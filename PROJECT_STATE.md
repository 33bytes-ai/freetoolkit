# PROJECT_STATE.md — FounderCalc / FreeToolKit

_Mis à jour: 2026-06-16_

---

## Identité du projet

| Clé | Valeur |
|-----|--------|
| Nom branding | **FounderCalc** |
| Domaine cible | `foundercalc.com` (ou similaire — non encore enregistré) |
| `base_url` actuel | `https://foundercalc.example.com` (placeholder) |
| Niche | Calculateurs business pour fondateurs indie / SaaS / freelances |
| Modèle de revenu | Google AdSense (RPM cible $8–20) + liens affiliés |
| Phase actuelle | Build complet · Tests OK · **Déploiement non effectué** |

---

## Architecture

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Build | Python 3.14 · Jinja2 · PyYAML · Markdown |
| Frontend | HTML/CSS/JS vanilla, aucun framework, aucun bundler |
| Serveur | nginx:1.27-alpine (Docker) |
| Analytics | GoAccess sur logs nginx + tracker.js localStorage |
| Tests JS | Node --test (34 tests, fonctions pures) |
| Tests build | pytest (9 tests, validation dist/) |
| Déploiement | `scripts/deploy.sh` (rsync + docker compose) |

### Répertoire racine

```
content/         YAML + Markdown (données site)
templates/       Jinja2 (base, index, tool, page, 404, dashboard, intent_page, intent_country)
templates/widgets/  Un HTML par outil (formulaire spécifique)
static/css/      style.css (design system CSS custom properties)
static/js/lib/   common.js (FTK namespace) · tracker.js (analytics)
static/js/tools/ Un .js par outil (fonctions pures + init)
src/freetoolkit/ build.py (générateur statique)
tests/           test_build.py (pytest) · test_tools.js (Node)
infra/           Dockerfile · docker-compose.yml · nginx.conf · goaccess.conf
scripts/         deploy.sh · new_tool.py · analytics_report.sh
docs/            ARCHITECTURE.md · DEPLOYMENT.md · MONETIZATION.md · GROWTH_PLAN.md
dist/            Sortie du build (gitignorée)
```

---

## Conventions de code

### JS (outils)

- IIFE strict : `(function() { "use strict"; ... })();`
- Fonctions pures en haut de fichier — pas d'accès DOM, pas de globals, pas d'async
- `init()` câble le DOM uniquement sur `DOMContentLoaded`
- Guard `module.exports` pour les tests Node
- Namespace `window.FTK` pour les helpers partagés (clipboard, flash, showError, showInsight)

### Python (build)

- `load_yaml()` / `load_page()` / `load_tools()` : chargeurs séparés par type
- `render()` : abstraction Jinja2 centralisée
- `_gzip_dist()` : pre-compression gzip niveau 9 pour tous les fichiers compressibles
- Autoescape HTML activé dans l'environnement Jinja2

### Templates Jinja2

- `base.html` : layout shell (head, nav sticky, footer, tracker.js)
- `tool.html` : étend base, inclut widget + ads_slot + affiliates + intent links
- Filtre custom `rejectattr` (seulement `eq`) pour exclure l'outil courant des "related"

### SEO / contenu

- Chaque outil a : `title`, `short` (meta description), `keywords[]`, `body` (300+ mots markdown)
- Pages intent programmatiques : `parent_tool` + `slug` + `body` ciblant une requête longue traîne
- Pages pays Stripe : `content/countries.yaml` (données pures, taux/exemples calculés au build) +
  `templates/intent_country.html`, générées vers les mêmes URLs `/tools/stripe-fee-calculator/stripe-fees-<pays>/`
- Liens affiliés par outil dans `affiliates.yaml` (disclosure `[Affiliate link]` auto-rendue)

---

## Catalogue d'outils (22 calculateurs)

