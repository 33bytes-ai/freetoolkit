# FreeToolKit — CLAUDE.md

## Overview
Static SEO tools website — 10 free browser-based utilities monetized via
Google AdSense. Zero database, zero backend, zero ongoing API costs.

## Stack
- **Build**: Python 3.11+ + Jinja2 + PyYAML + Markdown → generates `dist/`
- **Frontend**: Vanilla HTML/CSS/JS, no bundler, no frameworks
- **Hosting**: nginx in Docker, deployable on any $5–10/mo VPS
- **Analytics**: GoAccess on nginx access logs (no JS tracking script)

## Dev commands

| Command | What it does |
|---------|-------------|
| `make build` | Generate static site into `dist/` |
| `make test` | Run all tests (JS + Python) |
| `make test-js` | Node test runner for JS pure functions |
| `make test-py` | pytest for build output validation |
| `make serve` | Serve `dist/` locally at port 8080 |

Python dependencies are managed with a local `.venv/` created by `make .venv`.

## Content architecture (read before adding pages)

Google AdSense rejected the site in August 2026 for *"Contenu à faible valeur
informative"* (thin content). The cause was shape, not writing quality: ~320
intent/country pages averaging **244 words** each, a 9-term glossary averaging
165, and tool pages at a 303-word median — 462 URLs, most of them thin.

The fix was consolidation, and it is a constraint to keep, not a one-off:

- **A guide is a section, not a URL.** Entries in `content/intent_pages.yaml`
  and `content/countries.yaml` are merged into their `parent_tool`'s page by
  `attach_deep_dives()` and rendered as anchored `<section id="<slug>">`
  blocks. They no longer build standalone pages.
- **The glossary is one page.** `content/glossary.yaml` renders as anchored
  sections of `/glossary/`, not a page per term.
- **Retired URLs 301 to their anchor** via generated `dist/_redirects`
  (Cloudflare Pages). Never delete an entry from those YAML files without
  leaving a redirect behind.
- **Link to sections, not retired pages**: `](/tools/<parent>/#<slug>)` and
  `](/glossary/#<slug>)`. `test_tools_yaml_guide_links_all_resolve` fails on
  the old path form.
- **Category pages carry an intro** from `content/categories.yaml`; a bare
  tool grid is a thin page.
- A page-level `noindex: true` in a content page's front matter keeps it out
  of `robots`-visible indexing *and* the sitemaps (used for `/legal-notice/`).

Two tests enforce the floor — `test_tool_pages_meet_content_depth_budget`
(every tool page ≥ 600 visible words) and `test_no_indexable_page_is_thin`
(nothing in `sitemap.xml` under 300). If you add a page, give it substance or
keep it out of the sitemap.

## Project layout

```
content/
  config.yaml        Site-wide settings (domain, ads toggle)
  tools.yaml         Tool definitions + SEO body copy
  categories.yaml    Editorial intro per category page
  intent_pages.yaml  Guide sections, merged into their parent tool page
  countries.yaml     Per-country Stripe rates, merged into the Stripe tool page
  glossary.yaml      Glossary terms, merged into /glossary/
  pages/             Static pages (about, privacy, terms, contact)
templates/
  base.html          Layout shell
  _country_section.html  One country's Stripe rates, inlined into tool.html
  index.html         Home page
  tool.html          Tool page (includes widget)
  page.html          Generic markdown page
  widgets/<slug>.html  Tool-specific HTML
static/
  css/style.css
  js/lib/common.js   Shared browser utilities (FTK namespace)
  js/tools/          One JS file per tool
src/freetoolkit/
  build.py           Static site generator (CLI: python build.py)
tests/
  test_build.py      pytest — validates generated dist/ structure
  test_tools.js      Node test runner — validates JS pure functions
infra/
  Dockerfile         Multi-stage build (Python builder + nginx)
  docker-compose.yml web + analytics (GoAccess) services
  nginx.conf         nginx vhost config
  goaccess.conf      GoAccess settings
scripts/
  deploy.sh          rsync + docker compose up on VPS
  new_tool.py        Scaffold a new tool (adds entry + JS stub)
  analytics_report.sh Regenerate GoAccess HTML report
```

## Adding a new tool
```bash
python scripts/new_tool.py --slug my-tool --title "My Tool" \
    --short "One-sentence description." --category Everyday
```
Then implement pure functions in `static/js/tools/my-tool.js`, add SEO body
copy to `content/tools.yaml`, write tests in `tests/test_tools.js`, and run
`make build`.

## Ads

`ads_enabled: true` and `adsense_client_id` are already set in
`content/config.yaml`, so the AdSense snippet, the Funding Choices consent
banner and `/ads.txt` all render — AdSense reviews the site as served and
needs to find them. Slots stay blank until the account is approved.

`ADSENSE_CLIENT_ID=ca-pub-XXXX make build` overrides the ID at build time.

The consent banner is required before personalised ads reach EEA/UK visitors.
`static/js/ads.js` also wires the footer "Privacy & ad settings" button to
Funding Choices' revocation message — consent has to be as easy to withdraw as
to give, and `/privacy/` promises that control exists.

## Updating the live domain
Change `base_url` in `content/config.yaml` to your real domain before
deploying. This affects sitemap URLs and canonical tags.

## Content-Security-Policy / inline scripts
`infra/nginx.conf` sends a strict CSP with no `'unsafe-inline'` in
`script-src`. `build.py` generates one random nonce per build, passes it to
every template as `csp_nonce`, and writes it to `csp_nonce.txt` at the repo
root (gitignored); `infra/Dockerfile` substitutes that value into nginx.conf's
`__CSP_NONCE__` placeholder when it builds the image, so the header always
matches the markup it's serving.
- Any inline `<script>` (including `type="application/ld+json"`) needs
  `nonce="{{ csp_nonce }}"` — the CSP applies to inline scripts regardless of
  their `type`.
- Never use inline event-handler attributes (`onclick="..."`, including ones
  built dynamically via `innerHTML`) — nonces don't cover them. Wire events
  with `addEventListener` instead (see `static/js/lib/common.js` or any
  `addRow()` in `static/js/tools/` for the pattern).
- `tests/test_build.py` has CSP tests (nonce presence/consistency, no inline
  handlers anywhere in `templates/` or `static/js/`) — run them after
  touching any template or tool JS.
