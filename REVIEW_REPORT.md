STATUS: PASS

## Summary
Task: "Audit remaining pages/templates for other placeholder or hardcoded content."
The Builder found and fixed two real issues:
1. `content/affiliates.yaml`: 17 entries marked `affiliate: true` had unfilled
   `?via=YOURID` / `?ref=YOURID` / `?lmref=YOURID` tracking params. Changed to
   `affiliate: false` and stripped the placeholder query param (plus 2 already
   `affiliate: false` entries with the same leftover param, also cleaned up).
2. `content/pages/{terms,privacy,contact}.md`: still branded "FreeToolKit" and
   described a stale tool lineup (word counter, JSON formatter, Base64 encoder,
   password generator, etc.) that doesn't match this site. Rewritten to say
   "FounderCalc" and describe the real calculator category.

## Verification performed
- Confirmed via `content/config.yaml`, `content/pages/about.md`,
  `content/pages/comparisons.md`, and `templates/index.html` that "FounderCalc"
  is the actual site brand everywhere else — the three legal pages were the
  only outliers still saying "FreeToolKit". The fix aligns them with the rest
  of the site rather than introducing a new inconsistency.
- `grep -rl "FreeToolKit" content/ templates/ static/` now returns nothing —
  no stale brand references remain anywhere in the tree.
- `grep "YOURID"` and `grep "affiliate: true"` in `content/affiliates.yaml`
  confirm zero remaining placeholder IDs and zero remaining `affiliate: true`
  data lines (the one match is in the file's own instructional header
  comment, not an actual entry).
- Checked `templates/tool.html:168-181` and `src/freetoolkit/build.py` to
  confirm `affiliate` only gates the FTC disclosure badge and `rel=sponsored`
  — flipping these 17 entries to `false` is safe and matches the pattern
  already used by other non-affiliate entries in the same file (e.g. the
  QuickBooks entries).
- Confirmed `test_legal_pages_use_site_brand_not_stale_tool_list` reads from
  `DIST/{page}/index.html`, which matches `EXPECTED_FILES` earlier in the
  same test file (`privacy/index.html`, `terms/index.html`,
  `contact/index.html` are already expected build outputs) — no path
  mismatch.
- Confirmed `test_affiliate_links_have_no_placeholder_ids` follows the same
  direct-YAML-read pattern already used elsewhere in the test file, with no
  unneeded `run_build()` call since it only inspects source content.
- Correctly left `content/config.yaml`'s
  `base_url: https://foundercalc.example.com` untouched, since the repo's own
  CLAUDE.md documents that as an intentional deploy-time placeholder, not a
  bug, and it was already the subject of a separate prior task.
- `BACKLOG.md` / `backlog.json` updated consistently to `done` with a
  detailed, accurate note.

## Limitations
- Could not execute `make test` / `pytest` in this review session — Python
  invocations require interactive approval not available here (same
  restriction the Builder hit and disclosed). Verification above relied on
  static reads/greps tracing YAML data, template consumption, and test
  assertions by hand; no ambiguity was found. Recommend running `make test`
  once in an unrestricted shell before merge, as the Builder also
  recommended.

## Issues found
None.
