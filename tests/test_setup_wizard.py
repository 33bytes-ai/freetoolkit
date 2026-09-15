"""The setup wizard: its catalogue, the files it edits, its routes and its checks.

No test reaches the network. Checks read the site through checks.fetch, which
is replaced by a dictionary of what the "site" serves.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from freetoolkit.setup import catalogue, checks, contentfile, webapp  # noqa: E402
from freetoolkit.setup.state import StepStatus  # noqa: E402

TOKEN = "t0ken"
BASE = catalogue.BASE_URL


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    (tmp_path / "content").mkdir()
    for name in ("config.yaml", "affiliates.yaml", "intent_pages.yaml", "tools.yaml"):
        shutil.copy(ROOT / "content" / name, tmp_path / "content" / name)
    return tmp_path


@pytest.fixture
def wizard(repo: Path) -> webapp.Wizard:
    return webapp.Wizard(root=repo, token=TOKEN)


@pytest.fixture
def site(monkeypatch):
    """What the fake site serves: path or URL -> Response."""
    served: dict[str, checks.Response] = {}

    def fetch(url: str, *, follow: bool = True) -> checks.Response:
        return served.get(url.removeprefix(BASE), checks.Response(404, ""))

    monkeypatch.setattr(checks, "fetch", fetch)
    return served


def get(wizard, target: str, **kwargs) -> webapp.Reply:
    joiner = "&" if "?" in target else "?"
    return webapp.respond(wizard, "GET", f"{target}{joiner}t={TOKEN}", **kwargs)


def post(wizard, target: str, form: dict[str, str | list[str]]) -> webapp.Reply:
    from urllib.parse import urlencode

    body = urlencode(form, doseq=True).encode()
    return webapp.respond(wizard, "POST", target, cookie=TOKEN, body=body)


def first_intent(repo: Path) -> dict:
    return yaml.safe_load((repo / "content" / "intent_pages.yaml").read_text())[0]


def first_tool(repo: Path) -> str:
    tools = yaml.safe_load((repo / "content" / "tools.yaml").read_text())
    return (tools if isinstance(tools, list) else tools["tools"])[0]["slug"]


# -- catalogue ---------------------------------------------------------------


def test_the_catalogue_only_points_at_things_that_exist():
    ids = [step.id for step in catalogue.STEPS]
    assert len(ids) == len(set(ids))
    config = contentfile.read_config(ROOT / "content" / "config.yaml")
    affiliates = contentfile.read_affiliates(ROOT / "content" / "affiliates.yaml")
    for step in catalogue.STEPS:
        assert all(name in catalogue.BY_ID for name in step.prerequisites), step.id
        assert not step.check or step.check in checks.CHECKS, step.id
        assert step.check or step.acknowledgements, f"{step.id} has no proof at all"
        for field in step.fields:
            assert field.store in ("config", "affiliate", "local"), field.target
            if field.store == "config":
                assert contentfile.config_value(config, field.key) is not None, field.key
            if field.store == "affiliate":
                assert contentfile.programme_entries(affiliates, field.key), field.key


def test_the_site_build_never_imports_the_wizard():
    build = (ROOT / "src" / "freetoolkit" / "build.py").read_text()
    assert "freetoolkit.setup" not in build


# -- the files it edits ------------------------------------------------------


def test_a_config_value_is_written_without_touching_the_comments(repo):
    path = repo / "content" / "config.yaml"
    before = path.read_text().splitlines()

    contentfile.set_config_values(path, {"site.adsense_slots.tool-mid": "1234567890"},
                                  backup_dir=repo / "backups")

    after = path.read_text().splitlines()
    changed = [(a, b) for a, b in zip(before, after, strict=True) if a != b]
    assert changed == [('    tool-mid: ""', '    tool-mid: "1234567890"')]
    assert list((repo / "backups").iterdir())


def test_an_unknown_config_key_is_refused_and_nothing_is_written(repo):
    path = repo / "content" / "config.yaml"
    before = path.read_text()
    with pytest.raises(contentfile.ContentWriteError):
        contentfile.set_config_values(path, {"site.adsense_slot.tool-mid": "1"},
                                      backup_dir=repo / "backups")
    assert path.read_text() == before


def test_a_programme_link_reaches_every_card_and_only_those(repo):
    path = repo / "content" / "affiliates.yaml"
    before = contentfile.read_affiliates(path)
    comments = [line for line in path.read_text().splitlines() if line.lstrip().startswith("#")]

    touched = contentfile.set_affiliate_url(path, "ChartMogul", "https://chartmogul.com/?ref=fc",
                                            backup_dir=repo / "backups")

    after = contentfile.read_affiliates(path)
    cards = contentfile.programme_entries(after, "ChartMogul")
    assert touched == len(cards) > 1
    assert all(card["url"] == "https://chartmogul.com/?ref=fc" and card["affiliate"] is True
               for card in cards)
    assert contentfile.programme_entries(after, "Baremetrics") == \
        contentfile.programme_entries(before, "Baremetrics")
    assert [line for line in path.read_text().splitlines()
            if line.lstrip().startswith("#")] == comments


# -- routes ------------------------------------------------------------------


def test_nothing_answers_without_the_token(wizard):
    assert webapp.respond(wizard, "GET", "/").status == 403
    assert webapp.respond(wizard, "POST", "/step/formspree", body=b"").status == 403
    reply = get(wizard, "/")
    assert reply.status == 200 and reply.set_token


def test_every_step_page_renders(wizard):
    for step in catalogue.STEPS:
        reply = get(wizard, f"/step/{step.id}")
        assert reply.status == 200, step.id
        assert step.title.replace("'", "&#39;") in reply.body, step.id


def test_saving_a_slot_writes_config_yaml(wizard, repo):
    reply = post(wizard, "/step/adsense_slots", {
        "field.config:site.adsense_slots.tool-mid": "1234567890",
        "field.config:site.adsense_slots.home-mid": "0987654321",
    })
    assert (reply.status, reply.location) == (303, "/step/adsense_slots?saved=1")
    slots = contentfile.config_value(
        contentfile.read_config(repo / "content" / "config.yaml"), "site.adsense_slots")
    assert slots == {"tool-mid": "1234567890", "home-mid": "0987654321"}


def test_saving_an_affiliate_link_updates_the_programme(wizard, repo):
    post(wizard, "/step/affiliate_paddle",
         {"field.affiliate:Paddle": "https://www.paddle.com/?ref=foundercalc"})
    cards = contentfile.programme_entries(
        contentfile.read_affiliates(repo / "content" / "affiliates.yaml"), "Paddle")
    assert {card["url"] for card in cards} == {"https://www.paddle.com/?ref=foundercalc"}


def test_an_empty_affiliate_box_leaves_the_cards_alone(wizard, repo):
    path = repo / "content" / "affiliates.yaml"
    before = path.read_text()
    post(wizard, "/step/affiliate_paddle", {"field.affiliate:Paddle": ""})
    assert path.read_text() == before


def test_confirmations_are_the_proof_when_there_is_no_check(wizard):
    step = catalogue.BY_ID["hetzner_closure"]
    reply = post(wizard, "/step/hetzner_closure/verify", {})
    assert "ÉCHEC" in reply.body

    post(wizard, "/step/hetzner_closure", {"ack": list(step.acknowledgements)})
    assert "OK" in post(wizard, "/step/hetzner_closure/verify", {}).body
    assert wizard.state().record("hetzner_closure").status is StepStatus.VERIFIED


def test_changing_a_verified_value_needs_a_new_check(wizard, site, repo):
    site["/"] = checks.Response(200, 'action="https://formspree.io/f/xnjewraq"')
    step = catalogue.BY_ID["formspree"]
    post(wizard, "/step/formspree", {"ack": list(step.acknowledgements)})
    post(wizard, "/step/formspree/verify", {})
    assert wizard.state().record("formspree").status is StepStatus.VERIFIED

    post(wizard, "/step/formspree", {"field.config:site.formspree_id": "abcdefgh",
                                     "ack": list(step.acknowledgements)})

    assert wizard.state().record("formspree").status is StepStatus.PENDING


def test_skip_is_only_for_optional_steps(wizard):
    assert post(wizard, "/step/urssaf/skip", {}).status == 404
    assert post(wizard, "/step/twitter/skip", {}).status == 303


def test_the_publish_page_shows_the_pending_diff(wizard, repo):
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "add", "content"], cwd=repo, check=True)
    subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init"],
                   cwd=repo, check=True)
    assert "Rien en attente" in get(wizard, "/publish").body

    post(wizard, "/step/twitter", {"field.config:site.twitter": "foundercalc"})

    assert "foundercalc" in get(wizard, "/publish").body


# -- checks ------------------------------------------------------------------


def context(repo: Path, step_id: str) -> checks.Context:
    return checks.Context(root=repo, step=catalogue.BY_ID[step_id], local={})


def serve_healthy_site(site, repo: Path) -> None:
    page = first_intent(repo)
    site["/"] = checks.Response(200, "<html></html>")
    site["/ads.txt"] = checks.Response(
        200, "google.com, pub-6294535713639434, DIRECT, f08c47fec0942fa0\n")
    site[f"/tools/{page['parent_tool']}/{page['slug']}/"] = checks.Response(
        301, "", f"{BASE}/tools/{page['parent_tool']}/#{page['slug']}")


def test_the_site_check_passes_on_a_healthy_site(site, repo):
    serve_healthy_site(site, repo)
    assert checks.check_site_live(context(repo, "site_live")).ok


def test_ads_txt_must_carry_the_publisher_id_not_the_client_id(site, repo):
    serve_healthy_site(site, repo)
    site["/ads.txt"] = checks.Response(
        200, "google.com, ca-pub-6294535713639434, DIRECT, f08c47fec0942fa0\n")

    outcome = checks.check_site_live(context(repo, "site_live"))

    assert not outcome.ok and "ads.txt" in outcome.summary


def test_an_affiliate_link_is_proven_on_the_page_that_shows_it(site, repo):
    path = repo / "content" / "affiliates.yaml"
    ctx = context(repo, "affiliate_chartmogul")
    assert not checks.check_affiliate_link(ctx).ok

    contentfile.set_affiliate_url(path, "ChartMogul", "https://chartmogul.com",
                                  backup_dir=repo / "b")
    bare = checks.check_affiliate_link(ctx)
    assert not bare.ok and "page d'accueil" in bare.summary

    tracked = "https://chartmogul.com/?ref=fc&utm_source=foundercalc"
    contentfile.set_affiliate_url(path, "ChartMogul", tracked, backup_dir=repo / "b")
    unpublished = checks.check_affiliate_link(ctx)
    assert not unpublished.ok and unpublished.remedy == checks.PUBLISH_REMEDY

    slug = next(slug for slug, cards in contentfile.read_affiliates(path).items()
                if any(card["name"] == "ChartMogul" for card in cards or []))
    site[f"/tools/{slug}/"] = checks.Response(200, f'<a href="{tracked.replace("&", "&amp;")}">')
    assert checks.check_affiliate_link(ctx).ok


def test_ad_slots_must_be_numbers_and_on_the_site(site, repo):
    config = repo / "content" / "config.yaml"
    ctx = context(repo, "adsense_slots")
    contentfile.set_config_values(config, {"site.adsense_slots.tool-mid": "tool-mid",
                                           "site.adsense_slots.home-mid": "0987654321"},
                                  backup_dir=repo / "b")
    assert "tool-mid" in checks.check_adsense_slots(ctx).summary

    contentfile.set_config_values(config, {"site.adsense_slots.tool-mid": "1234567890"},
                                  backup_dir=repo / "b")
    assert not checks.check_adsense_slots(ctx).ok

    site["/"] = checks.Response(200, 'data-ad-slot="0987654321"')
    site[f"/tools/{first_tool(repo)}/"] = checks.Response(200, 'data-ad-slot="1234567890"')
    assert checks.check_adsense_slots(ctx).ok


def test_an_undeployed_main_is_not_a_working_pipeline(monkeypatch, repo):
    def github(path: str) -> dict:
        if path.startswith("commits/"):
            return {"sha": "b" * 40}
        return {"workflow_runs": [{"head_sha": "a" * 40, "status": "completed",
                                   "conclusion": "success", "html_url": "u"}]}

    monkeypatch.setattr(checks, "_github", github)
    outcome = checks.check_deploy_pipeline(context(repo, "deploy_pipeline"))
    assert not outcome.ok and "pas encore déployé" in outcome.summary


def test_a_crashing_check_reports_instead_of_breaking_the_page(monkeypatch, repo):
    monkeypatch.setitem(checks.CHECKS, "site_live", lambda ctx: 1 / 0)
    outcome = checks.run("site_live", context(repo, "site_live"))
    assert not outcome.ok and "ZeroDivisionError" in outcome.summary


def test_the_wizard_refuses_to_listen_off_this_machine():
    script = ROOT / "scripts" / "setup_wizard.py"
    completed = subprocess.run([sys.executable, str(script), "--host", "0.0.0.0", "--no-browser"],
                               capture_output=True, text=True, timeout=30, check=False)
    assert completed.returncode != 0 and "refusing to bind" in completed.stderr
