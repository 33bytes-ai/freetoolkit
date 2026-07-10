STATUS: PASS

## Summary
The task ("Remplacer og:image SVG par PNG statique") turned out to be already
implemented by earlier backlog work: `templates/base.html:52` already emits
`og:image` pointing at `/static/img/og.png` plus `og:image:width="1200"` /
`og:image:height="630"`, and `src/freetoolkit/build.py`'s `write_og_image()`
already renders a real 1200x630 PNG per page via Pillow at build time. The
Builder correctly identified this instead of duplicating work, and scoped
this change down to what was actually still wrong:

1. Deleted `static/img/og.svg` — a dead, unreferenced leftover from before
   the PNG generator existed. Confirmed via grep across templates/, static/,
   tests/, content/, and backlog.json: zero remaining references except the
   backlog note itself. It was being needlessly copied into `dist/` by
   `build.py`'s `shutil.copytree(STATIC_DIR, ...)` call.
2. Added `tests/test_build.py::test_pages_have_og_image_dimensions`, which
   was previously missing — no test asserted the og:image PNG path or the
   width/height meta tags directly (only `og:image:alt` was covered before).

## Verification performed
- Confirmed via grep that no code, template, or config references `og.svg`
  anymore.
- Confirmed the new test follows existing conventions in the file: uses the
  shared `run_build()` helper (which sets `FTK_SKIP_OG_IMAGE=1`, so it only
  exercises template output, not actual Pillow rendering — correctly scoped
  and consistent with sibling tests like `test_pages_have_og_image_alt`).
- Confirmed `test_og_images_are_actually_generated` (pre-existing,
  unmodified) already covers the actual PNG rendering path via
  `run_build_with_og_images()`, so the new test doesn't duplicate that
  coverage.
- Confirmed the `backlog.json` note is accurate and matches the actual diff.

## Limitations
- Could NOT execute `make test-py` / `pytest` / `python -m freetoolkit.build`
  in this reviewer session — the sandbox's shell permission mode blocks all
  python/make invocations here too, same restriction the Builder hit and
  disclosed. This is an environment limitation, not a defect in the diff.
  A human or CI run of `make build && make test-py` is still needed for a
  live green run, but the change is small, low-risk, template/test-only, and
  consistent with existing patterns in the file, so this doesn't block PASS.

## Issues found
None.
