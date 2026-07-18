#!/usr/bin/env python3
"""Scaffold a new calculator tool.

Usage:
  python scripts/new_tool.py --slug my-tool --title "My Tool" \
      --short "One-line description." --category "SaaS Growth Metrics"
"""
from __future__ import annotations

import argparse
import re
import textwrap
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent

CATEGORIES = [
    "Payments",
    "SaaS Growth Metrics",
    "SaaS Retention Metrics",
    "Freelance",
    "Pricing & Margins",
    "Marketing",
    "Finance",
    "Valuation",
    "Tax & Compliance",
    "HR & People",
]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def scaffold(slug: str, title: str, short: str, category: str) -> None:
    js = f"{slug}.js"
    prefix = slug.replace("-", "")[:8]
    today = date.today().isoformat()

    # ── tools.yaml entry ──────────────────────────────────────────────────────
    tool_entry = textwrap.dedent(f"""
    - slug: {slug}
      title: "{title}"
      nav_title: "{title}"
      short: "{short}"
      date_added: "{today}"
      new: true
      category: {category}
      js: {js}
      keywords: ["{slug.replace("-", " ")}", "free {slug} calculator", "{slug} online"]
      howto_steps:
        - name: "Enter your values"
          text: "Fill in the input fields above. Results update instantly as you type."
        - name: "Review the results"
          text: "Check the output boxes for your calculated values."
        - name: "Use the insight"
          text: "The insight box below the results gives context and benchmarks."
      body: |
        <!-- TODO: Replace with 300+ word SEO description for {title}. -->

        ## How to use this calculator

        Enter your values above and results update instantly in your browser.
        No data is sent to any server.

        ## Formula

        TODO: document the formula used.

        ## Frequently asked questions

        **What does this calculator do?**
        {short}
    """)

    tools_yaml = ROOT / "content" / "tools.yaml"
    with tools_yaml.open("a", encoding="utf-8") as f:
        f.write(tool_entry)
    print(f"✓ Appended tool entry to {tools_yaml}")

    # ── Widget template ───────────────────────────────────────────────────────
    # Matches the field-row/stats-grid/calc-insight/btn-row pattern used by the
    # majority of templates/widgets/*.html. tool.html already wraps the include
    # in #calculator.tool-widget and appends the <script> tag itself, so the
    # widget partial must not duplicate either.
    widget_path = ROOT / "templates" / "widgets" / f"{slug}.html"
    if widget_path.exists():
        print(f"⚠ Widget already exists: {widget_path} — skipping")
    else:
        widget_path.write_text(
            textwrap.dedent(f"""\
            <div class="field-row">
              <div class="field">
                <label for="{prefix}-input-a">Input A</label>
                <input type="number" autocomplete="off" id="{prefix}-input-a" value="0" min="0" step="1">
              </div>
              <div class="field">
                <label for="{prefix}-input-b">Input B</label>
                <input type="number" autocomplete="off" id="{prefix}-input-b" value="0" min="0" step="1">
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat" data-tooltip="TODO: add tooltip description">
                <span class="num" id="{prefix}-result">—</span>
                <span class="label">Result</span>
              </div>
            </div>
            <div id="{prefix}-insight" class="calc-insight" style="display:none"></div>
            <div class="btn-row" style="margin-top:0.75rem">
              <button id="{prefix}-copy" class="secondary">Copy results</button>
              <button id="{prefix}-share" class="secondary">Share results</button>
            </div>
            """),
            encoding="utf-8",
        )
        print(f"✓ Created widget at {widget_path}")

    # ── JS module ─────────────────────────────────────────────────────────────
    # IIFE + hash-state + copy/share wiring matches the pattern used by the
    # majority of static/js/tools/*.js files (see FTK.hashGet/hashSet/shareURL
    # in static/js/lib/common.js).
    calc_fn = f"calculate{prefix.capitalize()}"
    js_path = ROOT / "static" / "js" / "tools" / js
    if js_path.exists():
        print(f"⚠ JS file already exists: {js_path} — skipping")
    else:
        js_path.write_text(
            textwrap.dedent(f"""\
            (function () {{
              "use strict";

              function {calc_fn}(a, b) {{
                if (isNaN(a) || isNaN(b)) return null;
                // TODO: implement {title} logic
                return a + b;
              }}

              function {prefix}Label(result) {{
                if (result === null) return {{ text: "Enter values to see results.", type: "info" }};
                return {{ text: "Result: " + result, type: "success" }};
              }}

              function fmt(n) {{
                if (n === null || n === undefined || isNaN(n)) return "--";
                return String(n);
              }}

              function init() {{
                var aEl = document.getElementById("{prefix}-input-a");
                var bEl = document.getElementById("{prefix}-input-b");
                var resultEl = document.getElementById("{prefix}-result");
                var insEl = document.getElementById("{prefix}-insight");
                var copyBtn = document.getElementById("{prefix}-copy");
                var shareBtn = document.getElementById("{prefix}-share");

                function update() {{
                  var a = parseFloat(aEl.value) || 0;
                  var b = parseFloat(bEl.value) || 0;
                  var result = {calc_fn}(a, b);

                  resultEl.textContent = fmt(result);

                  window.FTK.hashSet({{ a: a, b: b }});

                  var label = {prefix}Label(result);
                  window.FTK.showInsight(insEl, label.text, label.type);
                }}

                function restoreHash() {{
                  var h = window.FTK.hashGet();
                  if (!h) return;
                  if (h.a !== undefined) aEl.value = h.a;
                  if (h.b !== undefined) bEl.value = h.b;
                }}

                if (shareBtn) shareBtn.addEventListener("click", function () {{ window.FTK.shareURL(shareBtn); }});
                if (copyBtn) {{
                  copyBtn.addEventListener("click", function () {{
                    var a = parseFloat(aEl.value) || 0;
                    var b = parseFloat(bEl.value) || 0;
                    var result = {calc_fn}(a, b);
                    var lines = [
                      "{title}",
                      "Input A: " + fmt(a),
                      "Input B: " + fmt(b),
                      "Result: " + fmt(result)
                    ];
                    window.FTK.copyToClipboard(lines.join("\\n")).then(function () {{ window.FTK.flash(copyBtn, "Copied!", 1500); }});
                  }});
                }}

                [aEl, bEl].forEach(function (el) {{
                  if (el) el.addEventListener("input", update);
                }});
                restoreHash();
                update();
              }}

              if (typeof document !== "undefined") {{ document.addEventListener("DOMContentLoaded", init); }}
              if (typeof module !== "undefined" && module.exports) {{
                module.exports = {{ {calc_fn}: {calc_fn}, {prefix}Label: {prefix}Label }};
              }}
            }})();
            """),
            encoding="utf-8",
        )
        print(f"✓ Created JS stub at {js_path}")

    # ── Test stub ─────────────────────────────────────────────────────────────
    test_stub = textwrap.dedent(f"""
    // ── {title} ──────────────────────────────────────────────────────────────
    const {prefix} = require("../static/js/tools/{js}");

    test("{prefix}: basic calculation returns a number", () => {{
      const result = {prefix}.{calc_fn}(10, 5);
      assert.ok(typeof result === "number");
    }});

    test("{prefix}: label returns success type", () => {{
      const lbl = {prefix}.{prefix}Label(15);
      assert.strictEqual(lbl.type, "success");
    }});
    """)
    test_file = ROOT / "tests" / "test_tools.js"
    with test_file.open("a", encoding="utf-8") as f:
        f.write(test_stub)
    print(f"✓ Appended test stub to {test_file}")

    # ── test_build.py stub ───────────────────────────────────────────────────
    build_test_name = f"test_{slug.replace('-', '_')}_tool_page_builds"
    build_test_stub = textwrap.dedent(f'''

    def {build_test_name}():
        """{title} page should build with required elements."""
        run_build()
        html = (DIST / "tools" / "{slug}" / "index.html").read_text()
        assert "WebApplication" in html
        assert "HowTo" in html
        assert "{prefix}-result" in html
    ''')
    build_test_file = ROOT / "tests" / "test_build.py"
    with build_test_file.open("a", encoding="utf-8") as f:
        f.write(build_test_stub)
    print(f"✓ Appended {build_test_name} to {build_test_file}")

    print(f"""
Next steps:
  1. Implement the pure function in static/js/tools/{js}
  2. Update widget inputs/outputs in templates/widgets/{slug}.html
  3. Replace SEO body copy and howto_steps in content/tools.yaml
     (add a "## Frequently asked questions" section with **bold** questions
     followed by their answers — it's auto-converted into FAQPage JSON-LD)
  4. Update/replace the test stubs in tests/test_tools.js and tests/test_build.py
  5. Optionally add to content/intent_pages.yaml
  6. Run: make build && make test
""")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold a new FounderCalc tool.")
    parser.add_argument("--slug", required=True, help="URL slug (e.g. my-tool)")
    parser.add_argument("--title", required=True, help='Display title (e.g. "My Tool")')
    parser.add_argument("--short", required=True, help="One-line description")
    parser.add_argument(
        "--category",
        default="SaaS Growth Metrics",
        choices=CATEGORIES,
        help=f"Category: {', '.join(CATEGORIES)}",
    )
    args = parser.parse_args()

    slug = slugify(args.slug)
    scaffold(slug, args.title, args.short, args.category)


if __name__ == "__main__":
    main()
