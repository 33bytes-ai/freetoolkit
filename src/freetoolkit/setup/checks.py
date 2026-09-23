"""What proves each step.

A saved value is a claim; these look at what is actually true. Most read the
site as served, because a value in content/ does nothing until it is merged
and deployed — a check that read the file would pass the day before anyone
could see the change. The file is still read first, so a failure says which
half is missing: the value, or its publication.

Nothing here writes to content/. The site, /ads.txt and GitHub's API for this
public repository all answer anonymously; only Search Console needs the OAuth
token kept outside the repository (see searchconsole.py), and its inspection
results are kept in .setup/ so a second click does not spend the daily quota.
"""

from __future__ import annotations

import html
import json
import re
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

import yaml

from freetoolkit.setup import contentfile, searchconsole
from freetoolkit.setup.catalogue import BASE_URL, REPO, Step

TIMEOUT_SECONDS = 15
USER_AGENT = "FounderCalc-setup-wizard/1 (+https://foundercalc.dev)"
#: The sitemap held 460 URLs before the consolidation and 130 after.
CONSOLIDATED_SITEMAP_MAX = 200
#: Asking for the AdSense re-review while a tenth of the thin pages are still
#: indexed is asking for the same verdict.
RETIRED_INDEXED_MAX_SHARE = 0.10
#: Google recrawls in days, not hours: a report this fresh is still the truth.
RECRAWL_REPORT_MAX_AGE = timedelta(hours=12)


@dataclass(frozen=True, slots=True)
class CheckOutcome:
    ok: bool
    summary: str
    detail: str = ""
    remedy: str = ""

    @classmethod
    def passed(cls, summary: str, detail: str = "") -> CheckOutcome:
        return cls(True, summary, detail)

    @classmethod
    def failed(cls, summary: str, *, detail: str = "", remedy: str = "") -> CheckOutcome:
        return cls(False, summary, detail, remedy)


@dataclass(frozen=True, slots=True)
class Context:
    root: Path
    step: Step
    local: dict[str, str]

    @property
    def config(self) -> dict:
        return contentfile.read_config(self.root / "content" / "config.yaml")

    @property
    def affiliates(self) -> dict[str, list[dict]]:
        return contentfile.read_affiliates(self.root / "content" / "affiliates.yaml")


@dataclass(frozen=True, slots=True)
class Response:
    status: int
    text: str
    location: str = ""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: ANN002, ANN003
        return None


