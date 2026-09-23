.PHONY: build test-js test-py test check-perf serve serve-network deploy setup gsc-auth gsc gsc-push clean help

PYTHON := .venv/bin/python
PYTEST  := .venv/bin/pytest

help:
	@echo "build           Build the static site into dist/"
	@echo "test-js         Run JavaScript unit tests (requires Node 18+)"
	@echo "test-py         Run Python build tests"
	@echo "test            Run all tests"
	@echo "check-perf      Check file size budgets, meta coverage, sitemap, og:images"
	@echo "serve           Serve dist/ at http://localhost:8080"
	@echo "serve-network   Serve dist/ on all interfaces (LAN access)"
	@echo "deploy          Build and publish to Cloudflare Pages by hand (CI does it on merge)"
	@echo "setup           Open the setup wizard: every step only a human can do"
	@echo "gsc-auth        Authorize Google Search Console (once)"
	@echo "gsc             Search Console: sitemaps, performance, what Google still indexes"
	@echo "gsc-push        Submit the served sitemaps to Search Console, withdraw dead ones"
	@echo "clean           Remove dist/"

build: .venv
	$(PYTHON) src/freetoolkit/build.py

test-js:
	node --test tests/test_tools.js

test-py: .venv
	$(PYTEST) tests/test_build.py tests/test_setup_wizard.py -v

test: test-js test-py

check-perf: build
	$(PYTHON) scripts/check_perf.py

serve: build
	$(PYTHON) -m http.server 8080 --directory dist

serve-network: build
	@LOCAL_IP=$$(hostname -I 2>/dev/null | awk '{print $$1}' || echo "your-ip"); \
	echo ""; \
	echo "  Local:   http://localhost:8080"; \
	echo "  Network: http://$$LOCAL_IP:8080"; \
	echo "  Dashboard: http://$$LOCAL_IP:8080/dashboard/"; \
	echo ""; \
	$(PYTHON) -m http.server 8080 --bind 0.0.0.0 --directory dist

deploy: test build
	npx wrangler pages deploy dist --project-name=foundercalc

setup: .venv
	$(PYTHON) scripts/setup_wizard.py

gsc-auth: .venv
	$(PYTHON) scripts/search_console.py auth

gsc: .venv
	$(PYTHON) scripts/search_console.py status

gsc-push: .venv
	$(PYTHON) scripts/search_console.py push

clean:
	rm -rf dist/

.venv: pyproject.toml
	python3 -m venv .venv
	.venv/bin/pip install -q -e ".[dev]"
	@touch .venv
