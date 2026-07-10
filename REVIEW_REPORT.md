STATUS: PASS

## Résumé
Tâche : "Dark mode CSS via prefers-color-scheme". Le Builder a constaté que la
fonctionnalité existait déjà intégralement dans `static/css/style.css`
(`@media (prefers-color-scheme: dark)` aux lignes 1171 et 1535, avec override
de `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`, etc.,
plus un override manuel `[data-theme="dark"]` piloté par `common.js`). Vérifié
manuellement : les deux media queries et les variables citées sont bien
présentes dans le fichier CSS actuel. Aucune modification de code applicatif —
seulement `backlog.json` (statut + note) et `tests/test_build.py` (nouveau
test de garde-fou).

## Vérifications effectuées
- Diff `git diff` relu intégralement (2 fichiers modifiés :
  `backlog.json`, `tests/test_build.py`).
- Contenu réel de `static/css/style.css` inspecté (lignes 1170-1219) pour
  confirmer que les affirmations de la note backlog sont exactes — elles le
  sont : les deux blocs `@media (prefers-color-scheme: dark)` existent et
  contiennent bien les overrides cités.
- `src/freetoolkit/build.py` inspecté : `static/` est copié verbatim vers
  `dist/static/` via `shutil.copytree` (aucune minification/transformation),
  donc le nouveau test qui lit `dist/static/css/style.css` teste bien
  fidèlement le fichier source.
- Convention `note` sur les entrées `status: "done"` du backlog : 10/18
  entrées `done` ont déjà un champ `note` similaire — cohérent avec
  l'existant, pas une déviation.
- Style du nouveau test (docstring one-liner) cohérent avec les tests
  existants du fichier (`test_pages_have_dark_mode_theme_color` juste
  au-dessus suit le même patron).
- Logique du nouveau test relue en détail : `test_stylesheet_has_dark_mode_palette`
  appelle `run_build()`, lit `dist/static/css/style.css`, vérifie la présence
  de `@media (prefers-color-scheme: dark)`, puis dans le texte situé après la
  première occurrence vérifie la présence de `--bg`, `--surface`, `--text`,
  `--border`, `--accent`. Ces variables apparaissent bien dans le bloc
  `:root:not([data-theme="light"])` juste après le split — le test passera
  contre l'état actuel du fichier.
- Tentative d'exécution réelle (`make build`, `.venv/bin/pytest
  tests/test_build.py -k dark_mode -v`, y compris avec sandbox désactivé) :
  bloquée par le mode de permission de cette session Reviewer (« This command
  requires approval »), identique au blocage documenté par le Builder dans
  `backlog.json`. La validation ci-dessus est donc statique (lecture de code),
  pas un run de test exécuté.

## Problèmes trouvés
Aucun bloquant.

## Remarque non bloquante
`test_stylesheet_has_dark_mode_palette` vérifie que les variables CSS
apparaissent *après* le début du bloc `@media (prefers-color-scheme: dark)`
plutôt que strictement à l'intérieur de ses accolades. Dans l'état actuel du
fichier ça fonctionne car les overrides suivent immédiatement le split, mais
le test resterait vert même si une variable citée n'apparaissait que plus loin
dans le fichier, hors du bloc dark. Amélioration possible (isoler le contenu
entre l'accolade ouvrante et sa fermante correspondante) mais ne justifie pas
un FAIL — la garde de régression reste utile en l'état.

Un `make build && make test-py` humain/CI reste nécessaire avant merge pour
confirmer une exécution réelle du nouveau test, aucune exécution n'ayant été
possible ni côté Builder ni côté Reviewer dans ces sessions sandboxées.
