# FreeToolKit — CLAUDE.md

## Overview
Static SEO tools website (FounderCalc, https://foundercalc.dev) — ~105 free
browser-based business calculators monetized via Google AdSense and affiliate
links. Zero database, zero backend, zero ongoing API costs.

## Stack
- **Build**: Python 3.11+ + Jinja2 + PyYAML + Markdown → generates `dist/`
- **Frontend**: Vanilla HTML/CSS/JS, no bundler, no frameworks
- **Hosting**: Cloudflare Pages. `.github/workflows/deploy.yml` publishes every
  merge to `main`; `build.py` writes `dist/_headers` and `dist/_redirects`
- **Analytics**: Cloudflare Web Analytics, injected by Cloudflare (no cookie,
  nothing in the templates)

## Dev commands

| Command | What it does |
|---------|-------------|
| `make build` | Generate static site into `dist/` |
| `make test` | Run all tests (JS + Python) |
| `make test-js` | Node test runner for JS pure functions |
| `make test-py` | pytest for build output validation |
| `make serve` | Serve `dist/` locally at port 8080 |
| `make setup` | Setup wizard at http://127.0.0.1:8097 — the steps only a human can do |
| `make gsc` | Search Console: what Google still indexes (see § Search Console) |
| `make deploy` | Publish `dist/` to Cloudflare Pages by hand (CI does it on merge) |

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
  leaving a redirect behind. Keep the rules **static**: Pages honours 2,000
  static rules but only 100 dynamic ones, and a single `*` in the source
  makes a rule dynamic — that silently 404'd 229 of 329 retired URLs once
  already. Verify with `npx wrangler pages dev dist`, which prints how many
  rules it parsed; a plain static server ignores the file entirely.
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
  setup/             Setup wizard: catalogue, checks, YAML editor, web page
tests/
  test_build.py      pytest — validates generated dist/ structure
  test_tools.js      Node test runner — validates JS pure functions
  test_setup_wizard.py  pytest — the wizard, without network
scripts/
  new_tool.py        Scaffold a new tool (adds entry + JS stub)
  setup_wizard.py    Entry point of `make setup`
  search_console.py  Entry point of `make gsc`, `gsc-auth`, `gsc-push`
  check_perf.py      Size budgets, meta coverage, sitemap, og:images
  uptime_check.sh    What .github/workflows/uptime.yml runs
```

## Setup wizard

`make setup` opens a loopback-only page that walks through every step only a
human can do (AdSense, affiliate programmes, Formspree, Hetzner, URSSAF) and
checks each one against the site as served. Code in `src/freetoolkit/setup/`,
entry point `scripts/setup_wizard.py`, tests in `tests/test_setup_wizard.py`.

- `catalogue.py` is content: fixing a click path is not a code change. A field
  targets `config:<dotted.path>`, `affiliate:<Name>` or `local:<key>`; a config
  path must already exist in `content/config.yaml` (a test holds that).
- `contentfile.py` edits the YAML line by line so its comments survive, and
  refuses any write whose result does not read back as the value asked for.
- Checks read the live site (`checks.fetch`), not the file: a value in
  `content/` does nothing until merged. The wizard never commits or publishes.
- Standard library plus Jinja2 only, and `build.py` never imports it.

## Search Console

The web report "Indexation des pages" lags by days (it sat on 2026-09-04 for
twelve), so nothing is decided from it. `src/freetoolkit/setup/searchconsole.py`
talks to the API instead — standard library, installed-app OAuth on
`localhost:8098`, the Desktop client shared with foundercalc-mail.

| Command | What it does |
|---------|-------------|
| `make gsc-auth` | Consent once; token in `~/.config/freetoolkit/search_console_token.json` |
| `make gsc` | Sitemaps known to GSC, 28-day impressions, URL Inspection of every URL in `sitemap.xml` and `sitemap_retired.xml`; snapshot in `.setup/search_console/<date>.json` (reused for 12 h) |
| `make gsc-push` | Submit `sitemap_index.xml` and `sitemap_retired.xml`, withdraw submitted sitemaps that now 404 |

- The wizard's `search_console_recrawl` check passes once ≤ 10 % of the retired
  URLs are still indexed — the signal to ask for the AdSense re-review.
- **`dist/sitemap_retired.xml` is temporary.** It lists the 329 retired URLs so
  Google comes back to their 301s; it is kept out of `sitemap_index.xml` and
  `robots.txt` (a test holds that) and submitted through the API only. Remove it
  once the check passes — see the backlog entry.
- URL Inspection allows 2,000 calls a day per property; a full `make gsc` spends ~460.

## Adding a new tool
```bash
python scripts/new_tool.py --slug my-tool --title "My Tool" \
    --short "One-sentence description." --category Everyday
```
Then implement pure functions in `static/js/tools/my-tool.js`, add SEO body
copy to `content/tools.yaml`, write tests in `tests/test_tools.js`, and run
`make build`.

## Translations (fr / es / de)

English is canonical and the only thing crawlers see. Translations are
applied in the browser by `static/js/lib/i18n.js`, with no new URLs, no
hreflang and nothing in the sitemaps. Machine-translated pages at their own URLs
would be Google's "scaled content abuse" on a search-traffic site.

- `content/i18n.yaml`: keyed interface strings (`data-i18n="..."`).
- `content/i18n/<lang>/`: everything else, mirroring the English sources.
  - `strings.yaml` maps English text to its translation, matched on any page:
    labels, tooltips, tool names, and calculator results. Digits are written
    `{0}`, `{1}`… and carried across.
  - `tools.yaml`, `intent_pages.yaml`, `glossary.yaml`, `categories.yaml` and
    `pages/*.md` hold the long-form text, filling `[data-i18n-region]` blocks.
  - `_terms.yaml` is the finance vocabulary each batch must reuse.
- The build (`src/freetoolkit/i18n.py`) writes `dist/i18n/<lang>/…json`, with
  `noindex` and `Disallow`.
- `make i18n-crawl` records the text calculators write at runtime into
  `content/i18n/_runtime_strings.json`. Re-run it after changing a tool's
  output text.
- `make i18n-coverage` gives percentages per language.
  `python scripts/i18n_coverage.py --missing fr` lists what is left, as YAML.

## Embeds and Pro (the MRR line)

Every tool also builds at `/embed/<slug>/` (`templates/embed.html`): the widget
alone, `noindex`, canonical to the tool page, with a credit link. Tool pages
show the two-line embed snippet (iframe + a credit link *outside* it — that one
is the backlink). `write_headers_file()` detaches `X-Frame-Options` and the CSP
for `/embed/*` and re-sends the CSP with `frame-ancestors *` only.

**Pro** (`/pro/`, `content/pages/pro.md`, `site.pro` in `config.yaml`) removes
the credit and unlocks `?accent=<hex>`. `static/js/lib/embed.js` hashes `?key=`
and compares it with `site.pro.key_hashes`. Keys are issued by hand after each
Stripe sale:

```bash
python3 -c "import secrets,hashlib;k=secrets.token_urlsafe(16);print(k);print(hashlib.sha256(k.encode()).hexdigest())"
```

Send the first line to the buyer (embed URL `…/embed/<slug>/?key=<key>`), add
the second to `key_hashes`, merge. Revoke by deleting the hash. The Payment
Link and portal URL come from the wizard step `stripe_pro`.

## Ads

Two flags, not one — they mean different things and `base.html` keys different
things off each:

- **`ads_enabled`** (currently `true`): ship the AdSense loader. AdSense
  reviews the site *as served* and has to find `adsbygoogle.js` and
  `/ads.txt` on it. `ADSENSE_CLIENT_ID=ca-pub-XXXX make build` overrides the
  ID at build time.
- **`adsense_slots`** (currently all empty): the ad unit IDs, issued once the
  account is approved. `ads_slot.html` draws an `<ins>` only for a slot with a
  real ID — an empty frame labelled "Advertisement" that can never fill is a
  worse review surface than no frame.

`base.html` derives **`ads_serving`** from both: ads_enabled *and* at least one
real slot ID. The Funding Choices consent platform, `static/js/ads.js` and the
footer "Privacy & ad settings" button all ship only when `ads_serving` — a
consent prompt for personalised ads is a prompt about nothing while no ad can
render, and shipping it cost ~9 Lighthouse performance points per page. Adding
a real slot ID brings all three back automatically, before any ad serves, so
the EEA consent obligation is still met the moment it starts to apply.

## Updating the live domain
Change `base_url` in `content/config.yaml` to your real domain before
deploying. This affects sitemap URLs and canonical tags.

## Content-Security-Policy / inline scripts
`build.py` writes the CSP into `dist/_headers`, which Cloudflare Pages serves.
`script-src` is `'self'` plus the AdSense and Cloudflare Analytics hosts, with
no `'unsafe-inline'` and no nonce: a nonce had to match between a header and
HTML that a CDN can serve from different builds, and a mismatch once blocked
every inline script site-wide.
- No executable inline `<script>`: put code in a file under `static/js/`.
  JSON-LD blocks stay inline — they are data, never executed.
- A new third-party script host has to be added to the CSP in
  `write_headers_file()`, or the browser blocks it silently.
- Never use inline event-handler attributes (`onclick="..."`, including ones
  built dynamically via `innerHTML`) — nonces don't cover them. Wire events
  with `addEventListener` instead (see `static/js/lib/common.js` or any
  `addRow()` in `static/js/tools/` for the pattern).
- `tests/test_build.py` has CSP tests (no executable inline script, no nonce
  dependency, the `_headers` protections, no inline handlers in `templates/`
  or `static/js/`) — run them after touching any template or tool JS.
