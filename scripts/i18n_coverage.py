"""Translation coverage for content/i18n/<lang>/, measured against the built site.

    python scripts/i18n_coverage.py                 # summary per language
    python scripts/i18n_coverage.py --missing fr    # untranslated strings, as YAML

The string inventory is content/i18n/_runtime_strings.json, recorded from the
live DOM of every built page by scripts/i18n_crawl.cjs (make i18n-crawl), and
normalised the way i18n.js matches it (digits -> {0}, {1}...).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from freetoolkit import i18n  # noqa: E402

CONTENT = ROOT / "content"
RUNTIME = CONTENT / "i18n" / "_runtime_strings.json"


def runtime_strings(found: Counter) -> None:
    if RUNTIME.exists():
        for text in json.loads(RUNTIME.read_text(encoding="utf-8")):
            key = i18n.templatize(text)
            if re.search(r"[A-Za-z]{2}", key):
                found[key] += 1


def inventory() -> Counter:
    found: Counter = Counter()
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
    if not RUNTIME.exists():
        print("No inventory yet: run `make i18n-crawl` first.", file=sys.stderr)
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
