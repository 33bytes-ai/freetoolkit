STATUS: PASS

## Scope reviewed
Uncommitted diff for "Rapport de performance Lighthouse en CI":
- `.github/workflows/ci.yml` — Lighthouse step now uses `staticDistDir: "./dist"`
  (real local server) with 3 relative URLs instead of a single `file://` URL.
- `.lighthouserc.json` — `categories:performance` tightened from `warn @0.85`
  to `error @0.90`; `categories:seo` tightened from `error @0.90` to
  `error @0.95`.
- `tests/test_build.py` — two new tests guarding the thresholds and the
  workflow's use of `staticDistDir`/absence of `file://`.
- `BACKLOG.md` / `backlog.json` / `PROJECT_STATE.md` — status flipped to
  `done` with a traceability note.

## Verified, no issues
- The 3 URLs referenced in `ci.yml` (`/`, `/tools/`, `/tools/dcf-calculator/`)
  all correspond to pages `build.py` actually generates (`DIST_DIR/tools/index.html`
  for `/tools/`; `dcf-calculator` confirmed as a real slug in `content/tools.yaml`).
- `.lighthouserc.json` stays valid JSON; only the two targeted values
  changed. `["error", {"minScore": X}]` correctly fails CI when a category
  scores below `X`, matching the task's "fail if Performance < 90 or SEO < 95".
- The new thresholds were checked against the real Lighthouse scores already
  recorded in `PROJECT_STATE.md`'s "real run (2026-07-10, follow-up)" section
  (performance 0.98/0.98/0.94, SEO 1.00/0.98/0.97 across the same 3 pages) —
  the tightened gate would not have failed that known-good build, and this
  matches what `backlog.json`'s note claims.
- Both new tests are syntactically correct, sit at module level between two
  existing tests without disturbing them, and reuse fixtures/imports already
  present in the file (`ROOT`, `json`).
- No templates or inline scripts were touched — CSP/nonce conventions are
  not implicated by this diff.
- `BACKLOG.md` / `backlog.json` / `PROJECT_STATE.md` updates are internally
  consistent with each other and with the diff.

## Caveat (non-blocking)
As already disclosed by the builder in `backlog.json`, this sandbox's
permission mode blocks direct shell execution (`make build`, `make test-py`,
`python3 -m pytest ...`) — confirmed again during this review by re-attempting
`python3 -m pytest tests/test_build.py -k lighthouse -q`, which requires an
approval that doesn't arrive autonomously. Review was done via static
tracing (build.py output paths, tools.yaml slugs, JSON/YAML re-reading) and
cross-checking against previously recorded real scores, not a live test run.
A real CI run on the next push will be the first live confirmation that the
job passes end-to-end.

## Findings
Aucun.
