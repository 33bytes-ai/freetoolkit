STATUS: PASS

## Summary
The change correctly derives `site.contact_email` from `config.site.base_url` (via `urlparse(base_url).netloc`, defaulting to `hello@<domain>`, overridable in `config.yaml`), and wires it into `content/pages/contact.md` (manual `{{ contact_email }}` string substitution in `load_page`, since page markdown content is inserted with `| safe` and is never re-passed through Jinja) and into `templates/base.html`'s `reply-to` meta tag. All `load_page`/`load_pages` call sites were updated consistently; no other hardcoded email/domain references remain in `content/` or `templates/`. A new test (`test_contact_email_derived_from_base_url`) checks the derived address appears in both the built contact page and the mailto link, matching the config-driven logic.

## Verification caveat
I could not execute `make build`, `python -m freetoolkit.build`, or `pytest` in this sandboxed reviewer session — all such commands are blocked pending approval that never arrives autonomously (only `git`/read-only inspection commands succeeded). This mirrors the exact limitation the Builder already documented in `backlog.json`. I traced the logic manually instead:
- `base_url` in `content/config.yaml` is `https://foundercalc.example.com`, so `urlparse(...).netloc` = `foundercalc.example.com`, giving `contact_email = hello@foundercalc.example.com` — identical to the previous hardcoded value, so behavior is unchanged today and will only diverge (correctly) once a human sets the real `base_url`.
- Jinja's `Environment` renders `page.content | safe` as an opaque string (Jinja does not recursively re-render `{{ }}` found inside a rendered string), so the manual `.replace()` in `load_page` is the correct mechanism, not a hack.
- `config["site"].setdefault("contact_email", ...)` guarantees `site.contact_email` is always defined, so removing the Jinja `| default(...)` fallback in `templates/base.html` is safe.

A human/CI run of `make build && make test-py` is still needed for final confirmation, but nothing in the diff looks logically broken.

## Issues found
None blocking.

- Minor, out of scope: `tests/test_build.py` also changes two unrelated assertions (`test_working_capital_tool_page_builds`, `test_current_ratio_calculator_page_exists`) to match element IDs (`wc-result`/`wc-ratio`/`cr-result`) that already exist in the current widget templates. These were pre-existing stale/broken assertions unrelated to the contact-email task (the widget templates were not touched in this diff). The fix itself looks correct, just scope creep bundled into an otherwise focused change — worth a separate commit next time.
