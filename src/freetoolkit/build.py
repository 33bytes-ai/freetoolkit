"""Static site generator for FounderCalc.

Reads content from content/{config.yaml,tools.yaml,affiliates.yaml,
intent_pages.yaml,pages/*.md}, renders templates/*.html with Jinja2,
and writes a fully static site to dist/.
"""
from __future__ import annotations

import datetime
import gzip
import json
import os
import secrets
import shutil
from pathlib import Path
from urllib.parse import urlparse

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parents[2]

CATEGORY_AFFINITY: dict[str, list[str]] = {
    "Payments": ["SaaS Metrics", "Business Math", "Freelance"],
    "SaaS Metrics": ["Payments", "Business Math", "Freelance"],
    "Freelance": ["Payments", "Business Math", "SaaS Metrics"],
    "Business Math": ["SaaS Metrics", "Freelance", "Payments"],
}
CONTENT_DIR = ROOT / "content"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"

MD_EXTENSIONS = ["fenced_code", "tables"]


def load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_page(path: Path, config: dict) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError(f"{path} is missing YAML frontmatter")
    _, frontmatter, body = text.split("---", 2)
    meta = yaml.safe_load(frontmatter) or {}
    body = body.replace("{{ contact_email }}", config["site"]["contact_email"])
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
        tool["body_html"] = markdown.markdown(tool["body"], extensions=MD_EXTENSIONS)
    return tools


def load_affiliates() -> dict[str, list[dict]]:
    return load_yaml(CONTENT_DIR / "affiliates.yaml") or {}


def load_faqs() -> dict[str, list[dict]]:
    return load_yaml(CONTENT_DIR / "faqs.yaml") or {}


def load_intent_pages() -> list[dict]:
    pages = load_yaml(CONTENT_DIR / "intent_pages.yaml") or []
    for page in pages:
        page["body_html"] = markdown.markdown(page["body"], extensions=MD_EXTENSIONS)
    return pages


def load_pages(config: dict) -> list[dict]:
    return [load_page(p, config) for p in sorted((CONTENT_DIR / "pages").glob("*.md"))]


def cross_category_tools(tool: dict, tools_by_category: dict[str, list[dict]]) -> list[dict]:
    picks = []
    for cat in CATEGORY_AFFINITY.get(tool["category"], []):
        for other in tools_by_category.get(cat, []):
            picks.append(other)
            break
    return picks[:3]


def build_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["rejectattr"] = _rejectattr
    env.filters["humandate"] = _humandate
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
) -> None:
    base = config["site"]["base_url"].rstrip("/")
    urls = (
        ["/", "/tools/", "/changelog/"]
        + [f"/tools/{t['slug']}/" for t in tools]
        + [f"/{p['slug']}/" for p in pages]
        + [f"/tools/{ip['parent_tool']}/{ip['slug']}/" for ip in intent_pages]
    )
    today = datetime.date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    tool_slugs = {t["slug"] for t in tools}
    for url in urls:
        if url == "/":
            priority, freq = "1.0", "weekly"
        elif url == "/tools/":
            priority, freq = "0.9", "weekly"
        elif url.startswith("/tools/") and url.count("/") == 3:
            slug = url.strip("/").split("/")[-1]
            priority, freq = ("0.9", "monthly") if slug in tool_slugs else ("0.7", "monthly")
        elif url.startswith("/tools/"):
            priority, freq = "0.7", "monthly"
        else:
            priority, freq = "0.5", "monthly"
        lines.append(
            f"  <url><loc>{base}{url}</loc><lastmod>{today}</lastmod>"
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
        "background_color": "#fafafa",
        "theme_color": "#4f7ef8",
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

    # Background: dark navy gradient top-to-bottom
    for y in range(H):
        t = y / H
        r = int(10 + t * 8)
        g = int(12 + t * 6)
        b = int(40 + t * 18)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Accent bar on left
    draw.rectangle([(60, 140), (72, 490)], fill=(79, 126, 248))

    # Decorative dots grid (top-right corner)
    for gx in range(8):
        for gy in range(5):
            cx = W - 120 + gx * 16
            cy = 60 + gy * 16
            draw.ellipse([(cx - 2, cy - 2), (cx + 2, cy + 2)], fill=(79, 126, 248, 80))

    # Title (wrapped at ~900px)
    title_lines = _wrap_text(title, font_large, 900, draw)
    ty = 180
    for line in title_lines[:2]:  # max 2 lines
        draw.text((100, ty), line, fill=(255, 255, 255), font=font_large)
        bbox = draw.textbbox((0, 0), line, font=font_large)
        ty += (bbox[3] - bbox[1]) + 16

    # Subtitle
    draw.text((100, max(ty + 20, 370)), subtitle, fill=(160, 185, 220), font=font_medium)

    # Bottom brand strip
    draw.rectangle([(0, H - 68), (W, H)], fill=(20, 22, 55))
    draw.text((100, H - 50), "freetoolkit.dev — Free calculators for founders", fill=(100, 130, 200), font=font_medium)

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
    pages = load_pages(config)
    affiliates = load_affiliates()
    faqs = load_faqs()
    intent_pages = load_intent_pages()
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

    common = dict(
        site=config["site"],
        categories=config["categories"],
        tools=tools,
        tools_by_category=tools_by_category,
        all_intent_pages=intent_pages,
        intent_count_by_category=intent_count_by_category,
        year=datetime.date.today().year,
        build_date=datetime.date.today().isoformat(),
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
        description="Browse all 22 free business calculators for founders, freelancers, and SaaS builders — organized by category with instant filtering.",
        **common,
    )

    for tool in tools:
        render(
            env,
            "tool.html",
            DIST_DIR / "tools" / tool["slug"] / "index.html",
            path=f"/tools/{tool['slug']}/",
            title=tool["title"],
            description=tool["short"],
            tool=tool,
            affiliate_links=affiliates.get(tool["slug"], []),
            tool_faqs=faqs.get(tool["slug"], []),
            intent_pages=[ip for ip in intent_pages if ip["parent_tool"] == tool["slug"]],
            cross_tools=cross_category_tools(tool, tools_by_category),
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
        csp_nonce=secrets.token_urlsafe(16),
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

    for ip in intent_pages:
        parent = tools_by_slug.get(ip["parent_tool"])
        siblings = _ip_by_parent.get(ip["parent_tool"], [])
        idx = next((i for i, s in enumerate(siblings) if s["slug"] == ip["slug"]), None)
        prev_ip = siblings[idx - 1] if idx is not None and idx > 0 else None
        next_ip = siblings[idx + 1] if idx is not None and idx < len(siblings) - 1 else None
        out = DIST_DIR / "tools" / ip["parent_tool"] / ip["slug"] / "index.html"
        render(
            env,
            "intent_page.html",
            out,
            path=f"/tools/{ip['parent_tool']}/{ip['slug']}/",
            title=ip["title"],
            description=ip["description"],
            intent_page=ip,
            parent_tool=parent,
            prev_intent_page=prev_ip,
            next_intent_page=next_ip,
            **common,
        )

    shutil.copytree(STATIC_DIR, DIST_DIR / "static", ignore=shutil.ignore_patterns("fonts"))

    write_sitemap(config, tools, pages, intent_pages)
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
