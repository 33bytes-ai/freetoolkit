#!/usr/bin/env python3
"""Scaffold a new calculator tool.

Usage:
  python scripts/new_tool.py --slug my-tool --title "My Tool" \
      --short "One-line description." --category "SaaS Metrics"
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
    "SaaS Metrics",
    "Freelance",
    "Business Math",
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
    widget_path = ROOT / "templates" / "widgets" / f"{slug}.html"
    if widget_path.exists():
        print(f"⚠ Widget already exists: {widget_path} — skipping")
    else:
        widget_path.write_text(
            textwrap.dedent(f"""\
            <div class="tool-widget" role="main">
              <div class="field-row">
                <div class="field">
                  <label for="{prefix}-input-a">Input A</label>
                  <input type="number" id="{prefix}-input-a" value="0" min="0" step="1">
                  <span class="field__error-msg"></span>
                </div>
                <div class="field">
                  <label for="{prefix}-input-b">Input B</label>
                  <input type="number" id="{prefix}-input-b" value="0" min="0" step="1">
                  <span class="field__error-msg"></span>
                </div>
              </div>
              <div class="output-grid">
                <div class="output-box" data-tooltip="TODO: add tooltip description">
                  <span class="label">Result</span>
                  <span class="value" id="{prefix}-out-result">—</span>
                </div>
              </div>
              <div id="{prefix}-insight" class="calc-insight" style="display:none"></div>
            </div>
            <script src="/static/js/tools/{js}" defer></script>
            """),
            encoding="utf-8",
        )
        print(f"✓ Created widget at {widget_path}")

    # ── JS module ─────────────────────────────────────────────────────────────
    js_path = ROOT / "static" / "js" / "tools" / js
    if js_path.exists():
        print(f"⚠ JS file already exists: {js_path} — skipping")
    else:
        js_path.write_text(
            textwrap.dedent(f"""\
            /* {title} */
            function calculate{prefix.capitalize()}(a, b) {{
              if (isNaN(a) || isNaN(b)) return null;
              // TODO: implement {title} logic
              return a + b;
            }}

            function {prefix}Label(result) {{
              if (result === null) return {{ text: "Enter values to see results.", type: "info" }};
              return {{ text: "Result: " + result, type: "success" }};
            }}

            if (typeof document !== "undefined") {{
              function run() {{
                var a = parseFloat(document.getElementById("{prefix}-input-a").value) || 0;
                var b = parseFloat(document.getElementById("{prefix}-input-b").value) || 0;
                var result = calculate{prefix.capitalize()}(a, b);

                var e1 = document.getElementById("{prefix}-out-result");
                if (e1) e1.textContent = result !== null ? result : "—";

                if (window.FTK) {{
                  var lbl = {prefix}Label(result);
                  window.FTK.showInsight(document.getElementById("{prefix}-insight"), lbl.text, lbl.type);
                }}
              }}

              document.addEventListener("DOMContentLoaded", function () {{
                ["{prefix}-input-a", "{prefix}-input-b"].forEach(function (id) {{
                  var el = document.getElementById(id);
                  if (el) el.addEventListener("input", run);
                }});
                run();
              }});
            }}

            if (typeof module !== "undefined") module.exports = {{ calculate{prefix.capitalize()}: calculate{prefix.capitalize()}, {prefix}Label: {prefix}Label }};
            """),
            encoding="utf-8",
        )
        print(f"✓ Created JS stub at {js_path}")

    # ── Test stub ─────────────────────────────────────────────────────────────
    test_stub = textwrap.dedent(f"""
    // ── {title} ──────────────────────────────────────────────────────────────
    const {prefix} = require("../static/js/tools/{js}");

    test("{prefix}: basic calculation returns a number", () => {{
      const result = {prefix}.calculate{prefix.capitalize()}(10, 5);
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

    print(f"""
Next steps:
  1. Implement the pure function in static/js/tools/{js}
  2. Update widget inputs/outputs in templates/widgets/{slug}.html
  3. Replace SEO body copy and howto_steps in content/tools.yaml
  4. Update/replace the test stub in tests/test_tools.js
  5. Optionally add to content/faqs.yaml and content/intent_pages.yaml
  6. Run: make build && make test
""")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold a new FounderCalc tool.")
    parser.add_argument("--slug", required=True, help="URL slug (e.g. my-tool)")
    parser.add_argument("--title", required=True, help='Display title (e.g. "My Tool")')
    parser.add_argument("--short", required=True, help="One-line description")
    parser.add_argument(
        "--category",
        default="SaaS Metrics",
        choices=CATEGORIES,
        help=f"Category: {', '.join(CATEGORIES)}",
    )
    args = parser.parse_args()

    slug = slugify(args.slug)
    scaffold(slug, args.title, args.short, args.category)


if __name__ == "__main__":
    main()
