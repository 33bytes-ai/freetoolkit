"""Google Search Console, read and nudged from this machine.

The "Indexation des pages" report in the web interface is a lagging aggregate:
in September 2026 it sat on the 4th for twelve days while the step it gates
waited on it. The API answers per URL and today — URL Inspection says whether
Google still indexes a page and when it last crawled it — and it can submit or
withdraw a sitemap, which is the one lever there is on when Google comes back.

OAuth is the installed-app loopback flow, with the Desktop client already
created for foundercalc-mail. The client and the token live in
~/.config/freetoolkit/, never in the repository. Standard library only, like
the rest of the wizard; every request goes through ``call``, which the tests
replace.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import time
import urllib.error
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlencode, urlsplit

from freetoolkit.setup.catalogue import BASE_URL, DOMAIN

SCOPE = "https://www.googleapis.com/auth/webmasters"
CONFIG_DIR = Path("~/.config/freetoolkit").expanduser()
CLIENT_SECRET = CONFIG_DIR / "client_secret.json"
TOKEN = CONFIG_DIR / "search_console_token.json"
#: Registered in ~/workspace/projets/PORTS.md.
REDIRECT_PORT = 8098
#: Preferred first: the property the coverage export came from.
PROPERTIES = (f"{BASE_URL}/", f"sc-domain:{DOMAIN}")
WRITE_PERMISSIONS = ("siteOwner", "siteFullUser")
#: The day the thin pages started to 301.
CONSOLIDATED_ON = date(2026, 8, 29)
SNAPSHOT_DIR = Path(".setup") / "search_console"
#: URL Inspection allows 600 calls a minute per property.
INSPECT_WORKERS = 4
TIMEOUT_SECONDS = 30

WEBMASTERS = "https://www.googleapis.com/webmasters/v3"
INSPECTION = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"


class SearchConsoleError(Exception):
    """Something a person has to fix: a missing client, a refused token, an API
    left disabled. The message says which."""


@dataclass(frozen=True, slots=True)
class ApiReply:
    status: int
    body: dict


def call(method: str, url: str, *, token: str = "", payload: dict | None = None,
         form: dict | None = None) -> ApiReply:
    """One HTTP request to Google. A network failure is status 0."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    elif form is not None:
        data = urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as reply:
            return ApiReply(reply.status, _json(reply.read()))
    except urllib.error.HTTPError as error:
        return ApiReply(error.code, _json(error.read() if error.fp else b""))
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return ApiReply(0, {"error": {"message": str(error)}})


def _json(raw: bytes) -> dict:
    try:
        parsed = json.loads(raw or b"{}")
    except ValueError:
        return {"error": {"message": raw[:300].decode("utf-8", "replace")}}
    return parsed if isinstance(parsed, dict) else {}


def _error(reply: ApiReply) -> str:
    error = reply.body.get("error")
    if isinstance(error, dict):
        return error.get("message") or str(error)
    return reply.body.get("error_description") or str(error or reply.body)[:300]


# -- OAuth -------------------------------------------------------------------


def _client(path: Path) -> dict:
    if not path.exists():
        raise SearchConsoleError(
            f"client OAuth absent : {path}. Copie le client Desktop de foundercalc-mail "
            "(~/.config/foundercalc-mail/client_secret.json) à cet endroit.")
    raw = json.loads(path.read_text("utf-8"))
    client = raw.get("installed")
    if not client:
        raise SearchConsoleError(f"{path} n'est pas un client OAuth « Application de bureau ».")
    return client


