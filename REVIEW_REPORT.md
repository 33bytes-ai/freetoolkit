STATUS: PASS

## Scope reviewed
Task: "Header Content-Security-Policy dans nginx.conf" (backlog #21.00).
`infra/nginx.conf`, `infra/Dockerfile`, `src/freetoolkit/build.py`, all `templates/*.html`,
`static/js/lib/common.js`, `static/js/tools/{dcf,mirr,weighted-average}-calculator.js`,
`tests/test_build.py`, `.gitignore`, `CLAUDE.md` docs.

## Findings

None blocking.

## Notes (non-blocking)

- Could not execute `make test-py` / `pytest` / `make test-js` in this sandbox — shell
  commands required interactive approval that never arrived. Reviewed the new/changed
  tests statically instead (see "Verification performed"); they look correct and target
  the actual risk. Recommend running `make test` before merge/deploy as a final gate.
- `templates/dashboard.html` (untouched by this diff) still carries its own
  `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-{{ csp_nonce }}'">`
  tag. It now shares the same build-wide nonce as the response header (good — previously it
  minted its own independent `secrets.token_urlsafe(16)` in `build.py`, which this diff
  correctly removed in favor of the shared `common` nonce). Flagging for awareness only:
  browsers enforce meta-tag CSP and header CSP together (most-restrictive-wins per
  directive), so this meta tag's narrower `script-src` (no `pagead2.googlesyndication.com`)
  would block AdSense's external script specifically on `/dashboard/` if ads were ever
  enabled there. This is pre-existing behavior, not introduced by this change, and the
  dashboard is `noindex`/internal-only, so likely intentional. Not a defect of this task.
- Minor style nit: the new tests in `tests/test_build.py` import `re` two different ways
  (`import re` in one test, `__import__("re")` inline in two others). Cosmetic only.

## Verification performed

- Read the full diff for every file touched by this task.
- Confirmed `nginx.conf`'s CSP `script-src` dropped `'unsafe-inline'` and now uses
  `'nonce-__CSP_NONCE__'` alongside the existing AdSense origins — matches the task
  description ("bloquer inline scripts non-nonce").
- Confirmed `build.py` generates one `csp_nonce` per build, threads it through the shared
  `common` template-context dict (previously only the dashboard page minted its own
  independent nonce — now unified, which is required for the single nginx header to match
  markup across *every* page), and writes it to `csp_nonce.txt` at repo root (correctly
  added to `.gitignore`).
- Confirmed `infra/Dockerfile` copies `csp_nonce.txt` from the builder stage and `sed`-
  substitutes it into the nginx placeholder at image build time. `secrets.token_urlsafe`'s
  URL-safe alphabet (`A-Za-z0-9-_`) contains no `/`, so the `sed s/.../.../ ` substitution
  is safe from delimiter collisions.
- Grepped all of `templates/` for `<script>` tags: every inline script (including
  `type="application/ld+json"`) now carries `nonce="{{ csp_nonce }}"`; external-`src`
  scripts (AdSense loader, `dashboard.js`) correctly do not need one.
- Grepped `templates/` and `static/js/` for `onclick=`/`onload=`/`onerror=`: none remain.
  The two elements that used inline `onclick` (`dashboard.html`'s unlock button,
  `tool.html`'s print button) were converted to `id` + `addEventListener`, wired in
  `dashboard.html`'s own inline script and `static/js/lib/common.js` respectively —
  matching the pattern CLAUDE.md already documents for this codebase.
- Checked the three calculator JS files (`dcf`, `mirr`, `weighted-average-calculator`):
  each `addRow()`-built remove button dropped its
  `onclick="...closest(...)...window._xRun..."` string and now binds via
  `row.querySelector("button").addEventListener("click", ...)`, and the now-unnecessary
  `window._xRun` globals were removed. Consistent with the pre-existing `addRow()` pattern.
- Reviewed the new tests in `tests/test_build.py`: nonce file is written, every inline
  script across representative page types (home, tools index, a tool page, changelog,
  dashboard, about, an intent page) carries that exact nonce, no inline event-handler
  attributes exist anywhere in built HTML or in template/JS source, `nginx.conf`'s
  `script-src` has no `unsafe-inline` and does have the placeholder + AdSense origin, and
  the Dockerfile performs the substitution. These tests are relevant and cover the real
  risk (header/markup nonce mismatch would silently break every inline script site-wide).
- `BACKLOG.md` / `backlog.json` / `CLAUDE.md` updates are orchestrator bookkeeping and
  documentation, consistent with the shipped change.

## Conventions check (CLAUDE.md)
- Inline scripts all carry `nonce="{{ csp_nonce }}"` — respected (project rule).
- No inline event-handler attributes anywhere — respected (project rule).
- No comments explaining "what" the code does; the few comments added explain non-obvious
  build/deploy wiring (nonce must match between build.py and Dockerfile) — respected.
- No backwards-compat shims / dead code — respected (removed the now-unused
  `window._xRun` globals rather than leaving them).
- Small, focused change — respected (touches only CSP/nonce plumbing + the handful of
  inline-handler call sites it required, plus tests/docs).
