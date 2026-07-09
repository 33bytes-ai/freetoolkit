# ANALYSIS.md — FounderCalc / FreeToolKit

_Generated: 2026-06-16_

---

## Architecture détectée

### Pipeline de build

```
content/{config,tools,affiliates,intent_pages}.yaml + pages/*.md
  └─► src/freetoolkit/build.py  (Python 3.11+ · Jinja2 · PyYAML · Markdown)
        └─► dist/               (HTML + CSS + JS + XML statique, gzip pre-compressé)
              └─► nginx:alpine  (Docker, gzip_static, cache headers, sécurité de base)
```

### Structure des outils (22 calculateurs)

Chaque outil suit un pattern uniforme :
- **YAML** (`content/tools.yaml`) : slug, titre, mots-clés, corps SEO markdown
- **Widget HTML** (`templates/widgets/<slug>.html`) : formulaire spécifique
- **JS pur** (`static/js/tools/<slug>.js`) : fonctions pures + `init()` DOM
- **Page générée** (`dist/tools/<slug>/index.html`)

### JS frontend

- Pattern IIFE strict avec séparation totale fonctions pures / DOM
- `window.FTK` (common.js) : clipboard, flash, showError, showInsight
- `tracker.js` : analytics localStorage (pageviews, calc_uses, affiliate_clicks)
- Aucun framework, aucun bundler, aucun appel réseau côté outil

### Monétisation

- AdSense (`ads_enabled: false` — en attente d'approbation)
- Liens affiliés (`content/affiliates.yaml` — IDs placeholders)
- Pages intent programmatiques pour le long-tail SEO (14 pages existantes)

### Tests

- 34 tests JS (Node `--test`, fonctions pures uniquement)
- 9 tests Python (pytest, validation du `dist/` généré)

---

## Dette technique

### 1. Configuration non-finalisée (bloquant déploiement)
- `base_url` = `https://foundercalc.example.com` (placeholder)
- Email de contact = placeholder dans `content/pages/contact.md`
- Tous les IDs affiliés = `YOURID` dans `affiliates.yaml`
- `ads_enabled: false` (pas encore soumis à AdSense)

### 2. Documentation désynchronisée
- `docs/ARCHITECTURE.md` mentionne "×10" outils alors que le projet en compte 22
- `CLAUDE.md` du workspace décrit encore l'ancienne vision "word counter, JSON formatter"
- `project.yaml` a la même description générique obsolète

### 3. Tests insuffisants
- `test_tool_pages_reference_correct_js` et `test_tool_pages_have_canonical_url` ne vérifient que les 3 premiers outils (`TOOL_SLUGS[:3]`)
- `TOOL_SLUGS` et `INTENT_PAGES` dans `test_build.py` sont des listes hard-codées → désynchronisation garantie à chaque ajout d'outil
- Aucun test d'intégration vérifiant le contenu réel des pages (titres H1, méta-description, schema JSON-LD)
- Aucune couverture des widgets JS spécifiques (uniquement Stripe, MRR, LTV partiellement)

### 4. Sécurité nginx
- Aucun header `Content-Security-Policy`
- Pas de redirection HTTP→HTTPS dans le conteneur (délégué à Certbot, mais le docker-compose ne le documente pas)
- Aucun rate-limiting sur le dashboard (`/dashboard/` accessible publiquement)

### 5. JavaScript
- `document.execCommand("copy")` dans `common.js` est déprécié (fallback clipboard)
- `tracker.js` n'implémente aucune limite de taille localStorage ni TTL — peut grossir indéfiniment
- `tracker.js` n'honore pas `navigator.doNotTrack`

### 6. Build
- `_rejectattr` dans `build.py` ne supporte que `op == "eq"` — les autres opérations retournent silencieusement la liste non filtrée (bug discret)
- `load_page()` utilise `text.split("---", 2)` : si le frontmatter contient des lignes `---`, cela peut lever une `ValueError` peu claire
- Pas de validation que le fichier widget HTML existe pour chaque slug défini dans tools.yaml (erreur Jinja2 à l'exécution, pas à la définition)

### 7. SEO / métadonnées
- `og:image` pointe vers un SVG (`/static/img/og.svg`) — Facebook et LinkedIn n'indexent pas les SVG pour les previews
- Pas de schéma JSON-LD `FAQPage` exploitant les sections FAQ de chaque outil
- Pas de schéma `WebApplication` ou `SoftwareApplication` par outil
- Sitemap sans `<lastmod>` ni `<priority>`

### 8. Scaffold `new_tool.py`
- Génère un widget `textarea`-based générique — incompatible avec le pattern réel (inputs numériques, output-boxes, insights)
- N'ajoute pas le slug aux `TOOL_SLUGS` de `test_build.py` → les tests échoueront silencieusement

### 9. CI/CD
- Aucun pipeline CI (pas de `.github/workflows/`) — les tests ne s'exécutent que localement
- `scripts/deploy.sh` n'est pas documenté dans les tests — déploiement uniquement manuel

---

## Bugs potentiels

| Sévérité | Localisation | Description |
|----------|-------------|-------------|
| Moyen | `build.py:_rejectattr` | Toute opération `!= "eq"` retourne la liste complète sans erreur |
| Moyen | `common.js:flash()` | `el.dataset.originalText` n'est pas réinitialisé si le texte du bouton change dynamiquement |
| Faible | `tracker.js` | `trackPageview()` s'exécute à chaque rechargement sans deduplication de session → statistiques gonflées |
| Faible | `build.py:load_page()` | Frontmatter YAML contenant `---` dans une valeur string peut corrompre le parsing |
| Faible | `test_build.py` | Tests `[:3]` passent même si les outils 4–22 ont des pages cassées |
| Faible | `nginx.conf` | `try_files $uri $uri/ $uri/index.html =404` peut servir des répertoires non prévus |

---

## Améliorations possibles

### Impact fort
1. **CI GitHub Actions** — lancer `make test` à chaque push (bloque les régressions)
2. **FAQ schema JSON-LD** — chaque page FAQ peut générer un rich result Google (`FAQPage` schema) → CTR +15–30%
3. **Schéma `WebApplication` par outil** — boost E-E-A-T et rich snippets
4. **CSP header** — sécurité et conformité AdSense
5. **Pages pays Stripe** — "stripe fees uk/canada/australia" programmées via `countries.yaml` (plan de croissance Phase 4)
6. **OG image PNG** — remplacer le SVG par un PNG pour les previews sociales

### Impact moyen
7. **Tests dynamiques** — lire `tools.yaml` dans `test_build.py` au lieu de listes hard-codées
8. **Dark mode CSS** — audience tech, adoption > 40%
9. **Améliorer `new_tool.py`** — générer un widget numérique cohérent + mise à jour auto de test_build.py
10. **Tracker DNT** — respecter `navigator.doNotTrack` (GDPR goodwill)
11. **Comparaison de tools** — page `/compare/stripe-vs-paypal/` ciblant des requêtes de comparaison
12. **Email capture** — simple formulaire + ConvertKit/Beehiiv pour une liste fondateurs

### Impact faible
13. **Preload CSS** — `<link rel="preload" as="style">` pour le CSS critique
14. **Favicon .ico** — fallback pour Safari < 9 et certains emails
15. **Sitemap lastmod** — date de dernière modification pour un meilleur crawl budget
