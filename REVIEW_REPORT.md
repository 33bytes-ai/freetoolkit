STATUS: PASS

## Scope reviewed
Task: "WebApplication schema JSON-LD par page outil" (backlog entry, index 8).
Diff touches only `backlog.json` (status update + note) and `tests/test_build.py`
(one new test). No template or `build.py` changes were made.

## Summary
The Builder found the WebApplication JSON-LD block already unconditionally
present in `templates/tool.html:37-52` — it predates this backlog entry, so the
backlog status was simply stale rather than a missing feature. Instead of
touching the template, the Builder hardened test coverage: the pre-existing
`test_tool_pages_have_web_application_schema` only spot-checked one hardcoded
tool page; the new test loops over every tool.

## Verification performed
- Read `templates/tool.html:37-52` directly: an unconditional
  `<script type="application/ld+json" nonce="{{ csp_nonce }}">` block emits
  `"@type": "WebApplication"`, `applicationCategory`, `operatingSystem`,
  `browserRequirements`, `url`, `offers` (`{"@type": "Offer", "price": "0",
  "priceCurrency": "USD"}`), `publisher` (Organization), and conditional
  `datePublished`/`dateModified` — matches the note's description exactly and
  confirms the task's stated goal is already met for every tool page (the block
  has no per-tool conditional gating besides the date fields).
- Confirmed the exact JSON key/value strings the new test asserts against
  (`'"@type": "WebApplication"'`, `'"@type": "Offer"'`) match the literal
  spacing emitted by the template — not a loose substring match that could pass
  spuriously.
- Confirmed `TOOL_SLUGS` (tests/test_build.py:12-15) is derived dynamically
  from `content/tools.yaml` rather than hardcoded, so
  `test_all_tool_pages_have_complete_web_application_schema` automatically
  covers tools added in the future — same pattern already used earlier in the
  file for `EXPECTED_FILES`.
- New test (tests/test_build.py:1383-1393) matches existing file conventions:
  one-line docstring, calls `run_build()` per test like its neighbors, same
  assertion/message style as surrounding tests. It's additive and does not
  duplicate or weaken the existing single-page test.
- `backlog.json` diff is a clean status ("pending" → "done") + `note` update;
  the `note` field's use to record findings/caveats matches the convention
  already established by other completed entries in this file.

## Conventions check (CLAUDE.md)
- No template/JS changes were needed, so CSP-nonce and inline-handler rules
  are not implicated by this diff.
- Test-only change, matches existing test file style — respected.
- No dead code, no backwards-compat shims introduced — respected.
- Small, focused change — respected.

## Caveat
Could not execute `make build` / `make test-py` / `pytest` in this review
session — same sandbox restriction ("This command requires approval") the
Builder hit. Verification above is static (direct template read + exact
string comparison + convention check), not a live test run. Recommend a
human/CI run of `make build && make test-py` before merge, per the Builder's
own note.

## Issues found
None.
