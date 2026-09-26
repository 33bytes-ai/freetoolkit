# Vendored scripts

`motion.min.js` is a tree-shaken IIFE (global `Motion`) of
[Motion](https://motion.dev) 13.4.4, MIT licensed: `animate` from
`motion/mini` (WAAPI) plus `scroll`, `inView` and `stagger`. 7.9 KB gzipped,
against 49 KB for the full UMD build. Used by `static/js/lib/motion-fx.js`.

Rebuild (outside the repo, no npm dependency here):

```bash
npm i motion@13.4.4 esbuild
echo 'export { animate } from "motion/mini"; export { scroll, inView, stagger } from "motion";' > entry.js
npx esbuild entry.js --bundle --minify --format=iife --global-name=Motion --target=es2019 \
  --legal-comments=none --outfile=motion.min.js \
  --banner:js="/*! Motion 13.4.4 (animate from motion/mini, scroll, inView, stagger) | MIT License | (c) 2024 Motion B.V. | https://motion.dev */"
```
