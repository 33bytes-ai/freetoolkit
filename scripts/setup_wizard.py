"""The guided setup for FounderCalc.

    make setup          (or: .venv/bin/python scripts/setup_wizard.py)

Opens a local page that walks through everything only a human can do — AdSense,
affiliate programmes, Formspree, the tax paperwork — stores what you paste in
content/, and checks each step against the site as served.

It binds to loopback and refuses anything else, and it never publishes:
publishing is merging content/ on main.
"""

from __future__ import annotations

import argparse
import ipaddress
import secrets
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from freetoolkit.setup.webapp import Wizard, serve  # noqa: E402

DEFAULT_PORT = 8766


def _loopback(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host == "localhost"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Guided setup for FounderCalc.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    if not _loopback(args.host):
        raise SystemExit(f"refusing to bind {args.host}: the wizard writes content/ and "
                         "is only safe because nothing off this machine can reach it.")

    wizard = Wizard(root=ROOT, token=secrets.token_urlsafe(16))
    url = f"http://{args.host}:{args.port}/?t={wizard.token}"
    print("\n  FounderCalc — configuration")
    print(f"  {url}")
    print("  loopback uniquement · le lien porte un jeton · Ctrl-C pour arrêter\n")
    if not args.no_browser:
        threading.Timer(0.6, webbrowser.open, args=(url,)).start()

    server = serve(wizard, args.host, args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