def _write_token(path: Path, token: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch(mode=0o600, exist_ok=True)
    path.chmod(0o600)
    path.write_text(json.dumps(token, indent=2), "utf-8")


def _stamp(token: dict, reply: ApiReply) -> dict:
    token = {**token, **reply.body}
    token["expires_at"] = time.time() + float(reply.body.get("expires_in", 0))
    return token


class _Callback(BaseHTTPRequestHandler):
    query: dict[str, list[str]] = {}

    def do_GET(self) -> None:  # noqa: N802
        query = parse_qs(urlsplit(self.path).query)
        if "code" not in query and "error" not in query:
            self.send_response(404)
            self.end_headers()
            return
        type(self).query = query
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write("FounderCalc : autorisation reçue, tu peux fermer cet onglet.".encode())

    def log_message(self, *args: object) -> None:
        pass


def authorize(*, client_path: Path | None = None, token_path: Path | None = None,
              open_browser: bool = True, announce=print) -> Path:
    """Run the consent screen once and store a refresh token."""
    client = _client(client_path or CLIENT_SECRET)
    token_path = token_path or TOKEN
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=")
    state = secrets.token_urlsafe(16)
    redirect_uri = f"http://localhost:{REDIRECT_PORT}/"
    url = client["auth_uri"] + "?" + urlencode({
        "client_id": client["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "code_challenge": challenge.decode(),
        "code_challenge_method": "S256",
    })

    server = HTTPServer(("127.0.0.1", REDIRECT_PORT), _Callback)
    server.timeout = 10
    announce(f"Ouvre ce lien et accepte l'accès Search Console :\n\n  {url}\n")
    if open_browser:
        webbrowser.open(url)
    _Callback.query = {}
    deadline = time.monotonic() + 300
    try:
        while not _Callback.query:
            if time.monotonic() > deadline:
                raise SearchConsoleError("pas de réponse du navigateur en 5 minutes.")
            server.handle_request()
    finally:
        server.server_close()

    query = _Callback.query
    if query.get("state", [""])[0] != state:
        raise SearchConsoleError("réponse OAuth sans le bon état : recommence.")
    if "code" not in query:
        raise SearchConsoleError(f"accès refusé : {query.get('error', ['inconnu'])[0]}")

    reply = call("POST", client["token_uri"], form={
        "grant_type": "authorization_code",
        "code": query["code"][0],
        "code_verifier": verifier,
        "redirect_uri": redirect_uri,
        "client_id": client["client_id"],
        "client_secret": client["client_secret"],
    })
    if reply.status != 200 or "refresh_token" not in reply.body:
        raise SearchConsoleError(f"échange du code refusé : {_error(reply)}")
    _write_token(token_path, _stamp({}, reply))
    return token_path


def access_token(*, client_path: Path | None = None, token_path: Path | None = None) -> str:
    token_path = token_path or TOKEN
    if not token_path.exists():
        raise SearchConsoleError("aucun token Search Console : lance make gsc-auth.")
    token = json.loads(token_path.read_text("utf-8"))
    if token.get("access_token") and token.get("expires_at", 0) > time.time() + 60:
        return token["access_token"]

    client = _client(client_path or CLIENT_SECRET)
    reply = call("POST", client["token_uri"], form={
        "grant_type": "refresh_token",
        "refresh_token": token.get("refresh_token", ""),
        "client_id": client["client_id"],
        "client_secret": client["client_secret"],
    })
    if reply.status != 200:
        raise SearchConsoleError(
            f"le token ne se rafraîchit plus ({_error(reply)}) : relance make gsc-auth. "
            "S'il expire chaque semaine, l'écran de consentement du projet GCP est en "
            "mode Testing.")
    token = _stamp(token, reply)
    _write_token(token_path, token)
    return token["access_token"]


# -- API ---------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Console:
    token: str
    site: str
    permission: str

    @property
    def can_write(self) -> bool:
        return self.permission in WRITE_PERMISSIONS

    def _site_url(self, suffix: str = "") -> str:
        return f"{WEBMASTERS}/sites/{quote(self.site, safe='')}{suffix}"

    def _ok(self, reply: ApiReply, doing: str) -> dict:
        if reply.status not in (200, 204):
            raise SearchConsoleError(f"{doing} : HTTP {reply.status} — {_error(reply)}")
        return reply.body

    def sitemaps(self) -> list[dict]:
        body = self._ok(call("GET", self._site_url("/sitemaps"), token=self.token),
                        "liste des sitemaps")
        return body.get("sitemap", [])

    def submit_sitemap(self, url: str) -> None:
        self._ok(call("PUT", self._site_url(f"/sitemaps/{quote(url, safe='')}"),
                      token=self.token), f"soumission de {url}")

    def delete_sitemap(self, url: str) -> None:
        self._ok(call("DELETE", self._site_url(f"/sitemaps/{quote(url, safe='')}"),
                      token=self.token), f"retrait de {url}")

    def inspect(self, url: str) -> Inspection:
        for attempt in range(4):
            reply = call("POST", INSPECTION, token=self.token, payload={
                "inspectionUrl": url, "siteUrl": self.site, "languageCode": "en-US"})
            if reply.status not in (429, 500, 503) or attempt == 3:
                break
            time.sleep(2 ** attempt * 5)
        result = self._ok(reply, f"inspection de {url}").get("inspectionResult", {})
        status = result.get("indexStatusResult", {})
        return Inspection(url=url, verdict=status.get("verdict", ""),
                          coverage=status.get("coverageState", ""),
                          last_crawl=status.get("lastCrawlTime", ""))

    def performance(self, days: int = 28) -> list[dict]:
        end = date.today()
        body = self._ok(call("POST", self._site_url("/searchAnalytics/query"), token=self.token,
                             payload={"startDate": (end - timedelta(days=days)).isoformat(),
                                      "endDate": end.isoformat(), "dimensions": ["date"]}),
                        "performances")
        return body.get("rows", [])


def connect(*, client_path: Path | None = None, token_path: Path | None = None) -> Console:
    token = access_token(client_path=client_path, token_path=token_path)
    reply = call("GET", f"{WEBMASTERS}/sites", token=token)
    if reply.status != 200:
        raise SearchConsoleError(
            f"l'API Search Console refuse l'accès (HTTP {reply.status}) : {_error(reply)}")
    granted = {entry["siteUrl"]: entry["permissionLevel"]
               for entry in reply.body.get("siteEntry", [])
               if entry.get("permissionLevel") != "siteUnverifiedUser"}
    for site in PROPERTIES:
        if site in granted:
            return Console(token=token, site=site, permission=granted[site])
    raise SearchConsoleError(
        f"le compte autorisé n'a pas {DOMAIN} dans Search Console "
        f"(propriétés vues : {', '.join(granted) or 'aucune'}).")


# -- the recrawl ---------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Inspection:
    url: str
    verdict: str
    coverage: str
    last_crawl: str

    @property
    def indexed(self) -> bool:
        return self.verdict == "PASS"

    @property
    def redirect(self) -> bool:
        return "redirect" in self.coverage.lower()

    @property
    def crawled_since_consolidation(self) -> bool:
        return self.last_crawl[:10] >= CONSOLIDATED_ON.isoformat()


@dataclass(frozen=True, slots=True)
class RecrawlReport:
    taken_at: str
    live: tuple[Inspection, ...]
    retired: tuple[Inspection, ...]

    @property
    def retired_still_indexed(self) -> int:
        return sum(item.indexed for item in self.retired)

    @property
    def retired_indexed_share(self) -> float:
        return self.retired_still_indexed / len(self.retired) if self.retired else 1.0

    def describe(self) -> str:
        retired, live = self.retired, self.live
        return "\n".join((
            f"mesuré le {self.taken_at[:16].replace('T', ' ')} UTC",
            f"anciennes URL : {len(retired)} — encore indexées {self.retired_still_indexed}, "
            f"vues en redirection {sum(i.redirect for i in retired)}, "
            f"recrawlées depuis le {CONSOLIDATED_ON:%d/%m} "
            f"{sum(i.crawled_since_consolidation for i in retired)}",
            f"URL du sitemap : {len(live)} — indexées {sum(i.indexed for i in live)}",
        ))

    def as_dict(self) -> dict:
        return {"taken_at": self.taken_at,
                "live": [asdict(item) for item in self.live],
                "retired": [asdict(item) for item in self.retired]}

    @classmethod
    def from_dict(cls, payload: dict) -> RecrawlReport:
        return cls(taken_at=payload["taken_at"],
                   live=tuple(Inspection(**item) for item in payload["live"]),
                   retired=tuple(Inspection(**item) for item in payload["retired"]))


def recrawl_report(console: Console, live: list[str], retired: list[str]) -> RecrawlReport:
    with ThreadPoolExecutor(max_workers=INSPECT_WORKERS) as pool:
        inspected = list(pool.map(console.inspect, [*live, *retired]))
    return RecrawlReport(taken_at=datetime.now(UTC).isoformat(timespec="seconds"),
                         live=tuple(inspected[:len(live)]), retired=tuple(inspected[len(live):]))


def save_report(root: Path, report: RecrawlReport) -> Path:
    path = root / SNAPSHOT_DIR / f"{report.taken_at[:10]}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report.as_dict(), indent=1), "utf-8")
    return path


def latest_report(root: Path, max_age: timedelta) -> RecrawlReport | None:
    snapshots = sorted((root / SNAPSHOT_DIR).glob("*.json"))
    if not snapshots:
        return None
    report = RecrawlReport.from_dict(json.loads(snapshots[-1].read_text("utf-8")))
    if datetime.now(UTC) - datetime.fromisoformat(report.taken_at) > max_age:
        return None
    return report
