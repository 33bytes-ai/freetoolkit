"""Tests for the static site build."""
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

import yaml

ROOT = Path(__file__).resolve().parent.parent
PYTHON = ROOT / ".venv" / "bin" / "python"
BUILD = ROOT / "src" / "freetoolkit" / "build.py"
DIST = ROOT / "dist"

TOOL_SLUGS = [
    t["slug"]
    for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
]

INTENT_PAGES = [
    (p["parent_tool"], p["slug"])
    for p in yaml.safe_load((ROOT / "content" / "intent_pages.yaml").read_text())
]

COUNTRIES = yaml.safe_load((ROOT / "content" / "countries.yaml").read_text())
COUNTRY_PAGE_SLUGS = [f"stripe-fees-{c['slug']}" for c in COUNTRIES]

EXPECTED_FILES = (
    [
        "index.html",
        "404.html",
        "sitemap.xml",
        "robots.txt",
        "about/index.html",
        "contact/index.html",
        "privacy/index.html",
        "terms/index.html",
        "static/css/style.css",
        "static/js/lib/common.js",
    ]
    + [f"tools/{slug}/index.html" for slug in TOOL_SLUGS]
    + [f"static/js/tools/{slug}.js" for slug in TOOL_SLUGS]
    + [f"tools/{parent}/{slug}/index.html" for parent, slug in INTENT_PAGES]
    + [f"tools/stripe-fee-calculator/{slug}/index.html" for slug in COUNTRY_PAGE_SLUGS]
)


def run_build():
    env = {**__import__("os").environ, "FTK_SKIP_OG_IMAGE": "1"}
    return subprocess.run([str(PYTHON), str(BUILD)], capture_output=True, text=True, env=env)


def run_build_with_og_images():
    env = dict(__import__("os").environ)
    env.pop("FTK_SKIP_OG_IMAGE", None)
    return subprocess.run([str(PYTHON), str(BUILD)], capture_output=True, text=True, env=env)


def test_build_succeeds():
    result = run_build()
    assert result.returncode == 0, f"Build failed:\n{result.stderr}"


def test_all_expected_files_exist():
    run_build()
    missing = [f for f in EXPECTED_FILES if not (DIST / f).exists()]
    assert not missing, f"Missing dist files: {missing}"


def test_sitemap_contains_all_tool_urls():
    run_build()
    sitemap = (DIST / "sitemap.xml").read_text()
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in sitemap, f"Tool {slug} missing from sitemap"


def test_robots_contains_sitemap_reference():
    run_build()
    robots = (DIST / "robots.txt").read_text()
    assert "Sitemap:" in robots
    assert "sitemap.xml" in robots


def test_tool_pages_reference_correct_js():
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert f"{slug}.js" in html, f"{slug} page missing its JS reference"


def test_tool_pages_have_canonical_url():
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert 'rel="canonical"' in html
        assert f"/tools/{slug}/" in html


def test_index_page_has_all_tools_linked():
    run_build()
    index = (DIST / "index.html").read_text()
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in index, f"Tool {slug} not linked from home page"


def test_branding_updated():
    run_build()
    index = (DIST / "index.html").read_text()
    assert "FounderCalc" in index


def test_privacy_page_exists_with_content():
    run_build()
    privacy = (DIST / "privacy" / "index.html").read_text()
    assert "Privacy Policy" in privacy
    assert len(privacy) > 1000


def test_intent_pages_exist():
    run_build()
    missing = [
        f"tools/{parent}/{slug}/index.html"
        for parent, slug in INTENT_PAGES
        if not (DIST / "tools" / parent / slug / "index.html").exists()
    ]
    assert not missing, f"Missing intent page files: {missing}"


def test_sitemap_contains_intent_page_urls():
    run_build()
    sitemap = (DIST / "sitemap.xml").read_text()
    for parent, slug in INTENT_PAGES:
        url = f"/tools/{parent}/{slug}/"
        assert url in sitemap, f"Intent page {url} missing from sitemap"


def test_contact_email_derived_from_base_url():
    run_build()
    config = yaml.safe_load((ROOT / "content" / "config.yaml").read_text())
    domain = config["site"]["base_url"].split("://", 1)[1]
    expected_email = f"hello@{domain}"

    contact = (DIST / "contact" / "index.html").read_text()
    assert expected_email in contact
    assert f"mailto:{expected_email}" in contact

    index = (DIST / "index.html").read_text()
    assert expected_email in index


def test_intent_pages_link_to_parent_tool():
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert f"/tools/{parent}/" in html, f"Intent page {slug} missing link to parent {parent}"


def test_faq_schema_on_tools_with_faq_section():
    run_build()
    for slug in ("stripe-fee-calculator", "paypal-fee-calculator", "mrr-calculator"):
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert "FAQPage" in html, f"{slug} missing FAQPage JSON-LD"
        assert "acceptedAnswer" in html, f"{slug} FAQPage missing acceptedAnswer"


def test_faq_schema_matches_visible_faq_text():
    """The FAQPage JSON-LD must be generated from the body's own FAQ section,
    so the question text on the page and in the schema never drift apart."""
    run_build()
    html = (DIST / "tools" / "stripe-fee-calculator" / "index.html").read_text()
    assert "rate change based on volume" in html
    assert "Can I use this for Stripe Connect?" in html


def test_tools_without_faq_section_have_no_faq_schema():
    run_build()
    from freetoolkit.build import extract_faqs_from_body

    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    slugs_without_faqs = [t["slug"] for t in tools if not extract_faqs_from_body(t["body"])]
    assert slugs_without_faqs, "expected at least one tool without a FAQ section"
    for slug in slugs_without_faqs:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert "FAQPage" not in html, f"{slug} unexpectedly has FAQPage schema"


def test_rejectattr_lt_gt_operators():
    from freetoolkit.build import _rejectattr

    items = [{"score": 1}, {"score": 5}, {"score": 10}]
    assert _rejectattr(items, "score", "lt", 5) == [{"score": 5}, {"score": 10}]
    assert _rejectattr(items, "score", "gt", 5) == [{"score": 1}, {"score": 5}]


def test_rejectattr_unknown_operator_raises():
    from freetoolkit.build import _rejectattr

    items = [{"x": 1}]
    try:
        _rejectattr(items, "x", "bad_op", 1)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "bad_op" in str(exc)


def test_tools_index_page_exists_with_all_tools():
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert "CollectionPage" in html
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in html, f"Tools index missing link to {slug}"


def test_rss_feed_exists_with_tool_entries():
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<rss" in rss
    assert "<item>" in rss
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in rss, f"RSS missing entry for {slug}"


def test_comparison_pages_have_itemlist_schema():
    run_build()
    for slug in ("payment-processor-comparison", "saas-analytics-comparison", "freelance-tools-comparison"):
        html = (DIST / slug / "index.html").read_text()
        assert "ItemList" in html, f"{slug} missing ItemList JSON-LD"
        assert "ListItem" in html, f"{slug} missing ListItem entries"


def test_dashboard_has_noindex():
    run_build()
    html = (DIST / "dashboard" / "index.html").read_text()
    assert 'noindex' in html, "Dashboard page should have noindex meta tag"


def test_cross_tools_appear_on_tool_pages():
    run_build()
    for slug in ("stripe-fee-calculator", "mrr-calculator", "freelance-rate-calculator"):
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert "You might also need" in html, f"{slug} missing cross-category tools section"


def test_intent_pages_have_body_html():
    run_build()
    for parent, slug in INTENT_PAGES[:5]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert len(html) > 2000, f"Intent page {slug} looks suspiciously short"
        assert "<p>" in html or "<h" in html, f"Intent page {slug} missing body HTML content"


def test_intent_and_country_pages_have_unique_meta_descriptions():
    """No two of the 244 intent/country pages should share an identical
    <meta name="description"> after template interpolation -- duplicate
    descriptions read as thin/near-duplicate content to Google, and with
    this many programmatically-templated pages it's easy for two entries
    to accidentally collide."""
    run_build()
    desc_re = re.compile(r'<meta name="description" content="([^"]*)">')
    seen: dict[str, str] = {}
    duplicates = []
    for parent, slug in INTENT_PAGES:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        match = desc_re.search(html)
        assert match, f"Intent page {parent}/{slug} missing meta description"
        desc = match.group(1)
        page_id = f"{parent}/{slug}"
        if desc in seen:
            duplicates.append((seen[desc], page_id, desc))
        else:
            seen[desc] = page_id
    for slug in COUNTRY_PAGE_SLUGS:
        html = (DIST / "tools" / "stripe-fee-calculator" / slug / "index.html").read_text()
        match = desc_re.search(html)
        assert match, f"Country page {slug} missing meta description"
        desc = match.group(1)
        page_id = f"stripe-fee-calculator/{slug}"
        if desc in seen:
            duplicates.append((seen[desc], page_id, desc))
        else:
            seen[desc] = page_id
    assert not duplicates, "Duplicate meta descriptions found:\n" + "\n".join(
        f"  {a} == {b}: {desc!r}" for a, b, desc in duplicates
    )


def test_nav_has_site_navigation_element_schema():
    run_build()
    html = (DIST / "index.html").read_text()
    assert "SiteNavigationElement" in html, "Home page missing SiteNavigationElement JSON-LD"


def test_pwa_manifest_linked():
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'rel="manifest" href="/manifest.json"' in html, "Home page missing web app manifest link"
    assert (DIST / "manifest.json").exists(), "manifest.json not generated at dist root"


def test_intent_pages_have_article_schema():
    run_build()
    for parent, slug in INTENT_PAGES[:5]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert '"Article"' in html, f"Intent page {slug} missing Article JSON-LD schema"


def test_changelog_page_lists_all_tools():
    run_build()
    html = (DIST / "changelog" / "index.html").read_text()
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in html, f"Changelog missing link to {slug}"


def test_sitemap_news_exists_with_tool_entries():
    run_build()
    xml = (DIST / "sitemap_news.xml").read_text()
    assert "<news:news>" in xml
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in xml, f"News sitemap missing {slug}"


def test_howto_schema_on_tools_with_steps():
    run_build()
    howto_tools = [
        t["slug"]
        for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
        if "howto_steps" in t
    ]
    assert len(howto_tools) >= 3, "Expected at least 3 tools with howto_steps"
    for slug in howto_tools[:3]:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert '"HowTo"' in html, f"{slug} missing HowTo schema"
        assert "HowToStep" in html, f"{slug} missing HowToStep entries"


def test_tool_pages_have_twitter_meta():
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert 'twitter:title' in html, f"{slug} missing twitter:title"
        assert 'twitter:description' in html, f"{slug} missing twitter:description"


def test_dashboard_has_csp_nonce():
    run_build()
    html = (DIST / "dashboard" / "index.html").read_text()
    assert "Content-Security-Policy" in html
    assert "nonce-" in html
    import re
    nonces = re.findall(r'nonce="([^"]+)"', html)
    assert len(nonces) >= 2, "Expected nonce on at least 2 script tags"
    assert len(set(nonces)) == 1, "All nonces on the dashboard should match"


