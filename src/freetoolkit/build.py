"""Static site generator for FounderCalc.

Reads content from content/{config.yaml,tools.yaml,affiliates.yaml,
intent_pages.yaml,pages/*.md}, renders templates/*.html with Jinja2,
and writes a fully static site to dist/.
"""
from __future__ import annotations

import datetime
import gzip
import json
import math
import os
import re
import secrets
import shutil
from pathlib import Path
from urllib.parse import quote, urlparse

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parents[2]

# One simple line-icon (24x24, stroke=currentColor, matches the site's
# existing minimal icon style) and a one-line tagline per category — used
# on category pages, the homepage category cards, and tool-card badges.
_ICON_ATTRS = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
CATEGORY_META: dict[str, dict[str, str]] = {
    "Payments": {
        "icon": f'<svg {_ICON_ATTRS}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>',
        "tagline": "Stripe, PayPal, Shopify fees and payout math",
    },
    "SaaS Metrics": {
        "icon": f'<svg {_ICON_ATTRS}><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
        "tagline": "MRR, LTV/CAC, churn, retention and growth math",
    },
    "Freelance": {
        "icon": f'<svg {_ICON_ATTRS}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="2" y1="13" x2="22" y2="13"/></svg>',
        "tagline": "Rates, estimates and taxes for independent work",
    },
    "Business Math": {
        "icon": f'<svg {_ICON_ATTRS}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/><line x1="8" y1="19" x2="16" y2="19"/></svg>',
        "tagline": "Margins, break-even, pricing and core arithmetic",
    },
    "Marketing": {
        "icon": f'<svg {_ICON_ATTRS}><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8a4 4 0 0 1 0 8"/><path d="M18 5a8 8 0 0 1 0 14"/></svg>',
        "tagline": "ROAS, conversion, funnels and campaign ROI",
    },
    "Finance": {
        "icon": f'<svg {_ICON_ATTRS}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="10" x2="6" y2="10.01"/><line x1="18" y1="14" x2="18" y2="14.01"/></svg>',
        "tagline": "Cash flow, ratios and core financial statements",
    },
    "Valuation": {
        "icon": f'<svg {_ICON_ATTRS}><line x1="12" y1="3" x2="12" y2="21"/><path d="M4 7h6l-3 7a3.2 3.2 0 0 1-6 0z"/><path d="M14 7h6l-3 7a3.2 3.2 0 0 1-6 0z"/><line x1="6" y1="3" x2="18" y2="3"/></svg>',
        "tagline": "DCF, multiples and enterprise value math",
    },
    "Tax & Compliance": {
        "icon": f'<svg {_ICON_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 12.5"/></svg>',
        "tagline": "Payroll tax, self-employment tax and filings",
    },
    "HR & People": {
        "icon": f'<svg {_ICON_ATTRS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        "tagline": "Headcount cost, turnover and compensation",
    },
}


def category_slug(category: str) -> str:
    return category.lower().replace(" & ", "-").replace(" ", "-")
CONTENT_DIR = ROOT / "content"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"

MD_EXTENSIONS = ["fenced_code", "tables"]

FAQ_HEADER_RE = re.compile(r"^##\s*frequently asked questions\s*$", re.IGNORECASE | re.MULTILINE)
NEXT_HEADER_RE = re.compile(r"^##\s", re.MULTILINE)
BOLD_LINE_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")
MATH_BLOCK_RE = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
MATH_FRAC_RE = re.compile(r"\\frac\{([^{}]*)\}\{([^{}]*)\}")
MATH_TEXT_RE = re.compile(r"\\text\{([^{}]*)\}")
MATH_EXPONENT_RE = re.compile(r"\^\{([^{}]*)\}")
MATH_DOUBLE_PAREN_RE = re.compile(r"\(\(([^()]*)\)\)")


def _render_math_expression(expr: str) -> str:
    """Convert a simple LaTeX math expression (\\text, \\frac, \\times, ^{},
    \\left/\\right — the small subset the content team writes formulas in)
    into plain, readable text. There's no MathJax/KaTeX on this site, so raw
    LaTeX source was rendering verbatim on every tool page with a formula."""
    expr = expr.replace(r"\%", "%")
    expr = MATH_TEXT_RE.sub(r"\1", expr)

    def frac_repl(m: re.Match) -> str:
        num, den = m.group(1).strip(), m.group(2).strip()
        wrap = lambda s: f"({s})" if re.search(r"[+\-×]", s) else s
        return f"{wrap(num)} / {wrap(den)}"

    expr = MATH_FRAC_RE.sub(frac_repl, expr)
    expr = expr.replace(r"\left(", "(").replace(r"\right)", ")")
    expr = MATH_EXPONENT_RE.sub(r"^\1", expr)
    expr = expr.replace(r"\times", "×")
    expr = MATH_DOUBLE_PAREN_RE.sub(r"(\1)", expr)
    return re.sub(r"\s+", " ", expr).strip()


