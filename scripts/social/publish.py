"""Publish the queued X post for a day, through the official API only.

    python scripts/social/publish.py [--date YYYY-MM-DD] [--live]

Dry run unless --live. Needs X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and
X_ACCESS_SECRET (OAuth 1.0a user context). A published post moves from
social/queue/ to social/posted/ with its X id, which is also what makes a
second run for the same day a no-op.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from functools import partial
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gate  # noqa: E402

SOCIAL = gate.ROOT / "social"
URL = "https://api.x.com/2/tweets"


def oauth_header(method: str, url: str, keys: dict, *, nonce: str | None = None,
                 timestamp: str | None = None) -> str:
    """OAuth 1.0a HMAC-SHA1. The JSON body is not part of the signature."""
    params = {"oauth_consumer_key": keys["X_API_KEY"], "oauth_token": keys["X_ACCESS_TOKEN"],
              "oauth_nonce": nonce or secrets.token_hex(16), "oauth_timestamp": timestamp or str(int(time.time())),
              "oauth_signature_method": "HMAC-SHA1", "oauth_version": "1.0"}
    quote = partial(urllib.parse.quote, safe="~")
    base = "&".join([method, quote(url), quote("&".join(f"{quote(k)}={quote(v)}" for k, v in sorted(params.items())))])
    key = f"{quote(keys['X_API_SECRET'])}&{quote(keys['X_ACCESS_SECRET'])}"
    params["oauth_signature"] = base64.b64encode(hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()).decode()
    return "OAuth " + ", ".join(f'{quote(k)}="{quote(v)}"' for k, v in sorted(params.items()))


def send(text: str, keys: dict) -> dict:
    request = urllib.request.Request(
        URL, data=json.dumps({"text": text}).encode(), method="POST",
        headers={"Authorization": oauth_header("POST", URL, keys), "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["data"]


def publish(day: str, *, live: bool, social: Path = SOCIAL, send=send) -> str:
    queued, posted = social / "queue" / f"{day}.json", social / "posted" / f"{day}.json"
    if posted.exists():
        return f"{day} already published"
    if not queued.exists():
        return f"nothing queued for {day}"
    post = json.loads(queued.read_text())
    text = gate.post_text(post)
    if not live:
        return f"dry run, would post:\n\n{text}"
    sent = send(text, {k: os.environ[k] for k in ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET")})
    posted.parent.mkdir(parents=True, exist_ok=True)
    posted.write_text(json.dumps({**post, "x_id": sent["id"]}, indent=2, ensure_ascii=False) + "\n")
    queued.unlink()
    return f"published {day}: https://x.com/i/status/{sent['id']}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=str(date.today()))
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    print(publish(args.date, live=args.live))
    return 0


if __name__ == "__main__":
    sys.exit(main())