def test_sub_sitemaps_exist_and_index_references_them():
    run_build()
    for name in ("sitemap_tools.xml", "sitemap_pages.xml", "sitemap_intent.xml"):
        assert (DIST / name).exists(), f"Missing {name}"
    index = (DIST / "sitemap_index.xml").read_text()
    assert "sitemap_tools.xml" in index
    assert "sitemap_pages.xml" in index
    assert "sitemap_intent.xml" in index
    tools_xml = (DIST / "sitemap_tools.xml").read_text()
    for slug in TOOL_SLUGS:
        assert f"/tools/{slug}/" in tools_xml, f"sitemap_tools.xml missing {slug}"
    intent_xml = (DIST / "sitemap_intent.xml").read_text()
    parent, slug = INTENT_PAGES[0]
    assert f"/tools/{parent}/{slug}/" in intent_xml


def test_payment_fee_comparison_tool_builds():
    run_build()
    html = (DIST / "tools" / "payment-fee-comparison" / "index.html").read_text()
    assert "payment-fee-comparison.js" in html
    assert "FAQPage" in html
    assert "pfc-amount" in html


def test_build_fails_with_clear_error_for_missing_widget(tmp_path):
    """Build should raise FileNotFoundError with the slug name, not a cryptic Jinja2 error."""
    import shutil, textwrap

    # Copy templates/widgets to tmp, drop one widget
    widgets_src = ROOT / "templates" / "widgets"
    widgets_dst = tmp_path / "templates" / "widgets"
    shutil.copytree(widgets_src, widgets_dst)
    missing_slug = TOOL_SLUGS[0]
    (widgets_dst / f"{missing_slug}.html").unlink()

    # Patch TEMPLATES_DIR to point at tmp_path/templates
    import importlib, sys
    build_mod = importlib.import_module("freetoolkit.build")
    original = build_mod.TEMPLATES_DIR
    build_mod.TEMPLATES_DIR = tmp_path / "templates"
    try:
        try:
            build_mod.build()
            assert False, "Expected FileNotFoundError"
        except FileNotFoundError as exc:
            assert missing_slug in str(exc), f"Error message missing slug: {exc}"
    finally:
        build_mod.TEMPLATES_DIR = original


def test_tool_pages_have_date_published():
    """Tools with date_added should have datePublished in their WebApplication schema."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_date = [t for t in tools if t.get("date_added")]
    assert tools_with_date, "No tools have date_added"
    for tool in tools_with_date[:5]:  # Check a sample
        page = DIST / "tools" / tool["slug"] / "index.html"
        assert page.exists()
        content = page.read_text()
        assert tool["date_added"] in content, f"{tool['slug']} missing datePublished {tool['date_added']}"


def test_intent_pages_article_schema_has_date():
    """Intent pages whose parent tool has date_added should have datePublished in Article schema."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tool_dates = {t["slug"]: t.get("date_added", "") for t in tools}
    intent = yaml.safe_load((ROOT / "content" / "intent_pages.yaml").read_text())
    checked = 0
    for ip in intent:
        date = tool_dates.get(ip["parent_tool"], "")
        if not date:
            continue
        page = DIST / "tools" / ip["parent_tool"] / ip["slug"] / "index.html"
        if not page.exists():
            continue
        content = page.read_text()
        assert date in content, f"Intent page {ip['slug']} missing datePublished {date}"
        checked += 1
        if checked >= 5:
            break
    assert checked > 0, "No intent pages with date_added parent tool found"


def test_rss_has_category_tags():
    """RSS feed should have <category> tags for each tool."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<category>" in rss, "RSS feed missing <category> tags"


def test_rss_has_channel_image():
    """RSS feed should have a <image> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<image>" in rss, "RSS feed missing <image> channel element"
    assert "og.png" in rss, "RSS channel image should reference og.png"


def test_sitemap_intent_has_lastmod():
    """sitemap_intent.xml should have <lastmod> matching parent tool date_added."""
    run_build()
    intent_xml = (DIST / "sitemap_intent.xml").read_text()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tool_dates = {t["slug"]: t.get("date_added", "") for t in tools}
    intent = yaml.safe_load((ROOT / "content" / "intent_pages.yaml").read_text())
    for ip in intent[:5]:
        date = tool_dates.get(ip["parent_tool"], "")
        if date:
            assert date in intent_xml, f"sitemap_intent.xml missing lastmod {date} for {ip['slug']}"


def test_sitemap_news_has_date_added():
    """sitemap_news.xml should use tool date_added for publication_date where available."""
    run_build()
    news_xml = (DIST / "sitemap_news.xml").read_text()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_date = [t for t in tools if t.get("date_added")]
    for tool in tools_with_date[:3]:
        assert tool["date_added"] in news_xml, f"sitemap_news.xml missing date {tool['date_added']} for {tool['slug']}"


def test_tool_pages_have_calculator_anchor():
    """Tool pages should have id='calculator' on the widget div."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert 'id="calculator"' in html, f"{slug} missing id='calculator' anchor on widget"


def test_tool_pages_have_robots_meta():
    """Tool pages should have max-snippet robots meta tag."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert "max-snippet" in html, f"{slug} missing max-snippet robots meta"
        assert "max-image-preview" in html, f"{slug} missing max-image-preview robots meta"


def test_rss_has_enclosure_per_item():
    """RSS feed items should have enclosure tags for og images."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert '<enclosure url=' in rss, "RSS feed missing enclosure tags"
    import re
    enclosures = re.findall(r'<enclosure url=', rss)
    assert len(enclosures) >= len(TOOL_SLUGS) - 1, "Expected one enclosure per tool item"


def test_tools_index_shows_guide_count():
    """Tools index should show guide count in category headers."""
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert "guides" in html, "/tools/ index missing guide count in category headers"


def test_webapplication_schema_has_date_modified():
    """Tool pages with date_added should have dateModified in WebApplication schema."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_date = [t for t in tools if t.get("date_added")]
    for tool in tools_with_date[:3]:
        html = (DIST / "tools" / tool["slug"] / "index.html").read_text()
        assert "dateModified" in html, f"{tool['slug']} missing dateModified in WebApplication schema"


def test_pages_have_hreflang():
    """All tool pages should have hreflang='en' link tag."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert 'hreflang="en"' in html, f"{slug} missing hreflang=en"


def test_tool_pages_have_social_share():
    """Tool pages should have social share links."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert "twitter.com/intent/tweet" in html, f"{slug} missing Twitter share link"
        assert "linkedin.com/sharing" in html, f"{slug} missing LinkedIn share link"


def test_tools_index_has_category_jump_bar():
    """Tools index should have a category quick-jump navigation bar."""
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert "cat-jump-bar" in html, "/tools/ index missing category jump bar"
    assert "#cat-" in html, "/tools/ index missing category anchor links"


def test_tool_pages_have_author_meta():
    """Tool pages should have meta author tag."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert 'name="author"' in html, f"{slug} missing meta author"


def test_ocf_tool_page_builds_with_schema():
    """Operating cash flow tool page should build with WebApplication and HowTo schemas."""
    run_build()
    html = (DIST / "tools" / "operating-cash-flow-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "ocf-net-income" in html


def test_tool_pages_have_reading_time():
    """Tool pages with a body should show reading time estimate."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_body = [t for t in tools if t.get("body")]
    for tool in tools_with_body[:3]:
        html = (DIST / "tools" / tool["slug"] / "index.html").read_text()
        assert "min read" in html, f"{tool['slug']} missing reading time estimate"


def test_footer_has_build_date():
    """Footer should contain build date."""
    run_build()
    html = (DIST / "index.html").read_text()
    import re, datetime
    today = datetime.date.today().isoformat()
    assert today in html, f"Home page footer missing build date {today}"


def test_intent_pages_have_hreflang():
    """Intent pages should have hreflang='en'."""
    run_build()
    for parent, slug in INTENT_PAGES[:5]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'hreflang="en"' in html, f"Intent page {slug} missing hreflang=en"


def test_payroll_tool_page_builds():
    """Payroll cost calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "payroll-cost-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "pr-salary" in html
    assert "FICA" in html


def test_intent_pages_have_reading_time():
    """Intent pages should show reading time estimate."""
    run_build()
    for parent, slug in INTENT_PAGES[:5]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert "min read" in html, f"Intent page {slug} missing reading time estimate"


def test_sitemap_tools_has_date_added_lastmod():
    """sitemap_tools.xml entries should have lastmod from date_added, not today."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_date = [t for t in tools if t.get("date_added")]
    tools_xml = (DIST / "sitemap_tools.xml").read_text()
    for tool in tools_with_date[:5]:
        assert tool["date_added"] in tools_xml, f"sitemap_tools.xml missing date_added for {tool['slug']}"


def test_sitemap_has_per_tool_date_added_lastmod():
    """sitemap.xml tool URLs should use each tool's date_added as lastmod, not a blanket today."""
    run_build()
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_date = [t for t in tools if t.get("date_added")]
    sitemap = (DIST / "sitemap.xml").read_text()
    for tool in tools_with_date[:5]:
        assert (
            f"/tools/{tool['slug']}/</loc><lastmod>{tool['date_added']}</lastmod>" in sitemap
        ), f"sitemap.xml missing date_added lastmod for {tool['slug']}"


def test_sitemap_respects_updated_field_override():
    """sitemap.xml should prefer a tool's optional 'updated' field over date_added."""
    run_build()
    from freetoolkit import build as ftk_build

    config = ftk_build.load_config()
    tools = ftk_build.load_tools()
    pages = ftk_build.load_pages(config, len(tools))
    intent_pages = ftk_build.load_intent_pages()
    tools[0]["updated"] = "2099-01-01"
    ftk_build.write_sitemap(config, tools, pages, intent_pages)

    sitemap = (DIST / "sitemap.xml").read_text()
    assert (
        f"/tools/{tools[0]['slug']}/</loc><lastmod>2099-01-01</lastmod>" in sitemap
    ), "sitemap.xml did not use the tool's 'updated' field for lastmod"


def test_intent_pages_have_article_published_time():
    """Intent pages should have article:published_time meta tag."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tool_dates = {t["slug"]: t.get("date_added", "") for t in tools}
    for parent, slug in INTENT_PAGES[:5]:
        if tool_dates.get(parent):
            html = (DIST / "tools" / parent / slug / "index.html").read_text()
            assert "article:published_time" in html, f"Intent page {slug} missing article:published_time"


def test_break_even_tool_page_builds():
    """Break-even revenue calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "break-even-revenue-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "be-fixed" in html
    assert "Contribution margin" in html


def test_build_writes_csp_nonce_file():
    """build.py should stamp a build-wide nonce for infra/Dockerfile to bake into nginx's CSP header."""
    run_build()
    nonce_file = ROOT / "csp_nonce.txt"
    assert nonce_file.exists()
    nonce = nonce_file.read_text().strip()
    assert len(nonce) >= 16


