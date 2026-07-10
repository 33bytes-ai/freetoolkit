STATUS: PASS

## Résumé
Le Builder remplace le mécanisme FAQPage JSON-LD basé sur `content/faqs.yaml`
(curation manuelle, désynchronisée du contenu réel — seulement 72/106 tools,
clés dupliquées, questions ne correspondant pas au texte visible) par une
extraction automatique : `extract_faqs_from_body()` dans `src/freetoolkit/build.py`
parse la section `## Frequently asked questions` du markdown `body` de chaque
outil (déjà présent dans `content/tools.yaml` pour 67/106 tools) et en déduit
les paires question/réponse via un motif "ligne **en gras** = question, suivie
d'un paragraphe = réponse". Le template `templates/tool.html` n'a pas changé
(toujours `{% if tool_faqs %}` / `tojson`), donc l'échappement JSON et le
`nonce` CSP restent corrects.

## Vérifications effectuées
- Relecture complète du diff (`content/tools.yaml`, `scripts/new_tool.py`,
  `src/freetoolkit/build.py`, `tests/test_build.py`, suppression de
  `content/faqs.yaml`).
- Recherche de références résiduelles à `faqs.yaml` / `load_faqs` dans tout le
  repo (hors `dist/`) : aucune, à part la note explicative dans `backlog.json`.
- Analyse statique de la regex d'extraction (`FAQ_HEADER_RE`, `NEXT_HEADER_RE`,
  `BOLD_LINE_RE`) contre les 67 sections `## Frequently asked questions`
  réellement présentes dans `content/tools.yaml` (grep sur toutes les lignes
  intégralement en gras du fichier) : les ~92 lignes en gras qui ne sont pas
  des questions (formules, glossaires type `**ARR = MRR × 12**`,
  `**Use MRR when:**`) se trouvent toutes dans des sections *avant* le header
  FAQ de leur outil respectif — aucune ne tombe dans une section FAQ, donc pas
  de faux positif actuel.
- Vérification manuelle que le texte cité par le nouveau test
  `test_faq_schema_matches_visible_faq_text` ("rate change based on volume",
  "Can I use this for Stripe Connect?") existe bien dans le body de
  `stripe-fee-calculator` (lignes 127 et 137 de `content/tools.yaml`).
- Vérification que `from freetoolkit.build import extract_faqs_from_body`
  (nouvel import local dans le test) est résoluble : le package est bien
  installé en editable dans `.venv` (`_editable_impl_freetoolkit.pth`).
- Tentative d'exécution réelle de `make build` / `pytest` / `python3 -c ...` :
  bloquée par le mode de permission du sandbox Reviewer (« This command
  requires approval »), même restriction que celle documentée par le Builder
  dans `backlog.json`. Impossible de faire tourner la suite de tests dans cette
  session — l'analyse ci-dessus est donc statique, pas une exécution vérifiée.

## Conformité CLAUDE.md
- Pas de handler inline, pas de nouveau script inline nonce-less — le seul
  bloc `<script type="application/ld+json">` concerné (`templates/tool.html`)
  a déjà `nonce="{{ csp_nonce }}"` et n'a pas été modifié.
- Commentaires ajoutés (docstring de `extract_faqs_from_body`, docstring du
  test `test_faq_schema_matches_visible_faq_text`) expliquent un WHY non
  évident (éviter la dérive schema/contenu visible) — conforme à la règle
  "no comments unless the WHY is non-obvious".
- Pas d'abstraction inutile ni de shim de rétrocompatibilité ; `load_faqs()`
  et `content/faqs.yaml` sont supprimés proprement plutôt que dépréciés.

## Problèmes trouvés
Aucun bloquant. Deux points mineurs, non bloquants :

1. **Robustesse silencieuse de la regex** (`src/freetoolkit/build.py`,
   `extract_faqs_from_body`) — le parseur suppose implicitement que la section
   FAQ est toujours la dernière section `##` du body et qu'aucune ligne
   entièrement en gras n'y apparaît sauf les questions. C'est vrai pour les 67
   sections FAQ actuelles, mais rien ne le garantit structurellement : un futur
   éditeur de contenu qui ajouterait une section après la FAQ, ou une ligne de
   type `**Note:**` à l'intérieur d'une FAQ, casserait silencieusement le
   pairage question/réponse (pas d'erreur, juste un mauvais couple Q/R dans le
   JSON-LD). Pas d'action requise maintenant, mais à garder en tête si un futur
   tool ajoute du contenu après sa FAQ.
2. **Tests non exécutés dans cette session** — je n'ai pas pu lancer
   `make build && make test-py` (permissions sandbox), donc la validation
   repose sur une relecture statique du diff et des données, pas sur un run
   réel. Le Builder a le même problème documenté dans `backlog.json`. Un
   `make build && make test-py` humain/CI reste nécessaire avant merge pour
   confirmer que `dist/tools/*/index.html` contient bien le FAQPage attendu.
