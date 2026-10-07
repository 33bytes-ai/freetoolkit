"""Quality gate for a drafted X post: nothing leaves it unless it is checked.

A post is a dict: tool, date, hook, value, cta_text, computation {fn, args}.
`check` returns the list of reasons it must not be published (empty = ok).
"""

from __future__ import annotations

import json
import re
import subprocess
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS_JS = ROOT / "static" / "js" / "tools"

POST_MAX = 280
TOOL_COOLDOWN_DAYS = 30
NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def post_text(post: dict) -> str:
    return f"{post['hook'].strip()}\n\n{post['value'].strip()}\n\n{post['cta_text'].strip()}"


def numbers(text: str) -> list[float]:
    return [float(m.replace(",", "")) for m in NUMBER.findall(text)]


def run_computation(js: str, fn: str, args: list) -> object:
    """Run the real calculator function from the file the site ships."""
    script = ("const m = require(process.argv[1]); const f = m[process.argv[2]];"
              "if (typeof f !== 'function') { console.error('no such export'); process.exit(2); }"
              "console.log(JSON.stringify(f(...JSON.parse(process.argv[3]))));")
    done = subprocess.run(["node", "-e", script, str(TOOLS_JS / js), fn, json.dumps(args)],
                          capture_output=True, text=True, timeout=20)
    if done.returncode != 0:
        raise ValueError(done.stderr.strip()[:200] or "computation failed")
    return json.loads(done.stdout)


def _flatten(value: object) -> list[float]:
    if isinstance(value, bool):
        return []
    if isinstance(value, (int, float)):
        return [float(value)]
    if isinstance(value, dict):
        value = list(value.values())
    if isinstance(value, list):
        return [n for v in value for n in _flatten(v)]
    return []


def allowed_numbers(tool: dict, args: list, result: object) -> list[float]:
    source = " ".join([tool.get("short", ""), tool.get("body", "")])
    base = numbers(source) + _flatten(args) + _flatten(result)
    return base + [n * 100 for n in base]  # a rate of 0.029 is quoted as 2.9%


def check(post: dict, tool: dict, history: list[dict], *, affiliate_page: bool, today: date | None = None) -> list[str]:
    problems: list[str] = []
    text = post_text(post)
    if len(text) > POST_MAX:
        problems.append(f"post is {len(text)} characters, max {POST_MAX}")
    if "bio" not in post["cta_text"].lower():
        problems.append("the CTA must point to the link in the bio")
    if affiliate_page and "affiliate" not in post["cta_text"].lower():
        problems.append("the page carries affiliate links and the CTA does not say so")

    comp = post.get("computation") or {}
    try:
        result = run_computation(tool["js"], comp.get("fn", ""), comp.get("args", []))
    except (ValueError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        problems.append(f"computation failed: {error}")
    else:
        ok = allowed_numbers(tool, comp.get("args", []), result)
        for n in numbers(text):
            if not any(abs(n - a) < 0.006 for a in ok):
                problems.append(f"number {n:g} is not in the tool's source or its computed result")

    hook = re.sub(r"\W+", " ", post["hook"]).strip().lower()
    cutoff = (today or date.today()) - timedelta(days=TOOL_COOLDOWN_DAYS)
    for old in history:
        if old.get("date") == post["date"]:
            continue
        if re.sub(r"\W+", " ", old["hook"]).strip().lower() == hook:
            problems.append("hook already used")
        if old["tool"] == post["tool"] and date.fromisoformat(old["date"]) > cutoff:
            problems.append(f"tool {post['tool']} was posted on {old['date']}")
    return problems
