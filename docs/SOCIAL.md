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

## Vidéos courtes (YouTube Shorts, Instagram Reels, TikTok, Snapchat Spotlight)

Les comptes s'ouvrent dans le wizard (`make setup`, porte « audience », une étape
par plateforme). Chaque compte enregistré est déclaré en `sameAs` dans le JSON-LD
`Organization` du site, ce que la vérification du wizard relit. La production des
vidéos n'est pas encore codée. Piste : HyperFrames (HTML → MP4, Apache 2.0) sur la
page `/embed/<outil>/`, avec les chiffres du brouillon X déjà validés par
`gate.py`.

### Format : une vidéo = un chiffre

Ces fils décident en 1 à 3 secondes si la vidéo continue d'être montrée : le taux
de visionnage complet et les revisionnages pèsent plus que les likes. Tout le
format sert à ça.

| Élément | Règle |
|---|---|
| Cadre | Vertical 9:16, 1080×1920, 30 i/s |
| Durée | 15 à 30 s. Plus court = plus de vidéos vues jusqu'au bout |
| Seconde 0 | Le chiffre surprenant **à l'écran dès la première image**, pas de logo ni d'intro. Ex. « Stripe te prend 3,20 $ sur 100 $ » |
| Structure | Accroche (0-2 s) → saisie réelle dans le calculateur, accélérée (2-15 s) → résultat agrandi (15-22 s) → une phrase qui fait relire ou commenter |
| Rythme | Un changement visuel toutes les 1,5 à 2 s (zoom, valeur qui change, surlignage) |
| Texte | Sous-titres incrustés en gros. La majorité regarde sans le son. 6 mots maximum à l'écran |
| Zones sûres | Rien d'important dans les 20 % du bas ni les 15 % de droite : légende, boutons et pseudo de l'app les couvrent |
| Fin | Boucle : la dernière image renvoie à la première pour que le revisionnage s'enchaîne |
| CTA | « Calculateur gratuit, lien dans la bio ». Jamais d'URL à l'écran |
| Son | Voix off ou musique libre de droits de la plateforme. Pas de musique commerciale ajoutée hors app |

### Diffusion

- **Un fichier propre par plateforme**, sans filigrane : Instagram et YouTube
  déclassent les vidéos qui portent le logo TikTok.
- **Pas tout le même jour** : la même règle « un canal à la fois » que pour les
  posts. Commencer par une plateforme, mesurer, puis étendre.
- **Mesure** : chaque bio porte `utm_source=<plateforme>&utm_medium=social&utm_campaign=bio`.
  Lire les visites par source dans Cloudflare Web Analytics après 3 à 4 semaines.
- **Publication automatique** : YouTube et TikTok publient en privé tant que leur
  application d'API n'a pas passé l'audit. Instagram exige un compte
  professionnel. Snapchat Spotlight n'a pas d'API publique de publication : il
  reste manuel.