def render_math_blocks(body: str) -> str:
    """Replace every $$...$$ block in a markdown body with a styled,
    plain-text rendering of the formula (see _render_math_expression)."""
    def block_repl(m: re.Match) -> str:
        return f'\n\n<div class="ftk-formula">{_render_math_expression(m.group(1))}</div>\n\n'

    return MATH_BLOCK_RE.sub(block_repl, body)


def extract_faqs_from_body(body: str) -> list[dict]:
    """Pull Q&A pairs out of a tool's '## Frequently asked questions' markdown
    section, so the FAQPage JSON-LD always matches what's visibly on the page
    instead of drifting from a hand-maintained duplicate."""
    header_match = FAQ_HEADER_RE.search(body)
    if not header_match:
        return []
    section = body[header_match.end():]
    next_header = NEXT_HEADER_RE.search(section)
    if next_header:
        section = section[: next_header.start()]

    faqs = []
    for block in re.split(r"\n\s*\n", section):
        lines = block.strip().splitlines()
        if not lines:
            continue
        bold_match = BOLD_LINE_RE.match(lines[0])
        if not bold_match:
            continue
        answer = " ".join(line.strip() for line in lines[1:] if line.strip())
        if answer:
            faqs.append({"question": bold_match.group(1).strip(), "answer": answer})
    return faqs


def load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_page(path: Path, config: dict, tool_count: int) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError(f"{path} is missing YAML frontmatter")
    _, frontmatter, body = text.split("---", 2)
    meta = yaml.safe_load(frontmatter) or {}
    body = body.replace("{{ contact_email }}", config["site"]["contact_email"])
    body = body.replace("{{ tool_count }}", str(tool_count))
    meta["content"] = markdown.markdown(body.strip(), extensions=MD_EXTENSIONS)
    return meta


def load_config() -> dict:
    config = load_yaml(CONTENT_DIR / "config.yaml")
    client_id = os.environ.get("ADSENSE_CLIENT_ID")
    if client_id:
        config["site"]["adsense_client_id"] = client_id
    config["site"].setdefault("adsense_client_id", "")
    domain = urlparse(config["site"]["base_url"]).netloc
    config["site"].setdefault("contact_email", f"hello@{domain}")
    return config


def load_tools() -> list[dict]:
    tools = load_yaml(CONTENT_DIR / "tools.yaml")
    for tool in tools:
        tool["body_html"] = markdown.markdown(render_math_blocks(tool["body"]), extensions=MD_EXTENSIONS)
        tool["faqs"] = extract_faqs_from_body(tool["body"])
    return tools


def load_affiliates() -> dict[str, list[dict]]:
    return load_yaml(CONTENT_DIR / "affiliates.yaml") or {}


def load_intent_pages() -> list[dict]:
    pages = load_yaml(CONTENT_DIR / "intent_pages.yaml") or []
    for page in pages:
        page["body_html"] = markdown.markdown(render_math_blocks(page["body"]), extensions=MD_EXTENSIONS)
    return pages


def load_glossary() -> list[dict]:
    entries = load_yaml(CONTENT_DIR / "glossary.yaml") or []
    for entry in entries:
        entry["body_html"] = markdown.markdown(render_math_blocks(entry["body"]), extensions=MD_EXTENSIONS)
    return entries


def stripe_fee_breakdown(amount: float, rate_pct: float, fixed: float) -> dict:
    fee = amount * rate_pct / 100 + fixed
    return {"fee": fee, "net": amount - fee}


