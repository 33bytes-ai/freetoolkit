STATUS: PASS

## Résumé
Le Builder a ajouté 2 URLs (`/tools/stripe-fee-calculator/stripe-fees-for-subscriptions/` pour `intent_page.html`, `/tools/stripe-fee-calculator/stripe-fees-uk/` pour `intent_country.html`) à la liste `urls` du job Lighthouse CI dans `.github/workflows/ci.yml`, portant l'échantillon à 5 URLs couvrant les 5 templates. Ajout d'un test de garde-fou dans `tests/test_build.py`, et mise à jour cohérente de `BACKLOG.md`, `backlog.json` et `PROJECT_STATE.md`.

## Vérifications effectuées
- Les deux URLs correspondent exactement aux données sources (`content/intent_pages.yaml` premier élément, `content/countries.yaml` slug `uk`) — pas d'URL inventée.
- `.lighthouserc.json` n'a pas de filtre d'URL propre : les 5 URLs listées dans `ci.yml` sont bien celles auditées par `treosh/lighthouse-ci-action`.
- Exécution de `pytest tests/test_build.py -k lighthouse -v` : 3/3 tests passent (~6s), y compris le nouveau test.
- Le nouveau test vérifie à la fois la présence textuelle des URLs dans le bloc `urls:` du workflow ET leur existence réelle dans `dist/` après build — bon garde-fou contre un renommage de slug qui rendrait le check silencieusement inopérant.
- `git status` : aucun fichier parasite (pas de nouveaux `*_tmp.txt`, pas de fichiers non trackés oubliés).
- Les mises à jour de `BACKLOG.md`/`backlog.json`/`PROJECT_STATE.md` sont scoping-correctes : seule la ligne de cette tâche passe à `done`, la dette correspondante dans `PROJECT_STATE.md` est retirée sans toucher aux autres lignes.
- Pas de changement de template/JS/CSS — cohérent avec une tâche purement CI/config, donc pas de risque CSP à vérifier ici.

## Problèmes trouvés
Aucun.

## Notes (non bloquantes)
- Le Builder n'a pas pu déclencher un vrai run GitHub Actions Lighthouse pour confirmer que les 2 nouvelles pages passent effectivement les seuils (`performance ≥0.90`, `seo ≥0.95`) — c'est attendu vu l'environnement sandboxé, à confirmer au prochain push/PR réel.
