# ANALYSIS.md — FounderCalc / FreeToolKit

_Généré: 2026-06-16 — Réécrit: 2026-07-11_

---

## Architecture détectée

### Pipeline de build

```
content/{config,tools,affiliates,intent_pages,countries}.yaml + pages/*.md
  └─► src/freetoolkit/build.py  (Python 3.11+ · Jinja2 · PyYAML · Markdown · Pillow)
        └─► dist/               (HTML + CSS + JS + XML statique, gzip pre-compressé)
              └─► nginx:alpine  (Docker, gzip_static, cache headers, CSP/HSTS/etc.)
```

### Structure des outils (105 calculateurs, pas 22 — cf. dette #1)

Chaque outil suit un pattern uniforme :
- **YAML** (`content/tools.yaml`, 6815 lignes, 105 entrées) : slug, titre, mots-clés,
  `howto_steps` (100/105 outils), corps SEO markdown avec section FAQ
- **Widget HTML** (`templates/widgets/<slug>.html`) : formulaire spécifique
- **JS pur** (`static/js/tools/<slug>.js`) : fonctions pures + `init()` DOM
- **Page générée** (`dist/tools/<slug>/index.html`)
- **Pages intent** (`content/intent_pages.yaml`, 239 entrées) + 5 pages pays Stripe
  programmatiques (`content/countries.yaml` → `intent_country.html`)

### JS frontend

- Pattern IIFE strict avec séparation totale fonctions pures / DOM
- `window.FTK` (common.js) : clipboard (Clipboard API + fallback), flash, showError, showInsight
- `tracker.js` : analytics 100% côté client (localStorage), TTL 90 jours, purge
  sous plafond 500KB, honore `navigator.doNotTrack`
- Aucun framework, aucun bundler, aucun appel réseau côté outil

### Monétisation

