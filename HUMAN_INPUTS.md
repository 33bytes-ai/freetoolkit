# Human Inputs Required

Checklist complète des étapes qui reviennent à toi seul avant que le site
génère du revenu légalement encaissable. Rien ici n'est automatisable par
Claude — création de comptes tiers, informations bancaires/fiscales, et
démarches administratives nominatives.

Mis à jour : 2026-07-10. Domaine retenu après vérification RDAP :
**`foundercalc.dev`** (`.com` et `.app` déjà pris).

---

## Catégorie A — Mise en ligne technique

### A1. Enregistrer le domaine (~15 min, ~10€/an)
1. Aller chez [Cloudflare Registrar](https://cloudflare.com/registrar/) (~10,44$/an, prix coûtant, pas de marge) ou [Porkbun](https://porkbun.com) (~11,06$/an, tarif stable)
2. Enregistrer `foundercalc.dev`
3. Une fois fait, redonner la main pour que `base_url` soit mis à jour dans `content/config.yaml` et le site rebuild

### A2. Créer et configurer le VPS (~20 min, ~4,50-6€/mois)
1. Créer un VPS chez [Hetzner](https://hetzner.com) (CX22, ~4,50€/mois, EU) ou DigitalOcean (~4$/mois)
2. Pointer le A record du domaine vers l'IP du VPS
3. Une fois le VPS accessible en SSH, redonner la main — `scripts/deploy.sh` et `infra/nginx.conf` sont déjà prêts, le déploiement + TLS (Certbot) peuvent être faits ensemble

### A3. Soumettre le sitemap aux moteurs (~10 min, gratuit)
1. [Google Search Console](https://search.google.com/search-console) → ajouter la propriété `foundercalc.dev` → soumettre `sitemap_index.xml`
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) → même démarche

---

## Catégorie B — Monétisation : AdSense

### B1. Candidater (~10 min à remplir, 2-4 semaines de review)
1. Aller sur [adsense.google.com](https://adsense.google.com), se connecter avec un compte Google
2. Renseigner l'URL du site (une fois en ligne — le site doit être accessible publiquement pour candidater) et une adresse postale (utilisée à des fins fiscales)
3. Coller le tag de vérification `<script>` fourni par Google — je peux l'intégrer dans `templates/base.html` si tu me donnes le tag exact
4. **Astuce approbation :** 15-20 visiteurs organiques réels/jour aide la review — envisager de partager le site sur IndieHackers/Reddit/Twitter avant de candidater

### B2. Une fois approuvé
1. Récupérer le **Publisher ID** (format `ca-pub-XXXXXXXXXXXXXXXX`)
2. Me le transmettre — je mets `ads_enabled: true` et `adsense_client_id` dans `content/config.yaml` et rebuild

### B3. Configurer le paiement (à faire une fois que le solde approche 100$)
1. Dans AdSense → Paiements → ajouter un compte bancaire à ton nom, dans le pays de ton profil AdSense
2. Vérifier le compte via les 2 micro-dépôts test que Google envoie (2-3 jours ouvrés)
3. **Soumettre le formulaire fiscal W-8BEN** (obligatoire pour un non-résident US) — sans ça, Google retient 24% par défaut ; avec le formulaire, le taux tombe généralement à 0% grâce à la convention fiscale France-US
4. ⚠️ Ce formulaire expire à la fin de la 3ème année civile pleine suivant la signature — à ressoumettre périodiquement

---

## Catégorie C — Monétisation : affiliation

### C1. S'inscrire aux programmes affiliés (~15-30 min chacun)
Comptes à créer toi-même (infos personnelles/IBAN requises, non déléguables) :
1. [Paddle Partners](https://paddle.com) (ou équivalent selon les outils SaaS pertinents)
2. [Lemon Squeezy Affiliates](https://lemonsqueezy.com)
3. FreshBooks (programme affilié comptabilité, pertinent pour l'audience freelance)
4. Tout autre programme pertinent identifié dans `content/affiliates.yaml`

### C2. Une fois les IDs obtenus
Me transmettre les IDs de tracking — je remplace tous les placeholders `YOURID` dans `content/affiliates.yaml` et rebuild (mécanique, quelques minutes).

---

## Catégorie D — Distribution / croissance

### D1. Formspree (~5 min, gratuit)
1. Créer un compte sur [formspree.io](https://formspree.io) (email + CGU, pas de vérification d'identité connue à ce jour)
2. Créer un formulaire, récupérer l'ID à 8 caractères
3. Me le transmettre — je le mets dans `formspree_id` (`content/config.yaml`)

### D2. Présence Twitter/X (optionnel, gratuit)
1. Créer un compte dédié au projet si tu veux ce canal de distribution
2. Me transmettre le handle — je le mets dans `content/config.yaml` (`twitter`)
3. **Décision stratégique déjà actée :** pas de publicité payante au lancement — miser sur Twitter/IndieHackers/Reddit (gratuit) plutôt que du paid ads, tant que le RPM réel n'est pas connu

---

## Catégorie E — Administratif / fiscal (France)

⚠️ Information générale, pas un conseil fiscal personnalisé — à valider avec un comptable ou directement sur les portails officiels pour ta situation exacte.

### E1. Créer le statut auto-entrepreneur / micro-entreprise
1. Point d'entrée unique et obligatoire depuis 2023 : [formalites.entreprises.gouv.fr](https://formalites.entreprises.gouv.fr) (guichet unique INPI, aussi accessible via `procedures.inpi.fr`)
2. Créer un compte, s'identifier (les démarches sensibles demandent désormais une signature électronique via FranceConnect+)
3. Choisir l'activité : revenus AdSense + affiliation se déclarent en **BIC Services**
4. Recevoir le SIRET une fois la formalité traitée

### E2. Déclarations récurrentes
1. Déclarer le chiffre d'affaires à l'URSSAF **chaque mois ou trimestre selon l'option choisie** — obligatoire même à 0€ de CA, aucun seuil d'exemption
2. Seuils 2026 à connaître (très loin des scénarios envisagés, mais bon à savoir) : franchise de TVA à 25 000€/an de CA cumulé toutes activités
3. Pénalité en cas d'oubli de déclaration : 750€, +750€ par mois de retard

### E3. Ressources officielles
- [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr) — portail de référence
- [economie.gouv.fr — Comment créer une micro-entreprise](https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/comment-creer-une-micro-entreprise)

---

## Ce qui tourne déjà automatiquement (rien à faire)

- Le site est servi par nginx, aucun process backend
- GoAccess génère un rapport de trafic hebdomadaire depuis les logs
- `scripts/deploy.sh` gère les futures mises à jour de code/contenu en une commande
- Rotation des logs via `logrotate`
- Renouvellement TLS automatique via le timer systemd de Certbot
- Ajout de nouveaux outils via `scripts/new_tool.py` + un redeploy

---

## Ce que je peux faire dès que tu me donnes les infos ci-dessus

| Info à me transmettre | Action automatisée |
|---|---|
| Domaine enregistré | Mise à jour `base_url`, rebuild |
| Accès SSH au VPS | Déploiement complet + TLS |
| Publisher ID AdSense | `ads_enabled: true` + `adsense_client_id`, rebuild |
| IDs affiliés | Remplacement des placeholders `YOURID`, rebuild |
| ID Formspree | `formspree_id`, rebuild |
| Handle Twitter | Ajout dans `config.yaml`, rebuild |
