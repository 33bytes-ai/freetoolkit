STATUS: PASS

## Résumé
Le correctif de `flash()` dans `static/js/lib/common.js` résout bien le bug décrit : un bouton dont le label change ailleurs entre deux appels de `flash()` ne revient plus vers un texte obsolète.

## Détails de l'implémentation
Le Builder n'a pas fait un "reset inconditionnel à chaque appel" au sens littéral de la consigne, mais une version plus robuste :
- `el._ftkFlashTimer` sert de marqueur d'état "flash en cours".
- Si un flash est déjà en cours (timer actif) → on annule l'ancien timer et on NE recapture PAS `textContent` (qui contiendrait "Copied!", pas le vrai texte d'origine).
- Sinon (pas de flash en cours) → on recapture `dataset.originalText` à partir du `textContent` courant avant de le modifier.

C'est une déviation justifiée par rapport à un reset inconditionnel : un reset naïf à chaque appel casserait le cas double-clic / appels rapprochés (le second appel capturerait "Copied!" comme "original", et le bouton resterait bloqué sur "Copied!" après le premier timer). La solution retenue couvre à la fois le bug décrit et ce cas limite préexistant — c'est justement le bug qu'une version précédente de ce correctif avait introduit (voir historique de ce rapport), et qui est désormais couvert par un test dédié.

## Vérifications effectuées
- Relecture du diff (`git diff static/js/lib/common.js tests/test_tools.js`).
- Recherche de tous les appelants de `FTK.flash(...)` dans `static/js/tools/` : aucun appel séquentiel synchrone problématique (les appels multiples observés sont dans des branches if/else mutuellement exclusives).
- Exécution de la suite JS complète (`node --test tests/test_tools.js`) : 557/557 tests passent.
- 3 nouveaux tests ajoutés, pertinents et couvrant : le comportement de base, le bug décrit (label changé entre deux flashes), et le cas limite du double appel avant expiration du premier timer.
- Style conforme aux conventions du projet (pas de commentaires superflus dans le code de prod, tests suivent le pattern `----` existant de `test_tools.js`).
- `backlog.json` : simple passage de statut `pending` → `done`, cohérent avec le pipeline orchestrateur.

## Problèmes trouvés
Aucun.
