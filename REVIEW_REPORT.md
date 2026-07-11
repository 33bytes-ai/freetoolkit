STATUS: PASS

## Scope reviewed
Uncommitted diff for "Capture email fondateurs (newsletter / lead magnet)":
- `templates/base.html` — new site-wide footer signup form, gated behind `site.formspree_id`
- `static/css/style.css` — `.footer-newsletter` / `.footer-newsletter-form` styles
- `content/config.yaml` — updated comment documenting the two forms + Zapier→ConvertKit/Beehiiv path
- `tests/test_build.py` — two new tests
- `BACKLOG.md` / `backlog.json` — status tracking (task correctly left as `in_progress`, not `done`, pending human verification)

## Findings

1. **Minor / non-blocking — duplicate signup UI on the homepage.** `templates/index.html` already renders its own prominent `.newsletter-card` section ("Get notified when new calculators ship") when `site.formspree_id` is set. Because `base.html`'s footer is rendered on every page including the homepage, once `formspree_id` is configured the homepage will show *two* email-capture forms with near-identical copy: the mid-page card and the new footer form. Each has a distinct `id`/`_subject` so submissions won't collide, and the task did ask for a "discreet, site-wide" form (which is exactly right for every other page), but on the homepage specifically this reads as redundant rather than discreet. Not a functional bug — worth a follow-up decision (e.g. suppress the footer variant on `/` via `{% if path != '/' %}`, or accept the double chance-to-convert as intentional) but doesn't block this task.

## Verified, no issues
- `{% if site.formspree_id %}...{% endif %}` in `base.html` is balanced and correctly gates the form off by default (matches the existing homepage pattern).
- Accessibility: `sr-only` label wired to `for="footer-nl-email"`, `autocomplete="email"`, `required`, matches the existing `.newsletter-form` conventions.
- No inline scripts/event-handler attributes were added — no CSP nonce needed here, and none is missing.
- CSS additions are syntactically valid, reuse existing custom properties (`--border`, `--radius`, `--bg`, `--text`, `--accent`), and `.footer-cols`'s `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))` already accommodates a 4th column without changes.
- Dark mode: the footer input's `background: var(--bg)` against the footer's `background: var(--surface)` still produces valid contrast in the dark palette (`#0f1117` vs `#1a1d27`), so the lack of an explicit `@media (prefers-color-scheme: dark)` override (unlike `.newsletter-form`) is not a visual bug.
- `tests/test_build.py`'s two new tests were checked by hand against `src/freetoolkit/build.py`: `test_footer_newsletter_form_appears_on_every_page_when_formspree_id_set` calls `ftk_build.build_env()/load_config()/load_tools()/load_pages()/render()` and assembles a `common` dict that exactly mirrors the real `common` dict built in `build()` (same keys), which matches the existing precedent at `test_sitemap_respects_updated_field_override`. `test_footer_newsletter_form_hidden_without_formspree_id` correctly relies on the real `run_build()` (config's `formspree_id` is `""` by default).
- The stray `DIST/_test_footer_newsletter/` directory the second test writes does not leak into other tests: every subsequent test calls `run_build()`, which does `shutil.rmtree(DIST_DIR)` before re-populating it, and no other test does a broad `DIST.rglob`/`DIST.glob("**/*.html")` scan that would pick it up.
- `backlog.json`'s new `note`/`human_input_needed` fields match the schema already used by every other entry in the file (not a new convention).
- `BACKLOG.md`'s unrelated line change (Stripe country pages `pending` → `done`) is catching the markdown mirror up to `backlog.json`'s state from a prior, already-committed task (`3e167a9`) — not something this diff introduces incorrectly.

## Caveat
Neither the builder nor this review session could execute `make build` / `make test-py` — the sandbox's permission mode blocks all shell execution (`This command requires approval`). All of the above was verified by static/manual tracing of the Jinja templates, CSS, and Python build functions instead of an actual build run. A human or CI run of `make build && make test` is still needed before flipping this backlog entry to `done`.