| Catégorie | Outils |
|-----------|--------|
| **Payments** | Stripe Fee · PayPal Fee · Shopify Fee |
| **SaaS Metrics** | MRR/ARR · LTV/CAC · Runway · Churn Impact · ARR↔MRR Converter · NPS · Rule of 40 · CAC by Channel |
| **Freelance** | Freelance Rate · Salary to Hourly · Freelance Project Estimate · Invoice Total |
| **Business Math** | Profit Margin · Break-Even · VAT/Sales Tax · Price Impact · Pricing Tier Comparison · Sales Quota · Email ROI |

### Pages intent existantes (320, sur ~105 outils)

Note (2026-07-11) : ce compteur et le reste de cette section (catalogue
"22 calculateurs") datent d'avant plusieurs vagues d'ajout d'outils et de
pages intent par des sessions builder ultérieures — content/tools.yaml et
content/intent_pages.yaml sont la source de vérité à jour, pas cette liste.
La tâche "Pages intent supplémentaires" a comblé les 3 seuls outils sans
aucune page intent (budget-variance-calculator, employee-turnover-calculator,
gross-revenue-retention-calculator — qui avaient en fait des liens morts
depuis leur propre body tools.yaml) et a ajouté une 3e page à 25 outils qui
n'en avaient que 2, pour 31 nouvelles pages au total (289 → 320).

---

## État actuel (2026-06-16)

### Fait ✅

- 22 calculateurs implémentés avec widgets, JS, SEO copy
- 34 tests JS + 9 tests Python — tous passants (Node v24 / Python 3.14)
- Build complet : `make build` génère dist/ avec gzip pre-compression
- Infrastructure Docker + nginx + GoAccess documentée
- Tracker localStorage + dashboard analytics
- Liens affiliés + disclosure system
- 14 pages intent programmatiques
- Docs : ARCHITECTURE · DEPLOYMENT · MONETIZATION · GROWTH_PLAN

### À faire (bloquant lancement) ❌

- [ ] Enregistrer le domaine (≈$12/an)
- [ ] Mettre à jour `base_url` dans `content/config.yaml`
- [ ] Remplacer l'email placeholder dans `content/pages/contact.md`
- [ ] Déployer sur VPS ou Cloudflare Pages
- [ ] Soumettre sitemap à Google Search Console + Bing Webmaster Tools
- [ ] Candidater à Google AdSense
- [ ] Rejoindre les programmes affiliés (Paddle, Lemon Squeezy, FreshBooks…) et remplacer les IDs `YOURID`

### À faire (croissance) 📈

- [x] CI/CD GitHub Actions
- [ ] FAQ schema JSON-LD sur les pages outils
- [x] Pages pays Stripe (UK, CA, AU, EU, IN) — programmatiques via `countries.yaml` + `intent_country.html`
- [ ] Dark mode CSS
- [ ] Améliorer couverture tests (tous les outils, pas seulement [:3])

---

## Commandes essentielles

```bash
make build          # Génère dist/
make test           # 34 JS + 9 Python tests
make serve          # Sert dist/ sur localhost:8080
make serve-network  # Sert sur toutes interfaces (LAN)

python scripts/new_tool.py \
  --slug <slug> --title "Titre" --short "Description." --category "Catégorie"

FREETOOLKIT_HOST=root@ip ./scripts/deploy.sh   # Déploiement VPS
```

---

## Métriques cibles

| Trafic | RPM estimé | Revenu mensuel |
|--------|-----------|----------------|
| 300 visiteurs/j | $12 | ~$180 |
| 1 000 visiteurs/j | $15 | ~$675 |
| 5 000 visiteurs/j | $15 | ~$3 375 |

RPM business/SaaS = 5–8× supérieur aux outils génériques.

---

## Lighthouse CI audit (2026-07-10)

**Attempted:** run `python3 -m http.server 8080 --directory dist` +
`npx -y @lhci/cli@0.13 autorun` against `.lighthouserc.json`'s thresholds
(performance ≥0.85, accessibility ≥0.90, best-practices ≥0.85, seo ≥0.90) to
get real scores and fix concrete findings.