- AdSense (`ads_enabled: false` — en attente d'approbation, bloqué sur mise en ligne réelle)
- Liens affiliés (`content/affiliates.yaml`, 178 entrées ; 177 ont `affiliate: false`
  car les programmes ne sont pas encore rejoints côté humain — cf. `HUMAN_INPUTS.md` C1/C2)
- 239 pages intent + 5 pages pays programmatiques pour le long-tail SEO

### Tests

- **554 tests JS** (`tests/test_tools.js`, Node `--test`, fonctions pures — 105/105 outils couverts)
- **272 tests Python** (`tests/test_build.py`, pytest, validation du `dist/` généré)
- CI GitHub Actions (`.github/workflows/ci.yml`) : `test-js` + `test-py` + `build` +
  Lighthouse CI (3 URLs) à chaque push/PR

### Sécurité (nginx)

- CSP stricte avec nonce généré au build (`csp_nonce.txt`, substitué dans l'image Docker),
  aucun `'unsafe-inline'` en `script-src`
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS
  tous présents — la dette "aucun header CSP" du rapport précédent est résolue

---

## Dette technique

Le site est passé de **22 à 105 outils** et de **~14 à 239 pages intent** en plusieurs
vagues de sessions builder depuis la dernière version de ce document (2026-06-16), sans
que la documentation, certaines assertions de test et un texte SEO généré ne suivent le
rythme. C'est la source de la quasi-totalité des points ci-dessous.

### 1. Compteur d'outils hardcodé obsolète (bug visible en production)
- `src/freetoolkit/build.py:674` — la meta-description de `/tools/` dit encore
  *"Browse all 22 free business calculators..."* alors qu'il y en a 105. C'est une
  description indexée par Google sur une page à fort trafic potentiel (page catalogue).
- `content/pages/comparisons.md:55` — lien texte *"browse all 22 tools →"*, même problème.
- Aucun garde-fou ne relie ce texte à `len(tools)` : une future vague d'ajout d'outils
  répétera l'écart silencieusement.

### 2. Documentation projet gravement désynchronisée
- `README.md` décrit encore **10 calculateurs**, **43 tests** (34 JS + 9 Python), et
  affiche un badge CI pointant vers `YOUR_USERNAME/freetoolkit` (placeholder jamais
  remplacé — badge cassé pour quiconque visite le repo).
- `docs/ARCHITECTURE.md` montre un diagramme `dist/` avec `tools/<slug>/ (×10)`.
- `docs/GROWTH_PLAN.md` Phase 1 dit "Verify all 10 calculator pages load...".
- `docs/DEPLOYMENT.md` dit "make test # run all 55 tests" — un troisième chiffre
  différent des deux autres documents, aucun des trois n'étant exact (826 tests réels).
- Un lecteur externe (contributeur, futur repreneur, ou l'IA elle-même dans une session
  future sans ce contexte) partirait sur des hypothèses fausses sur l'ampleur du projet.

### 3. Fichiers de scratch commités par erreur à la racine du repo
15 fichiers `*_tmp.txt` sont **trackés par git** (`git ls-files` les confirme, ce ne sont
pas de simples fichiers non ignorés) : `covered_counts_tmp.txt`, `covered_tools_tmp.txt`,
`covered_unique_tmp.txt`, `existing_urls_raw_tmp.txt`, `existing_urls_sorted_tmp.txt`,
`existing_urls_tmp.txt`, `pairs_raw_tmp.txt`, `pairs_tmp.txt`, `parents_only_tmp.txt`,
`parents_vals_tmp.txt`, `referenced_clean_sorted_tmp.txt`, `referenced_clean_tmp.txt`,
`referenced_links_tmp.txt`, `slugs_only_tmp.txt`, `slugs_vals_tmp.txt`. Ce sont
manifestement des sorties de commandes shell intermédiaires (grep/sort/comm) d'une session
builder antérieure (probablement l'audit des liens intent pages), jamais nettoyées avant
commit. Bruit dans l'historique, aucune valeur pour le repo.

### 4. Couverture de test qui ne suit pas l'échelle réelle (11 tests sur ~272)
La tâche backlog "Tests dynamiques — lire tools.yaml au lieu de listes hard-codées" a été
marquée `done`, mais elle n'a rendu dynamique que la vérification d'existence de fichiers
(`EXPECTED_FILES`). Onze fonctions de test dans `tests/test_build.py` bouclent encore sur
`TOOL_SLUGS[:3]` ou `TOOL_SLUGS[:5]` au lieu de la liste complète des 105 slugs :
`test_tool_pages_reference_correct_js`, `test_tool_pages_have_canonical_url`,
`test_index_page_has_all_tools_linked`, `test_sitemap_news`,
`test_tool_pages_have_twitter_meta`, `test_tool_pages_have_calculator_anchor`,
`test_tool_pages_have_robots_meta`, `test_rss_has_enclosure_per_item`,
`test_tool_pages_have_social_share`, `test_tool_pages_have_author_meta`,
`test_sub_sitemaps_exist_and_index_references_them`. Comme toutes les pages outil
partagent le même template Jinja2, le risque d'une régression *par outil* (plutôt que par
template) est faible, mais reste réel pour tout outil avec des données inhabituelles
(catégorie, `howto_steps` absent, etc.) qui casserait un `if`/`filter` Jinja spécifique.

### 5. `make check-perf` jamais exécuté en CI
`scripts/check_perf.py` (budgets de taille de fichier, couverture des balises meta,
présence sitemap, présence og:image) existe et fonctionne via `make check-perf`, mais
`.github/workflows/ci.yml` ne l'appelle jamais — seuls `test-js`, `test-py`, `build` et
Lighthouse CI tournent en CI. Une régression de budget de perf/poids de page pourrait
passer un merge sans être détectée automatiquement.

### 6. Lighthouse CI n'échantillonne qu'un seul template sur trois
`.lighthouserc.json` + le job CI n'auditent que `/`, `/tools/`,
`/tools/dcf-calculator/` — donc uniquement `index.html`, `tools_index.html` et
`tool.html`. Les templates `intent_page.html` (239 pages) et `intent_country.html`
(5 pages) n'ont jamais été passés dans Lighthouse, alors qu'ils partagent une bonne
partie mais pas la totalité du head/layout de `tool.html`.

### 7. Risque de cannibalisation SEO entre calculateurs quasi-homonymes
Le catalogue contient plusieurs paires/triplets de titres très proches :
`gross-margin-calculator` / `gross-profit-margin-calculator` / `profit-margin-calculator`,
`revenue-growth-calculator` / `revenue-growth-rate-calculator`,
`break-even-calculator` / `break-even-revenue-calculator`,
`employee-turnover-calculator` / `employee-turnover-cost-calculator`. Si le corps
SEO/mots-clés de chaque paire ne cible pas une intention de recherche clairement
distincte, Google peut les traiter comme du contenu quasi-dupliqué et n'en indexer
qu'un seul, ou diluer le classement des deux (cannibalisation) — non vérifié depuis
l'ajout de ces outils.

### 8. Pas de protection anti-spam sur le formulaire newsletter Formspree
`templates/base.html` rend un formulaire Formspree (footer, sur chaque page une fois
`formspree_id` renseigné) sans champ honeypot ni autre garde-fou anti-bot. Formspree
free tier a un quota mensuel de soumissions ; un bot qui trouve le formulaire pourrait
l'épuiser avant que de vrais visiteurs ne s'inscrivent.

### 9. Absence de Consent Management Platform (CMP) pour AdSense EU
Le site cible explicitement une audience internationale (pages pays UK/EU dans
`countries.yaml`) et prévoit d'activer Google AdSense (`ads_enabled`). Depuis la
politique de consentement UE de Google (obligatoire pour tout éditeur AdSense avec du
trafic EEA/UK), une bannière de consentement certifiée IAB TCF est requise avant
l'affichage d'annonces personnalisées aux visiteurs européens — rien n'est en place
aujourd'hui dans `templates/base.html`. Risque : suspension du compte AdSense si des
impressions EU sont servies sans consentement valide dès l'activation.

### 10. JavaScript (résiduel, mineur)
- `common.js:flash()` — `el.dataset.originalText` n'est pas réinitialisé si le texte
  du bouton change dynamiquement entre deux appels (déjà noté en juin, non corrigé,
  impact visuel mineur).
- `tracker.js:trackPageview()` s'exécute à chaque rechargement sans déduplication de
  session → les pageviews affichées sur `/dashboard/` (local à chaque navigateur) sont
  gonflées par les rafraîchissements. Faible enjeu car le dashboard est explicitement
  documenté comme "local browser analytics only", pas une source de vérité business.

### 11. `build.py:load_page()` — fragilité mineure du parsing frontmatter
`text.split("---", 2)` lève une `ValueError` peu claire si le frontmatter d'une page
Markdown contient lui-même la séquence `---` dans une valeur de chaîne. Signalé en juin,
toujours vrai, risque faible (le contenu des pages est écrit par l'équipe elle-même).

---

## Bugs potentiels

| Sévérité | Localisation | Description |
|----------|-------------|-------------|
| Moyen | `build.py:674` | Description `/tools/` affiche "22" calculateurs au lieu de 105 (indexée par Google) |
| Moyen | `README.md` badge CI | Pointe vers `YOUR_USERNAME/freetoolkit`, jamais remplacé — badge cassé |
| Faible | `tests/test_build.py` | 11 tests "toutes les pages outil" ne couvrent que les 3–5 premiers slugs sur 105 |
| Faible | `common.js:flash()` | `el.dataset.originalText` non réinitialisé si le texte du bouton change |
| Faible | `tracker.js` | `trackPageview()` sans déduplication de session → stats locales gonflées |
| Faible | `build.py:load_page()` | Frontmatter YAML contenant `---` dans une valeur string peut corrompre le parsing |
| Faible | `content/pages/comparisons.md` | Lien "browse all 22 tools →" obsolète |

---

## Améliorations possibles

### Impact fort
1. **Corriger le compteur d'outils hardcodé** (`build.py`, `comparisons.md`) + test de
   régression qui échoue si un texte affiché diverge de `len(tools.yaml)`
2. **CMP / bannière de consentement UE** avant l'activation d'AdSense — bloquant légal,
   pas juste "nice to have"
3. **Étendre les assertions de contenu de `test_build.py` à tous les 105 outils** plutôt
   que `TOOL_SLUGS[:3]`
4. **Intégrer `make check-perf` dans la CI**
5. **Auditer les calculateurs quasi-dupliqués** pour risque de cannibalisation SEO
6. **Rafraîchir README.md et docs/*.md** avec les chiffres réels + corriger le badge CI

### Impact moyen
7. **Élargir l'échantillon Lighthouse CI** à `intent_page.html` et `intent_country.html`
8. **Honeypot anti-spam** sur le formulaire newsletter Formspree
9. **Nettoyer les 15 fichiers `*_tmp.txt`** commités par erreur à la racine
10. **Monitoring d'uptime externe** prêt à activer dès le déploiement VPS

### Impact faible
11. **`common.js:flash()`** — réinitialiser `originalText` à chaque appel
12. **`build.py:load_page()`** — parser le frontmatter avec une regex plutôt que `split("---", 2)`
13. **Mesurer et documenter le temps de build** à l'échelle actuelle (349 pages générées, OG images PIL par outil)

---

## Ce qui n'est PAS de la dette (dépendances humaines déjà trackées)

`base_url` placeholder, `ads_enabled: false`, IDs affiliés non trackés, `formspree_id`
vide : tout est intentionnel et documenté avec précision dans `HUMAN_INPUTS.md` comme
des étapes qui reviennent à l'humain (enregistrement de domaine, VPS, candidature
AdSense, inscription aux programmes affiliés). Ne pas les traiter comme des bugs de code.
