STATUS: PASS

## Scope
Pages pays Stripe programmatiques : `content/countries.yaml` (nouveau), `templates/intent_country.html`
(nouveau), `src/freetoolkit/build.py` (`stripe_fee_breakdown`, `load_countries`, câblage du render loop),
`content/intent_pages.yaml` (suppression des entrées prose uk/canada/australia/india au profit du
mécanisme programmatique), `static/js/tools/stripe-fee-calculator.js` (fix `restoreHash`),
`tests/test_build.py` (8 nouveaux tests), `PROJECT_STATE.md` / `backlog.json` (tracking).

## Suivi du round de review précédent
Le round précédent avait trouvé **STATUS: FAIL** sur un bug réel : `restoreHash()` testait `if (s.cf)`
(vérité JS), donc `domestic_fixed: 0` pour l'Inde (`content/countries.yaml:91`) était ignoré au clic sur
le CTA — le champ "Fixed fee" restait à sa valeur HTML par défaut (`0.30`) au lieu d'être mis à `0`,
faussant le calcul affiché.

Ce bug est corrigé dans le diff actuel :
```
-      if (s.cp) customPct.value = s.cp;
-      if (s.cf) customFixed.value = s.cf;
+      if (s.cp !== undefined) customPct.value = s.cp;
+      if (s.cf !== undefined) customFixed.value = s.cf;
```
Vérifié par relecture ligne à ligne de `restoreHash()`/`getParams()` (`static/js/tools/stripe-fee-calculator.js`)
et de `hashGet`/`hashSet` (`static/js/lib/common.js`) contre les valeurs de `content/countries.yaml` (y
compris `domestic_fixed: 0` pour l'Inde) : le hash encodé par `load_countries()` en Python
(`cp`/`cf`/`a`/`t`) est maintenant restauré à l'identique côté client pour tous les pays, y compris ceux
à fixed fee nul.

## Problèmes trouvés
Aucun bloquant identifié dans ce round.

## Points positifs
- La migration de `content/intent_pages.yaml` (suppression uk/canada/australia/india, conservation
  germany/france) préserve les URLs existantes (`stripe-fees-<pays>`) — aucun changement de slug, donc
  pas de churn sitemap/backlinks. Vérifié qu'aucune référence orpheline aux anciennes entrées ne subsiste
  ailleurs dans le repo.
- Le câblage dans `build.py` (`load_countries()` concaténé à `load_intent_pages()`, sélection de
  template `intent_country.html` vs `intent_page.html` via le flag `is_country_page`, `country_pages`
  pour le cross-linking) réutilise proprement le code existant de sitemap / "Related guides" / navigation
  prev-next sans dupliquer de logique. `tool.html` et `intent_page.html` accèdent uniquement à des champs
  présents sur les pages pays (slug/parent_tool/title), donc aucun risque de casse côté pages non-pays.
- Les blocks Jinja de `intent_country.html` (`og_type`, `og_image`, `twitter_image`, `head_extra`,
  `content`) correspondent exactement à ceux définis dans `base.html`.
- CSP respectée : les deux blocs `<script type="application/ld+json">` portent `nonce="{{ csp_nonce }}"`,
  aucun attribut `onclick` ni gestionnaire inline.
- L'encodage `quote(json.dumps(...))` côté Python est équivalent à `encodeURIComponent` pour les
  caractères présents dans le hash, et se décode correctement via `decodeURIComponent` + `JSON.parse`
  côté client.
- Les 8 tests ajoutés à `tests/test_build.py` suivent les conventions existantes (`run_build()`,
  structure des assertions), et couvrent la génération des URLs, le contenu par pays, le deep-link
  pré-rempli (assertion sur les valeurs décodées, y compris `cf` pour l'Inde), le cross-linking entre
  pages pays, le listing sur la page outil, et le sitemap. `EXPECTED_FILES` est correctement étendu.

## Note
`make build` / `make test-py` n'ont pas pu être exécutés dans cette session (permission mode bloque toute
commande shell non triviale, "This command requires approval", reproduit y compris avec
`python3 -c "print(...)"` et `ast.parse` en lecture seule) — même restriction documentée par le Builder
et par le round de review précédent. Revue basée sur une lecture statique complète du diff et une trace
manuelle du flux hash JS contre `content/countries.yaml`. Une exécution réelle de
`make build && make test` reste recommandée avant merge pour confirmer que les 8 nouveaux tests passent
tels qu'écrits et qu'aucune régression n'apparaît dans le reste de la suite.