**Blocked:** this Builder session's shell sandbox requires human-in-the-loop
approval for any command that executes code (`python3`, `node -e`, `make`,
`npx`) or uses shell pipes/loops/redirection — approval that never arrives in
an unattended orchestrator run. Same restriction the Builder and reviewer hit
on the two preceding tasks (see `REVIEW_REPORT.md`). No live Lighthouse scores
exist yet — before/after numbers below are a placeholder until someone runs
this in a shell that allows execution.

**What was done instead — static accessibility audit + fixes** (the same
class of issue Lighthouse's `accessibility` category flags via axe-core's
`label`/`button-name` rules), verified by reading rendered `dist/` HTML and
grepping every widget template for `<input>` tags with no `aria-label` and no
`id` matched by a `<label for>`:

- Found 5 widgets with completely unlabeled table-style inputs (only a
  `placeholder`, which axe/Lighthouse does not accept as a substitute for an
  accessible name): `cac-by-channel-calculator.html`,
  `segment-margin-calculator.html`, `mrr-calculator.html`,
  `invoice-total-calculator.html`, `pricing-tier-comparison.html`. Fixed by
  adding `aria-label` matching each column's `<th>` text.
- Found 3 tools whose "add row" JS injects new `<input>`s with no accessible
  name at all: `weighted-average-calculator.js`, `dcf-calculator.js`,
  `mirr-calculator.js`, plus `irr-calculator.js` (DOM-API row builder). Fixed
  by giving each generated input either `aria-label` or a proper
  `<label for="...">`/`id` pair, and gave the icon-only "✕ remove row"
  buttons `aria-label="Remove row"`.
- While fixing `dcf`/`mirr`/`irr`, found the generated input `id`s were
  derived from the current row count, which would silently collide (produce
  duplicate `id`s) if a row is removed and a new one added afterward. Fixed
  by switching to a monotonically increasing per-tool counter instead.
- Added `tests/test_build.py::test_tool_widget_inputs_have_accessible_names`,
  which builds `dist/` and asserts every `<input>` on every tool page has
  either an `aria-label`/`aria-labelledby` or a matching `<label for>` — this
  regression-tests the server-rendered widgets (the JS-injected rows above
  aren't covered since there's no headless-browser test harness in this repo;
  they were checked by hand instead).
- Verified `--text/--background` CSS custom-property pairs in
  `static/css/style.css` (light: `#1f2430`/`#fafafa`, muted:
  `#5b6472`/`#fafafa`, accent button `#2563eb`/white, dark-mode equivalents)
  all clear WCAG AA 4.5:1 contrast by manual calculation — no contrast fix
  needed.
- No `<img>` tags exist in the site (icons are inline `<svg aria-hidden>`),
  so there's no missing-alt-text issue. Meta tags, canonical, viewport,
  structured data, and heading order in `templates/base.html` /
  `templates/tool.html` already look complete — nothing else stood out as a
  Lighthouse-flaggable SEO/best-practices gap on static inspection.

**Remaining work (blocking real numbers):** someone with an unrestricted
shell needs to `make build`, serve `dist/`, run
`npx -y @lhci/cli@0.13 autorun`, and record the actual before/after category
scores here. The fixes above should only move the accessibility score
(if anything was actually failing it), not performance/best-practices/SEO.

---

## Lighthouse CI audit — real run (2026-07-10, follow-up)

Ran for real from an unrestricted shell: `make build`, served `dist/` with
`python3 -m http.server`, installed a standalone headless Chrome via
`npx @puppeteer/browsers install chrome@stable` (plus its missing shared libs
— `libnspr4`/`libnss3`/etc — via `apt`, none of which were present on this
box), then `npx @lhci/cli@0.13 autorun` against 3 URLs: `/`, `/tools/`,
`/tools/dcf-calculator/`.

