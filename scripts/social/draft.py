"""Draft tomorrow's X post from a real tool, check it, and queue it.

    ANTHROPIC_API_KEY=... python scripts/social/draft.py [--date YYYY-MM-DD] [--tool slug]

Writes social/queue/<date>.json only if the post passes gate.check. A rejection
is fed back to the model for up to three attempts; after that nothing is written
and the exit code is 1, so a bad day produces no post rather than a bad one.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
import gate  # noqa: E402

ROOT = gate.ROOT
SOCIAL = ROOT / "social"
MODEL = "claude-sonnet-5-5"
ATTEMPTS = 3

PROMPT = """You write one daily X post for FounderCalc, a site of free business calculators.

Tool: {title}
What it does: {short}

Tool page text (the only source of facts you may use):
{body}

Exported calculator functions (name and parameters), run by the real site code:
{exports}

Write a post a founder would bookmark:
- hook: one first line that stops the scroll (a surprising number or a sharp question), no hashtags, no emoji.
- value: 1-3 short lines with one concrete worked example. Every number you write must come from the page text or from the result of your computation.
- cta_text: one short line inviting them to try the calculator. Do not include a URL.
- computation: {{"fn": <one exported function>, "args": [<numbers or strings>]}} that produces the numbers in your example.
hook + blank line + value must be at most 280 characters. Be useful, not salesy.

Answer with a JSON object with exactly the keys hook, value, cta_text, computation. Nothing else.
{feedback}"""


def load_history() -> list[dict]:
    return [json.loads(p.read_text())
            for d in ("queue", "posted") for p in sorted((SOCIAL / d).glob("*.json"))]


def pick_tool(tools: list[dict], history: list[dict]) -> dict:
    last = {}
    for post in history:
        last[post["tool"]] = max(last.get(post["tool"], ""), post["date"])
    return min(tools, key=lambda t: last.get(t["slug"], ""))


def exports_of(js: str) -> str:
    script = ("const m = require(process.argv[1]);"
              "for (const [k, f] of Object.entries(m)) if (typeof f === 'function')"
              " console.log(k + f.toString().match(/\\([^)]*\\)/)[0]);")
    return subprocess.run(["node", "-e", script, str(gate.TOOLS_JS / js)],
                          capture_output=True, text=True, check=True).stdout.strip()


def ask(prompt: str) -> dict:
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps({"model": MODEL, "max_tokens": 800,
                         "messages": [{"role": "user", "content": prompt}]}).encode(),
        headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"],
                 "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        text = json.load(response)["content"][0]["text"]
    return json.loads(text[text.index("{"):text.rindex("}") + 1])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=str(date.today() + timedelta(days=1)))
    parser.add_argument("--tool")
    args = parser.parse_args()

    out = SOCIAL / "queue" / f"{args.date}.json"
    if out.exists() or (SOCIAL / "posted" / f"{args.date}.json").exists():
        print(f"{args.date} already has a post, nothing to do")
        return 0

    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    config = yaml.safe_load((ROOT / "content" / "config.yaml").read_text())
    affiliates = yaml.safe_load((ROOT / "content" / "affiliates.yaml").read_text()) or {}
    history = load_history()
    tool = (next(t for t in tools if t["slug"] == args.tool) if args.tool
            else pick_tool(tools, history))
    affiliate_page = any(a.get("affiliate") for a in affiliates.get(tool["slug"], []))

    feedback = ""
    for attempt in range(1, ATTEMPTS + 1):
        draft = ask(PROMPT.format(title=tool["title"], short=tool["short"],
                                  body=tool["body"][:6000], exports=exports_of(tool["js"]),
                                  feedback=feedback))
        post = {"tool": tool["slug"], "date": args.date, **draft}
        problems = gate.check(post, tool, history, base_url=config["site"]["base_url"],
                              affiliate_page=affiliate_page)
        if not problems:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(post, indent=2, ensure_ascii=False) + "\n")
            print(f"queued {out.relative_to(ROOT)}\n\n{gate.post_text(post)}")
            return 0
        print(f"attempt {attempt} rejected: {'; '.join(problems)}", file=sys.stderr)
        feedback = "Your previous answer was rejected: " + "; ".join(problems) + ". Fix it."
    return 1


if __name__ == "__main__":
    sys.exit(main())
