STATUS: PASS

## Scope
Reviewed unstaged changes to `static/js/lib/tracker.js` and `tests/test_tools.js` implementing:
- TTL raised from 30 to 90 days (`TTL_MS`)
- localStorage size limit raised from 50KB to 500KB (`SIZE_LIMIT`)
- Oldest-entry purge (across `pageviews` → `calc_uses` → `affiliate_clicks`, in insertion order) instead of wiping all pageviews on overflow

## Findings
None blocking.

- Correctness: `purgeOldestEntry` relies on `Object.keys()` insertion order for string keys, which holds here since all keys (page paths, tool slugs, `slug|partner` pairs) are non-numeric strings — no risk of V8's integer-key reordering silently breaking the "oldest first" assumption.
- `enforceSizeLimit`'s average-entry-size estimate for `toPurge` is an approximation (not exact byte accounting), but the surrounding `while` loop re-measures `JSON.stringify` length each pass and always purges at least one entry, so it correctly converges under `SIZE_LIMIT` regardless of estimate accuracy.
- The new early return `if (typeof window === "undefined") return;` (tracker.js:67) is placed after `module.exports` is populated (tracker.js:56-65), so `require()`-based unit tests still get `fresh/isExpired/purgeOldestEntry/enforceSizeLimit/TTL_MS/SIZE_LIMIT`, while the existing `new Function(...)`-based DNT/TTL/size-limit tests still exercise the full browser path since they inject a non-undefined `window` object. Both test styles in `test_tools.js` are compatible with this change.
- `dashboard.js` reads `pageviews`/`calc_uses`/`affiliate_clicks`/`first_seen` off the stored object; the data shape is unchanged by this diff, so no regression there.
- No stale references to the old 30-day/50KB values remain elsewhere in the repo.
- Tests were updated consistently with the new constants (90 days / 500KB), and new unit tests were added for `fresh`, `isExpired`, `purgeOldestEntry`, and `enforceSizeLimit` directly (via `require`), in addition to updating the existing integration-style tracker tests.

## Note
Could not execute `make test-js` / `node --test tests/test_tools.js` in this session — command execution was blocked before returning a result in this Reviewer permission mode. Review is based on static reading of the diff and hand-tracing of the test assertions against the implementation; the test additions look correct and internally consistent, but an actual test run is recommended before merge to confirm.