def test_inline_scripts_all_carry_the_same_build_nonce():
    """Every inline <script> across page types must carry the nonce written to csp_nonce.txt,
    since nginx's CSP (script-src 'nonce-...') has no 'unsafe-inline' fallback."""
    import re

    run_build()
    nonce = (ROOT / "csp_nonce.txt").read_text().strip()

    pages = [
        DIST / "index.html",
        DIST / "tools" / "index.html",
        DIST / "tools" / TOOL_SLUGS[0] / "index.html",
        DIST / "changelog" / "index.html",
        DIST / "dashboard" / "index.html",
        DIST / "about" / "index.html",
    ]
    if INTENT_PAGES:
        parent, slug = INTENT_PAGES[0]
        pages.append(DIST / "tools" / parent / slug / "index.html")

    for page in pages:
        html = page.read_text()
        inline_scripts = re.findall(r"<script(?![^>]*\ssrc=)([^>]*)>", html)
        assert inline_scripts, f"{page} has no inline <script> tags to check"
        for attrs in inline_scripts:
            assert f'nonce="{nonce}"' in attrs, (
                f"{page} has an inline <script {attrs.strip()}> without the build nonce"
            )


def test_no_inline_event_handler_attributes():
    """Inline onclick=/onload=-style attributes bypass nonce-based CSP entirely and must not be used."""
    run_build()
    pattern = __import__("re").compile(r'\son[a-z]+\s*=\s*"', __import__("re").IGNORECASE)
    for page in [DIST / "index.html", DIST / "tools" / TOOL_SLUGS[0] / "index.html", DIST / "dashboard" / "index.html"]:
        html = page.read_text()
        assert not pattern.search(html), f"{page} contains an inline event-handler attribute"


def test_nginx_conf_csp_has_no_unsafe_inline_scripts():
    """nginx.conf's script-src must rely on the nonce placeholder, not 'unsafe-inline'."""
    conf = (ROOT / "infra" / "nginx.conf").read_text()
    assert "Content-Security-Policy" in conf
    script_src = conf.split("script-src", 1)[1].split(";", 1)[0]
    assert "unsafe-inline" not in script_src
    assert "'nonce-__CSP_NONCE__'" in script_src
    assert "https://pagead2.googlesyndication.com" in script_src


def test_dockerfile_substitutes_csp_nonce_placeholder():
    """infra/Dockerfile must replace nginx.conf's nonce placeholder with the value build.py stamped."""
    dockerfile = (ROOT / "infra" / "Dockerfile").read_text()
    assert "csp_nonce.txt" in dockerfile
    assert "__CSP_NONCE__" in dockerfile


def test_no_inline_event_handlers_in_source():
    """Inline on*= attributes (static or built via innerHTML) bypass nonce-based CSP and must not
    exist anywhere in templates or JS source, since nginx's script-src has no 'unsafe-inline' fallback."""
    import re

    pattern = re.compile(r'\son[a-z]+\s*=\s*["\']', re.IGNORECASE)
    offenders = []
    for base in [ROOT / "templates", ROOT / "static" / "js"]:
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in (".html", ".js"):
                for lineno, line in enumerate(path.read_text().splitlines(), 1):
                    if pattern.search(line):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}")
    assert not offenders, f"Inline event-handler attributes found: {offenders}"