def load_countries() -> list[dict]:
    """Programmatic Stripe fee pages, one per content/countries.yaml entry.

    Shaped like an intent_pages.yaml entry (slug/parent_tool/title/description/
    keywords) so it can share sitemap, robots, and tool-page linking code with
    the hand-written intent pages; is_country_page + country tell the render
    loop to use intent_country.html instead.
    """
    countries = load_yaml(CONTENT_DIR / "countries.yaml") or []
    pages = []
    for country in countries:
        default_amount = country["example_amounts"][0]
        hash_params = {
            "a": default_amount,
            "t": "custom",
            "cp": country["domestic_rate"],
            "cf": country["domestic_fixed"],
        }
        country["deep_link"] = (
            "/tools/stripe-fee-calculator/#"
            + quote(json.dumps(hash_params, separators=(",", ":")))
        )
        slug = f"stripe-fees-{country['slug']}"
        pages.append(
            {
                "slug": slug,
                "parent_tool": "stripe-fee-calculator",
                "title": f"Stripe Fees in {country['name']} — Rates, Examples & Net Payout",
                "description": (
                    f"Exact Stripe processing fees for businesses in {country['name']} — "
                    f"{country['domestic_rate']}% + {country['currency_symbol']}{country['domestic_fixed']} "
                    f"for {country['domestic_label']}, with worked examples."
                ),
                "keywords": [
                    f"stripe fees {country['slug']}",
                    f"stripe {country['slug']} pricing",
                    f"stripe fee calculator {country['slug']}",
                ],
                "is_country_page": True,
                "country": country,
            }
        )
    return pages


def load_pages(config: dict, tool_count: int) -> list[dict]:
    return [
        load_page(p, config, tool_count)
        for p in sorted((CONTENT_DIR / "pages").glob("*.md"))
    ]


_RELATED_STOPWORDS = {
    "calculator", "calc", "free", "business", "saas", "for", "and", "the", "a", "of",
    "your", "how", "to", "what", "is", "with", "vs", "or", "in", "on", "per", "rate",
    "estimate", "tool", "online", "converter", "comparison", "impact", "growth",
    "revenue", "cost", "value", "based", "worth", "you", "does", "much",
    "calculate", "formula", "from", "price", "sales", "net",
}


def _keyword_tokens(tool: dict) -> set[str]:
    tokens: set[str] = set()
    for kw in tool.get("keywords", []):
        for word in re.findall(r"[a-z0-9]+", kw.lower()):
            if word not in _RELATED_STOPWORDS and len(word) > 2:
                tokens.add(word)
    return tokens


def _build_keyword_index(tools: list[dict]) -> tuple[dict[str, set[str]], dict[str, float]]:
    """Tokenize every tool's keywords once, then compute an IDF weight per
    token so common connector words (shared by many tools, e.g. "margin")
    count for less than genuinely distinctive ones (e.g. "vat", "mrr")."""
    tool_tokens = {t["slug"]: _keyword_tokens(t) for t in tools}
    doc_freq: dict[str, int] = {}
    for tokens in tool_tokens.values():
        for word in tokens:
            doc_freq[word] = doc_freq.get(word, 0) + 1
    n = len(tools)
    idf = {word: math.log(n / freq) for word, freq in doc_freq.items()}
    return tool_tokens, idf


def related_and_cross_tools(
    tool: dict,
    tools: list[dict],
    tools_by_category: dict[str, list[dict]],
    tool_tokens: dict[str, set[str]],
    idf: dict[str, float],
) -> tuple[list[dict], list[dict]]:
    """Rank other tools by IDF-weighted shared-keyword overlap with this
    tool's authored `keywords:` list, then split into on-topic "related
    tools" (top picks) and secondary "you might also need" picks. Falls
    back to same-category tools if keyword overlap doesn't produce enough.
    """
    base_tokens = tool_tokens[tool["slug"]]
    scored = []
    for other in tools:
        if other["slug"] == tool["slug"]:
            continue
        overlap = base_tokens & tool_tokens[other["slug"]]
        if overlap:
            score = sum(idf[word] for word in overlap)
            scored.append((score, other))
    scored.sort(key=lambda pair: -pair[0])
    ranked = [other for _, other in scored]

    related = ranked[:4]
    cross = ranked[4:7]

    if len(related) < 4 or len(cross) < 3:
        used_slugs = {tool["slug"]} | {t["slug"] for t in related} | {t["slug"] for t in cross}
        fallback = [t for t in tools_by_category.get(tool["category"], []) if t["slug"] not in used_slugs]
        fallback += [t for t in tools if t["slug"] not in used_slugs and t["slug"] not in {f["slug"] for f in fallback}]
        for other in fallback:
            if len(related) < 4:
                related.append(other)
                used_slugs.add(other["slug"])
            elif len(cross) < 3:
                cross.append(other)
                used_slugs.add(other["slug"])
            else:
                break

    return related, cross


def build_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["rejectattr"] = _rejectattr
    env.filters["humandate"] = _humandate
    env.filters["category_slug"] = category_slug
    env.globals["stripe_fee"] = stripe_fee_breakdown
    env.globals["category_meta"] = CATEGORY_META
    return env