def fetch(url: str, *, follow: bool = True) -> Response:
    """GET a URL. A network failure is a Response with status 0, so a check
    can say "unreachable" instead of raising."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    opener = (urllib.request.build_opener() if follow
              else urllib.request.build_opener(_NoRedirect))
    try:
        with opener.open(request, timeout=TIMEOUT_SECONDS) as reply:
            return Response(reply.status, reply.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace") if error.fp else ""
        return Response(error.code, body, error.headers.get("Location", ""))
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return Response(0, str(error))


def _unreachable(url: str, response: Response) -> CheckOutcome:
    return CheckOutcome.failed(
        f"{url} ne répond pas (HTTP {response.status or 'aucune réponse'})",
        detail=response.text[:300],
        remedy="Vérifie ta connexion, puis le projet Pages dans Cloudflare.",
    )


PUBLISH_REMEDY = ("La valeur est enregistrée dans content/ mais pas encore en ligne : "
                  "merge-la sur main (voir « Ce qui reste à publier »), attends le "
                  "déploiement, puis revérifie.")


# ---------------------------------------------------------------------------


def check_site_live(ctx: Context) -> CheckOutcome:
    lines: list[str] = []
    home = fetch(BASE_URL + "/")
    if home.status != 200:
        return _unreachable(BASE_URL, home)
    lines.append("accueil : 200")

    client = str(contentfile.config_value(ctx.config, "site.adsense_client_id") or "")
    ads = fetch(BASE_URL + "/ads.txt")
    expected = f"google.com, {client.removeprefix('ca-')}, DIRECT"
    if ads.status != 200 or expected not in ads.text:
        return CheckOutcome.failed(
            "/ads.txt ne déclare pas l'éditeur AdSense",
            detail=f"attendu : {expected}\nservi (HTTP {ads.status}) : {ads.text[:200]}",
            remedy="ads.txt est écrit à chaque build quand ads_enabled est vrai : "
                   "vérifie content/config.yaml et le dernier déploiement.",
        )
    lines.append("/ads.txt : éditeur déclaré")

    pages = yaml.safe_load((ctx.root / "content" / "intent_pages.yaml").read_text("utf-8")) or []
    if pages:
        retired = f"/tools/{pages[0]['parent_tool']}/{pages[0]['slug']}/"
        moved = fetch(BASE_URL + retired, follow=False)
        target = f"/tools/{pages[0]['parent_tool']}/#{pages[0]['slug']}"
        if moved.status != 301 or not moved.location.endswith(target):
            return CheckOutcome.failed(
                f"{retired} ne redirige pas en 301 vers sa section",
                detail=f"HTTP {moved.status} → {moved.location or 'aucune redirection'}",
                remedy="Les redirections viennent de dist/_redirects : un build récent "
                       "a-t-il été publié ? Voir CLAUDE.md § Content architecture.",
            )
        lines.append(f"{retired} : 301 vers sa section")
    return CheckOutcome.passed("le site, /ads.txt et les redirections répondent",
                               detail="\n".join(lines))


def _github(path: str) -> dict | None:
    response = fetch(f"https://api.github.com/repos/{REPO}/{path}")
    if response.status != 200:
        return None
    return json.loads(response.text)


def _latest_run(workflow: str) -> dict | None:
    runs = _github(f"actions/workflows/{workflow}/runs?branch=main&per_page=1")
    return (runs or {}).get("workflow_runs", [None])[0] if runs else None


def check_deploy_pipeline(ctx: Context) -> CheckOutcome:
    run = _latest_run("deploy.yml")
    head = _github("commits/main")
    if run is None or head is None:
        return CheckOutcome.failed("l'API GitHub ne répond pas",
                                   remedy="Réessaie dans une minute : la limite anonyme "
                                          "est de 60 requêtes par heure.")
    detail = f"dernier déploiement : {run['head_sha'][:7]} ({run['status']}, {run['conclusion']})"
    if run["head_sha"] != head["sha"]:
        return CheckOutcome.failed(
            "le dernier commit de main n'est pas encore déployé",
            detail=f"{detail}\nmain : {head['sha'][:7]}",
            remedy="Un déploiement est peut-être en cours : attends qu'il finisse. S'il "
                   "n'y en a pas, lance le workflow Deploy à la main depuis GitHub.",
        )
    if run["conclusion"] != "success":
        return CheckOutcome.failed(
            f"le déploiement de {run['head_sha'][:7]} n'a pas réussi ({run['conclusion']})",
            detail=f"{detail}\n{run['html_url']}",
            remedy="Ouvre l'exécution : des secrets Cloudflare absents y sont nommés.",
        )
    return CheckOutcome.passed(f"main ({head['sha'][:7]}) est déployé", detail=detail)


def check_web_analytics(ctx: Context) -> CheckOutcome:
    home = fetch(BASE_URL + "/")
    if home.status != 200:
        return _unreachable(BASE_URL, home)
    if "static.cloudflareinsights.com/beacon" not in home.text:
        return CheckOutcome.failed(
            "la page servie ne charge pas le beacon Cloudflare Web Analytics",
            remedy="Active le site dans Web Analytics avec la configuration automatique. "
                   "L'injection peut prendre quelques minutes après l'activation.",
        )
    return CheckOutcome.passed("Cloudflare Web Analytics mesure le trafic")


def check_search_console_access(ctx: Context) -> CheckOutcome:
    try:
        console = searchconsole.connect()
    except searchconsole.SearchConsoleError as error:
        return CheckOutcome.failed(
            "Search Console ne répond pas avec ton accès",
            detail=str(error),
            remedy="Suis les instructions dans l'ordre : API activée, client copié, "
                   "make gsc-auth. Un « has not been used in project » veut dire que "
                   "l'API n'est pas activée.",
        )
    if not console.can_write:
        return CheckOutcome.failed(
            f"accès en lecture seule à {console.site} ({console.permission})",
            remedy="Soumettre un sitemap demande un accès « Complet » ou propriétaire : "
                   "autorise le compte Google qui possède la propriété.",
        )
    return CheckOutcome.passed(f"Search Console répond pour {console.site}",
                               detail=f"droits : {console.permission}")


def sitemap_urls(response: Response) -> list[str]:
    return re.findall(r"<loc>([^<]+)</loc>", response.text)


def check_search_console_recrawl(ctx: Context) -> CheckOutcome:
    sitemap = fetch(BASE_URL + "/sitemap.xml")
    if sitemap.status != 200:
        return _unreachable(BASE_URL + "/sitemap.xml", sitemap)
    live = sitemap_urls(sitemap)
    if len(live) > CONSOLIDATED_SITEMAP_MAX:
        return CheckOutcome.failed(
            f"le sitemap servi liste encore {len(live)} URL",
            remedy="La consolidation n'est pas en ligne : Google recrawlerait les pages "
                   "courtes. Vérifie le dernier déploiement.",
        )

    report = searchconsole.latest_report(ctx.root, RECRAWL_REPORT_MAX_AGE)
    if report is None:
        retired = fetch(BASE_URL + "/sitemap_retired.xml")
        if retired.status != 200:
            return CheckOutcome.failed("/sitemap_retired.xml n'est pas servi",
                                       detail=f"HTTP {retired.status}", remedy=PUBLISH_REMEDY)
        try:
            report = searchconsole.recrawl_report(searchconsole.connect(), live,
                                                  sitemap_urls(retired))
        except searchconsole.SearchConsoleError as error:
            return CheckOutcome.failed("Search Console n'a pas pu inspecter les URL",
                                       detail=str(error),
                                       remedy="L'étape « Accès à Search Console » passe-t-elle ?")
        searchconsole.save_report(ctx.root, report)

    still = report.retired_still_indexed
    if report.retired_indexed_share > RETIRED_INDEXED_MAX_SHARE:
        return CheckOutcome.failed(
            f"Google indexe encore {still} des {len(report.retired)} anciennes URL",
            detail=report.describe(),
            remedy="Rien à corriger sur le site : Google doit repasser sur les 301. "
                   "Soumets le sitemap des anciennes URL (make gsc-push) s'il ne l'est "
                   "pas encore, puis revérifie dans quelques jours.",
        )
    return CheckOutcome.passed(
        f"{len(report.retired) - still} des {len(report.retired)} anciennes URL ont quitté l'index",
        detail=report.describe())


def check_ads_ready(ctx: Context) -> CheckOutcome:
    site = check_site_live(ctx)
    if not site.ok:
        return site
    pages = yaml.safe_load((ctx.root / "content" / "tools.yaml").read_text("utf-8")) or []
    tools = pages if isinstance(pages, list) else pages.get("tools", [])
    page = fetch(f"{BASE_URL}/tools/{tools[0]['slug']}/")
    if "adsbygoogle.js" not in page.text:
        return CheckOutcome.failed(
            "le script AdSense n'est pas sur les pages outil",
            remedy="ads_enabled doit rester vrai pendant l'examen : Google cherche le "
                   "script sur le site qu'il relit.",
        )
    return CheckOutcome.passed("le site relu par Google sert /ads.txt et le script AdSense")


def check_adsense_slots(ctx: Context) -> CheckOutcome:
    slots = contentfile.config_value(ctx.config, "site.adsense_slots") or {}
    bad = [name for name in ("tool-mid", "home-mid")
           if not re.fullmatch(r"\d{8,12}", str(slots.get(name) or ""))]
    if bad:
        return CheckOutcome.failed(
            f"ID de bloc absent ou mal formé : {', '.join(bad)}",
            remedy="L'ID est le nombre de data-ad-slot dans le code du bloc, 10 chiffres "
                   "en général — pas le nom du bloc ni le ca-pub.",
        )
    pages = yaml.safe_load((ctx.root / "content" / "tools.yaml").read_text("utf-8")) or []
    tools = pages if isinstance(pages, list) else pages.get("tools", [])
    missing = []
    for name, url in (("home-mid", BASE_URL + "/"),
                      ("tool-mid", f"{BASE_URL}/tools/{tools[0]['slug']}/")):
        if f'data-ad-slot="{slots[name]}"' not in fetch(url).text:
            missing.append(f"{name} absent de {url}")
    if missing:
        return CheckOutcome.failed("les blocs ne sont pas encore sur le site",
                                   detail="\n".join(missing), remedy=PUBLISH_REMEDY)
    return CheckOutcome.passed("les deux blocs d'annonces sont en ligne")


def _is_tracked(url: str) -> bool:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.netloc:
        return False
    query = [pair for pair in parts.query.split("&") if pair and not pair.startswith("utm_")]
    return bool(query) or parts.path.strip("/") != ""


def check_affiliate_link(ctx: Context) -> CheckOutcome:
    name = ctx.step.subject
    entries = contentfile.programme_entries(ctx.affiliates, name)
    urls = {entry.get("url") for entry in entries}
    if not entries:
        return CheckOutcome.failed(f"aucune carte {name} dans content/affiliates.yaml")
    if len(urls) != 1 or not all(entry.get("affiliate") is True for entry in entries):
        return CheckOutcome.failed(
            f"les cartes {name} n'ont pas toutes le lien affilié",
            detail="\n".join(sorted(str(url) for url in urls)),
            remedy="Colle le lien tracké dans le champ et enregistre : toutes les cartes "
                   "sont mises à jour ensemble.",
        )
    url = str(urls.pop())
    if not _is_tracked(url):
        return CheckOutcome.failed(
            f"{url} ressemble à la page d'accueil, pas à un lien tracké",
            remedy="Le programme fournit un lien propre à ton compte (paramètre ref, "
                   "sous-domaine, chemin /go/…). Une URL nue ne rapporte rien.",
        )
    slug = next(slug for slug, cards in ctx.affiliates.items()
                if any(card.get("name") == name for card in cards or []))
    page = fetch(f"{BASE_URL}/tools/{slug}/")
    if html.escape(url, quote=True) not in page.text and url not in page.text:
        return CheckOutcome.failed(f"le lien {name} n'est pas encore sur /tools/{slug}/",
                                   remedy=PUBLISH_REMEDY)
    return CheckOutcome.passed(f"{len(entries)} carte(s) {name} portent le lien affilié en ligne")


def check_formspree(ctx: Context) -> CheckOutcome:
    form_id = str(contentfile.config_value(ctx.config, "site.formspree_id") or "")
    if not re.fullmatch(r"[A-Za-z0-9]{8}", form_id):
        return CheckOutcome.failed(
            "l'ID Formspree est absent ou mal formé",
            remedy="C'est la partie après /f/ dans l'URL du formulaire : 8 caractères.",
        )
    home = fetch(BASE_URL + "/")
    if f"https://formspree.io/f/{form_id}" not in home.text:
        return CheckOutcome.failed("le formulaire servi ne poste pas vers cet ID",
                                   remedy=PUBLISH_REMEDY)
    return CheckOutcome.passed(f"le site poste les inscriptions vers le formulaire {form_id}")


def check_twitter(ctx: Context) -> CheckOutcome:
    handle = str(contentfile.config_value(ctx.config, "site.twitter") or "").lstrip("@")
    if not re.fullmatch(r"[A-Za-z0-9_]{1,15}", handle):
        return CheckOutcome.failed("le nom de compte est absent ou invalide",
                                   remedy="1 à 15 lettres, chiffres ou _, sans @.")
    if f'content="@{handle}"' not in fetch(BASE_URL + "/").text:
        return CheckOutcome.failed("twitter:site n'est pas encore sur le site",
                                   remedy=PUBLISH_REMEDY)
    return CheckOutcome.passed(f"les pages déclarent @{handle}")


def check_uptime_workflow(ctx: Context) -> CheckOutcome:
    run = _latest_run("uptime.yml")
    if run is None:
        return CheckOutcome.failed("aucune exécution du workflow uptime trouvée",
                                   remedy="Il tourne sur un cron : vérifie qu'il n'est pas "
                                          "désactivé dans l'onglet Actions (GitHub coupe "
                                          "les crons des repos inactifs 60 jours).")
    if run["conclusion"] != "success":
        return CheckOutcome.failed(
            f"la dernière vérification d'uptime a échoué ({run['conclusion']})",
            detail=run["html_url"],
        )
    return CheckOutcome.passed(f"le site a répondu au dernier ping ({run['updated_at']})")


CHECKS: dict[str, Callable[[Context], CheckOutcome]] = {
    "site_live": check_site_live,
    "deploy_pipeline": check_deploy_pipeline,
    "web_analytics": check_web_analytics,
    "search_console_access": check_search_console_access,
    "search_console_recrawl": check_search_console_recrawl,
    "ads_ready": check_ads_ready,
    "adsense_slots": check_adsense_slots,
    "affiliate_link": check_affiliate_link,
    "formspree": check_formspree,
    "twitter": check_twitter,
    "uptime_workflow": check_uptime_workflow,
}


def run(name: str, ctx: Context) -> CheckOutcome:
    check = CHECKS.get(name)
    if check is None:
        return CheckOutcome.failed(f"aucune vérification nommée {name!r}")
    try:
        return check(ctx)
    except Exception as error:  # noqa: BLE001 — a check must report, not crash the page
        return CheckOutcome.failed(f"la vérification a planté : {type(error).__name__}",
                                   detail=str(error)[:500])
