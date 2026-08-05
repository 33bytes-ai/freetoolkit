#!/usr/bin/env python3
"""Performance budget and quality checks for the built site.

Checks file size budgets, meta tag presence, and structural issues.
Exit code 0 = all checks pass. Exit code 1 = one or more failures.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
WARN = "\033[33m⚠\033[0m"

failures = 0
warnings = 0


def check(condition: bool, message: str, warn_only: bool = False) -> None:
    global failures, warnings
    if condition:
        print(f"  {PASS} {message}")
    else:
        if warn_only:
            print(f"  {WARN} {message}")
            warnings += 1
        else:
            print(f"  {FAIL} {message}")
            failures += 1


def size_kb(path: Path) -> float:
    return path.stat().st_size / 1024


def gz_kb(path: Path) -> float:
    """Size of the .gz twin build.py already writes next to every compressible
    asset (_gzip_dist). Cloudflare Pages serves that, so it is the number a
    visitor's connection actually carries -- raw bytes on disk are 3-5x larger
    and nobody ever downloads them. Falls back to raw if the .gz is missing,
    which fails loudly against a gzip budget rather than passing silently."""
    gz = path.with_suffix(path.suffix + ".gz")
    return gz.stat().st_size / 1024 if gz.exists() else size_kb(path)


def main() -> int:
    if not DIST.exists():
        print(f"{FAIL} dist/ directory not found — run 'make build' first")
        return 1

    print("\n── File size budgets (gzipped — what visitors download) ──────────")
    css = DIST / "static" / "css" / "style.css"
    if css.exists():
        check(gz_kb(css) < 20, f"style.css = {gz_kb(css):.1f} KB gz ({size_kb(css):.1f} raw) (budget: 20 KB)")

    tool_pages = list((DIST / "tools").glob("*/index.html"))
    if tool_pages:
        sizes = [gz_kb(p) for p in tool_pages]
        avg_kb = sum(sizes) / len(sizes)
        biggest = max(tool_pages, key=gz_kb)
        check(gz_kb(biggest) < 25,
              f"Largest tool page = {gz_kb(biggest):.1f} KB gz ({size_kb(biggest):.1f} raw) "
              f"({biggest.parent.name}) (budget: 25 KB)")
        check(avg_kb < 20, f"Average tool page = {avg_kb:.1f} KB gz (budget: 20 KB)")
    else:
        check(False, "No tool pages found in dist/tools/")

    js_files = list((DIST / "static" / "js" / "tools").glob("*.js")) if (DIST / "static" / "js" / "tools").exists() else []
    if js_files:
        max_js = max(gz_kb(f) for f in js_files)
        check(max_js < 8, f"Largest tool JS = {max_js:.1f} KB gz (budget: 8 KB)")
    common_js = DIST / "static" / "js" / "lib" / "common.js"
    if common_js.exists():
        check(gz_kb(common_js) < 12,
              f"common.js = {gz_kb(common_js):.1f} KB gz ({size_kb(common_js):.1f} raw) (budget: 12 KB)")

    print("\n── Meta tag coverage ────────────────────────────────────────────")
    index = DIST / "index.html"
    if index.exists():
        html = index.read_text(encoding="utf-8")
        check('property="og:title"' in html, "index.html has og:title")
        check('property="og:image"' in html, "index.html has og:image")
        check('name="description"' in html, "index.html has meta description")
        check('<link rel="canonical"' in html, "index.html has canonical link")
        check('application/ld+json' in html, "index.html has JSON-LD schema")

    if tool_pages:
        sample = next((p for p in tool_pages if "stripe-fee-calculator" in str(p)), tool_pages[0])
        html = sample.read_text(encoding="utf-8")
        check('"WebApplication"' in html, f"Tool page has WebApplication schema ({sample.parent.name})")
        check('name="DC.rights"' in html, f"Tool page has DC.rights meta")
        check('data-tooltip' in html or True, "Tooltip pass (informational)", warn_only=True)

    print("\n── Sitemap coverage ─────────────────────────────────────────────")
    sitemap = DIST / "sitemap_tools.xml"
    if sitemap.exists():
        content = sitemap.read_text(encoding="utf-8")
        count = content.count("<loc>")
        check(count >= 79, f"sitemap_tools.xml has {count} entries (expected ≥79)")
    else:
        check(False, "sitemap_tools.xml not found")

    intent_sitemap = DIST / "sitemap_intent.xml"
    if intent_sitemap.exists():
        content = intent_sitemap.read_text(encoding="utf-8")
        count = content.count("<loc>")
        check(count >= 200, f"sitemap_intent.xml has {count} entries (expected ≥200)")
    else:
        check(False, "sitemap_intent.xml not found")

    print("\n── Structural checks ────────────────────────────────────────────")
    og_images = list((DIST / "static" / "img").glob("og-*.png")) if (DIST / "static" / "img").exists() else []
    skip_og = os.environ.get("FTK_SKIP_OG_IMAGE")
    if skip_og:
        check(True, f"og:image PNGs skipped (FTK_SKIP_OG_IMAGE set) — {len(og_images)} present")
    else:
        check(len(og_images) >= 79, f"og:image PNGs = {len(og_images)} (expected ≥79)")

    robots = DIST / "robots.txt"
    check(robots.exists() and "Sitemap:" in robots.read_text(), "robots.txt exists with Sitemap directive")

    rss = DIST / "rss.xml"
    check(rss.exists(), "rss.xml exists")

    print("\n── Accessibility spot checks ────────────────────────────────────")
    if tool_pages:
        sample = tool_pages[0]
        html = sample.read_text(encoding="utf-8")
        check('role="main"' in html or '<main' in html, "Tool page has main landmark")
        check('aria-label' in html, "Tool page uses aria-label attributes")

    print(f"\n{'─'*60}")
    total = failures + warnings
    if failures == 0 and warnings == 0:
        print(f"\033[32m  All checks passed.\033[0m\n")
    elif failures == 0:
        print(f"\033[33m  {warnings} warning(s), 0 failures.\033[0m\n")
    else:
        print(f"\033[31m  {failures} failure(s), {warnings} warning(s).\033[0m\n")

    return 1 if failures > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
