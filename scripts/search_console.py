"""Google Search Console for FounderCalc, from the terminal.

    make gsc-auth       (once: consent screen, token in ~/.config/freetoolkit/)
    make gsc            where the index stands, saved in .setup/search_console/
    make gsc-push       submit the sitemaps the site serves, withdraw the dead ones

    .venv/bin/python scripts/search_console.py sitemaps
    .venv/bin/python scripts/search_console.py inspect https://foundercalc.dev/tools/…

The wizard's Search Console steps read the same client and the same snapshots.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from freetoolkit.setup import checks, searchconsole  # noqa: E402
from freetoolkit.setup.catalogue import BASE_URL  # noqa: E402

#: What robots.txt and sitemap_index.xml expose, plus the temporary list of
#: retired URLs that nothing else points at.
SUBMITTED = ("sitemap_index.xml", "sitemap_retired.xml")


def _served_urls(path: str) -> list[str]:
    response = checks.fetch(f"{BASE_URL}/{path}")
    if response.status != 200:
        raise searchconsole.SearchConsoleError(f"/{path} répond HTTP {response.status}")
    return checks.sitemap_urls(response)


def _print_sitemaps(console: searchconsole.Console) -> list[dict]:
    entries = console.sitemaps()
    print(f"Sitemaps connus de Search Console ({console.site}) :")
    if not entries:
        print("  aucun")
    for entry in entries:
        contents = ", ".join(f"{c.get('type')} {c.get('submitted')}" for c in entry.get("contents", []))
        print(f"  {entry['path']}\n"
              f"    soumis {entry.get('lastSubmitted', '—')[:10]} · lu {entry.get('lastDownloaded', '—')[:10]}"
              f" · erreurs {entry.get('errors', 0)} · avertissements {entry.get('warnings', 0)}"
              f"{' · en attente' if entry.get('isPending') else ''}{' · ' + contents if contents else ''}")
    return entries


def cmd_auth(args: argparse.Namespace) -> None:
    path = searchconsole.authorize(open_browser=not args.no_browser)
    console = searchconsole.connect()
    print(f"Token enregistré : {path}\nPropriété : {console.site} ({console.permission})")


def cmd_status(args: argparse.Namespace) -> None:
    console = searchconsole.connect()
    _print_sitemaps(console)

    rows = console.performance(28)
    if rows:
        week = rows[-7:]
        before = rows[-14:-7]
        print(f"\nPerformances (28 j, dernière donnée {rows[-1]['keys'][0]}) :")
        print(f"  impressions {sum(r['impressions'] for r in rows):.0f} · clics "
              f"{sum(r['clicks'] for r in rows):.0f}")
        print(f"  7 derniers jours {sum(r['impressions'] for r in week):.0f} impressions, "
              f"7 précédents {sum(r['impressions'] for r in before):.0f}")

    report = searchconsole.latest_report(ROOT, checks.RECRAWL_REPORT_MAX_AGE)
    if report is None or args.fresh:
        live, retired = _served_urls("sitemap.xml"), _served_urls("sitemap_retired.xml")
        print(f"\nInspection de {len(live) + len(retired)} URL (quelques minutes)…")
        report = searchconsole.recrawl_report(console, live, retired)
        print(f"Instantané : {searchconsole.save_report(ROOT, report).relative_to(ROOT)}")
    print("\n" + report.describe())
    share = report.retired_indexed_share
    verdict = "atteint" if share <= checks.RETIRED_INDEXED_MAX_SHARE else "pas encore atteint"
    print(f"seuil du wizard (≤ {checks.RETIRED_INDEXED_MAX_SHARE:.0%} encore indexées) : "
          f"{verdict} ({share:.0%})")
    coverage: dict[str, int] = {}
    for item in report.retired:
        coverage[item.coverage or "—"] = coverage.get(item.coverage or "—", 0) + 1
    for state, count in sorted(coverage.items(), key=lambda kv: -kv[1]):
        print(f"  {count:4d}  {state}")


def cmd_push(args: argparse.Namespace) -> None:
    console = searchconsole.connect()
    if not console.can_write:
        raise searchconsole.SearchConsoleError(
            f"accès {console.permission} : soumettre demande un accès Complet ou propriétaire.")
    for path in SUBMITTED:
        _served_urls(path)
        console.submit_sitemap(f"{BASE_URL}/{path}")
        print(f"soumis : /{path}")
    for entry in console.sitemaps():
        response = checks.fetch(entry["path"])
        if response.status in (404, 410):
            console.delete_sitemap(entry["path"])
            print(f"retiré (HTTP {response.status}) : {entry['path']}")
    print()
    _print_sitemaps(console)


def cmd_sitemaps(args: argparse.Namespace) -> None:
    _print_sitemaps(searchconsole.connect())


def cmd_inspect(args: argparse.Namespace) -> None:
    item = searchconsole.connect().inspect(args.url)
    print(f"{item.url}\n  verdict {item.verdict} · {item.coverage} · dernier crawl "
          f"{item.last_crawl or 'jamais'}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Google Search Console pour FounderCalc.")
    sub = parser.add_subparsers(dest="command", required=True)
    auth = sub.add_parser("auth", help="autoriser l'accès (une fois)")
    auth.add_argument("--no-browser", action="store_true")
    auth.set_defaults(run=cmd_auth)
    status = sub.add_parser("status", help="sitemaps, performances, état de l'index")
    status.add_argument("--fresh", action="store_true",
                        help="réinspecter même si un instantané de moins de 12 h existe")
    status.set_defaults(run=cmd_status)
    sub.add_parser("push", help="soumettre les sitemaps servis, retirer les morts").set_defaults(
        run=cmd_push)
    sub.add_parser("sitemaps", help="lister les sitemaps connus").set_defaults(run=cmd_sitemaps)
    inspect = sub.add_parser("inspect", help="inspecter une URL")
    inspect.add_argument("url")
    inspect.set_defaults(run=cmd_inspect)

    args = parser.parse_args(argv)
    try:
        args.run(args)
    except searchconsole.SearchConsoleError as error:
        print(f"erreur : {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
