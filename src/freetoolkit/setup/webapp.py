"""The wizard's HTTP surface, on the standard library.

The site is a static build with no server of its own, so the wizard brings no
framework either: http.server, and Jinja2, which the build already uses.

Loopback only, one operator, one token in the first URL and then a cookie. Two
rules the routes keep:

* a check is the only thing that marks a step verified — saving a value is not
  evidence that it works, and changing a verified value sends it back to pending;
* the wizard writes content/config.yaml, content/affiliates.yaml and its own
  .setup/ directory, and nothing else. Publishing is a merge, shown, not run.
"""

from __future__ import annotations

import secrets
import subprocess
from dataclasses import dataclass
from datetime import datetime, UTC
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from jinja2 import Environment, FileSystemLoader, select_autoescape

from freetoolkit.setup import catalogue, checks, contentfile
from freetoolkit.setup.catalogue import BASE_URL, DOMAIN, Field, Step
from freetoolkit.setup.state import SetupState, StepStatus

TEMPLATE_DIR = Path(__file__).parent / "templates"
STATIC_DIR = Path(__file__).parent / "static"
TOKEN_COOKIE = "foundercalc_setup"
CONTENT_FILES = ("content/config.yaml", "content/affiliates.yaml")


@dataclass
class Wizard:
    root: Path
    token: str

    @property
    def state_path(self) -> Path:
        return self.root / ".setup" / "state.json"

    @property
    def backup_dir(self) -> Path:
        return self.root / ".setup" / "backups"

    @property
    def config_path(self) -> Path:
        return self.root / "content" / "config.yaml"

    @property
    def affiliates_path(self) -> Path:
        return self.root / "content" / "affiliates.yaml"

    def state(self) -> SetupState:
        return SetupState.load(self.state_path)


@dataclass(frozen=True, slots=True)
class Reply:
    status: int
    body: str
    content_type: str = "text/html; charset=utf-8"
    location: str = ""
    set_token: bool = False


@dataclass(frozen=True, slots=True)
class StepView:
    step: Step
    status: StepStatus
    summary: str
    checked_at: datetime | None
    unlocked: bool
    blocked_by: tuple[str, ...]
    acknowledged: frozenset[str]


_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)),
                   autoescape=select_autoescape(["html"]))
_env.globals.update(DOMAIN=DOMAIN, BASE_URL=BASE_URL, StepStatus=StepStatus)


def _render(template: str, **context: object) -> str:
    return _env.get_template(template).render(**context)


def _views(wizard: Wizard) -> dict[str, StepView]:
    state = wizard.state()
    views = {}
    for step in catalogue.STEPS:
        record = state.record(step.id)
        blocked = tuple(catalogue.BY_ID[name].title for name in step.prerequisites
                        if not state.satisfied(name))
        views[step.id] = StepView(step, record.status, record.summary, record.checked_at,
                                  not blocked, blocked, frozenset(record.acknowledged))
    return views


def _next_action(views: dict[str, StepView]) -> StepView | None:
    for step in catalogue.STEPS:
        view = views[step.id]
        if view.unlocked and view.status not in (StepStatus.VERIFIED, StepStatus.SKIPPED):
            return view
    return None


def current_value(wizard: Wizard, field: Field) -> str:
    if field.store == "config":
        value = contentfile.config_value(contentfile.read_config(wizard.config_path), field.key)
        return "" if value is None else str(value)
    if field.store == "affiliate":
        entries = contentfile.programme_entries(
            contentfile.read_affiliates(wizard.affiliates_path), field.key)
        urls = {entry.get("url") for entry in entries}
        tracked = len(urls) == 1 and all(entry.get("affiliate") is True for entry in entries)
        return str(urls.pop()) if tracked else ""
    return wizard.state().local_values().get(field.key, "")


def save(wizard: Wizard, step: Step, form: dict[str, list[str]]) -> str:
    """Write what the form carries. Returns an error message, or "" on success."""
    state = wizard.state()
    config: dict[str, str] = {}
    changed = False
    try:
        for field in step.fields:
            if field.form_name not in form:
                continue
            value = form[field.form_name][0].strip()
            if value == current_value(wizard, field):
                continue
            if field.store == "config":
                config[field.key] = value
            elif field.store == "affiliate":
                if not value:
                    continue
                contentfile.set_affiliate_url(wizard.affiliates_path, field.key, value,
                                              backup_dir=wizard.backup_dir)
                changed = True
            else:
                state.remember(step.id, {field.key: value})
                changed = True
        if config:
            contentfile.set_config_values(wizard.config_path, config,
                                          backup_dir=wizard.backup_dir)
            changed = True
    except contentfile.ContentWriteError as error:
        return str(error)

    if step.acknowledgements:
        state.acknowledge(step.id, [text for text in form.get("ack", [])
                                    if text in step.acknowledgements])
    if changed and state.record(step.id).status is StepStatus.VERIFIED:
        state.mark(step.id, StepStatus.PENDING, "valeurs modifiées depuis la dernière vérification")
    return ""