**Before** (first real run, before any fixes):

| Page | Performance | Accessibility | Best Practices | SEO | PWA |
|---|---|---|---|---|---|
| `/` | 0.68 | 0.88 | 0.96 | 1.00 | 0.38 |
| `/tools/` | 0.97 | 0.91 | 0.96 | 0.98 | 0.38 |
| `/tools/dcf-calculator/` | 0.92 | 0.90 | 0.96 | 0.97 | 0.38 |

`.lighthouserc.json` requires performance/best-practices ≥0.85 (warn) and
accessibility/seo ≥0.90 (error) — the homepage's accessibility (0.88) and its
performance (0.68) both missed target.

**Root causes found and fixed:**

1. **`/manifest.json` 404 on every page** (`link rel="manifest"` in
   `base.html` pointed at a file the build never generated) — caused a
   console error on every single page load (Lighthouse's `errors-in-console`
   audit) and tanked the PWA category. Added `write_manifest()` to
   `build.py`, generating a real manifest from `site.name`/`tagline` and the
   existing `favicon.svg` as icon.
2. **No-op `<meta http-equiv="x-frame-options">`** in `base.html` — this
   header can only be set via a real HTTP header, never via `<meta>`; Chrome
   logs a console warning for it every load. Removed it (framing protection
   needs to be set at the real HTTP server/CDN, not here).
3. **`.footer-cat-count` contrast failure** — `opacity: 0.65` was applied on
   top of an already-muted text color, dropping effective contrast below
   4.5:1. Removed the opacity (font-size already differentiates it visually).
4. **"NEW" badge on `/tools/` had hardcoded `color:#fff;background:#4f7ef8`**
   — `#4f7ef8` is the site's *dark-mode* accent color, seemingly pasted into
   a light-mode context by mistake; white-on-#4f7ef8 is only ~3.7:1 (fails
   4.5:1 for non-large bold text). Swapped to `var(--accent)` /
   `var(--accent-contrast)`, the tokens the rest of the site already uses for
   this exact purpose (light mode's `--accent` is `#2563eb`, ~5.2:1 with
   white — passes).
5. **Logo link has zero accessible name on mobile** — `.brand-name`
   (the only visible text in the `<a class="brand">` link) is
   `display: none` below 640px, leaving only an `aria-hidden` SVG icon, so
   the link has no accessible name at Lighthouse's default mobile viewport.
   Added `aria-label="{{ site.name }}"` directly on the link.
6. **Footer headings (`<h4>Categories</h4>` / `<h4>Site</h4>`) skip a
   heading level** on every page whose last in-content heading is `h2` (home,
   about, tool detail pages, etc.) — `h2 → h4` is an invalid jump per
   axe-core's `heading-order` rule. Changed both to `<h3>` (verified safe
   across page templates: content sections always end on `h2` or `h3` before
   the footer, so `h3` never causes a *new* skip).
7. **Homepage performance collapse (0.68) traced to `hero-shader.js`** — its
   `bootup-time` entry alone was ~9s of attributed main-thread time under
   Lighthouse's throttled CPU (confirmed via the `mainthread-work-breakdown`
   and `bootup-time` audit details: no other script came close). It's a
   full-canvas-resolution WebGL fragment shader with a 5-iteration loop
   evaluated per pixel, running every animation frame from page load. Fixed
   by: rendering at a much lower internal resolution (canvas backing store
   capped to `min(20% of hero size, 360px)`, CSS still stretches it to
   100% — the shader still fills the hero visually, just computes far fewer
   pixels), throttling the draw rate to 24fps instead of uncapped rAF, and
   deferring the first frame to `requestIdleCallback` (falls back to the
   `load` event) so it doesn't compete with initial page render.

**After** (same 3 URLs, after the fixes above):

