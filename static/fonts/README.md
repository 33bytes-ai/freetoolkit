# Bundled font

`Aileron-Regular.ttf` guarantees `write_og_image()` in
`src/freetoolkit/build.py` can always render OG images, regardless of what
fonts (if any) are installed on the build machine.

Aileron is a free font by Chris Simpson (https://dotcolon.net/fonts/aileron),
free for personal and commercial use. This exact copy is the one the Pillow
project has bundled as its own `ImageFont.load_default()` fallback since
Pillow 10.1.0, extracted from `PIL/ImageFont.py` — i.e. the same binary
already redistributed to every Pillow install via PyPI.

# Web font

`Geist-latin.woff2` is the site's only web font (UI and headings). It is
Geist 1.7.2 by Vercel (https://vercel.com/font), SIL Open Font License 1.1,
subset to Latin + common punctuation/currency/math symbols with
`pyftsubset --flavor=woff2 --layout-features='*'` (69 KB → 33 KB). It is the
one shipped to `dist/` along with `Geist-LICENSE.txt`; the `.ttf` and this README are
build-only.
