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
templates/       Jinja2 (base, index, tool, page, 404, dashboard, intent_page)
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
- Liens affiliés par outil dans `affiliates.yaml` (disclosure `[Affiliate link]` auto-rendue)

---

## Catalogue d'outils (22 calculateurs)

| Catégorie | Outils |
|-----------|--------|
| **Payments** | Stripe Fee · PayPal Fee · Shopify Fee |
| **SaaS Metrics** | MRR/ARR · LTV/CAC · Runway · Churn Impact · ARR↔MRR Converter · NPS · Rule of 40 · CAC by Channel |
| **Freelance** | Freelance Rate · Salary to Hourly · Freelance Project Estimate · Invoice Total |
| **Business Math** | Profit Margin · Break-Even · VAT/Sales Tax · Price Impact · Pricing Tier Comparison · Sales Quota · Email ROI |

### Pages intent existantes (14)

- Stripe : subscriptions, vs PayPal, UK, India, $10, $1000
- MRR : benchmarks croissance SaaS
- LTV/CAC : benchmarks SaaS / e-commerce / agency
- Runway : quand lever des fonds
- Freelance Rate : par expérience
- Rule of 40 : par tier ARR

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

- [ ] CI/CD GitHub Actions
- [ ] FAQ schema JSON-LD sur les pages outils
- [ ] Pages pays Stripe (UK, CA, AU, EU, IN) — programmatiques via `countries.yaml`
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
