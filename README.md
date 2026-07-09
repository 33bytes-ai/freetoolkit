# FounderCalc

[![CI](https://github.com/YOUR_USERNAME/freetoolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/freetoolkit/actions/workflows/ci.yml)

Free business calculators for indie founders, freelancers, and SaaS builders.

**10 calculators:** Stripe fees · MRR & ARR · LTV/CAC · Runway · Churn impact ·
Freelance rate · Salary to hourly · Profit margin · Break-even · VAT/Sales tax

All math runs client-side — no backend, no database, no user data collected.
Monetized via Google AdSense (RPM target: $8–20 for this business audience).

## Quick start

```bash
make build   # generate static site → dist/
make serve   # serve at http://localhost:8080
make test    # run all 43 tests
```

Requires Python 3.11+ and Node 18+.

## Why this niche

Generic utility tools ("json formatter", "word counter") compete against 10-year-old
domains with millions of backlinks. Business-specific calculators ("stripe fee
calculator", "ltv cac ratio") have real monthly search volume but dramatically lower
competition — achievable page 1 rankings for a new site within 3–6 months.

Expected RPM: **$8–20** (business audience) vs. $1–3 for general utilities.

## Project structure

```
content/        Calculator definitions, config, page copy (YAML + Markdown)
templates/      Jinja2 HTML templates + per-calculator widget HTML
static/         CSS, shared JS helpers, per-calculator JS modules
src/            Python static site generator (build.py)
tests/          43 tests: 34 JS unit tests + 9 Python build tests
infra/          Docker, nginx, docker-compose, GoAccess config
scripts/        deploy.sh, new_tool.py, analytics_report.sh
docs/           DEPLOYMENT.md, MONETIZATION.md, GROWTH_PLAN.md, ARCHITECTURE.md
```

## Docs

| Document | Description |
|----------|-------------|
| `HUMAN_INPUTS.md` | 3 one-time manual steps (domain, VPS/free host, AdSense) |
| `docs/DEPLOYMENT.md` | Full deployment guide (VPS + Cloudflare Pages) |
| `docs/MONETIZATION.md` | AdSense setup, RPM estimates ($8–20 for this niche) |
| `docs/GROWTH_PLAN.md` | 90-day plan: community distribution + niche SEO strategy |
| `docs/ARCHITECTURE.md` | System design and data flow |
| `BACKLOG.md` | Next calculators + programmatic long-tail page ideas |

## Adding a new calculator

```bash
python scripts/new_tool.py \
    --slug shopify-fee-calculator \
    --title "Shopify Fee Calculator" \
    --short "Calculate Shopify transaction fees and net payout for any plan." \
    --category Payments
```

## Tests

```
34 JS unit tests   node --test tests/test_tools.js
 9 Python tests    pytest tests/test_build.py
```

All 43 tests pass with zero failures on Node 20 / Python 3.11.

## Revenue model

Display advertising via Google AdSense (free to apply, no cost).

| Traffic | Est. RPM | Monthly revenue |
|---------|---------|----------------|
| 300 daily visitors | $12 | ~$180 |
| 1,000 daily visitors | $15 | ~$675 |
| 5,000 daily visitors | $15 | ~$3,375 |

Business/SaaS audience RPM is 5–8× higher than general utility tools.

## Operating costs

| Item | Cost |
|------|------|
| Domain | ~$12/year |
| VPS (Hetzner CX11) | $5/month |
| Cloudflare Pages (alternative) | $0 |
| All dependencies | $0 |
