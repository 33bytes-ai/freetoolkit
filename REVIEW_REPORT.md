STATUS: PASS

## Résumé
Revue du diff non commité : `scripts/uptime_check.sh` (nouveau),
`.github/workflows/uptime.yml` (nouveau), `docs/DEPLOYMENT.md`,
`HUMAN_INPUTS.md`, `backlog.json`, `tests/test_build.py`.

## Vérifications effectuées
- `scripts/uptime_check.sh` relu ligne à ligne : `set -euo pipefail`
  correct, dédup down/up via state file correcte, échappement JSON minimal
  mais suffisant pour l'usage (pas de retour à la ligne dans les messages),
  code de sortie 0/1 cohérent avec ce qu'attendent les tests et le workflow.
- Les 5 nouveaux tests (`test_uptime_check_script_is_executable`,
  `test_uptime_check_script_detects_up_and_down`, `test_uptime_check_requires_url`,
  `test_uptime_workflow_self_activates_on_real_domain`,
  `test_human_inputs_documents_uptime_webhook_secret`) sont pertinents et
  testent un vrai comportement fonctionnel (serveur HTTP local up/down, pas
  seulement la syntaxe).
- Suite complète relancée en isolation (les premiers runs concurrents ont
  produit de fausses failures par contention de ressources, écartées après
  un run propre) : `280 passed` sur `tests/test_build.py` (~20 min) et
  `557/557` côté JS (`node --test tests/test_tools.js`), conforme à la note
  du backlog.
- Documentation (`docs/DEPLOYMENT.md`, `HUMAN_INPUTS.md`) cohérente avec le
  code, format aligné sur les entrées A1-A3 existantes. `backlog.json`
  correctement mis à jour (`status: done` + note détaillée, conforme au
  style des autres entrées `done`).
- Aucun template/JS de widget touché → pas de risque CSP/nonce/handler
  inline à vérifier pour ce diff.
- Permissions d'exécution sur `scripts/uptime_check.sh` correctes sur le
  disque (rwxrwxr-x).

## Problèmes trouvés

1. (mineur, non confirmé — à vérifier avant de compter dessus en prod)
   Dans `.github/workflows/uptime.yml`, l'étape "Read base_url from
   content/config.yaml" fait `python3 -c "import yaml; ..."` sans installer
   PyYAML au préalable (pas de `pip install`, pas de `actions/setup-python`
   suivi d'un install). Le reste du projet ne fait pas cette hypothèse :
   `pyproject.toml` déclare `pyyaml` comme dépendance explicite et
   `.github/workflows/ci.yml` fait `pip install -e ".[dev]"` avant tout usage
   de `yaml`. Si le Python système des runners `ubuntu-latest` n'a pas
   PyYAML préinstallé (probable mais pas garanti — vérifié uniquement en
   local, pas sur un vrai runner GitHub), chaque exécution du cron échouera
   dès l'étape de lecture du `base_url`, avant même de checker le site — ce
   qui spammerait une alerte email GitHub toutes les 15 min pour la mauvaise
   raison (erreur de config, pas panne du site) dès que A1 sera fait. Aucun
   test de la suite ne couvre ce point puisqu'il faudrait exécuter le
   workflow réel sur GitHub Actions. À vérifier via `workflow_dispatch`
   après le premier push.

Aucun autre bug, régression ou écart aux conventions CLAUDE.md relevé.
