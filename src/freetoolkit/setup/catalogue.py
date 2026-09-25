"""Les étapes, déclarées.

Une entrée par chose que seul un humain peut faire pour FounderCalc : un compte,
une candidature, une identité fiscale, une vérification dans un tableau de bord
sans API. Chacune dit à quoi elle sert, ce qu'elle coûte, quoi cliquer, où va la
valeur saisie, et quelle vérification la prouve.

Les valeurs ne vont pas dans un .env : ce site n'a pas de secret. Elles vont dans
content/config.yaml ou content/affiliates.yaml, qui sont versionnés. Une valeur
enregistrée n'est donc en ligne qu'une fois mergée sur main — c'est pourquoi les
vérifications regardent le site servi, pas le fichier.

Rien ici ne s'exécute : checks.py prouve, webapp.py affiche. Corriger un chemin
de clics n'est jamais un changement de code.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

DOMAIN = "foundercalc.dev"
BASE_URL = f"https://{DOMAIN}"
REPO = "33bytes-ai/freetoolkit"

FieldKind = Literal["text", "select", "date"]


@dataclass(frozen=True, slots=True)
class Field:
    """Une valeur saisie, et l'endroit où elle atterrit.

    ``target`` vaut ``config:<chemin.pointé>`` pour content/config.yaml,
    ``affiliate:<Nom>`` pour toutes les cartes d'un programme dans
    content/affiliates.yaml, ou ``local:<clé>`` pour une valeur que seul le
    wizard retient (une date de demande, une périodicité)."""

    target: str
    label: str
    help: str = ""
    kind: FieldKind = "text"
    required: bool = True
    placeholder: str = ""
    choices: tuple[str, ...] = ()

    @property
    def store(self) -> str:
        return self.target.partition(":")[0]

    @property
    def key(self) -> str:
        return self.target.partition(":")[2]

    @property
    def form_name(self) -> str:
        return f"field.{self.target}"


@dataclass(frozen=True, slots=True)
class Instruction:
    """Une action. Deux clics, deux instructions."""

    text: str
    paste: str = ""
    note: str = ""
    warning: str = ""
    url: str = ""


@dataclass(frozen=True, slots=True)
class Step:
    id: str
    gate: int
    title: str
    #: Ce qui manque tant que ce n'est pas fait. Une conséquence, pas une description.
    why: str
    cost: str
    instructions: tuple[Instruction, ...]
    prerequisites: tuple[str, ...] = ()
    fields: tuple[Field, ...] = ()
    #: Ce qu'aucune vérification ne peut constater. Cocher est horodaté.
    acknowledgements: tuple[str, ...] = ()
    #: Clé dans checks.CHECKS. Vide : les confirmations sont la preuve.
    check: str = ""
    #: Ce que la vérification examine quand elle sert plusieurs étapes (un programme).
    subject: str = ""
    optional: bool = False
    unlocks: str = ""
    docs: tuple[str, ...] = field(default_factory=tuple)


PUBLISH = Instruction(
    text="Publie : la valeur est dans le fichier, pas encore sur le site. Merger sur "
         "main déclenche la CI puis le déploiement (quelques minutes).",
    paste="git switch -c config/wizard && git add content/ && "
          "git commit -m \"Record what the setup wizard collected\" && "
          "git push -u origin HEAD && gh pr create --fill && gh pr merge --merge --auto",
    note="Ou demande à Claude de le faire. La page « Ce qui reste à publier » montre "
         "le diff en attente.",
)

GATE_TITLES = {
    0: "le site tourne sans toi",
    1: "abonnements Pro",
    2: "AdSense",
    3: "affiliation",
    4: "audience",
    5: "obligations qui reviennent",
}


# ---------------------------------------------------------------------------
# GATE 0 — le site tourne sans toi
# ---------------------------------------------------------------------------

SITE_LIVE = Step(
    id="site_live",
    gate=0,
    title=f"{DOMAIN} sert le site",
    why="Tout le reste en dépend : AdSense relit le site servi, les programmes "
        "affiliés regardent la page où leur lien apparaît.",
    cost="Déjà fait : domaine chez Cloudflare, site sur Cloudflare Pages.",
    instructions=(
        Instruction(text="Rien à faire si la vérification passe. Elle ouvre la page "
                         "d'accueil, /ads.txt, /sitemap.xml et une ancienne URL de guide, "
                         "qui doit rediriger en 301 vers sa section."),
    ),
    check="site_live",
    unlocks="Le site est une base sur laquelle les autres étapes peuvent s'appuyer.",
    docs=("HUMAN_INPUTS.md §A1–A2",),
)

DEPLOY_PIPELINE = Step(
    id="deploy_pipeline",
    gate=0,
    title="Chaque merge est publié tout seul",
    why="Toutes les étapes suivantes écrivent dans content/ : sans déploiement "
        "automatique, une valeur mergée n'atteint jamais le site.",
    cost="Déjà fait : .github/workflows/deploy.yml avec deux secrets du repo.",
    instructions=(
        Instruction(text="Si la vérification échoue sur des secrets absents : GitHub → "
                         "Settings → Secrets and variables → Actions.",
                    url=f"https://github.com/{REPO}/settings/secrets/actions"),
        Instruction(text="CLOUDFLARE_API_TOKEN : un token avec la permission "
                         "« Cloudflare Pages: Edit ». CLOUDFLARE_ACCOUNT_ID : Workers & "
                         "Pages → Account ID."),
    ),
    prerequisites=("site_live",),
    check="deploy_pipeline",
    unlocks="Publier une valeur, c'est merger une PR.",
    docs=(".github/workflows/deploy.yml",),
)

WEB_ANALYTICS = Step(
    id="web_analytics",
    gate=0,
    title="Mesure d'audience (Cloudflare Web Analytics)",
    why="Sans elle, aucune idée du trafic réel : ni pour savoir si le recrawl a "
        "fait chuter les visites, ni pour la revue AdSense, qui aime voir des "
        "visiteurs organiques. Elle a remplacé GoAccess lors du départ du VPS.",
    cost="Gratuit, sans cookie. Cinq minutes.",
    instructions=(
        Instruction(text="Tableau de bord Cloudflare → Analytics & Logs → Web Analytics.",
                    url="https://dash.cloudflare.com/?to=/:account/web-analytics"),
        Instruction(text=f"Add a site → choisis {DOMAIN} dans la liste des sites "
                         "proxifiés → Done.",
                    note="Pour un domaine proxifié par Cloudflare, l'injection est "
                         "automatique : rien à coller dans les templates. La CSP du site "
                         "autorise déjà static.cloudflareinsights.com."),
        Instruction(text="Attends une minute, puis vérifie : le beacon doit apparaître "
                         "dans la page servie.",
                    note="Cloudflare ne l'injecte pas pour toutes les requêtes : un curl "
                         "peut ne pas le voir alors que l'analyse tourne. La vérification "
                         "fait la requête d'un client ordinaire."),
    ),
    prerequisites=("site_live",),
    check="web_analytics",
    unlocks="Le trafic se lit dans Cloudflare, sans outil de suivi sur le site.",
)

HETZNER_CLOSURE = Step(
    id="hetzner_closure",
    gate=0,
    title="Fermer le compte Hetzner et récupérer le crédit",
    why="Le VPS est supprimé depuis le 2026-07-29, mais le compte reste ouvert : les "
        "25 € de crédit prépayé restent bloqués tant qu'il n'est pas fermé.",
    cost="Dix minutes. Rapporte le solde du crédit.",
    instructions=(
        Instruction(text="accounts.hetzner.com → Invoices → Overview : la facture finale "
                         "est-elle apparue ? Elle est émise le 4 du mois.",
                    url="https://accounts.hetzner.com"),
        Instruction(text="Invoices → Transactions : le crédit l'a-t-il couverte ?"),
        Instruction(text="Settings → Delete user account."),
        Instruction(text="Écris à cda-review@hetzner.com pour demander le remboursement "
                         "du solde restant.",
                    paste="cda-review@hetzner.com"),
    ),
    acknowledgements=(
        "La facture finale Hetzner est payée par le crédit.",
        "Le compte Hetzner est supprimé.",
        "Le remboursement du solde est demandé à cda-review@hetzner.com.",
    ),
    docs=("HUMAN_INPUTS.md §A2bis",),
)


# ---------------------------------------------------------------------------
# GATE 1 — abonnements Pro
# ---------------------------------------------------------------------------

STRIPE_PRO = Step(
    id="stripe_pro",
    gate=1,
    title="Abonnement Pro : Stripe encaisse",
    why="La page /pro/ vend l'embed sans lien de crédit. Tant que son bouton pointe "
        "vers /contact/, chaque acheteur doit t'écrire, et la plupart ne le feront pas.",
    cost="Gratuit. Stripe prend 1,5 % + 0,25 € par paiement carte européenne. "
         "Environ 25 minutes, dont 15 pour l'activation du compte.",
    instructions=(
        Instruction(text="Ouvre le tableau de bord Stripe et connecte-toi.",
                    url="https://dashboard.stripe.com"),
        Instruction(text="Tout en haut de l'accueil, clique « Activate payments » (ou "
                         "« Complete your account setup »), puis « Start ».",
                    note="Si le bandeau n'apparaît pas, le compte est déjà activé : passe "
                         "à l'instruction « Product catalog »."),
        Instruction(text="Business location : France. Type of business : « Individual » "
                         "(Entreprise individuelle / micro-entreprise). Continue."),
        Instruction(text="Personal details : ton nom légal, e-mail, date de naissance, "
                         "adresse du domicile, téléphone. Continue."),
        Instruction(text="Business details : SIRET, secteur « Software », site web, "
                         "description du produit ci-dessous. Continue.",
                    paste="Monthly subscription to white-label embeddable business "
                          "calculators (https://foundercalc.dev/pro/)"),
        Instruction(text="Public details : libellé bancaire « FOUNDERCALC », e-mail de "
                         "support hello@foundercalc.dev. Continue."),
        Instruction(text="Bank account : colle ton IBAN. Le BIC se remplit tout seul ; le "
                         "BIC intermédiaire n'est pas demandé. Continue."),
        Instruction(text="Verify identity : choisis la carte d'identité, puis « Use your "
                         "phone » et scanne le QR code — recto, verso, selfie.",
                    warning="Photographie la carte avec le téléphone plutôt que d'envoyer "
                            "un PDF : ensuite, aucune copie de la pièce ne traîne sur "
                            "l'ordinateur."),
        Instruction(text="Review : relis, puis « Submit ». C'est fait quand le bandeau "
                         "d'activation disparaît et que le bouton « Test mode » (en haut "
                         "à droite) peut être désactivé. Désactive-le.",
                    note="Stripe peut demander un justificatif de plus dans les 48 h : "
                         "il arrive par e-mail et dans la cloche des notifications."),
        Instruction(text="Menu de gauche → « Product catalog » → « + Add product ». "
                         "Name : FounderCalc Pro. Description ci-dessous. Pricing : "
                         "« Recurring », 12,00 EUR, Billing period « Monthly ». « Add "
                         "product ».",
                    paste="White-label embeds of every FounderCalc calculator: no credit "
                          "line, your brand colour."),
        Instruction(text="Sur la page du produit, à droite du prix : « … » → « Create "
                         "payment link ». Coche « Collect customers' names », ajoute un "
                         "champ personnalisé texte « Website where you'll embed ». Onglet "
                         "« After payment » : garde « Show confirmation page » et colle le "
                         "message ci-dessous. « Create link », puis copie l'URL "
                         "https://buy.stripe.com/…",
                    paste="Thanks! Your Pro key arrives by email within one business day."),
        Instruction(text="Settings (roue dentée) → « Billing » → « Customer portal » → "
                         "« Activate link ». Coche « Cancel subscriptions ». Copie "
                         "l'URL https://billing.stripe.com/p/login/…"),
        Instruction(text="Settings → « Customer emails » : active « Successful payments ». "
                         "Settings → « Billing » → « Invoice template » → Footer : colle la "
                         "mention ci-dessous.",
                    paste="TVA non applicable, art. 293 B du CGI"),
        PUBLISH,
    ),
    prerequisites=("deploy_pipeline",),
    fields=(
        Field("config:site.pro.payment_link", "Lien de paiement Stripe",
              placeholder="https://buy.stripe.com/…"),
        Field("config:site.pro.portal_link", "Lien du portail client",
              placeholder="https://billing.stripe.com/p/login/…"),
    ),
    acknowledgements=("Le mode test est désactivé et le compte Stripe n'affiche plus de "
                      "bandeau d'activation.",),
    check="stripe_pro",
    unlocks="Le bouton de /pro/ encaisse. À chaque vente, demande à Claude d'émettre une "
            "clé Pro (son empreinte va dans site.pro.key_hashes) et envoie-la à l'acheteur.",
    docs=("content/pages/pro.md",),
)


# ---------------------------------------------------------------------------
# GATE 2 — AdSense
# ---------------------------------------------------------------------------

SEARCH_CONSOLE_API = Step(
    id="search_console_api",
    gate=2,
    title="Accès à Search Console",
    why="Le rapport « Indexation des pages » de l'interface se met à jour avec des jours "
        "de retard — il est resté figé au 4 septembre pendant douze jours. L'API dit, URL "
        "par URL et au jour même, ce que Google indexe encore, et permet de soumettre le "
        "sitemap qui le fait repasser.",
    cost="Gratuit. Dix minutes, une fois.",
    instructions=(
        Instruction(text="Google Cloud Console → le projet du client OAuth de "
                         "foundercalc-mail → APIs & Services → Library → « Google Search "
                         "Console API » → Enable.",
                    url="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"),
        Instruction(text="Google Auth Platform → Audience : si le statut est « Testing », ton "
                         "adresse doit figurer dans les test users.",
                    url="https://console.cloud.google.com/auth/audience",
                    warning="En « Testing », le token expire au bout de 7 jours et il faut "
                            "relancer make gsc-auth. « In production » l'évite : pour ton seul "
                            "compte, Google affiche un avertissement mais n'exige pas de "
                            "vérification."),
        Instruction(text="Donne au projet freetoolkit le même client OAuth :",
                    paste="install -Dm600 ~/.config/foundercalc-mail/client_secret.json "
                          "~/.config/freetoolkit/client_secret.json"),
        Instruction(text="Autorise l'accès depuis le dossier freetoolkit, avec le compte Google "
                         "propriétaire de la propriété Search Console :",
                    paste="make gsc-auth",
                    note="Le navigateur revient sur localhost:8098. Le token reste dans "
                         "~/.config/freetoolkit/, jamais dans le repo."),
    ),
    prerequisites=("site_live",),
    check="search_console_access",
    unlocks="make gsc mesure l'indexation et soumet les sitemaps.",
    docs=("CLAUDE.md § Search Console",),
)

SEARCH_CONSOLE = Step(
    id="search_console",
    gate=2,
    title="Le recrawl a vu la consolidation",
    why="AdSense a refusé le site le 7 août pour contenu à faible valeur. La "
        "consolidation (462 URL → 130) est en ligne depuis le 29 août, mais redemander "
        "l'examen pendant que Google indexe encore les 329 anciennes pages courtes "
        "appelle le même verdict.",
    cost="Gratuit. Quelques jours à quelques semaines d'attente : c'est Google qui repasse.",
    instructions=(
        Instruction(text="Soumets le sitemap des anciennes URL — il fait revenir Google sur "
                         "les 301 — et regarde où en est l'index :",
                    paste="make gsc-push && make gsc"),
        Instruction(text="Vérifie : l'étape inspecte chaque ancienne URL et passe quand moins "
                         "d'une sur dix est encore indexée. Le résultat est gardé 12 heures.",
                    warning="Les impressions chutent dans Performances pendant ce temps : "
                            "c'est mécanique, 329 URL quittent les résultats."),
    ),
    prerequisites=("search_console_api",),
    check="search_console_recrawl",
    unlocks="Le réexamen AdSense peut être demandé sans rejouer le refus.",
    docs=("HUMAN_INPUTS.md §B1", "docs/MONETIZATION.md"),
)

ADSENSE_REVIEW = Step(
    id="adsense_review",
    gate=2,
    title="Demander le réexamen AdSense",
    why="Sans approbation, le script AdSense se charge mais aucune annonce ne peut "
        "s'afficher : le site ne rapporte rien.",
    cost="Gratuit. Google répond en quelques jours à quelques semaines.",
    instructions=(
        Instruction(text="AdSense → Sites → foundercalc.dev → Demander un examen.",
                    url="https://adsense.google.com/adsense/u/0/pub-6294535713639434/sites"),
        Instruction(text="Note la date de la demande ci-dessous : c'est elle qu'on "
                         "regardera avant de s'inquiéter d'un silence."),
        Instruction(text="En attendant : 15 à 20 visiteurs organiques par jour aident. "
                         "Partage le site sur un canal à la fois (IndieHackers, Reddit…).",
                    warning="Poster partout le même jour se fait sanctionner comme du spam."),
    ),
    prerequisites=("search_console",),
    fields=(
        Field("local:adsense_review_requested_on", "Date de la demande", kind="date"),
    ),
    acknowledgements=("J'ai demandé le réexamen dans AdSense.",),
    check="ads_ready",
    unlocks="Google relit un site qui sert /ads.txt et le script AdSense.",
)

ADSENSE_SLOTS = Step(
    id="adsense_slots",
    gate=2,
    title="Créer les deux blocs d'annonces",
    why="Tant qu'un emplacement n'a pas d'ID, il ne rend rien — volontairement : un "
        "cadre « Advertisement » vide dessert la revue. Une fois le site approuvé, sans "
        "ces deux IDs, toujours aucune annonce.",
    cost="Gratuit. Dix minutes, une fois l'approbation reçue.",
    instructions=(
        Instruction(text="AdSense → Annonces → Par bloc d'annonces → Annonces display.",
                    url="https://adsense.google.com/adsense/u/0/pub-6294535713639434/myads/units"),
        Instruction(text="Crée un bloc nommé tool-mid (page outil), puis un bloc home-mid "
                         "(page d'accueil). Copie l'ID numérique de chacun.",
                    note="L'ID est le nombre de data-ad-slot dans le code proposé, par "
                         "exemple 1234567890."),
        Instruction(text="Laisse les annonces automatiques désactivées.",
                    warning="L'auto-placement pose des ancres en bas d'écran, par-dessus "
                            "la barre de partage et le bouton du tableau de bord."),
        PUBLISH,
    ),
    prerequisites=("adsense_review",),
    fields=(
        Field("config:site.adsense_slots.tool-mid", "ID du bloc tool-mid",
              placeholder="1234567890"),
        Field("config:site.adsense_slots.home-mid", "ID du bloc home-mid",
              placeholder="0987654321"),
    ),
    acknowledgements=("AdSense a approuvé foundercalc.dev.",),
    check="adsense_slots",
    unlocks="Les annonces s'affichent, et avec elles la bannière de consentement UE.",
    docs=("CLAUDE.md § Ads",),
)

ADSENSE_PAYMENT = Step(
    id="adsense_payment",
    gate=2,
    title="Être payé par AdSense",
    why="Google n'envoie rien sans compte bancaire vérifié, et retient 24 % sans "
        "formulaire fiscal W-8BEN.",
    cost="Gratuit. Deux à trois jours ouvrés pour les micro-dépôts. À faire quand le "
         "solde approche 100 $.",
    instructions=(
        Instruction(text="AdSense → Paiements → Ajouter un mode de paiement : le compte "
                         "bancaire professionnel à ton nom.",
                    note="Le compte Shine en cours d'ouverture convient, une fois validé."),
        Instruction(text="Confirme le micro-dépôt que Google envoie (2 à 3 jours ouvrés)."),
        Instruction(text="Paiements → Paramètres → Gérer les informations fiscales → "
                         "W-8BEN.",
                    warning="Il expire à la fin de la troisième année civile pleine après "
                            "la signature : à ressoumettre."),
    ),
    prerequisites=("adsense_slots",),
    acknowledgements=(
        "Le compte bancaire est ajouté et le micro-dépôt confirmé.",
        "Le formulaire W-8BEN est soumis dans AdSense.",
    ),
    docs=("HUMAN_INPUTS.md §B3",),
)


# ---------------------------------------------------------------------------
# GATE 3 — affiliation
# ---------------------------------------------------------------------------

def _affiliate_step(name: str, cards: int, url: str, *, extra: tuple[Instruction, ...] = (),
                    acknowledgements: tuple[str, ...] = (), cost: str = "") -> Step:
    return Step(
        id=f"affiliate_{name.lower()}",
        gate=3,
        title=f"Affiliation {name}",
        why=f"{name} apparaît sur {cards} carte(s) « Recommended tools ». Tant que le "
            "lien est l'URL nue, chaque clic envoyé ne rapporte rien.",
        cost=cost or "Gratuit. Quinze à trente minutes, puis quelques jours de validation.",
        instructions=(
            Instruction(text=f"Candidate au programme partenaire de {name}.", url=url),
            *extra,
            Instruction(text="Une fois accepté, copie ton lien tracké et colle-le ci-dessous. "
                             "Enregistrer met à jour toutes les cartes du programme et les "
                             "marque affiliate: true, ce qui affiche la mention « Affiliate "
                             "link » exigée par la FTC et l'ASA."),
            PUBLISH,
        ),
        prerequisites=("deploy_pipeline",),
        fields=(Field(f"affiliate:{name}", "Lien affilié tracké",
                      placeholder="https://…?ref=…",
                      help="Le lien exact fourni par le programme, pas la page d'accueil."),),
        acknowledgements=acknowledgements,
        check="affiliate_link",
        subject=name,
        unlocks=f"Les {cards} cartes {name} rapportent une commission.",
        docs=("HUMAN_INPUTS.md §C1–C2", "content/affiliates.yaml"),
    )


AFFILIATE_BAREMETRICS = _affiliate_step(
    "Baremetrics", 21, "https://baremetrics.com/affiliate",
    extra=(Instruction(text="Le programme passe par impact.com : crée ton compte partenaire "
                            "là-bas si on te le demande."),),
)
AFFILIATE_PADDLE = _affiliate_step("Paddle", 8, "https://www.paddle.com/partners")
AFFILIATE_FRESHBOOKS = _affiliate_step(
    "FreshBooks", 4, "https://www.freshbooks.com/affiliates",
    extra=(
        Instruction(text="La candidature du 2026-07-29 attend ton compte PartnerStack : "
                         "crée-le avec la même adresse.",
                    url="https://dash.partnerstack.com"),
        Instruction(text="PartnerStack paie via Stripe : connecte le compte Stripe dans "
                         "Settings → Payouts.",
                    note="Dépend du compte bancaire Shine relié à Stripe."),
    ),
    acknowledgements=("Mon compte PartnerStack existe et Stripe y est connecté pour les "
                      "versements.",),
    cost="Gratuit. Bloqué sur le compte Stripe activé (banque).",
)

GUSTO_PAYOUTS = Step(
    id="gusto_payouts",
    gate=3,
    title="Recevoir les commissions Gusto",
    why="Le lien Gusto est câblé et approuvé depuis le 4 août, mais sans Stripe "
        "Connect côté partenaire, aucune commission gagnée n'est versée.",
    cost="Gratuit. Bloqué sur le compte Stripe activé (banque Shine).",
    instructions=(
        Instruction(text="Tableau de bord partenaire Gusto → Payouts → Connect with Stripe."),
        Instruction(text="Si un formulaire fiscal est proposé, remplis le W-8BEN.",
                    warning="Sans lui, 30 % de retenue à la source ; avec, 0 % via la "
                            "convention France–États-Unis."),
    ),
    acknowledgements=(
        "Stripe Connect est relié dans le tableau de bord partenaire Gusto.",
        "Le W-8BEN est soumis à Gusto, ou aucun ne m'a été demandé.",
    ),
    docs=("HUMAN_INPUTS.md §C1",),
)


# ---------------------------------------------------------------------------
# GATE 4 — audience
# ---------------------------------------------------------------------------

FORMSPREE = Step(
    id="formspree",
    gate=4,
    title="L'inscription à la newsletter arrive quelque part",
    why="Le formulaire du pied de page et de l'accueil poste vers Formspree. Avec un "
        "ID faux ou un formulaire supprimé, chaque inscription est perdue en silence.",
    cost="Gratuit. Cinq minutes.",
    instructions=(
        Instruction(text="formspree.io → ton formulaire → copie l'ID de 8 caractères de "
                         "l'URL /f/…",
                    url="https://formspree.io/forms"),
        Instruction(text="Ouvre le site et inscris-toi avec une adresse à toi.",
                    url=BASE_URL),
        Instruction(text="Vérifie que l'inscription apparaît dans Formspree → Submissions.",
                    note="Formspree ne dit pas de l'extérieur si un formulaire existe : cet "
                         "essai est la seule preuve qu'une inscription arrive."),
        PUBLISH,
    ),
    prerequisites=("deploy_pipeline",),
    fields=(Field("config:site.formspree_id", "ID du formulaire Formspree",
                  placeholder="xnjewraq"),),
    acknowledgements=("Une inscription test envoyée depuis le site est arrivée dans "
                      "Formspree.",),
    check="formspree",
    unlocks="Chaque inscription arrive dans ta boîte Formspree.",
    docs=("HUMAN_INPUTS.md §D1",),
)

TWITTER = Step(
    id="twitter",
    gate=4,
    title="Compte X / Twitter du site",
    why="Un partage du site sur X est attribué au compte du projet (twitter:site) "
        "plutôt qu'à personne.",
    cost="Gratuit. Dix minutes.",
    instructions=(
        Instruction(text="Crée un compte dédié au projet si tu veux ce canal.",
                    url="https://x.com/i/flow/signup"),
        Instruction(text="Colle le nom du compte ci-dessous, sans @."),
        PUBLISH,
    ),
    prerequisites=("deploy_pipeline",),
    fields=(Field("config:site.twitter", "Nom du compte", placeholder="foundercalc"),),
    check="twitter",
    optional=True,
    unlocks="Les cartes de partage X portent le compte du site.",
)

UPTIME_ALERTS = Step(
    id="uptime_alerts",
    gate=4,
    title="Être prévenu si le site tombe",
    why="Le workflow uptime.yml ping le site toutes les 15 minutes et un échec "
        "arrive par email GitHub. Plus que des emails (SMS, multi-régions) demande un "
        "compte externe.",
    cost="Gratuit. Dix minutes.",
    instructions=(
        Instruction(text="Si les emails GitHub suffisent : rien à faire, la vérification "
                         "regarde la dernière exécution du workflow."),
        Instruction(text="Sinon : crée un compte UptimeRobot, ajoute un moniteur HTTPS "
                         f"vers {BASE_URL}, et configure les contacts d'alerte.",
                    url="https://uptimerobot.com"),
    ),
    prerequisites=("site_live",),
    check="uptime_workflow",
    optional=True,
    unlocks="Une panne se voit en quinze minutes, pas au prochain passage.",
    docs=("docs/DEPLOYMENT.md § Uptime monitoring",),
)

BING = Step(
    id="bing",
    gate=4,
    title="Bing Webmaster Tools",
    why="Bing (et DuckDuckGo, qui s'en sert) n'indexe pas vite un site dont on ne lui "
        "a pas donné le sitemap.",
    cost="Gratuit. Cinq minutes : l'import depuis Search Console fait tout.",
    instructions=(
        Instruction(text="Bing Webmaster Tools → Import from Google Search Console.",
                    url="https://www.bing.com/webmasters"),
    ),
    prerequisites=("search_console",),
    acknowledgements=("foundercalc.dev est importé dans Bing Webmaster Tools avec son "
                      "sitemap.",),
    optional=True,
)


# ---------------------------------------------------------------------------
# GATE 5 — obligations qui reviennent
# ---------------------------------------------------------------------------

URSSAF = Step(
    id="urssaf",
    gate=5,
    title="Déclarer le chiffre d'affaires à l'URSSAF",
    why="La déclaration est due même à 0 € — sans elle, 750 € de pénalité, plus 750 € "
        "par mois de retard. Elle couvre toute la micro-entreprise : FounderCalc, ACO et "
        "le reste. Les revenus AdSense et d'affiliation en font partie.",
    cost="Gratuit. Cinq minutes par échéance.",
    instructions=(
        Instruction(text="autoentrepreneur.urssaf.fr → Mon compte → Déclarer et payer.",
                    url="https://www.autoentrepreneur.urssaf.fr"),
        Instruction(text="Choisis ci-dessous la périodicité de ton compte, puis mets les "
                         "échéances dans ton agenda.",
                    note="Mensuelle : fin du mois suivant. Trimestrielle : 30 avril, "
                         "31 juillet, 31 octobre, 31 janvier."),
    ),
    fields=(Field("local:urssaf_period", "Périodicité", kind="select",
                  choices=("mensuelle", "trimestrielle")),),
    acknowledgements=(
        "Je connais la périodicité de mes déclarations URSSAF.",
        "Les prochaines échéances sont dans mon agenda.",
    ),
    docs=("HUMAN_INPUTS.md §E2",),
)


STEPS: tuple[Step, ...] = (
    SITE_LIVE, DEPLOY_PIPELINE, WEB_ANALYTICS, HETZNER_CLOSURE,
    STRIPE_PRO,
    SEARCH_CONSOLE_API, SEARCH_CONSOLE, ADSENSE_REVIEW, ADSENSE_SLOTS, ADSENSE_PAYMENT,
    AFFILIATE_BAREMETRICS, AFFILIATE_PADDLE, AFFILIATE_FRESHBOOKS, GUSTO_PAYOUTS,
    FORMSPREE, TWITTER, UPTIME_ALERTS, BING,
    URSSAF,
)
BY_ID = {step.id: step for step in STEPS}


def get(step_id: str) -> Step | None:
    return BY_ID.get(step_id)


def gates() -> list[tuple[int, list[Step]]]:
    grouped: dict[int, list[Step]] = {}
    for step in STEPS:
        grouped.setdefault(step.gate, []).append(step)
    return sorted(grouped.items())
