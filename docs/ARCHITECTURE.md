# Architecture

## Overview

FreeToolKit is a **static website**. There is no server-side runtime, no
database, and no API calls in production. All user-facing processing happens
in the visitor's browser using JavaScript.

```
Source (Python + Jinja2 + YAML + Markdown)
           │
           ▼
       build.py
           │ generates
           ▼
         dist/        ← static HTML/CSS/JS/XML
           │
           ▼
       nginx container
           │ serves
           ▼
      Visitor's browser
           │ runs
           ▼
     Tool JS (pure functions, no network)
```

## Build pipeline

```
content/config.yaml    ──┐
content/tools.yaml     ──┤
content/pages/*.md     ──┤  src/freetoolkit/build.py
templates/*.html       ──┤         │
templates/widgets/*.html─┤         │ Jinja2 render
static/                ──┘         │
                                   ▼
                               dist/
                          ├── index.html
                          ├── tools/<slug>/index.html (×105)
                          ├── tools/<parent>/<slug>/index.html (×325, intent + country)
                          ├── categories/<slug>/index.html (×9)
                          ├── glossary/<slug>/index.html (×9)
                          ├── <page>/index.html (×4)
                          ├── 404.html
                          ├── sitemap.xml
                          ├── robots.txt
                          └── static/
                              ├── css/style.css
                              └── js/
                                  ├── lib/common.js
                                  └── tools/<slug>.js (×105)
```

## JavaScript architecture

Each tool follows the same pattern:

```
static/js/tools/<slug>.js
 │
 ├── Pure functions (top of file)
 │     No DOM access, no globals, no async.
 │     Exported via module.exports for Node unit testing.
 │
 ├── init()
 │     Called once on DOMContentLoaded.
 │     Queries DOM elements, wires up event listeners,
 │     calls pure functions on input changes.
 │
 └── module.exports / global guard
       Allows the file to be require()'d in Node for tests.

window.FTK (static/js/lib/common.js)
 ├── copyToClipboard(text)  — clipboard API with fallback
 ├── flash(el, message)     — temporary button label change
 └── showError(el, message) — show/hide .error-message divs
```

## Deployment architecture

```
Internet
  │  443/80
  ▼
VPS (e.g. Hetzner CX11, €4.15/mo)
  ├── Docker: web (nginx:alpine)
  │     serves dist/ as static files
  │     logs to /var/log/nginx/access.log
  │
  └── Docker: analytics (goaccess)
        reads nginx logs
        generates /reports/index.html (GoAccess)
        exposes :7890 on localhost only
```

Alternatively, dist/ can be deployed directly to Cloudflare Pages or Netlify
(free tier) with zero operational cost.

## Data flows

| Flow | Where it happens |
|------|-----------------|
| User types text into a tool | Browser JS, never leaves device |
| User generates a password | Web Crypto API, local only |
| Page rendered | From static HTML file on disk (nginx) |
| Ad displayed (when enabled) | AdSense script loads from Google CDN |
| Traffic logged | nginx `access.log` (no JS tracking) |
| Traffic analysed | GoAccess reads logs locally on server |
| Revenue reported | AdSense dashboard (manual check) |

## Key design decisions

- **No framework, no bundler** — keeps build simple, pages load in <1s, no
  supply-chain risk from npm packages, zero maintenance overhead.
- **No client-side API calls** — eliminates API key management, rate limits,
  and privacy concerns. Tool logic is all local.
- **Jinja2 build** — standard Python templating, minimal dependencies
  (jinja2, pyyaml, markdown). Easy to extend.
- **GoAccess over Google Analytics** — privacy-friendly, no JS tracking
  pixel, no cookies, no GDPR consent banner required (unless AdSense is
  enabled, which adds ad cookies).
