STATUS: PASS

## Scope
Reviewed the diff for task "Sitemap avec lastmod dynamique" (backlog #22.50):
- `src/freetoolkit/build.py` — `write_sitemap()` rewritten to assign per-URL
  `lastmod` instead of a blanket `today` for every entry
- `content/tools.yaml` — added a comment block documenting `date_added` / `updated`
- `tests/test_build.py` — two new tests
- `BACKLOG.md` / `backlog.json` — status updates (this task, plus an unrelated
  task #31.50 flipped from `pending` to `done`)

## Findings
None blocking.

## Notes (non-blocking)
1. **Not verified by test execution.** This reviewer session hit the same sandbox
   permission restriction the builder's note in `backlog.json` describes: `pytest`
   / `make test-py` require an approval that never arrives autonomously. I traced
   the new logic manually instead:
   - Priority/changefreq values for every URL class (`/`, `/tools/`, `/changelog/`,
     tool pages, static pages, intent pages) are unchanged from the pre-diff
     branching logic — confirmed tuple-by-tuple against the removed code.
   - `tool_lastmod = t.get("updated") or t.get("date_added") or today` falls back
     in the right order; no tool in `content/tools.yaml` currently sets `updated`,
     so today's sitemap output is identical in shape to before except tool/intent
     URLs now carry `date_added` instead of `today`.
   - The two new tests (`test_sitemap_has_per_tool_date_added_lastmod`,
     `test_sitemap_respects_updated_field_override`) target the right behavior,
     reuse the established `run_build()` + `DIST` fixtures, and
     `from freetoolkit import build as ftk_build` resolves correctly via the
     project's editable install (`.venv/lib/python*/site-packages/_editable_impl_freetoolkit.pth`).
   - Checked all other sitemap-related tests in the file for assumptions that
     would conflict with the new per-tool lastmod (e.g. an assertion that every
     URL shares one `today` lastmod) — none found.
   - This is manual static verification, not a green test run — a human or CI
     should still run `make test-py` before treating this as fully confirmed.
2. **Code duplication, not a regression.** `write_sitemap()` still hand-builds
   XML instead of reusing the `_sitemap_urlset()` helper (used by
   `write_sitemap_pages`), which already supports an optional 4th `lastmod`
   tuple element. This duplication pre-dates this diff (the old `write_sitemap`
   also didn't use the helper), so it's not introduced by this change, but now
   that `write_sitemap` needs the same optional-lastmod behavior the helper
   already provides, it would have been a good opportunity to consolidate.
   Worth a follow-up cleanup ticket, not a blocker.
3. **Tuple field order is inconsistent across the file.** `write_sitemap()` uses
   `(url, priority, freq, lastmod)` while `_sitemap_urlset()` uses
   `(url, freq, priority, lastmod)`. Both are internally consistent with their
   own unpacking, so there's no bug, but a future edit that copy-pastes a tuple
   between the two could silently swap priority/changefreq.
4. **`backlog.json` diff also flips task #31.50 ("Remplacer og:image SVG par PNG
   statique") to `done`.** That task's code isn't in this diff — it was already
   committed (`git log` shows commit `0e314b9` for it) — so this looks like a
   stale-status cleanup riding along with this change rather than scope creep.
5. `content/tools.yaml` comment addition documents a non-obvious contract (how
   the sitemap consumes `date_added`/`updated`), consistent with CLAUDE.md's
   "only comment the WHY" guidance.

## Conventions check (CLAUDE.md)
- No comments explaining "what" the code does — respected.
- No backwards-compat shims / dead code — respected.
- Small, focused change — respected (touches only sitemap logic + docs + tests +
  backlog bookkeeping).