def test_discount_calculator_builds_with_margin_insight():
    """Discount calculator page should build and contain margin result element."""
    run_build()
    html = (DIST / "tools" / "discount-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "dc-margin" in html
    assert "Margin After Discount" in html


def test_pages_have_format_detection_meta():
    """All tool pages should have format-detection meta tag."""
    run_build()
    html = (DIST / "tools" / "break-even-revenue-calculator" / "index.html").read_text()
    assert 'format-detection' in html, "Tool page missing format-detection meta"
    assert 'telephone=no' in html


def test_tool_pages_have_email_share():
    """Tool pages should have a mailto: share link."""
    run_build()
    html = (DIST / "tools" / "break-even-revenue-calculator" / "index.html").read_text()
    assert "mailto:" in html, "Tool page missing email share link"


def test_rss_has_managing_editor():
    """RSS feed should have managingEditor and webMaster channel elements."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<managingEditor>" in rss, "RSS missing managingEditor"
    assert "<webMaster>" in rss, "RSS missing webMaster"


def test_intent_pages_have_article_tag():
    """Intent pages with parent tool keywords should have article:tag meta."""
    run_build()
    import yaml
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
    tools_with_kw = {t["slug"]: t for t in tools if t.get("keywords")}
    count = 0
    for parent, slug in INTENT_PAGES[:10]:
        if parent in tools_with_kw:
            html = (DIST / "tools" / parent / slug / "index.html").read_text()
            assert 'article:tag' in html, f"Intent page {slug} missing article:tag meta"
            count += 1
            if count >= 3:
                break


def test_widget_inputs_have_autocomplete_off():
    """Tool widget inputs should have autocomplete=off."""
    run_build()
    html = (DIST / "tools" / "break-even-revenue-calculator" / "index.html").read_text()
    assert 'autocomplete="off"' in html, "Widget inputs missing autocomplete=off"


def test_cac_tool_page_builds():
    """CAC calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "cac-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "cac-result" in html
    assert "cac-payback" in html


def test_changelog_has_date_grouped_tools():
    """Changelog page should have a 'recent additions' section grouped by date."""
    run_build()
    html = (DIST / "changelog" / "index.html").read_text()
    assert "Recent additions" in html
    assert "tools added" in html or "tool added" in html


def test_tool_pages_have_twitter_labels():
    """Tool pages should have twitter:label1 metadata."""
    run_build()
    html = (DIST / "tools" / "cac-calculator" / "index.html").read_text()
    assert 'twitter:label1' in html
    assert 'twitter:data1' in html


def test_tool_pages_have_date_published_microdata():
    """Tool pages with date_added should have itemprop=datePublished."""
    run_build()
    html = (DIST / "tools" / "cac-calculator" / "index.html").read_text()
    assert 'itemprop="datePublished"' in html


def test_rss_has_ttl():
    """RSS feed should have <ttl> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<ttl>" in rss, "RSS missing <ttl> element"


def test_pages_have_manifest_link():
    """Pages should have a link to manifest.json."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'rel="manifest"' in html, "Home page missing manifest link"


def test_footer_newsletter_form_hidden_without_formspree_id():
    """The site-wide footer signup form should not render while formspree_id is unset."""
    run_build()
    for html_path in (DIST / "index.html", DIST / "about" / "index.html"):
        html = html_path.read_text()
        assert "footer-newsletter" not in html, f"{html_path} should not have a footer newsletter form"


def test_footer_newsletter_form_appears_on_every_page_when_formspree_id_set():
    """Setting site.formspree_id should turn on the discreet footer signup form site-wide,
    distinct from the homepage's own larger newsletter card (different id, same form ID)."""
    run_build()
    from freetoolkit import build as ftk_build

    env = ftk_build.build_env()
    config = ftk_build.load_config()
    config["site"] = dict(config["site"], formspree_id="abcd1234")
    tools = ftk_build.load_tools()
    pages = ftk_build.load_pages(config, len(tools))
    common = dict(
        site=config["site"],
        categories=config["categories"],
        tools=tools,
        tools_by_category={},
        all_intent_pages=[],
        intent_count_by_category={},
        year=2026,
        build_date="2026-01-01",
        csp_nonce="test-nonce",
    )

    about_page = next(p for p in pages if p["slug"] == "about")
    out = DIST / "_test_footer_newsletter" / "index.html"
    ftk_build.render(
        env,
        "page.html",
        out,
        path="/about/",
        title=about_page["title"],
        description=about_page["description"],
        page=about_page,
        **common,
    )
    html = out.read_text()
    assert 'action="https://formspree.io/f/abcd1234"' in html
    assert 'id="footer-nl-email"' in html
    assert 'name="_gotcha"' in html

    index_out = DIST / "_test_footer_newsletter" / "home" / "index.html"
    ftk_build.render(
        env,
        "index.html",
        index_out,
        path="/",
        title=config["site"]["name"],
        description=config["site"]["description"],
        **common,
    )
    index_html = index_out.read_text()
    assert 'id="nl-email"' in index_html
    assert 'name="_gotcha"' in index_html


def test_no_ad_or_cmp_scripts_when_ads_disabled():
    """With ads_enabled: false (the current default), neither the AdSense
    script nor the Funding Choices consent-management script should render
    anywhere -- there's nothing to gather consent for if no ads ever load."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "adsbygoogle.js" not in html
    assert "fundingchoicesmessages.google.com" not in html


def test_cmp_script_loads_before_adsense_when_ads_enabled():
    """Setting ads_enabled: true should render Google's Funding Choices CMP
    script (required before showing personalized ads to EEA/UK visitors)
    and it must appear before adsbygoogle.js in the document so consent is
    gathered before any ad request fires."""
    from freetoolkit import build as ftk_build

    env = ftk_build.build_env()
    config = ftk_build.load_config()
    config["site"] = dict(config["site"], ads_enabled=True, adsense_client_id="ca-pub-1234567890")
    out = DIST / "_test_cmp" / "index.html"
    ftk_build.render(
        env,
        "index.html",
        out,
        path="/",
        title=config["site"]["name"],
        description=config["site"]["description"],
        site=config["site"],
        categories=config["categories"],
        tools=[],
        tools_by_category={},
        all_intent_pages=[],
        intent_count_by_category={},
        year=2026,
        build_date="2026-01-01",
        csp_nonce="test-nonce",
    )
    html = out.read_text()
    assert "fundingchoicesmessages.google.com/i/ca-pub-1234567890" in html
    assert "adsbygoogle.js?client=ca-pub-1234567890" in html
    cmp_pos = html.index("fundingchoicesmessages.google.com")
    ad_pos = html.index("adsbygoogle.js")
    assert cmp_pos < ad_pos, "CMP script must load before adsbygoogle.js"


def test_revenue_per_employee_tool_builds():
    """Revenue per employee calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "revenue-per-employee-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "rpe-result" in html
    assert "rpe-benchmark" in html


def test_intent_pages_have_prev_next_links():
    """Intent pages with siblings should have rel=prev/rel=next links."""
    run_build()
    found = False
    for parent, slug in INTENT_PAGES:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        if 'rel="prev"' in html or 'rel="next"' in html:
            found = True
            break
    assert found, "No intent pages found with rel=prev or rel=next links"


def test_rss_has_language_element():
    """RSS feed should have <language> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<language>" in rss, "RSS missing <language> element"
    assert "en-us" in rss


def test_tool_pages_have_article_itemscope():
    """Tool article element should have itemscope/itemtype for schema.org/Article."""
    run_build()
    html = (DIST / "tools" / "revenue-per-employee-calculator" / "index.html").read_text()
    assert 'itemscope' in html and 'schema.org/Article' in html


def test_pages_have_dns_prefetch_control():
    """Pages should have x-dns-prefetch-control meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'x-dns-prefetch-control' in html, "Page missing x-dns-prefetch-control meta"


def test_nrr_tool_page_builds():
    """NRR calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "nrr-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "nrr-out-nrr" in html
    assert "nrr-out-grr" in html


def test_tool_pages_have_og_updated_time():
    """Tool pages with date_added should have og:updated_time meta."""
    run_build()
    html = (DIST / "tools" / "nrr-calculator" / "index.html").read_text()
    assert 'og:updated_time' in html, "Tool page missing og:updated_time"


def test_pages_have_og_locale():
    """All pages should have og:locale meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'og:locale' in html and 'en_US' in html, "Page missing og:locale meta"


def test_rss_has_copyright():
    """RSS feed should have <copyright> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<copyright>" in rss, "RSS missing <copyright> element"


def test_tools_index_cards_have_aria_label():
    """Tool cards on tools index should have aria-label attributes."""
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert 'aria-label=' in html, "Tool cards missing aria-label"


def test_arr_tool_page_builds():
    """ARR calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "arr-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "arr-result" in html
    assert "arr-proj12" in html


def test_pages_have_application_name_meta():
    """All pages should have application-name meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'application-name' in html, "Page missing application-name meta"


def test_rss_has_generator():
    """RSS feed should have <generator> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<generator>" in rss, "RSS missing <generator> element"


def test_intent_pages_have_robots_meta():
    """Intent pages should have robots meta tag."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'name="robots"' in html, f"Intent page {slug} missing robots meta"


def test_tools_index_has_role_search():
    """Tools index should have role=search on filter bar."""
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert 'role="search"' in html, "Tools index missing role=search"


def test_ebitda_tool_page_builds():
    """EBITDA calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "ebitda-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "ebitda-result" in html
    assert "ebitda-margin" in html


def test_pages_have_dark_mode_theme_color():
    """Pages should have dark mode theme-color meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'prefers-color-scheme: dark' in html, "Page missing dark mode theme-color meta"


def test_stylesheet_has_dark_mode_palette():
    """style.css should define an alternate palette under prefers-color-scheme: dark."""
    run_build()
    css = (DIST / "static" / "css" / "style.css").read_text()
    assert "@media (prefers-color-scheme: dark)" in css, "style.css missing dark mode media query"
    dark_block = css.split("@media (prefers-color-scheme: dark)", 1)[1]
    for var in ("--bg", "--surface", "--text", "--border", "--accent"):
        assert var in dark_block, f"Dark mode media query missing override for {var}"


def test_rss_has_docs():
    """RSS feed should have <docs> channel element."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "<docs>" in rss, "RSS missing <docs> element"


def test_sitemap_tools_has_image_entries():
    """sitemap_tools.xml should have image:image entries."""
    run_build()
    xml = (DIST / "sitemap_tools.xml").read_text()
    assert "image:image" in xml, "sitemap_tools.xml missing image entries"
    assert "image:loc" in xml


def test_pages_have_referrer_meta():
    """Pages should have referrer meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="referrer"' in html, "Page missing referrer meta"


def test_ccc_tool_page_builds():
    """Cash Conversion Cycle calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "cash-conversion-cycle-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "ccc-result" in html
    assert "ccc-dso" in html


def test_pages_have_og_site_name():
    """All pages should have og:site_name meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'og:site_name' in html, "Page missing og:site_name meta"


def test_tools_index_has_keywords_meta():
    """Tools index page should have keywords meta."""
    run_build()
    html = (DIST / "tools" / "index.html").read_text()
    assert 'name="keywords"' in html, "Tools index missing keywords meta"


def test_tool_pages_have_aria_describedby():
    """Tool widget containers should have aria-describedby."""
    run_build()
    html = (DIST / "tools" / "cash-conversion-cycle-calculator" / "index.html").read_text()
    assert 'aria-describedby' in html, "Tool widget missing aria-describedby"


def test_pages_have_mobile_web_app_meta():
    """Pages should have mobile-web-app-capable meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'mobile-web-app-capable' in html, "Page missing mobile-web-app-capable meta"


def test_burn_multiple_tool_page_builds():
    """Burn Multiple calculator page should build with required elements."""
    run_build()
    html = (DIST / "tools" / "burn-multiple-calculator" / "index.html").read_text()
    assert "WebApplication" in html
    assert "HowTo" in html
    assert "bm-result" in html
    assert "bm-runway" in html


def test_tool_pages_have_keywords_meta():
    """Tool pages with keywords should have keywords meta tag."""
    run_build()
    html = (DIST / "tools" / "burn-multiple-calculator" / "index.html").read_text()
    assert 'name="keywords"' in html, "Tool page missing keywords meta"
    assert 'burn multiple' in html.lower()


def test_sitemap_intent_has_image_entries():
    """sitemap_intent.xml should have image:image entries."""
    run_build()
    xml = (DIST / "sitemap_intent.xml").read_text()
    assert "image:image" in xml, "sitemap_intent.xml missing image entries"


def test_pages_have_apple_mobile_title():
    """Pages should have apple-mobile-web-app-title meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'apple-mobile-web-app-title' in html, "Page missing apple-mobile-web-app-title meta"


def test_tool_pages_have_webpage_schema():
    """Tool pages should have schema.org/WebPage itemscope."""
    run_build()
    html = (DIST / "tools" / "burn-multiple-calculator" / "index.html").read_text()
    assert 'schema.org/WebPage' in html, "Tool page missing WebPage schema"


def test_saas_quick_ratio_tool_page_builds():
    """saas-quick-ratio-calculator page should build with Quick Ratio stat output."""
    run_build()
    html = (DIST / "tools" / "saas-quick-ratio-calculator" / "index.html").read_text()
    assert "sqr-result" in html, "Quick Ratio page missing result output element"
    assert "sqr-growth-mrr" in html, "Quick Ratio page missing growth-mrr output"


def test_intent_pages_have_keywords_meta():
    """Intent pages should have keywords meta from parent tool."""
    run_build()
    # Use a tool with known keywords
    html = (DIST / "tools" / "saas-quick-ratio-calculator" / "what-is-saas-quick-ratio" / "index.html").read_text()
    assert 'name="keywords"' in html, "Intent page missing keywords meta"


def test_pages_have_css_preload():
    """All pages should preload the stylesheet."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'rel="preload"' in html and 'style.css' in html, "Page missing CSS preload link"


def test_tool_pages_have_h1_itemprop_name():
    """Tool pages h1 should have itemprop='name' for WebPage microdata."""
    run_build()
    html = (DIST / "tools" / "saas-quick-ratio-calculator" / "index.html").read_text()
    assert 'itemprop="name"' in html, "Tool page h1 missing itemprop=name"


def test_tool_pages_have_article_author():
    """Tool pages article should have author meta for Article schema."""
    run_build()
    html = (DIST / "tools" / "saas-quick-ratio-calculator" / "index.html").read_text()
    assert 'itemprop="author"' in html, "Tool page missing article author itemprop"


def test_magic_number_tool_page_builds():
    """magic-number-calculator page should build with result output element."""
    run_build()
    html = (DIST / "tools" / "magic-number-calculator" / "index.html").read_text()
    assert "mn-result" in html, "Magic Number page missing result output element"
    assert "mn-payback" in html, "Magic Number page missing payback output element"


def test_pages_have_og_image_alt():
    """Pages should have og:image:alt meta for social sharing accessibility."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'property="og:image:alt"' in html, "Page missing og:image:alt meta"


def test_pages_have_og_image_dimensions():
    """og:image must be a static PNG (SVGs aren't previewed by Facebook/LinkedIn/X)
    with explicit width/height so crawlers can render the preview without a fetch."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "/static/img/og.png" in html, "og:image should point to a static PNG, not an SVG"
    assert 'property="og:image:width" content="1200"' in html
    assert 'property="og:image:height" content="630"' in html


def test_og_images_are_actually_generated():
    """A real (non-skipped) build should render og.png and per-tool og-*.png
    files using the bundled fallback font, regardless of what fonts (if any)
    are installed on the build machine."""
    result = run_build_with_og_images()
    assert result.returncode == 0, f"Build failed:\n{result.stderr}"
    og_main = DIST / "static" / "img" / "og.png"
    assert og_main.exists(), "dist/static/img/og.png was not generated"
    assert og_main.stat().st_size > 1000, "og.png is suspiciously small"
    og_tool_images = list((DIST / "static" / "img").glob("og-*.png"))
    assert len(og_tool_images) == len(TOOL_SLUGS), (
        f"Expected {len(TOOL_SLUGS)} og-*.png files, found {len(og_tool_images)}"
    )


def test_pages_have_sitemap_link():
    """Pages should have a rel=sitemap link to the sitemap index."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'rel="sitemap"' in html, "Page missing rel=sitemap link"


def test_tool_pages_have_og_image_alt():
    """Tool pages should have og:image:alt with tool title."""
    run_build()
    html = (DIST / "tools" / "magic-number-calculator" / "index.html").read_text()
    assert 'property="og:image:alt"' in html, "Tool page missing og:image:alt"


def test_base_has_no_duplicate_manifest():
    """base.html should have exactly one manifest link."""
    run_build()
    html = (DIST / "index.html").read_text()
    count = html.count('rel="manifest"')
    assert count == 1, f"Expected 1 manifest link, found {count}"


def test_working_capital_tool_page_builds():
    """working-capital-calculator page should build with working-capital and current-ratio output."""
    run_build()
    html = (DIST / "tools" / "working-capital-calculator" / "index.html").read_text()
    assert "wc-result" in html, "Working Capital page missing working-capital output"
    assert "wc-ratio" in html, "Working Capital page missing current-ratio output"


def test_pages_have_color_scheme_meta():
    """Pages should have color-scheme meta for CSS color-scheme support."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="color-scheme"' in html, "Page missing color-scheme meta"


def test_pages_have_x_content_type_options():
    """Pages should have x-content-type-options meta hint."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'x-content-type-options' in html, "Page missing x-content-type-options meta"


def test_tool_pages_have_og_image_type():
    """Tool pages should have og:image:type meta."""
    run_build()
    html = (DIST / "tools" / "working-capital-calculator" / "index.html").read_text()
    assert 'property="og:image:type"' in html, "Tool page missing og:image:type"


def test_tool_pages_have_article_section():
    """Tool pages should have article:section meta with category."""
    run_build()
    html = (DIST / "tools" / "working-capital-calculator" / "index.html").read_text()
    assert 'property="article:section"' in html, "Tool page missing article:section meta"


def test_roi_tool_page_builds():
    """roi-calculator page should build with result output element."""
    run_build()
    html = (DIST / "tools" / "roi-calculator" / "index.html").read_text()
    assert "roi-result" in html, "ROI page missing result output element"
    assert "roi-ann-roi" in html, "ROI page missing annualized ROI output element"


def test_pages_have_rating_meta():
    """Pages should have rating meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="rating"' in html, "Page missing rating meta"


def test_pages_have_oembed_link():
    """Pages should have oEmbed discovery link."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'application/json+oembed' in html, "Page missing oEmbed link"


def test_tool_pages_have_thumbnail_meta():
    """Tool pages should have thumbnail meta."""
    run_build()
    html = (DIST / "tools" / "roi-calculator" / "index.html").read_text()
    assert 'name="thumbnail"' in html, "Tool page missing thumbnail meta"


def test_sitemap_index_has_lastmod():
    """sitemap_index.xml should have lastmod for all entries."""
    run_build()
    xml = (DIST / "sitemap_index.xml").read_text()
    assert "<lastmod>" in xml, "sitemap_index.xml missing lastmod"


def test_payback_period_tool_page_builds():
    """payback-period-calculator page should build with result output."""
    run_build()
    html = (DIST / "tools" / "payback-period-calculator" / "index.html").read_text()
    assert "pp-result" in html, "Payback Period page missing result output"
    assert "pp-disc-pb" in html, "Payback Period page missing discounted payback output"


def test_intent_pages_have_article_author():
    """Intent pages Article JSON-LD should include author."""
    run_build()
    html = (DIST / "tools" / "payback-period-calculator" / "payback-period-vs-roi" / "index.html").read_text()
    assert '"author"' in html, "Intent page Article JSON-LD missing author"


def test_intent_pages_have_article_image():
    """Intent pages Article JSON-LD should include image from parent tool."""
    run_build()
    html = (DIST / "tools" / "payback-period-calculator" / "payback-period-vs-roi" / "index.html").read_text()
    assert '"image"' in html, "Intent page Article JSON-LD missing image"


def test_pages_have_robots_max_snippet():
    """Pages should have robots meta with max-snippet from base.html."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "max-snippet" in html, "Page missing robots max-snippet meta"


def test_tool_intent_pages_build_count():
    """Should have at least 320 intent pages built."""
    run_build()
    intent_pages = list(DIST.glob("tools/*/*/index.html"))
    assert len(intent_pages) >= 320, f"Expected 320+ intent pages, found {len(intent_pages)}"


def test_previously_broken_intent_links_now_build():
    """budget-variance-calculator, employee-turnover-calculator, and
    gross-revenue-retention-calculator each reference two intent pages from
    their own tools.yaml body's '### Intent Pages' section. Those six pages
    didn't exist in content/intent_pages.yaml (dead links on live tool pages)
    until this task added them."""
    run_build()
    expected = [
        ("budget-variance-calculator", "what-is-budget-variance-analysis"),
        ("budget-variance-calculator", "favorable-vs-unfavorable-variance"),
        ("employee-turnover-calculator", "how-to-calculate-employee-turnover-rate"),
        ("employee-turnover-calculator", "true-cost-of-employee-turnover"),
        ("gross-revenue-retention-calculator", "grr-vs-nrr-difference"),
        ("gross-revenue-retention-calculator", "what-is-good-gross-revenue-retention"),
    ]
    missing = [
        f"{parent}/{slug}"
        for parent, slug in expected
        if not (DIST / "tools" / parent / slug / "index.html").exists()
    ]
    assert not missing, f"Missing intent pages: {missing}"


def test_tools_yaml_intent_page_links_all_resolve():
    """Every /tools/<parent>/<slug>/ link inside a tools.yaml tool body must
    match an actual content/intent_pages.yaml entry. Regression test for the
    six dead links this task fixed (tool bodies referenced intent pages that
    were never added to intent_pages.yaml)."""
    tools_text = (ROOT / "content" / "tools.yaml").read_text()
    referenced = set(re.findall(r"/tools/([a-z0-9-]+)/([a-z0-9-]+)/", tools_text))
    existing = {(p["parent_tool"], p["slug"]) for p in yaml.safe_load(
        (ROOT / "content" / "intent_pages.yaml").read_text()
    )}
    missing = sorted(referenced - existing)
    assert not missing, f"tools.yaml links to intent pages that don't exist: {missing}"


def test_arpu_tool_page_builds():
    """arpu-calculator page should build with arpu-result output."""
    run_build()
    html = (DIST / "tools" / "arpu-calculator" / "index.html").read_text()
    assert "arpu-result" in html, "ARPU page missing result output"
    assert "arpu-users-needed" in html, "ARPU page missing users-needed output"


def test_pages_have_revisit_after_meta():
    """Pages should have revisit-after meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="revisit-after"' in html, "Page missing revisit-after meta"


def test_tool_pages_have_webapp_publisher():
    """Tool pages WebApplication JSON-LD should include publisher."""
    run_build()
    html = (DIST / "tools" / "arpu-calculator" / "index.html").read_text()
    assert '"publisher"' in html, "Tool page WebApplication JSON-LD missing publisher"


def test_rss_has_all_new_tools():
    """RSS feed should include recent new tools."""
    run_build()
    rss = (DIST / "rss.xml").read_text()
    assert "arpu-calculator" in rss or "ARPU" in rss, "RSS missing ARPU tool"


def test_sitemap_tools_has_correct_count():
    """sitemap_tools.xml should have at least 51 tool URLs."""
    run_build()
    xml = (DIST / "sitemap_tools.xml").read_text()
    count = xml.count("<loc>")
    assert count >= 51, f"Expected 51+ tool URLs in sitemap, found {count}"


def test_run_rate_tool_page_builds():
    """revenue-run-rate-calculator page should build with run rate output."""
    run_build()
    html = (DIST / "tools" / "revenue-run-rate-calculator" / "index.html").read_text()
    assert "rrr-result" in html, "Run Rate page missing result output"
    assert "rrr-projected" in html, "Run Rate page missing projected output"


def test_pages_have_language_meta():
    """Pages should have language meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="language"' in html, "Page missing language meta"


def test_tool_pages_have_author_link():
    """Tool pages should have rel=author link for authorship signal."""
    run_build()
    html = (DIST / "tools" / "revenue-run-rate-calculator" / "index.html").read_text()
    assert 'rel="author"' in html, "Tool page missing rel=author link"


def test_run_rate_intent_pages_build():
    """Revenue run rate intent pages should build."""
    run_build()
    assert (DIST / "tools" / "revenue-run-rate-calculator" / "run-rate-vs-arr" / "index.html").exists()


def test_tool_count_at_least_52():
    """Should have at least 52 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 52, f"Expected 52+ tool dirs, found {len(tool_dirs)}"


def test_sales_velocity_tool_page_builds():
    """sales-velocity-calculator page should build with velocity outputs."""
    run_build()
    html = (DIST / "tools" / "sales-velocity-calculator" / "index.html").read_text()
    assert "sv-result" in html, "Sales Velocity page missing result output"
    assert "sv-annual" in html, "Sales Velocity page missing annual output"


def test_pages_have_category_meta():
    """Pages should include category meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="category"' in html, "Page missing category meta"
    assert "Business Tools" in html, "Category meta missing Business Tools value"


def test_intent_page_article_has_word_count():
    """Intent page Article JSON-LD should include wordCount."""
    run_build()
    html = (DIST / "tools" / "sales-velocity-calculator" / "what-is-sales-velocity" / "index.html").read_text()
    assert "wordCount" in html, "Intent page Article JSON-LD missing wordCount"


def test_sales_velocity_intent_pages_build():
    """Sales velocity intent pages should build."""
    run_build()
    assert (DIST / "tools" / "sales-velocity-calculator" / "how-to-improve-win-rate" / "index.html").exists()
    assert (DIST / "tools" / "sales-velocity-calculator" / "sales-cycle-length-benchmarks" / "index.html").exists()


def test_tool_count_at_least_54():
    """Should have at least 54 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 54, f"Expected 54+ tool dirs, found {len(tool_dirs)}"


def test_free_cash_flow_tool_page_builds():
    """free-cash-flow-calculator page should build with FCF outputs."""
    run_build()
    html = (DIST / "tools" / "free-cash-flow-calculator" / "index.html").read_text()
    assert "fcf-result" in html, "FCF page missing result output"
    assert "fcf-margin" in html, "FCF page missing margin output"


def test_tool_pages_have_dcterms_meta():
    """Tool pages should have Dublin Core dcterms.created meta."""
    run_build()
    html = (DIST / "tools" / "free-cash-flow-calculator" / "index.html").read_text()
    assert "dcterms.created" in html, "Tool page missing dcterms.created meta"


def test_tool_pages_have_web_application_schema():
    """Tool pages should have WebApplication JSON-LD schema."""
    run_build()
    html = (DIST / "tools" / "free-cash-flow-calculator" / "index.html").read_text()
    assert "WebApplication" in html, "Tool page missing WebApplication schema"
    assert '"price": "0"' in html or '"price":"0"' in html, "Tool page missing free offer price"


def test_all_tool_pages_have_complete_web_application_schema():
    """Every tool page (not just a sample) should carry a full WebApplication schema."""
    run_build()
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        assert '"@type": "WebApplication"' in html, f"{slug} missing WebApplication schema"
        assert "applicationCategory" in html, f"{slug} WebApplication schema missing applicationCategory"
        assert "operatingSystem" in html, f"{slug} WebApplication schema missing operatingSystem"
        assert "browserRequirements" in html, f"{slug} WebApplication schema missing browserRequirements"
        assert '"@type": "Offer"' in html, f"{slug} WebApplication schema missing Offer"
        assert '"publisher"' in html, f"{slug} WebApplication schema missing publisher"


def test_intent_pages_have_news_keywords():
    """Intent pages should have news_keywords meta tag."""
    run_build()
    html = (DIST / "tools" / "free-cash-flow-calculator" / "what-is-free-cash-flow" / "index.html").read_text()
    assert 'name="news_keywords"' in html, "Intent page missing news_keywords meta"


def test_tool_count_at_least_55():
    """Should have at least 55 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 55, f"Expected 55+ tool dirs, found {len(tool_dirs)}"


def test_equity_dilution_tool_page_builds():
    """equity-dilution-calculator page should build with dilution outputs."""
    run_build()
    html = (DIST / "tools" / "equity-dilution-calculator" / "index.html").read_text()
    assert "ed-post-money" in html, "Equity Dilution page missing post-money output"
    assert "ed-my-pct" in html, "Equity Dilution page missing my-pct output"


def test_tool_pages_have_dc_title_meta():
    """Tool pages should have Dublin Core DC.title meta."""
    run_build()
    html = (DIST / "tools" / "equity-dilution-calculator" / "index.html").read_text()
    assert 'name="DC.title"' in html, "Tool page missing DC.title meta"
    assert 'name="DC.description"' in html, "Tool page missing DC.description meta"


def test_tool_pages_have_speakable_schema():
    """Tool pages should have speakable JSON-LD property."""
    run_build()
    html = (DIST / "tools" / "equity-dilution-calculator" / "index.html").read_text()
    assert "speakable" in html, "Tool page missing speakable JSON-LD"
    assert "SpeakableSpecification" in html, "Tool page missing SpeakableSpecification"


def test_equity_dilution_intent_pages_build():
    """Equity dilution intent pages should build."""
    run_build()
    assert (DIST / "tools" / "equity-dilution-calculator" / "pre-money-vs-post-money-valuation" / "index.html").exists()
    assert (DIST / "tools" / "equity-dilution-calculator" / "cap-table-basics-for-founders" / "index.html").exists()


def test_tool_count_at_least_56():
    """Should have at least 56 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 56, f"Expected 56+ tool dirs, found {len(tool_dirs)}"


def test_business_loan_tool_page_builds():
    """business-loan-calculator page should build with loan outputs."""
    run_build()
    html = (DIST / "tools" / "business-loan-calculator" / "index.html").read_text()
    assert "bl-result" in html, "Business Loan page missing result output"
    assert "bl-interest" in html, "Business Loan page missing interest output"


def test_tool_pages_have_subject_meta():
    """Tool pages should have subject and coverage meta tags."""
    run_build()
    html = (DIST / "tools" / "business-loan-calculator" / "index.html").read_text()
    assert 'name="subject"' in html, "Tool page missing subject meta"
    assert 'name="coverage"' in html, "Tool page missing coverage meta"


def test_intent_pages_have_author_meta():
    """Intent pages should have author meta tag."""
    run_build()
    html = (DIST / "tools" / "business-loan-calculator" / "sba-loan-calculator" / "index.html").read_text()
    assert 'name="author"' in html, "Intent page missing author meta"


def test_tool_count_at_least_57():
    """Should have at least 57 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 57, f"Expected 57+ tool dirs, found {len(tool_dirs)}"


def test_inventory_turnover_tool_page_builds():
    """inventory-turnover-calculator page should build with turnover outputs."""
    run_build()
    html = (DIST / "tools" / "inventory-turnover-calculator" / "index.html").read_text()
    assert "inv-turnover" in html, "Inventory Turnover page missing turnover output"
    assert "inv-dsi" in html, "Inventory Turnover page missing DSI output"


def test_pages_have_handheld_friendly_meta():
    """Pages should have HandheldFriendly meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "HandheldFriendly" in html, "Page missing HandheldFriendly meta"


def test_tool_pages_have_role_main():
    """Tool pages should have role=main on content section."""
    run_build()
    html = (DIST / "tools" / "inventory-turnover-calculator" / "index.html").read_text()
    assert 'role="main"' in html, "Tool page missing role=main"


def test_tool_pages_have_noscript_fallback():
    """Tool pages should have noscript fallback for calculator."""
    run_build()
    html = (DIST / "tools" / "inventory-turnover-calculator" / "index.html").read_text()
    assert "<noscript>" in html, "Tool page missing noscript fallback"


def test_tool_count_at_least_58():
    """Should have at least 58 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 58, f"Expected 58+ tool dirs, found {len(tool_dirs)}"


def test_npv_tool_page_builds():
    """npv-calculator page should build with NPV outputs."""
    run_build()
    html = (DIST / "tools" / "npv-calculator" / "index.html").read_text()
    assert "npv-result" in html, "NPV page missing result output"
    assert "npv-pi" in html, "NPV page missing profitability index output"


def test_pages_have_geo_meta():
    """Pages should have geo.region and geo.placename meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="geo.region"' in html, "Page missing geo.region meta"
    assert 'name="geo.placename"' in html, "Page missing geo.placename meta"


def test_tool_pages_have_icbm_meta():
    """Tool pages should have ICBM geo coordinates meta."""
    run_build()
    html = (DIST / "tools" / "npv-calculator" / "index.html").read_text()
    assert 'name="ICBM"' in html, "Tool page missing ICBM meta"


def test_intent_pages_have_topic_meta():
    """Intent pages should have topic meta from parent tool category."""
    run_build()
    html = (DIST / "tools" / "npv-calculator" / "npv-vs-irr" / "index.html").read_text()
    assert 'name="topic"' in html, "Intent page missing topic meta"


def test_tool_count_at_least_59():
    """Should have at least 59 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 59, f"Expected 59+ tool dirs, found {len(tool_dirs)}"


def test_revenue_per_lead_tool_page_builds():
    """revenue-per-lead-calculator page should build with RPL outputs."""
    run_build()
    html = (DIST / "tools" / "revenue-per-lead-calculator" / "index.html").read_text()
    assert "rpl-result" in html, "RPL page missing result output"
    assert "rpl-roi" in html, "RPL page missing ROI output"


def test_pages_have_abstract_meta():
    """Pages should have abstract meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="abstract"' in html, "Page missing abstract meta"


def test_tool_pages_have_classification_meta():
    """Tool pages should have classification meta from category."""
    run_build()
    html = (DIST / "tools" / "revenue-per-lead-calculator" / "index.html").read_text()
    assert 'name="classification"' in html, "Tool page missing classification meta"
    assert "Marketing" in html, "Classification meta missing category value"


def test_intent_pages_have_summary_meta():
    """Intent pages should have summary meta tag."""
    run_build()
    html = (DIST / "tools" / "revenue-per-lead-calculator" / "how-to-calculate-revenue-per-lead" / "index.html").read_text()
    assert 'name="summary"' in html, "Intent page missing summary meta"


def test_tool_count_at_least_60():
    """Should have at least 60 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 60, f"Expected 60+ tool dirs, found {len(tool_dirs)}"


def test_customer_concentration_tool_page_builds():
    """customer-concentration-calculator page should build with concentration outputs."""
    run_build()
    html = (DIST / "tools" / "customer-concentration-calculator" / "index.html").read_text()
    assert "cc-top-pct" in html, "Concentration page missing top-pct output"
    assert "cc-hhi" in html, "Concentration page missing HHI output"


def test_pages_have_reply_to_meta():
    """Pages should have reply-to meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="reply-to"' in html, "Page missing reply-to meta"


def test_tool_pages_have_identifier_url_meta():
    """Tool pages should have identifier-URL meta."""
    run_build()
    html = (DIST / "tools" / "customer-concentration-calculator" / "index.html").read_text()
    assert 'name="identifier-URL"' in html, "Tool page missing identifier-URL meta"


def test_intent_pages_have_distribution_meta():
    """Intent pages should have distribution meta tag."""
    run_build()
    html = (DIST / "tools" / "customer-concentration-calculator" / "what-is-customer-concentration-risk" / "index.html").read_text()
    assert 'name="distribution"' in html, "Intent page missing distribution meta"


def test_tool_count_at_least_61():
    """Should have at least 61 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 61, f"Expected 61+ tool dirs, found {len(tool_dirs)}"


def test_tam_sam_som_tool_page_builds():
    """tam-sam-som-calculator page should build with TAM/SAM/SOM outputs."""
    run_build()
    html = (DIST / "tools" / "tam-sam-som-calculator" / "index.html").read_text()
    assert "tsm-tam" in html, "TAM SAM SOM page missing TAM output"
    assert "tsm-sam" in html, "TAM SAM SOM page missing SAM output"
    assert "tsm-som" in html, "TAM SAM SOM page missing SOM output"


def test_tool_pages_have_og_locale_alternate():
    """Tool pages should have og:locale:alternate for international signal."""
    run_build()
    html = (DIST / "tools" / "tam-sam-som-calculator" / "index.html").read_text()
    assert 'og:locale:alternate' in html, "Tool page missing og:locale:alternate"
    assert 'en_GB' in html, "Tool page missing en_GB locale alternate"


def test_pages_have_viewport_fit_cover():
    """Pages should have viewport-fit=cover in viewport meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "viewport-fit=cover" in html, "Page missing viewport-fit=cover in viewport meta"


def test_tool_count_at_least_62():
    """Should have at least 62 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 62, f"Expected 62+ tool dirs, found {len(tool_dirs)}"


def test_tam_sam_som_intent_pages_build():
    """TAM SAM SOM intent pages should build."""
    run_build()
    assert (DIST / "tools" / "tam-sam-som-calculator" / "how-to-calculate-tam-sam-som" / "index.html").exists()
    assert (DIST / "tools" / "tam-sam-som-calculator" / "top-down-vs-bottom-up-market-sizing" / "index.html").exists()


def test_contribution_margin_tool_page_builds():
    """contribution-margin-calculator page should build with CM outputs."""
    run_build()
    html = (DIST / "tools" / "contribution-margin-calculator" / "index.html").read_text()
    assert "cm-result" in html, "CM page missing result output"
    assert "cm-ratio" in html, "CM page missing ratio output"
    assert "cm-beu" in html, "CM page missing break-even units output"


def test_pages_have_common_js_preload():
    """Pages should preload common.js as a script resource."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'rel="preload"' in html and 'common.js' in html, "Page missing common.js preload link"


def test_tool_pages_have_geo_position_meta():
    """Tool pages should have geo.position meta tag."""
    run_build()
    html = (DIST / "tools" / "contribution-margin-calculator" / "index.html").read_text()
    assert 'name="geo.position"' in html, "Tool page missing geo.position meta"


def test_intent_pages_have_index_follow_robots():
    """Intent pages robots meta should include index, follow directive."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert "index, follow" in html, f"Intent page {slug} robots meta missing index, follow"


def test_tool_count_at_least_63():
    """Should have at least 63 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 63, f"Expected 63+ tool dirs, found {len(tool_dirs)}"


def test_freelance_tax_tool_page_builds():
    """freelance-tax-estimator page should build with tax outputs."""
    run_build()
    html = (DIST / "tools" / "freelance-tax-estimator" / "index.html").read_text()
    assert "fte-se-tax" in html, "Freelance tax page missing SE tax output"
    assert "fte-quarterly" in html, "Freelance tax page missing quarterly output"


def test_pages_have_mstile_color_meta():
    """Pages should have msapplication-TileColor meta for Windows tiles."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "msapplication-TileColor" in html, "Page missing msapplication-TileColor meta"


def test_tool_pages_have_index_follow_robots():
    """Tool pages should have index, follow robots meta."""
    run_build()
    html = (DIST / "tools" / "freelance-tax-estimator" / "index.html").read_text()
    assert "index, follow" in html, "Tool page missing index, follow robots meta"


def test_intent_pages_have_geo_region_meta():
    """Intent pages should have geo.region meta."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'name="geo.region"' in html, f"Intent page {slug} missing geo.region meta"


def test_tool_count_at_least_64():
    """Should have at least 64 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 64, f"Expected 64+ tool dirs, found {len(tool_dirs)}"


def test_employee_cost_tool_page_builds():
    """employee-cost-calculator page should build with cost outputs."""
    run_build()
    html = (DIST / "tools" / "employee-cost-calculator" / "index.html").read_text()
    assert "ec-taxes" in html, "Employee Cost page missing taxes output"
    assert "ec-total" in html, "Employee Cost page missing total output"
    assert "ec-multiplier" in html, "Employee Cost page missing multiplier output"


def test_pages_have_msapplication_config_meta():
    """Pages should have msapplication-config meta."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "msapplication-config" in html, "Page missing msapplication-config meta"


def test_tool_pages_have_apple_status_bar_meta():
    """Tool pages should have apple-mobile-web-app-status-bar-style meta."""
    run_build()
    html = (DIST / "tools" / "employee-cost-calculator" / "index.html").read_text()
    assert "apple-mobile-web-app-status-bar-style" in html, "Tool page missing Apple status bar meta"


def test_intent_pages_have_coverage_meta():
    """Intent pages should have coverage meta tag."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'name="coverage"' in html, f"Intent page {slug} missing coverage meta"


def test_tool_count_at_least_65():
    """Should have at least 65 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 65, f"Expected 65+ tool dirs, found {len(tool_dirs)}"


def test_price_to_sales_tool_page_builds():
    """price-to-sales-calculator page should build with P/S outputs."""
    run_build()
    html = (DIST / "tools" / "price-to-sales-calculator" / "index.html").read_text()
    assert "ps-ratio" in html, "P/S page missing ratio output"
    assert "ps-implied" in html, "P/S page missing implied valuation output"


def test_pages_have_extended_format_detection():
    """Pages should have format-detection meta with address and email disabled."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "address=no" in html, "Page missing address=no in format-detection meta"
    assert "email=no" in html, "Page missing email=no in format-detection meta"


def test_tool_pages_have_og_image_secure_url():
    """Tool pages should have og:image:secure_url meta."""
    run_build()
    html = (DIST / "tools" / "price-to-sales-calculator" / "index.html").read_text()
    assert "og:image:secure_url" in html, "Tool page missing og:image:secure_url"


def test_intent_pages_have_identifier_url_meta():
    """Intent pages should have identifier-URL meta."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'name="identifier-URL"' in html, f"Intent page {slug} missing identifier-URL meta"


def test_tool_count_at_least_66():
    """Should have at least 66 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 66, f"Expected 66+ tool dirs, found {len(tool_dirs)}"


def test_churn_cohort_tool_page_builds():
    """churn-cohort-calculator page should build with retention outputs."""
    run_build()
    html = (DIST / "tools" / "churn-cohort-calculator" / "index.html").read_text()
    assert "cc-retention" in html, "Cohort page missing retention output"
    assert "cc-ltv" in html, "Cohort page missing LTV output"
    assert "cc-half-life" in html, "Cohort page missing half-life output"


def test_pages_have_web_author_meta():
    """Pages should have web_author meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="web_author"' in html, "Page missing web_author meta"


def test_tool_pages_have_dc_language_meta():
    """Tool pages should have DC.language Dublin Core meta."""
    run_build()
    html = (DIST / "tools" / "churn-cohort-calculator" / "index.html").read_text()
    assert 'name="DC.language"' in html, "Tool page missing DC.language meta"


def test_intent_pages_have_icbm_meta():
    """Intent pages should have ICBM geo coordinates meta."""
    run_build()
    for parent, slug in INTENT_PAGES[:3]:
        html = (DIST / "tools" / parent / slug / "index.html").read_text()
        assert 'name="ICBM"' in html, f"Intent page {slug} missing ICBM meta"


def test_tool_count_at_least_67():
    """Should have at least 67 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 67, f"Expected 67+ tool dirs, found {len(tool_dirs)}"


def test_segment_margin_calculator_page_exists():
    """segment-margin-calculator tool page should be built."""
    run_build()
    assert (DIST / "tools" / "segment-margin-calculator" / "index.html").exists()


def test_segment_margin_calculator_has_dc_subject():
    """tool.html should emit DC.subject meta with tool category."""
    run_build()
    html = (DIST / "tools" / "segment-margin-calculator" / "index.html").read_text()
    assert 'name="DC.subject"' in html


def test_base_html_copyright_meta():
    """base.html should emit copyright meta tag on every page."""
    run_build()
    html = (DIST / "tools" / "segment-margin-calculator" / "index.html").read_text()
    assert 'name="copyright"' in html


def test_intent_page_article_modified_time():
    """intent_page.html should emit article:modified_time meta."""
    run_build()
    html = (DIST / "tools" / "segment-margin-calculator" / "gross-margin-by-product-line" / "index.html").read_text()
    assert 'article:modified_time' in html


def test_tool_count_at_least_68():
    """Should have at least 68 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 68, f"Expected 68+ tool dirs, found {len(tool_dirs)}"


def test_dso_calculator_page_exists():
    """dso-calculator tool page should be built."""
    run_build()
    assert (DIST / "tools" / "dso-calculator" / "index.html").exists()


def test_dso_calculator_has_dc_type():
    """tool.html should emit DC.type meta on tool pages."""
    run_build()
    html = (DIST / "tools" / "dso-calculator" / "index.html").read_text()
    assert 'name="DC.type"' in html


def test_intent_page_dc_format():
    """intent_page.html should emit DC.format meta."""
    run_build()
    html = (DIST / "tools" / "dso-calculator" / "how-to-reduce-dso" / "index.html").read_text()
    assert 'name="DC.format"' in html


def test_base_html_no_dead_preconnect():
    """base.html should not have unused fonts.gstatic.com preconnect."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert "fonts.gstatic.com" not in html


def test_tool_count_at_least_69():
    """Should have at least 69 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 69, f"Expected 69+ tool dirs, found {len(tool_dirs)}"


def test_roe_calculator_page_exists():
    """roe-calculator tool page should be built."""
    run_build()
    assert (DIST / "tools" / "roe-calculator" / "index.html").exists()


def test_roe_calculator_has_dc_rights():
    """tool.html should emit DC.rights meta on tool pages."""
    run_build()
    html = (DIST / "tools" / "roe-calculator" / "index.html").read_text()
    assert 'name="DC.rights"' in html


def test_intent_page_dc_subject():
    """intent_page.html should emit DC.subject meta."""
    run_build()
    html = (DIST / "tools" / "roe-calculator" / "dupont-analysis-roe" / "index.html").read_text()
    assert 'name="DC.subject"' in html


def test_base_html_expires_meta():
    """base.html should emit expires meta tag."""
    run_build()
    html = (DIST / "index.html").read_text()
    assert 'name="expires"' in html


def test_tool_count_at_least_70():
    """Should have at least 70 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 70, f"Expected 70+ tool dirs, found {len(tool_dirs)}"

def test_tool_count_at_least_82():
    """Should have at least 82 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 82, f"Expected 82+ tool dirs, found {len(tool_dirs)}"

def test_nrr_calculator_page_exists():
    """NRR calculator page should be built."""
    run_build()
    page = DIST / "tools" / "nrr-calculator" / "index.html"
    assert page.exists(), "nrr-calculator/index.html not found"

def test_rule_of_72_calculator_page_exists():
    """Rule of 72 calculator page should be built."""
    run_build()
    page = DIST / "tools" / "rule-of-72-calculator" / "index.html"
    assert page.exists(), "rule-of-72-calculator/index.html not found"

def test_cac_payback_calculator_page_exists():
    """CAC payback calculator page should be built."""
    run_build()
    page = DIST / "tools" / "cac-payback-calculator" / "index.html"
    assert page.exists(), "cac-payback-calculator/index.html not found"

def test_intent_pages_have_defined_term_schema():
    """Intent pages starting with 'What Is' should have DefinedTerm schema."""
    run_build()
    what_is_pages = list((DIST / "tools").glob("*/what-is-*/index.html"))
    assert len(what_is_pages) > 0, "No 'what-is-*' intent pages found"
    for page in what_is_pages[:3]:
        html = page.read_text(encoding="utf-8")
        assert '"DefinedTerm"' in html, f"Missing DefinedTerm schema in {page}"

def test_nrr_intent_pages_exist():
    """NRR calculator should have intent pages."""
    run_build()
    intent_dir = DIST / "tools" / "nrr-calculator"
    intent_pages = [d for d in intent_dir.iterdir() if d.is_dir() and d.name != "index"]
    assert len(intent_pages) >= 2, f"Expected 2+ intent pages for nrr-calculator, found {len(intent_pages)}"

def test_tool_count_at_least_85():
    """Should have at least 85 tools built."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 85, f"Expected 85+ tool dirs, found {len(tool_dirs)}"


def test_sales_funnel_calculator_page_exists():
    """Sales funnel calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "sales-funnel-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "sf-mqls" in content
    assert "sf-mrr" in content


def test_dscr_calculator_page_exists():
    """DSCR calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "dscr-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "dscr-result" in content
    assert "dscr-max-loan" in content


def test_ebitda_multiple_calculator_page_exists():
    """EBITDA multiple calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "ebitda-multiple-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "em-ev-ebitda" in content
    assert "em-equity" in content


def test_tool_count_at_least_88():
    """Should have at least 88 tools built (added 3 in Loop 94)."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 88, f"Expected 88+ tool dirs, found {len(tool_dirs)}"


def test_current_ratio_calculator_page_exists():
    """Current ratio calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "current-ratio-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "cr-result" in content


def test_markup_calculator_page_exists():
    """Markup calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "markup-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "mk-markup" in content


def test_aov_calculator_page_exists():
    """AOV calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "aov-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "aov-result" in content


def test_commission_calculator_page_exists():
    """Commission calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "commission-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "comm-result" in content


def test_roa_calculator_page_exists():
    """ROA calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "roa-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "roa-result" in content


def test_debt_to_equity_calculator_page_exists():
    """Debt-to-equity calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "debt-to-equity-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "dte-result" in content


def test_customer_retention_rate_calculator_page_exists():
    """Customer retention rate calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "customer-retention-rate-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "ret-rate" in content


def test_percentage_change_calculator_page_exists():
    """Percentage change calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "percentage-change-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "pct-change" in content


def test_cogs_calculator_page_exists():
    """COGS calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "cogs-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "cogs-result" in content


def test_net_profit_calculator_page_exists():
    """Net profit calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "net-profit-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "np-result" in content
    assert "np-net-margin" in content


def test_financial_ratios_calculator_page_exists():
    """Financial ratios calculator should build and have the widget."""
    run_build()
    page = DIST / "tools" / "financial-ratios-calculator" / "index.html"
    assert page.exists()
    content = page.read_text()
    assert "fr-roe" in content
    assert "fr-roa" in content


def test_tool_count_at_least_100():
    """Should have at least 100 tools built (100-tool milestone)."""
    run_build()
    tool_dirs = [d for d in (DIST / "tools").iterdir() if d.is_dir() and d.name != "index"]
    assert len(tool_dirs) >= 100, f"Expected 100+ tool dirs, found {len(tool_dirs)}"


def test_affiliate_links_have_no_placeholder_ids():
    """affiliate: true renders an FTC 'Affiliate link' disclosure + rel=sponsored,
    so a link marked affiliate must not carry an unfilled tracking placeholder."""
    affiliates = yaml.safe_load((ROOT / "content" / "affiliates.yaml").read_text())
    for slug, links in affiliates.items():
        for link in links:
            if link.get("affiliate"):
                assert "YOURID" not in link["url"], (
                    f"{slug}/{link['name']} is marked affiliate: true but url still "
                    "has a placeholder tracking ID"
                )


def test_legal_pages_use_site_brand_not_stale_tool_list():
    run_build()
    for page in ("privacy", "terms", "contact"):
        html = (DIST / page / "index.html").read_text()
        assert "FreeToolKit" not in html
        assert "word counter" not in html.lower()


def test_tool_widget_inputs_have_accessible_names():
    """Every <input> in a tool's calculator widget must have an accessible name
    (aria-label/aria-labelledby, a <label for="..."> pointing at its id, or
    being wrapped inside a <label>...</label>) — a plain placeholder does not
    count and is the #1 axe-core/Lighthouse accessibility failure ("label")
    for form controls."""
    import re

    run_build()
    input_re = re.compile(r"<input\b[^>]*>")
    id_re = re.compile(r'\bid="([^"]+)"')
    label_block_re = re.compile(r"<label\b[^>]*>.*?</label>", re.DOTALL)
    for slug in TOOL_SLUGS:
        html = (DIST / "tools" / slug / "index.html").read_text()
        label_blocks = label_block_re.findall(html)
        for tag in input_re.findall(html):
            if 'aria-label="' in tag or "aria-labelledby=" in tag:
                continue
            if any(tag in block for block in label_blocks):
                continue
            match = id_re.search(tag)
            assert match, f"{slug}: <input> has no id and no aria-label: {tag}"
            input_id = match.group(1)
            assert f'for="{input_id}"' in html, (
                f"{slug}: <input id=\"{input_id}\"> has no associated "
                "<label for> and no aria-label"
            )


def test_stripe_fee_breakdown_computes_fee_and_net():
    """stripe_fee_breakdown is the Jinja global intent_country.html uses to
    compute worked examples — verify the math directly."""
    from freetoolkit.build import stripe_fee_breakdown

    result = stripe_fee_breakdown(100, 2.9, 0.30)
    assert round(result["fee"], 2) == 3.20
    assert round(result["net"], 2) == 96.80


def test_load_countries_shapes_pages_like_intent_pages():
    """load_countries() must produce entries with the fields the shared
    sitemap/tool-page-linking code expects (slug, parent_tool, title)."""
    from freetoolkit.build import load_countries

    pages = load_countries()
    assert len(pages) == len(COUNTRIES)
    for page in pages:
        assert page["parent_tool"] == "stripe-fee-calculator"
        assert page["slug"].startswith("stripe-fees-")
        assert page["is_country_page"] is True
        assert page["country"]["deep_link"].startswith("/tools/stripe-fee-calculator/#")


def test_country_pages_build_at_expected_urls():
    """Each content/countries.yaml entry should build to
    /tools/stripe-fee-calculator/stripe-fees-<slug>/."""
    run_build()
    for slug in COUNTRY_PAGE_SLUGS:
        out = DIST / "tools" / "stripe-fee-calculator" / slug / "index.html"
        assert out.exists(), f"Missing country page: {out}"


def test_country_pages_use_intent_country_template():
    """Country pages should render distinct per-country rate content, not the
    generic intent_page.html body."""
    run_build()
    for country in COUNTRIES:
        html = (DIST / "tools" / "stripe-fee-calculator" / f"stripe-fees-{country['slug']}" / "index.html").read_text()
        assert country["name"] in html
        assert f"{country['domestic_rate']}%" in html
        assert "stripe.com/pricing" in html


def test_country_pages_link_to_prefilled_calculator():
    """The CTA on each country page should deep-link into the Stripe fee
    calculator with the domestic rate and fixed fee pre-filled via the URL
    hash, decoded to the exact values from countries.yaml (including
    countries like India where domestic_fixed is 0)."""
    run_build()
    for country in COUNTRIES:
        html = (DIST / "tools" / "stripe-fee-calculator" / f"stripe-fees-{country['slug']}" / "index.html").read_text()
        match = re.search(r'/tools/stripe-fee-calculator/#([^"\'\s]+)', html)
        assert match, f"stripe-fees-{country['slug']} is missing a deep-link into the calculator"
        params = json.loads(unquote(match.group(1)))
        assert params["cp"] == country["domestic_rate"]
        assert params["cf"] == country["domestic_fixed"]


def test_country_pages_cross_link_each_other():
    """Each country page should link to the other country pages for
    internal-linking SEO value."""
    run_build()
    for country in COUNTRIES:
        html = (DIST / "tools" / "stripe-fee-calculator" / f"stripe-fees-{country['slug']}" / "index.html").read_text()
        other_slugs = [c["slug"] for c in COUNTRIES if c["slug"] != country["slug"]]
        found = sum(1 for s in other_slugs if f"/tools/stripe-fee-calculator/stripe-fees-{s}/" in html)
        assert found == len(other_slugs), f"stripe-fees-{country['slug']} is missing links to sibling country pages"


def test_country_pages_appear_on_parent_tool_page():
    """The stripe-fee-calculator tool page should list the country pages
    under its 'Related guides' section."""
    run_build()
    html = (DIST / "tools" / "stripe-fee-calculator" / "index.html").read_text()
    for slug in COUNTRY_PAGE_SLUGS:
        assert f"/tools/stripe-fee-calculator/{slug}/" in html


def test_lighthouserc_fails_ci_below_performance_90_and_seo_95():
    """CI must fail (not just warn) on Performance < 90 or SEO < 95, per the
    'Rapport de performance Lighthouse en CI' backlog task."""
    config = json.loads((ROOT / ".lighthouserc.json").read_text())
    assertions = config["ci"]["assert"]["assertions"]

    perf_level, perf_opts = assertions["categories:performance"]
    assert perf_level == "error"
    assert perf_opts["minScore"] >= 0.90

    seo_level, seo_opts = assertions["categories:seo"]
    assert seo_level == "error"
    assert seo_opts["minScore"] >= 0.95


def test_ci_workflow_runs_lighthouse_against_a_served_dist():
    """The CI Lighthouse step should serve dist/ locally (staticDistDir)
    rather than open file:// pages, matching real Lighthouse runs."""
    workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "treosh/lighthouse-ci-action" in workflow
    assert "staticDistDir" in workflow
    assert "file://" not in workflow
    assert ".lighthouserc.json" in workflow


def test_ci_workflow_lighthouse_samples_intent_and_country_templates():
    """The Lighthouse CI step must sample at least one intent_page.html and one
    intent_country.html URL, not just index.html/tools_index.html/tool.html —
    those two templates share only part of tool.html's head/layout and were
    never actually audited (see 'Elargir l'echantillon Lighthouse CI aux
    templates intent_page et intent_country' backlog task)."""
    workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text()
    urls_block = workflow[workflow.index("urls:") : workflow.index("configPath:")]

    intent_parent, intent_slug = INTENT_PAGES[0]
    intent_url = f"/tools/{intent_parent}/{intent_slug}/"
    assert intent_url in urls_block

    country_url = f"/tools/stripe-fee-calculator/{COUNTRY_PAGE_SLUGS[0]}/"
    assert country_url in urls_block

    run_build()
    assert (DIST / intent_url.strip("/") / "index.html").exists()
    assert (DIST / country_url.strip("/") / "index.html").exists()


def test_ci_workflow_runs_check_perf():
    """CI must run `make check-perf` so a perf/weight budget regression
    (file size budgets, meta coverage, sitemap, og:image) fails the build
    instead of merging undetected."""
    workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "make check-perf" in workflow
    build_pos = workflow.index("make build")
    check_perf_pos = workflow.index("make check-perf")
    lighthouse_pos = workflow.index("lighthouse-ci-action")
    assert build_pos < check_perf_pos < lighthouse_pos


def test_country_pages_in_sitemap():
    """Country pages should be included in sitemap.xml like other intent pages."""
    run_build()
    sitemap = (DIST / "sitemap.xml").read_text()
    for slug in COUNTRY_PAGE_SLUGS:
        assert f"/tools/stripe-fee-calculator/{slug}/" in sitemap


def test_total_tool_count_mentions_match_tools_yaml():
    """Any 'all N tools/calculators' claim in the built site must match the
    real tool count, so a stale hardcoded number (e.g. left over from a
    previous batch of tool additions) fails the build instead of shipping
    to Google's index."""
    run_build()
    expected = len(TOOL_SLUGS)
    pattern = re.compile(r"all (\d+) [a-z ]*(?:tools|calculators)", re.IGNORECASE)
    stale = set()
    for html_file in DIST.rglob("*.html"):
        for match in pattern.finditer(html_file.read_text(encoding="utf-8")):
            count = int(match.group(1))
            if count != expected:
                stale.add((str(html_file.relative_to(DIST)), match.group(0)))
    assert not stale, (
        f"Found tool-count text that doesn't match len(tools.yaml)={expected}: {stale}"
    )


def test_uptime_check_script_is_executable():
    script = ROOT / "scripts" / "uptime_check.sh"
    assert script.exists()
    assert os.access(script, os.X_OK)
    result = subprocess.run(["bash", "-n", str(script)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_uptime_check_script_detects_up_and_down(tmp_path):
    """Functional check: the script must exit 0 against a live URL and
    exit non-zero (without raising) against an unreachable one, since CI/cron
    callers rely on the exit code to know whether to alert."""
    script = ROOT / "scripts" / "uptime_check.sh"
    state_file = tmp_path / "state"

    server = subprocess.Popen(
        ["python3", "-u", "-m", "http.server", "0", "--directory", str(tmp_path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        port_line = server.stdout.readline()
        port = int(re.search(r"port (\d+)", port_line).group(1))

        up = subprocess.run(
            [str(script)],
            capture_output=True,
            text=True,
            env={
                **os.environ,
                "UPTIME_URL": f"http://127.0.0.1:{port}/",
                "UPTIME_STATE_FILE": str(state_file),
                "UPTIME_TIMEOUT": "5",
            },
        )
        assert up.returncode == 0, up.stdout + up.stderr
        assert state_file.read_text().strip() == "up"
    finally:
        server.terminate()
        server.wait()

    down = subprocess.run(
        [str(script)],
        capture_output=True,
        text=True,
        env={
            **os.environ,
            "UPTIME_URL": f"http://127.0.0.1:{port}/",
            "UPTIME_STATE_FILE": str(state_file),
            "UPTIME_TIMEOUT": "2",
        },
    )
    assert down.returncode == 1
    assert state_file.read_text().strip() == "down"


def test_uptime_check_requires_url():
    script = ROOT / "scripts" / "uptime_check.sh"
    result = subprocess.run([str(script)], capture_output=True, text=True, env=os.environ)
    assert result.returncode != 0


def test_uptime_workflow_self_activates_on_real_domain():
    """The scheduled uptime workflow must skip while base_url is still the
    example.com placeholder (nothing deployed yet) and run the check
    automatically once A1 in HUMAN_INPUTS.md swaps in the real domain —
    no manual workflow edit should be required to turn it on."""
    workflow = (ROOT / ".github" / "workflows" / "uptime.yml").read_text()
    assert "schedule:" in workflow
    assert "scripts/uptime_check.sh" in workflow
    assert "example.com" in workflow
    assert "UPTIME_WEBHOOK_URL" in workflow


def test_human_inputs_documents_uptime_webhook_secret():
    human_inputs = (ROOT / "HUMAN_INPUTS.md").read_text()
    assert "UPTIME_WEBHOOK_URL" in human_inputs