def _humandate(date_str: str) -> str:
    from datetime import date as _date
    try:
        d = _date.fromisoformat(date_str)
        return d.strftime("%-d %b %Y")
    except (ValueError, TypeError):
        return date_str


def _rejectattr(seq, attr, op, value):
    if op == "eq":
        return [item for item in seq if item.get(attr) != value]
    if op == "ne":
        return [item for item in seq if item.get(attr) == value]
    if op == "lt":
        return [item for item in seq if not (item.get(attr) < value)]
    if op == "gt":
        return [item for item in seq if not (item.get(attr) > value)]
    if op == "in":
        return [item for item in seq if item.get(attr) not in value]
    if op == "defined":
        return [item for item in seq if attr not in item]
    raise ValueError(f"_rejectattr: unknown operator {op!r}")


def render(env: Environment, template_name: str, out_path: Path, **context) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    template = env.get_template(template_name)
    out_path.write_text(template.render(**context), encoding="utf-8")


def _sitemap_urlset(base: str, entries: list[tuple]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    today = datetime.date.today().isoformat()
    for entry in entries:
        url, freq, priority = entry[0], entry[1], entry[2]
        lastmod = entry[3] if len(entry) > 3 and entry[3] else today
        lines.append(
            f"  <url><loc>{base}{url}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{priority}</priority></url>"
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def write_sitemap_tools(config: dict, tools: list[dict]) -> None:
    base = config["site"]["base_url"].rstrip("/")
    today = datetime.date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for t in tools:
        lastmod = t.get("date_added", today)
        title = t["title"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        img_url = f"{base}/static/img/og-{t['slug']}.png"
        lines.append(
            f"  <url>"
            f"<loc>{base}/tools/{t['slug']}/</loc>"
            f"<lastmod>{lastmod}</lastmod>"
            f"<changefreq>monthly</changefreq>"
            f"<priority>0.9</priority>"
            f"<image:image><image:loc>{img_url}</image:loc><image:title>{title}</image:title></image:image>"
            f"</url>"
        )
    lines.append("</urlset>")
    (DIST_DIR / "sitemap_tools.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_sitemap_pages(config: dict, pages: list[dict]) -> None:
    base = config["site"]["base_url"].rstrip("/")
    entries = (
        [("/", "weekly", "1.0"), ("/tools/", "weekly", "0.9"), ("/changelog/", "monthly", "0.6")]
        + [(f"/{p['slug']}/", "monthly", "0.5") for p in pages]
    )
    (DIST_DIR / "sitemap_pages.xml").write_text(_sitemap_urlset(base, entries), encoding="utf-8")


def write_sitemap_intent(config: dict, intent_pages: list[dict], tools: list[dict]) -> None:
    base = config["site"]["base_url"].rstrip("/")
    tool_dates = {t["slug"]: t.get("date_added", "") for t in tools}
    today = datetime.date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for ip in intent_pages:
        lastmod = tool_dates.get(ip["parent_tool"], today)
        img_url = f"{base}/static/img/og-{ip['parent_tool']}.png"
        title = ip["title"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        lines.append(
            f"  <url>"
            f"<loc>{base}/tools/{ip['parent_tool']}/{ip['slug']}/</loc>"
            f"<lastmod>{lastmod}</lastmod>"
            f"<changefreq>monthly</changefreq><priority>0.7</priority>"
            f"<image:image><image:loc>{img_url}</image:loc><image:title>{title}</image:title></image:image>"
            f"</url>"
        )
    lines.append("</urlset>")
    (DIST_DIR / "sitemap_intent.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_sitemap_index(config: dict) -> None:
    base = config["site"]["base_url"].rstrip("/")
    today = datetime.date.today().isoformat()
    sitemaps = [
        "sitemap_tools.xml",
        "sitemap_pages.xml",
        "sitemap_intent.xml",
        "sitemap_news.xml",
        "sitemap.xml",
    ]
    entries = "".join(
        f'  <sitemap><loc>{base}/{s}</loc><lastmod>{today}</lastmod></sitemap>\n'
        for s in sitemaps
    )
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + entries
        + '</sitemapindex>\n'
    )
    (DIST_DIR / "sitemap_index.xml").write_text(content, encoding="utf-8")


def write_sitemap(
    config: dict,
    tools: list[dict],
    pages: list[dict],
    intent_pages: list[dict],
    tools_by_category: dict[str, list[dict]] | None = None,
    glossary: list[dict] | None = None,
) -> None:
    base = config["site"]["base_url"].rstrip("/")
    today = datetime.date.today().isoformat()
    tool_lastmod = {t["slug"]: t.get("updated") or t.get("date_added") or today for t in tools}
    tools_by_category = tools_by_category or {}
    glossary = glossary or []
    entries = (
        [
            ("/", "1.0", "weekly", today),
            ("/tools/", "0.9", "weekly", today),
            ("/changelog/", "0.5", "monthly", today),
            ("/glossary/", "0.5", "monthly", today),
        ]
        + [
            (f"/categories/{category_slug(c)}/", "0.8", "weekly", today)
            for c in config["categories"]
            if tools_by_category.get(c)
        ]
        + [
            (f"/tools/{t['slug']}/", "0.9", "monthly", tool_lastmod[t["slug"]])
            for t in tools
        ]
        + [(f"/{p['slug']}/", "0.5", "monthly", today) for p in pages]
        + [
            (
                f"/tools/{ip['parent_tool']}/{ip['slug']}/",
                "0.7",
                "monthly",
                tool_lastmod.get(ip["parent_tool"], today),
            )
            for ip in intent_pages
        ]
        + [(f"/glossary/{g['slug']}/", "0.6", "monthly", today) for g in glossary]
    )
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url, priority, freq, lastmod in entries:
        lines.append(
            f"  <url><loc>{base}{url}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{priority}</priority></url>"
        )
    lines.append("</urlset>")
    (DIST_DIR / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_rss(config: dict, tools: list[dict]) -> None:
    base = config["site"]["base_url"].rstrip("/")
    name = config["site"]["name"]
    description = config["site"]["description"].strip()
    fallback_pub = datetime.date.today().strftime("%a, %d %b %Y 00:00:00 +0000")
    sorted_tools = sorted(
        tools,
        key=lambda t: t.get("date_added", "1970-01-01"),
        reverse=True,
    )
    items = []
    for tool in sorted_tools:
        img_url = f"{base}/static/img/og-{tool['slug']}.png"
        da = tool.get("date_added", "")
        if da:
            try:
                d = datetime.date.fromisoformat(da)
                pub_date = d.strftime("%a, %d %b %Y 00:00:00 +0000")
            except ValueError:
                pub_date = fallback_pub
        else:
            pub_date = fallback_pub
        items.append(
            f"  <item>"
            f"<title>{tool['title']}</title>"
            f"<link>{base}/tools/{tool['slug']}/</link>"
            f"<guid isPermaLink=\"true\">{base}/tools/{tool['slug']}/</guid>"
            f"<description>{tool['short']}</description>"
            f"<pubDate>{pub_date}</pubDate>"
            f"<category>{tool.get('category', 'Tools')}</category>"
            f'<enclosure url="{img_url}" type="image/png" length="0"/>'
            f'<media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="{img_url}"/>'
            f"</item>"
        )
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"\n'
        '     xmlns:media="http://search.yahoo.com/mrss/">\n'
        "<channel>\n"
        f"  <title>{name}</title>\n"
        f"  <link>{base}/</link>\n"
        f"  <description>{description}</description>\n"
        f'  <atom:link href="{base}/rss.xml" rel="self" type="application/rss+xml"/>\n'
        f"  <image><url>{base}/static/img/og.png</url><title>{name}</title><link>{base}/</link><width>144</width><height>144</height></image>\n"
        f"  <language>en-us</language>\n"
        f"  <docs>https://www.rssboard.org/rss-specification</docs>\n"
        f"  <generator>FounderCalc build.py</generator>\n"
        f"  <copyright>Copyright {datetime.date.today().year} {name}</copyright>\n"
        f"  <managingEditor>guillaume.malvestio1@gmail.com ({name})</managingEditor>\n"
        f"  <webMaster>guillaume.malvestio1@gmail.com ({name})</webMaster>\n"
        f"  <ttl>1440</ttl>\n"
        + "\n".join(items)
        + "\n</channel>\n</rss>\n"
    )
    (DIST_DIR / "rss.xml").write_text(content, encoding="utf-8")


def write_sitemap_news(config: dict, tools: list[dict]) -> None:
    base = config["site"]["base_url"].rstrip("/")
    name = config["site"]["name"]
    today = datetime.date.today().isoformat()
    items = []
    for tool in tools:
        title = tool["title"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        items.append(
            f"  <url>"
            f"<loc>{base}/tools/{tool['slug']}/</loc>"
            f"<news:news>"
            f"<news:publication><news:name>{name}</news:name><news:language>en</news:language></news:publication>"
            f"<news:publication_date>{tool.get('date_added', today)}</news:publication_date>"
            f"<news:title>{title}</news:title>"
            f"</news:news>"
            f"</url>"
        )
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n'
        + "\n".join(items)
        + "\n</urlset>\n"
    )
    (DIST_DIR / "sitemap_news.xml").write_text(content, encoding="utf-8")


def write_ads_txt(config: dict) -> None:
    client_id = config["site"].get("adsense_client_id", "")
    if client_id:
        content = f"google.com, {client_id}, DIRECT, f08c47fec0942fa0\n"
    else:
        content = "# Replace XXXXXXXXXXXXXXXX with your AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX)\n# google.com, ca-pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n"
    (DIST_DIR / "ads.txt").write_text(content, encoding="utf-8")


def write_manifest(config: dict) -> None:
    site = config["site"]
    manifest = {
        "name": site["name"],
        "short_name": site["name"],
        "description": site.get("tagline", ""),
        "start_url": "/",
        "display": "standalone",
        "background_color": "#f6f8f5",
        "theme_color": "#0e6b45",
        "icons": [
            {"src": "/static/img/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"},
            {"src": "/static/img/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "maskable"},
        ],
    }
    (DIST_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def write_robots(config: dict) -> None:
    base = config["site"]["base_url"].rstrip("/")
    (DIST_DIR / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nDisallow: /dashboard/\n"
        f"Sitemap: {base}/sitemap_index.xml\n"
        f"Sitemap: {base}/sitemap.xml\n"
        f"Sitemap: {base}/sitemap_news.xml\n",
        encoding="utf-8",
    )


BUNDLED_FONT = STATIC_DIR / "fonts" / "Aileron-Regular.ttf"


def _load_fonts():
    try:
        from PIL import ImageFont
    except ImportError:
        return None, None
    for fp in [
        BUNDLED_FONT,
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]:
        try:
            return ImageFont.truetype(str(fp), 90), ImageFont.truetype(str(fp), 42)
        except (OSError, IOError):
            continue
    return ImageFont.load_default(), ImageFont.load_default()


def _wrap_text(text: str, font, max_width: int, draw) -> list[str]:
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def _render_og_image(title: str, subtitle: str, font_large, font_medium) -> "Image":
    from PIL import Image, ImageDraw
    W, H = 1200, 630
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Background: dark forest-green gradient top-to-bottom (ledger palette)
    for y in range(H):
        t = y / H
        r = int(10 + t * 14)
        g = int(18 + t * 30)
        b = int(14 + t * 20)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Accent bar on left
    draw.rectangle([(60, 140), (72, 490)], fill=(52, 201, 138))

    # Decorative dots grid (top-right corner)
    for gx in range(8):
        for gy in range(5):
            cx = W - 120 + gx * 16
            cy = 60 + gy * 16
            draw.ellipse([(cx - 2, cy - 2), (cx + 2, cy + 2)], fill=(52, 201, 138, 80))

    # Title (wrapped at ~900px)
    title_lines = _wrap_text(title, font_large, 900, draw)
    ty = 180
    for line in title_lines[:2]:  # max 2 lines
        draw.text((100, ty), line, fill=(255, 255, 255), font=font_large)
        bbox = draw.textbbox((0, 0), line, font=font_large)
        ty += (bbox[3] - bbox[1]) + 16

    # Subtitle
    draw.text((100, max(ty + 20, 370)), subtitle, fill=(170, 210, 190), font=font_medium)

    # Bottom brand strip
    draw.rectangle([(0, H - 68), (W, H)], fill=(12, 22, 17))
    draw.text((100, H - 50), "freetoolkit.dev — Free calculators for founders", fill=(90, 160, 130), font=font_medium)

    return img


def write_og_image(config: dict, tools: list[dict] | None = None) -> None:
    if os.environ.get("FTK_SKIP_OG_IMAGE"):
        return
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        return

    font_large, font_medium = _load_fonts()
    if font_large is None:
        return

    out_dir = DIST_DIR / "static" / "img"
    out_dir.mkdir(parents=True, exist_ok=True)

    site = config["site"]
    name = site.get("name", "FounderCalc")
    tagline = site.get("tagline", "Free business calculators")

    _render_og_image(name, tagline, font_large, font_medium).save(
        out_dir / "og.png", "PNG", optimize=True
    )

    if tools:
        for tool in tools:
            _render_og_image(
                tool["title"],
                tool["category"] + " — " + name,
                font_large,
                font_medium,
            ).save(out_dir / f"og-{tool['slug']}.png", "PNG", optimize=True)


def build() -> Path:
    config = load_config()
    tools = load_tools()
    pages = load_pages(config, len(tools))
    affiliates = load_affiliates()
    intent_pages = load_intent_pages() + load_countries()
    glossary = load_glossary()
    env = build_env()

    if DIST_DIR.exists():
        try:
            shutil.rmtree(DIST_DIR)
        except OSError:
            for p in sorted(DIST_DIR.rglob("*"), reverse=True):
                try:
                    p.unlink() if p.is_file() else p.rmdir()
                except OSError:
                    pass
            if DIST_DIR.exists():
                DIST_DIR.rmdir()
    DIST_DIR.mkdir(parents=True)

    tools_by_category: dict[str, list[dict]] = {}
    for tool in tools:
        tools_by_category.setdefault(tool["category"], []).append(tool)
    # Alphabetical by display name within each category, so a tool's position
    # is predictable instead of depending on the order it was added to
    # tools.yaml (nav dropdowns, homepage sections, footer, and the /tools/
    # index "Default order" toggle all read from this dict).
    for cat_tools in tools_by_category.values():
        cat_tools.sort(key=lambda t: (t.get("nav_title") or t["title"]).lower())

    tools_by_slug: dict[str, dict] = {t["slug"]: t for t in tools}

    _tool_cat = {t["slug"]: t["category"] for t in tools}
    intent_count_by_category: dict[str, int] = {}
    for ip in intent_pages:
        cat = _tool_cat.get(ip["parent_tool"], "")
        intent_count_by_category[cat] = intent_count_by_category.get(cat, 0) + 1

    csp_nonce = secrets.token_urlsafe(16)

    common = dict(
        site=config["site"],
        categories=config["categories"],
        tools=tools,
        tools_by_category=tools_by_category,
        all_intent_pages=intent_pages,
        intent_count_by_category=intent_count_by_category,
        year=datetime.date.today().year,
        build_date=datetime.date.today().isoformat(),
        csp_nonce=csp_nonce,
    )

    for tool in tools:
        widget_path = TEMPLATES_DIR / "widgets" / f"{tool['slug']}.html"
        if not widget_path.exists():
            raise FileNotFoundError(
                f"Missing widget template for tool '{tool['slug']}': {widget_path}\n"
                "Create the file or run: python scripts/new_tool.py --slug "
                f"{tool['slug']} ..."
            )

    render(
        env,
        "index.html",
        DIST_DIR / "index.html",
        path="/",
        title=config["site"]["name"],
        description=config["site"]["description"],
        **common,
    )

    render(
        env,
        "tools_index.html",
        DIST_DIR / "tools" / "index.html",
        path="/tools/",
        title="All Free Business Calculators",
        description=f"Browse all {len(tools)} free business calculators for founders, freelancers, and SaaS builders — organized by category with instant filtering.",
        **common,
    )

    for category in config["categories"]:
        cat_tools = tools_by_category.get(category, [])
        if not cat_tools:
            continue
        meta = CATEGORY_META.get(category, {"icon": "", "tagline": ""})
        render(
            env,
            "category.html",
            DIST_DIR / "categories" / category_slug(category) / "index.html",
            path=f"/categories/{category_slug(category)}/",
            title=f"{category} Calculators",
            description=f"{len(cat_tools)} free {category.lower()} calculators for founders, freelancers, and SaaS builders — {meta['tagline'].lower()}.",
            category=category,
            cat_tools=cat_tools,
            meta=meta,
            other_categories=[c for c in config["categories"] if c != category and tools_by_category.get(c)],
            **common,
        )

    tool_tokens, tool_idf = _build_keyword_index(tools)
    for tool in tools:
        related, cross = related_and_cross_tools(tool, tools, tools_by_category, tool_tokens, tool_idf)
        render(
            env,
            "tool.html",
            DIST_DIR / "tools" / tool["slug"] / "index.html",
            path=f"/tools/{tool['slug']}/",
            title=tool["title"],
            description=tool["short"],
            tool=tool,
            affiliate_links=affiliates.get(tool["slug"], []),
            tool_faqs=tool["faqs"],
            intent_pages=[ip for ip in intent_pages if ip["parent_tool"] == tool["slug"]],
            related_tools=related,
            cross_tools=cross,
            **common,
        )

    for page in pages:
        render(
            env,
            "page.html",
            DIST_DIR / page["slug"] / "index.html",
            path=f"/{page['slug']}/",
            title=page["title"],
            description=page["description"],
            page=page,
            **common,
        )

    render(
        env,
        "glossary_index.html",
        DIST_DIR / "glossary" / "index.html",
        path="/glossary/",
        title="Glossary — FounderCalc",
        description="Plain-language definitions for the finance and SaaS terms used across FounderCalc's calculators.",
        glossary=glossary,
        **common,
    )

    for entry in glossary:
        related = [tools_by_slug[slug] for slug in entry.get("related_tools", []) if slug in tools_by_slug]
        render(
            env,
            "glossary.html",
            DIST_DIR / "glossary" / entry["slug"] / "index.html",
            path=f"/glossary/{entry['slug']}/",
            title=f"{entry['term']} — Glossary — FounderCalc",
            description=entry["short"],
            entry=entry,
            related=related,
            **common,
        )

    render(
        env,
        "404.html",
        DIST_DIR / "404.html",
        path="/404.html",
        title="Page not found",
        description="Page not found",
        **common,
    )

    render(
        env,
        "dashboard.html",
        DIST_DIR / "dashboard" / "index.html",
        path="/dashboard/",
        title="Analytics Dashboard",
        description="Traffic and revenue analytics for FounderCalc",
        **common,
    )

    render(
        env,
        "changelog.html",
        DIST_DIR / "changelog" / "index.html",
        path="/changelog/",
        title="All Free Calculators — FounderCalc",
        description="Complete list of all free business calculators on FounderCalc — organized by category.",
        **common,
    )

    _ip_by_parent: dict[str, list[dict]] = {}
    for ip in intent_pages:
        _ip_by_parent.setdefault(ip["parent_tool"], []).append(ip)

    country_pages = [ip for ip in intent_pages if ip.get("is_country_page")]

    for ip in intent_pages:
        parent = tools_by_slug.get(ip["parent_tool"])
        siblings = _ip_by_parent.get(ip["parent_tool"], [])
        idx = next((i for i, s in enumerate(siblings) if s["slug"] == ip["slug"]), None)
        prev_ip = siblings[idx - 1] if idx is not None and idx > 0 else None
        next_ip = siblings[idx + 1] if idx is not None and idx < len(siblings) - 1 else None
        out = DIST_DIR / "tools" / ip["parent_tool"] / ip["slug"] / "index.html"
        template_name = "intent_country.html" if ip.get("is_country_page") else "intent_page.html"
        render(
            env,
            template_name,
            out,
            path=f"/tools/{ip['parent_tool']}/{ip['slug']}/",
            title=ip["title"],
            description=ip["description"],
            intent_page=ip,
            parent_tool=parent,
            prev_intent_page=prev_ip,
            next_intent_page=next_ip,
            country=ip.get("country"),
            other_countries=[cp for cp in country_pages if cp["slug"] != ip["slug"]] if ip.get("is_country_page") else None,
            **common,
        )

    shutil.copytree(STATIC_DIR, DIST_DIR / "static", ignore=shutil.ignore_patterns("fonts"))

    write_sitemap(config, tools, pages, intent_pages, tools_by_category, glossary)
    write_sitemap_tools(config, tools)
    write_sitemap_pages(config, pages)
    write_sitemap_intent(config, intent_pages, tools)
    write_sitemap_news(config, tools)
    write_sitemap_index(config)
    write_robots(config)
    write_manifest(config)
    write_ads_txt(config)
    write_rss(config, tools)
    write_og_image(config, tools)
    _gzip_dist()

    # Consumed by infra/Dockerfile to bake the matching CSP nonce into the
    # nginx response header — inline <script> tags across dist/ carry this
    # same value, so the header and markup must agree at deploy time.
    (ROOT / "csp_nonce.txt").write_text(csp_nonce, encoding="utf-8")

    return DIST_DIR


def _gzip_dist() -> None:
    compressible = {".html", ".css", ".js", ".xml", ".txt", ".svg"}
    for path in DIST_DIR.rglob("*"):
        if path.is_file() and path.suffix in compressible:
            gz = path.with_suffix(path.suffix + ".gz")
            with path.open("rb") as src, gzip.open(gz, "wb", compresslevel=9) as dst:
                shutil.copyfileobj(src, dst)


if __name__ == "__main__":
    out = build()
    print(f"Built site to {out}")
