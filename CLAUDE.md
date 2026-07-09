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

## Project layout

```
content/
  config.yaml        Site-wide settings (domain, ads toggle)
  tools.yaml         Tool definitions + SEO body copy
  pages/             Static pages (about, privacy, terms, contact)
templates/
  base.html          Layout shell
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

## Enabling ads
1. Register at https://adsense.google.com (free — takes 2-4 weeks to approve).
2. Set `ads_enabled: true` in `content/config.yaml`.
3. Set `adsense_client_id` or export `ADSENSE_CLIENT_ID=ca-pub-XXXXXX` at
   build time.
4. Rebuild and redeploy.

## Updating the live domain
Change `base_url` in `content/config.yaml` to your real domain before
deploying. This affects sitemap URLs and canonical tags.
