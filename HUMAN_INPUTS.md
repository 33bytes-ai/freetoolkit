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

### A2. Hébergement (Cloudflare Pages, gratuit)
Migré le 2026-07-29 depuis un VPS Hetzner (CPX12, ~13,79€/mois) vers
**Cloudflare Pages** — le VPS était justifié par GoAccess (analytics sur
logs serveur bruts, zéro tracking JS), mais **Cloudflare Web Analytics**
offre la même promesse "zéro cookie / zéro tracking" gratuitement, déjà
disponible puisque le domaine est déjà chez Cloudflare — ce qui rend le VPS
inutile. Serveur, firewall, clé SSH et IPs supprimés le 2026-07-29.

1. Build : `pip install -e . && python src/freetoolkit/build.py` → dossier `dist/`
2. Déploiement : `wrangler pages deploy dist --project-name=foundercalc`

### A2bis. Clôture complète du compte Hetzner (⚠️ à partir du 2026-08-04)
Ressources supprimées, mais le compte Hetzner n'est pas encore fermé — le
crédit (25€, prépaiement lié à la vérification d'identité) reste bloqué
tant que ce n'est pas fait. La facture finale n'est générée que le 4 de
chaque mois (facturation Hetzner), donc rien à faire avant.
1. [accounts.hetzner.com](https://accounts.hetzner.com) → **Invoices → Overview** — vérifier que la facture finale est apparue
2. **Invoices → Transactions** — confirmer que le crédit l'a couverte automatiquement
3. **Settings → Delete user account** — fermer le compte
4. Écrire à **cda-review@hetzner.com** pour demander le remboursement du solde de crédit restant
3. Domaine personnalisé attaché au projet Pages ; DNS = CNAME vers
   `foundercalc.pages.dev`, proxy Cloudflare activé (SSL géré automatiquement)
4. Stats : activer Cloudflare Web Analytics dans le dashboard (remplace GoAccess)

### A3. Soumettre le sitemap aux moteurs (~10 min, gratuit)
1. [Google Search Console](https://search.google.com/search-console) → ajouter la propriété `foundercalc.dev` → soumettre `sitemap_index.xml`
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) → même démarche

⚠️ **En attente (2026-07-28)** : GSC affiche « Impossible de récupérer le
sitemap » après soumission. Vérifié côté serveur — XML valide, HTTP 200,
`content-type` correct, répond même avec un user-agent Googlebot — rien
d'anormal détecté depuis l'extérieur. Probablement juste le délai normal
GSC avant premier crawl (jusqu'à 24-48h). À revérifier le 2026-07-29 ; si
toujours en échec, regarder Cloudflare Dashboard → Security → Bot Fight
Mode (le token API actuel n'a pas la permission de vérifier ce réglage).

### A4. Monitoring d'uptime (optionnel, ~10 min, gratuit)
Un healthcheck externe tourne déjà automatiquement dès que A1 est fait (voir
`docs/DEPLOYMENT.md` § Uptime monitoring) : `.github/workflows/uptime.yml`
ping le domaine toutes les 15 min et une alerte GitHub par email part si le
site tombe — rien à faire pour ça. Optionnel, seulement si tu veux plus que
des emails (SMS, appel, checks multi-régions) :
1. Créer un compte [UptimeRobot](https://uptimerobot.com) (ou [Better Uptime](https://betteruptime.com)), plan gratuit
2. Ajouter un moniteur HTTP(S) pointant vers `foundercalc.dev`
3. Configurer les contacts d'alerte (email/SMS/Slack selon le plan)
4. *Optionnel* : pour aussi router les alertes du workflow GitHub Actions vers Slack/Discord, créer un webhook entrant et me transmettre l'URL — je l'ajoute comme secret `UPTIME_WEBHOOK_URL` du repo

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
2. [Chargebee Solution Partner Program](https://www.chargebee.com/partners/solution-partner-program/) (commission sur les nouveaux clients référés — Lemon Squeezy retiré : son "affiliate" est par marchand individuel, pas une commission de parrainage plateforme)
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

### E1. ~~Créer le statut auto-entrepreneur / micro-entreprise~~ ✅ fait le 2026-08-05
Micro-entreprise immatriculée, SIREN 934129537 / SIRET 93412953700023, APE
6201Z, franchise en base de TVA. Elle couvre aussi `aco` et `aams` — voir
`../ENTITY_STRUCTURE.md`. L'identité est publiée sur `/legal-notice/`
(alimentée par `site.legal` dans `content/config.yaml`).

Il reste la déclaration récurrente, ci-dessous — c'est le seul point E encore
ouvert, et il est obligatoire même à 0 € de CA.

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
- Monitoring d'uptime (`.github/workflows/uptime.yml`) — s'active tout seul dès que `base_url` pointe vers le vrai domaine (voir A4)

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
| URL webhook Slack/Discord (optionnel, A4) | Ajout du secret repo `UPTIME_WEBHOOK_URL` |
