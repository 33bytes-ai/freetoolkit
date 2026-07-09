.PHONY: build test-js test-py test check-perf serve serve-network deploy clean help

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
	@echo "deploy          Build and deploy to VPS (requires FREETOOLKIT_HOST)"
	@echo "clean           Remove dist/"

build: .venv
	$(PYTHON) src/freetoolkit/build.py

test-js:
	node --test tests/test_tools.js

test-py: .venv
	$(PYTEST) tests/test_build.py -v

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
	bash scripts/deploy.sh

clean:
	rm -rf dist/

.venv: pyproject.toml
	python3 -m venv .venv
	.venv/bin/pip install -q -e ".[dev]"
	@touch .venv