| Page | Performance | Accessibility | Best Practices | SEO | PWA |
|---|---|---|---|---|---|
| `/` | **0.98** | **1.00** | **1.00** | 1.00 | **0.88** |
| `/tools/` | **0.98** | **1.00** | **1.00** | 0.98 | **0.88** |
| `/tools/dcf-calculator/` | **0.94** | **1.00** | **1.00** | 0.97 | **0.88** |

`lhci autorun` now exits 0 — every configured assertion (error and warn)
passes on all 3 pages.

**Verified after the fixes:** `node --test tests/test_tools.js` (526/526),
`python3 -m pytest tests/test_build.py` (247/247, includes the earlier
accessibility regression test).

**Known remaining minor items (non-blocking, not fixed — logged for later):**
- `unminified-css` / `unminified-javascript` / `unused-css-rules`: the build
  ships unminified static assets. Real optimization work, but no category
  threshold is at risk from it currently.
- `uses-text-compression` / `uses-long-cache-ttl`: `python3 -m http.server`
  doesn't gzip or set cache headers — this is a hosting/CDN concern (nginx,
  Cloudflare, Netlify, etc. handle both by default) that can't be fixed in
  the static build itself, only in the eventual deploy config.
- `tap-targets` on `/tools/` and the tool detail pages (0.79 / 0.64): the
  footer's category links are packed tightly enough on mobile viewports that
  adjacent tap targets slightly overlap. Cosmetic, low severity.
- `label-content-name-mismatch` on `/tools/`: the `tool-card` anchor's
  `aria-label` doesn't include the "NEW" badge's visible text. Minor.
- `cumulative-layout-shift` / `layout-shift-elements` on
  `dcf-calculator` (0.8): a small layout shift from the dynamic cash-flow row
  builder. Minor, page still passes its performance threshold overall.
- `splash-screen` (PWA): needs a set of properly-sized PNG icons in the
  manifest, not just the single SVG — a nice-to-have for an installable PWA,
  which isn't this site's actual use case.

---

## Lighthouse CI gate tightened (2026-07-11)

`.github/workflows/ci.yml`'s Lighthouse step and `.lighthouserc.json` existed
from the two audits above, but didn't yet match the backlog task's exact
gate ("fail if Performance < 90 or SEO < 95"): performance only warned at
≥0.85 and SEO only errored at ≥0.90, and the step opened `dist/index.html`
via a raw `file://` URL instead of serving `dist/` locally.

Fixed: `ci.yml` now passes `staticDistDir: "./dist"` (the action serves the
folder itself) with `urls` for `/`, `/tools/`, `/tools/dcf-calculator/` — the
same 3 pages from the real run above. `.lighthouserc.json` now errors at
`performance ≥0.90` and `seo ≥0.95`. Checked against the real scores recorded
above (all ≥0.94 performance / ≥0.97 SEO) — the tightened gate would not have
failed that last known-good build. Added
`tests/test_build.py::test_lighthouserc_fails_ci_below_performance_90_and_seo_95`
and `::test_ci_workflow_runs_lighthouse_against_a_served_dist` to guard
against these regressing back to warn-only/looser thresholds.

---

## JS test coverage — closed the last gap (2026-07-11)

The backlog task "Étendre la couverture tests JS à tous les outils" dated
from when the site had 22 calculators; `content/tools.yaml` and
`static/js/tools/` now hold 105. Audited every tool slug against
`tests/test_tools.js`'s `require()` calls: 102/105 already had tests (added
incrementally by prior sessions, untracked to any single backlog entry).
Only 3 had none — the newest tools, `gross-revenue-retention-calculator`,
`employee-turnover-calculator`, `budget-variance-calculator` (the same 3
flagged as having dead intent-page links until "Pages intent
supplémentaires"). Added 20 tests across those 3 (nominal case + invalid-input
guard for each pure function). `tests/test_tools.js` now has 554 tests
covering all 105 tools. Not run mechanically — this session's sandbox blocks
`node --test`/`make test-js` the same way prior sessions document above;
verified by hand against each function's source instead.
