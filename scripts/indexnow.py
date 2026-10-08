"""Tell IndexNow engines (Bing, which ChatGPT Search reads, Yandex, Seznam) what a deploy changed.

    python scripts/indexnow.py changed > changed.txt   before publishing: dist/ vs the live sitemap
    python scripts/indexnow.py submit < changed.txt    after publishing

`changed` must run before the publish, while the live sitemap is still the
previous release's. A URL is changed when it is new or its <lastmod> moved.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from freetoolkit.setup import checks  # noqa: E402

ENDPOINT = "https://api.indexnow.org/indexnow"
URL_RE = re.compile(r"<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>")


def lastmods(sitemap: str) -> dict[str, str]:
    return dict(URL_RE.findall(sitemap))


def changed(built: str, live: str) -> list[str]:
    before = lastmods(live)
    return [url for url, lastmod in lastmods(built).items() if before.get(url) != lastmod]


def main() -> int:
    site = yaml.safe_load((ROOT / "content" / "config.yaml").read_text())["site"]
    base = site["base_url"].rstrip("/")
    command = sys.argv[1] if len(sys.argv) > 1 else ""

    if command == "changed":
        live = checks.fetch(f"{base}/sitemap.xml")
        # Unreachable live sitemap: submit everything rather than nothing.
        urls = changed((ROOT / "dist" / "sitemap.xml").read_text(), live.text if live.status == 200 else "")
        print("\n".join(urls))
        return 0

    if command == "submit":
        urls = [line.strip() for line in sys.stdin if line.strip()]
        if not urls:
            print("IndexNow: nothing changed, nothing submitted.")
            return 0
        key = site["indexnow_key"]
        body = json.dumps({
            "host": base.split("://", 1)[1],
            "key": key,
            "keyLocation": f"{base}/{key}.txt",
            "urlList": urls,
        }).encode()
        request = urllib.request.Request(
            ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
        try:
            with urllib.request.urlopen(request, timeout=30) as reply:
                print(f"IndexNow: HTTP {reply.status}, {len(urls)} URL submitted.")
                return 0
        except urllib.error.HTTPError as error:
            print(f"IndexNow: HTTP {error.code} {error.read().decode('utf-8', 'replace')}", file=sys.stderr)
            return 1

    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
