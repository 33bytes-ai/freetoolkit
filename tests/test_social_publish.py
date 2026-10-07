"""Publishing an X post: dry run by default, once per day, official API only."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "social"))
import publish  # noqa: E402

POST = {"tool": "stripe-fee-calculator", "date": "2026-10-10", "hook": "Hook.",
        "value": "Value.", "cta_text": "Link in bio."}
KEYS = {"X_API_KEY": "ck", "X_API_SECRET": "cs", "X_ACCESS_TOKEN": "at", "X_ACCESS_SECRET": "as"}


def queue(tmp_path):
    (tmp_path / "queue").mkdir()
    (tmp_path / "queue" / "2026-10-10.json").write_text(json.dumps(POST))


def test_a_dry_run_sends_nothing(tmp_path):
    queue(tmp_path)
    sent = []
    out = publish.publish("2026-10-10", live=False, social=tmp_path, send=lambda *a: sent.append(a))
    assert "Hook." in out and sent == []
    assert (tmp_path / "queue" / "2026-10-10.json").exists()


def test_a_live_run_posts_once_and_moves_the_file(tmp_path, monkeypatch):
    queue(tmp_path)
    for k, v in KEYS.items():
        monkeypatch.setenv(k, v)
    sent = []

    def fake(text, keys):
        sent.append(text)
        return {"id": "123"}

    publish.publish("2026-10-10", live=True, social=tmp_path, send=fake)
    again = publish.publish("2026-10-10", live=True, social=tmp_path, send=fake)
    assert sent == ["Hook.\n\nValue.\n\nLink in bio."]
    assert json.loads((tmp_path / "posted" / "2026-10-10.json").read_text())["x_id"] == "123"
    assert not (tmp_path / "queue" / "2026-10-10.json").exists()
    assert "already published" in again


def test_nothing_queued_is_not_an_error(tmp_path):
    assert "nothing queued" in publish.publish("2026-10-10", live=True, social=tmp_path)


def test_the_oauth_header_is_signed_deterministically():
    a = publish.oauth_header("POST", publish.URL, KEYS, nonce="n", timestamp="1")
    assert a == publish.oauth_header("POST", publish.URL, KEYS, nonce="n", timestamp="1")
    assert a.startswith("OAuth ") and 'oauth_signature="' in a and "cs" not in a
