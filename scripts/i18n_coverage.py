"""Translation coverage for content/i18n/<lang>/, measured against the built site.

    python scripts/i18n_coverage.py                 # summary per language
    python scripts/i18n_coverage.py --missing fr    # untranslated strings, as YAML

The string inventory is every text node and placeholder/aria-label/title/alt/
data-tooltip in dist/*.html outside [data-i18n] keys and [data-i18n-region]
blocks, plus content/i18n/_runtime_strings.json: the text calculators write
at runtime, recorded by scripts/i18n_crawl.cjs. All of it is normalised the
way i18n.js matches it (digits -> {0}, {1}...). Run `make build` first.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from freetoolkit import i18n  # noqa: E402

DIST = ROOT / "dist"
CONTENT = ROOT / "content"
SKIP_TAGS = {"script", "style", "noscript", "textarea", "code", "pre", "template"}
ATTRS = ("placeholder", "aria-label", "title", "alt", "data-tooltip")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP_DIRS = ("embed/", "dashboard/", "i18n/", "static/")


class Collector(HTMLParser):
    def __init__(self, found: Counter):
        super().__init__(convert_charrefs=True)
        self.found = found
        self.stack: list[bool] = []  # True where this element or an ancestor is off-limits

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        off = (bool(self.stack and self.stack[-1]) or tag in SKIP_TAGS or "data-i18n" in a
               or "data-i18n-region" in a or a.get("translate") == "no")
        if not off:
            for name in ATTRS:
                self.add(a.get(name) or "")
        if tag not in VOID:
            self.stack.append(off)

    def handle_endtag(self, tag):
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if not (self.stack and self.stack[-1]):
            self.add(data)

    def add(self, text: str):
        key = i18n.templatize(text)
        if re.search(r"[A-Za-z]{2}", key):
            self.found[key] += 1


RUNTIME = CONTENT / "i18n" / "_runtime_strings.json"


def runtime_strings(found: Counter) -> None:
    if RUNTIME.exists():
        for text in json.loads(RUNTIME.read_text(encoding="utf-8")):
            key = i18n.templatize(text)
            if re.search(r"[A-Za-z]{2}", key):
                found[key] += 1


def inventory() -> Counter:
    found: Counter = Counter()
    for page in sorted(DIST.rglob("*.html")):
        rel = page.relative_to(DIST).as_posix()
        if rel.startswith(SKIP_DIRS):
            continue
        Collector(found).feed(page.read_text(encoding="utf-8"))
    runtime_strings(found)
    return found


def content_fields() -> dict[str, set[str]]:
    """English long-form fields that a language can translate, by file."""
    tools = yaml.safe_load((CONTENT / "tools.yaml").read_text())
    intents = yaml.safe_load((CONTENT / "intent_pages.yaml").read_text())
    glossary = yaml.safe_load((CONTENT / "glossary.yaml").read_text())
    cats = yaml.safe_load((CONTENT / "categories.yaml").read_text())
    return {
        "tools": {t["slug"] for t in tools if t.get("body")},
        "intent_pages": {p["slug"] for p in intents},
        "glossary": {e["slug"] for e in glossary},
        "categories": set(cats),
        "pages": {p.stem for p in (CONTENT / "pages").glob("*.md")},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--missing", metavar="LANG", help="print untranslated strings for LANG as YAML")
    args = ap.parse_args()
    if not (DIST / "index.html").exists():
        print("dist/ is empty: run `make build` first.", file=sys.stderr)
        return 1

    found = inventory()
    langs = i18n.load(CONTENT / "i18n")
    if args.missing:
        have = langs.get(args.missing, {}).get("strings", {})
        todo = [k for k, _ in found.most_common() if k not in have]
        sys.stdout.write(yaml.safe_dump({k: "" for k in todo}, allow_unicode=True, sort_keys=False, width=1000))
        return 0

    fields = content_fields()
    print(f"String inventory: {len(found)} unique strings")
    for lang, tr in sorted(langs.items()):
        have = sum(1 for k in found if k in tr["strings"])
        print(f"\n[{lang}] strings {have}/{len(found)} ({100 * have / max(len(found), 1):.0f}%)")
        for name, keys in fields.items():
            done = keys & {k for k, v in (tr[name] or {}).items() if v}
            print(f"  {name:13} {len(done)}/{len(keys)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