def verify(wizard: Wizard, step: Step) -> checks.CheckOutcome:
    state = wizard.state()
    missing = [text for text in step.acknowledgements
               if text not in state.record(step.id).acknowledged]
    if missing:
        outcome = checks.CheckOutcome.failed(
            f"{len(missing)} confirmation(s) non cochée(s)", detail="\n".join(missing),
            remedy="Aucune vérification ne peut constater ces points à ta place : coche-les "
                   "et enregistre avant de vérifier.")
    elif not step.check:
        outcome = checks.CheckOutcome.passed("confirmé par toi")
    else:
        outcome = checks.run(step.check, checks.Context(
            root=wizard.root, step=step, local=state.local_values()))
    state.mark(step.id, StepStatus.VERIFIED if outcome.ok else StepStatus.FAILED,
               outcome.summary)
    return outcome


def pending_publication(wizard: Wizard) -> str:
    """The uncommitted diff of the files the wizard writes."""
    try:
        completed = subprocess.run(
            ["git", "diff", "HEAD", "--", *CONTENT_FILES], cwd=wizard.root,
            capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        return f"git indisponible : {error}"
    return completed.stdout


def respond(wizard: Wizard, method: str, target: str, *, cookie: str = "",
            body: bytes = b"") -> Reply:
    parts = urlsplit(target)
    path = parts.path.rstrip("/") or "/"
    query = parse_qs(parts.query)

    if path.startswith("/static/"):
        asset = STATIC_DIR / path.removeprefix("/static/")
        if asset.parent != STATIC_DIR or not asset.is_file():
            return Reply(404, "introuvable", "text/plain")
        return Reply(200, asset.read_text(encoding="utf-8"), "text/css; charset=utf-8")

    presented = query.get("t", [""])[0] or cookie
    if not secrets.compare_digest(presented, wizard.token):
        return Reply(403, "<h1>Pas ce lien</h1><p>Ouvre l'URL affichée dans le terminal "
                          "où le wizard a été lancé.</p>")
    set_token = bool(query.get("t"))
    form = parse_qs(body.decode("utf-8"), keep_blank_values=True) if body else {}

    if method == "GET" and path == "/":
        views = _views(wizard)
        return Reply(200, _render(
            "overview.html", views=views, gates=catalogue.gates(),
            gate_titles=catalogue.GATE_TITLES, next_action=_next_action(views),
            done=sum(view.status is StepStatus.VERIFIED for view in views.values()),
            total=len(catalogue.STEPS)), set_token=set_token)

    if method == "GET" and path == "/publish":
        return Reply(200, _render("publish.html", diff=pending_publication(wizard),
                                  publish=catalogue.PUBLISH), set_token=set_token)

    segments = path.strip("/").split("/")
    if len(segments) < 2 or segments[0] != "step" or catalogue.get(segments[1]) is None:
        return Reply(404, "<h1>Introuvable</h1>")
    step = catalogue.get(segments[1])
    assert step is not None
    action = segments[2] if len(segments) > 2 else ""

    if method == "GET" and not action:
        index = catalogue.STEPS.index(step)
        return Reply(200, _render(
            "step.html", step=step, view=_views(wizard)[step.id],
            current={field.target: current_value(wizard, field) for field in step.fields},
            saved=query.get("saved") == ["1"], error=query.get("error", [""])[0],
            previous=catalogue.STEPS[index - 1] if index else None,
            following=catalogue.STEPS[index + 1] if index + 1 < len(catalogue.STEPS) else None,
        ), set_token=set_token)

    if method != "POST":
        return Reply(405, "méthode non autorisée", "text/plain")
    if not action:
        error = save(wizard, step, form)
        suffix = f"error={error}" if error else "saved=1"
        return Reply(303, "", location=f"/step/{step.id}?{suffix}")
    if action == "verify":
        outcome = verify(wizard, step)
        return Reply(200, _render("partials/result.html", outcome=outcome, step=step,
                                  checked_at=datetime.now(UTC)))
    if action == "skip" and step.optional:
        wizard.state().mark(step.id, StepStatus.SKIPPED, "écartée volontairement")
        return Reply(303, "", location="/")
    if action == "reopen":
        wizard.state().mark(step.id, StepStatus.PENDING, "")
        return Reply(303, "", location=f"/step/{step.id}")
    return Reply(404, "<h1>Introuvable</h1>")


def serve(wizard: Wizard, host: str, port: int) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def _dispatch(self, method: str) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            token = cookies[TOKEN_COOKIE].value if TOKEN_COOKIE in cookies else ""
            reply = respond(wizard, method, self.path, cookie=token,
                            body=self.rfile.read(length) if length else b"")
            payload = reply.body.encode("utf-8")
            self.send_response(reply.status)
            self.send_header("Content-Type", reply.content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            if reply.location:
                self.send_header("Location", reply.location)
            if reply.set_token:
                self.send_header("Set-Cookie", f"{TOKEN_COOKIE}={wizard.token}; HttpOnly; "
                                               "SameSite=Strict; Path=/")
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self) -> None:  # noqa: N802
            self._dispatch("GET")

        def do_POST(self) -> None:  # noqa: N802
            self._dispatch("POST")

        def log_message(self, *args: object) -> None:
            return

    return ThreadingHTTPServer((host, port), Handler)
