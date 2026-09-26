"""Full-content translations, applied client-side.

English stays canonical and is the only thing crawlers see: no new URLs, no
hreflang, nothing in the sitemaps. A visitor who picks FR/ES/DE gets the same
page with its text swapped in place by static/js/lib/i18n.js, from two files
this module writes:

  dist/i18n/<lang>/strings.json         English text -> translation, site-wide
                                         (widget labels, result sentences as
                                         number templates, tool names, chrome)
  dist/i18n/<lang>/<path>/index.json    long-form regions of one page (tool
                                         body, guides, category intro, ...)

Sources live in content/i18n/<lang>/, mirroring the English files:
  strings.yaml      {english text: translation}; digits become {0}, {1}...
  tools.yaml        {slug: {body}}
  intent_pages.yaml {slug: {title, description, body}}
  glossary.yaml     {slug: {term, short, body}}
  categories.yaml   {category name: {body}}
  pages/<slug>.md   front matter title/description + body

Anything missing falls back to the English already on the page.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path
from typing import Callable

import yaml

NUM_RE = re.compile(r"[-−+]?[$€£¥]?\d+(?:[.,]\d+)*[kKMB]?%?")
# A placeholder a translator already wrote counts as one number slot, so
# "{0} more" (a key) and "12 more" (live text) both become "{0} more".
SLOT_RE = re.compile(r"\{\d+\}|" + NUM_RE.pattern)


def templatize(text: str) -> str:
    """'Pro at $49 is 40%' -> 'Pro at {0} is {1}'. Mirrors i18n.js."""
    counter = iter(range(10_000))
    return SLOT_RE.sub(lambda _m: "{%d}" % next(counter), " ".join(text.split()))


def languages(i18n_dir: Path) -> list[str]:
    if not i18n_dir.exists():
        return []
    return sorted(p.name for p in i18n_dir.iterdir() if p.is_dir() and not p.name.startswith("_"))


def version(i18n_dir: Path) -> str:
    """Content hash of every translation source, for cache-busting ?v=."""
    digest = hashlib.sha256()
    if i18n_dir.exists():
        for path in sorted(i18n_dir.rglob("*")):
            if path.is_file():
                digest.update(path.relative_to(i18n_dir).as_posix().encode())
                digest.update(path.read_bytes())
    return digest.hexdigest()[:10]


def _yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n?", re.DOTALL)


def _pages(lang_dir: Path) -> dict[str, dict]:
    pages = {}
    for path in sorted((lang_dir / "pages").glob("*.md")):
        text = path.read_text(encoding="utf-8")
        m = FRONTMATTER_RE.match(text)
        meta = (yaml.safe_load(m.group(1)) or {}) if m else {}
        meta["body"] = text[m.end():] if m else text
        pages[path.stem] = meta
    return pages


def load(i18n_dir: Path) -> dict[str, dict]:
    out = {}
    for lang in languages(i18n_dir):
        d = i18n_dir / lang
        out[lang] = {
            "strings": {templatize(k): v for k, v in _yaml(d / "strings.yaml").items() if v},
            "tools": _yaml(d / "tools.yaml"),
            "intent_pages": _yaml(d / "intent_pages.yaml"),
            "glossary": _yaml(d / "glossary.yaml"),
            "categories": _yaml(d / "categories.yaml"),
            "pages": _pages(d),
        }
    return out


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write(dist: Path, translations: dict[str, dict], *, md: Callable[[str], str],
          demote: Callable[[str], str], tools: list[dict], intent_pages: list[dict],
          glossary: list[dict], category_slug: Callable[[str], str],
          page_body: Callable[[str], str]) -> None:
    """Emit strings.json and one JSON per page that has translated regions.

    `md` is the build's markdown pipeline, `demote` its heading demotion and
    `page_body` its placeholder substitution for content/pages, so translated
    regions come out shaped exactly like the English ones they replace."""
    dives_by_tool: dict[str, list[dict]] = {}
    for ip in intent_pages:
        dives_by_tool.setdefault(ip["parent_tool"], []).append(ip)

    for lang, tr in translations.items():
        root = dist / "i18n" / lang
        _write(root / "strings.json", tr["strings"])

        for tool in tools:
            regions = {}
            body = (tr["tools"].get(tool["slug"]) or {}).get("body")
            if body:
                regions["body"] = md(body)
            for ip in dives_by_tool.get(tool["slug"], []):
                t = tr["intent_pages"].get(ip["slug"]) or {}
                if t.get("title"):
                    regions[f"dive-title:{ip['slug']}"] = html.escape(t["title"])
                if t.get("description"):
                    regions[f"dive-desc:{ip['slug']}"] = html.escape(t["description"])
                if t.get("body") and not ip.get("is_country_page"):
                    regions[f"dive-body:{ip['slug']}"] = demote(md(t["body"]))
            if regions:
                _write(root / "tools" / tool["slug"] / "index.json", {"regions": regions})

        for name, entry in tr["categories"].items():
            if entry and entry.get("body"):
                _write(root / "categories" / category_slug(name) / "index.json",
                       {"regions": {"intro": md(entry["body"])}})

        regions = {}
        for e in glossary:
            t = tr["glossary"].get(e["slug"]) or {}
            if t.get("term"):
                regions[f"term:{e['slug']}"] = html.escape(t["term"])
            if t.get("short"):
                regions[f"term-short:{e['slug']}"] = html.escape(t["short"])
            if t.get("body"):
                regions[f"term-body:{e['slug']}"] = demote(md(t["body"]))
        if regions:
            _write(root / "glossary" / "index.json", {"regions": regions})

        for slug, page in tr["pages"].items():
            data = {"regions": {"body": md(page_body(page["body"]))}}
            if page.get("title"):
                data["title"] = page["title"]
                data["regions"]["title"] = html.escape(page["title"])
            if page.get("description"):
                data["description"] = page["description"]
            _write(root / slug / "index.json", data)
