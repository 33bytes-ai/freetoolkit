# Posts X automatiques

Un post original par jour sur le compte X du site, rédigé à partir d'un vrai
outil. Le code est dans `scripts/social/`, les workflows dans
`.github/workflows/social-{draft,publish}.yml`, l'étape humaine dans le wizard
(`make setup`, étape « Un post X par jour, tout seul »).

## Chemin d'un post

1. `social-draft.yml` (06:00 UTC) choisit l'outil le moins récemment posté, demande
   au modèle `hook`, `value`, `cta_text` et le calcul qui produit ses chiffres.
2. `scripts/social/gate.py` refuse le post si : plus de 280 caractères (CTA inclus) ;
   un chiffre n'est ni dans le texte de l'outil ni dans le résultat de la vraie
   fonction JS (`static/js/tools/<outil>.js`, exécutée par Node) ; le hook a déjà
   servi ; l'outil a été posté dans les 30 derniers jours ; le CTA ne renvoie pas
   à la bio ; la page de l'outil porte des liens affiliés et le CTA ne le dit pas.
   Trois essais, puis rien : pas de post vaut mieux qu'un mauvais.
3. Le fichier `social/queue/<date>.json` arrive dans un PR. **Le merger approuve.**
   Avec `site.social_auto_approve: true` (`content/config.yaml`), il est commité
   directement sur `main`. À activer après environ deux semaines de brouillons relus.
4. `social-publish.yml` (09:00 UTC) publie le fichier du jour par l'API officielle
   et le déplace dans `social/posted/` avec son `x_id`.

## Choix à ne pas défaire sans les relire

- **Aucune URL dans le post, le lien est dans la bio.** X facture 0,20 $ un post qui
  contient une URL, 0,015 $ un post sans (page de tarifs de l'API X, septembre 2026) :
  environ 0,45 $ par mois contre 6 $. Le lien de la bio porte
  `utm_source=x&utm_medium=social&utm_campaign=bio`.
- **API officielle uniquement.** Les règles d'automatisation de X interdisent le
  scraping et l'automatisation du navigateur, au risque de la suspension du compte.
  Le compte porte le label « Automated » et le dit dans sa bio.
- Pas de réponses ni de mentions automatiques, pas de posts sur les sujets tendance.

## Mesure

Pas de code. Après trois à quatre semaines, lire dans Cloudflare Web Analytics les
visites dont la source est `x` (`utm_campaign=bio`) et les comparer aux impressions du
compte. Le lien étant unique, on mesure le canal, pas le post : pour savoir quel format
fait cliquer, regarder les posts les plus vus dans l'analytics du compte X.
Décider alors de garder, changer ou arrêter ; l'arrêt, c'est désactiver les deux workflows.

## En local

```bash
ANTHROPIC_API_KEY=... make social-draft    # écrit social/queue/<demain>.json
make social-publish                        # dry run du post d'aujourd'hui
make social-publish LIVE=1                 # le publie vraiment (4 clés X dans l'environnement)
```
