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
content/config.yaml     ──┐
content/tools.yaml      ──┤
content/intent_pages.yaml─┤  merged into their parent tool page
content/countries.yaml  ──┤  merged into the Stripe tool page
content/glossary.yaml   ──┤  merged into /glossary/
content/categories.yaml ──┤  src/freetoolkit/build.py
content/pages/*.md      ──┤         │
templates/*.html        ──┤         │ Jinja2 render
templates/widgets/*.html──┤         │
static/                 ──┘         │
                                    ▼
                               dist/
                          ├── index.html
                          ├── tools/<slug>/index.html (×105, guides inlined
                          │     as anchored <section> blocks)
                          ├── categories/<slug>/index.html (×12)
                          ├── glossary/index.html (one page, ×9 sections)
                          ├── <page>/index.html
                          ├── 404.html
                          ├── sitemap.xml
                          ├── robots.txt
                          ├── ads.txt
                          ├── _redirects  (301s from every retired guide URL
                          │     to its section anchor)
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
  │
  ▼
Cloudflare Pages (free tier)
  serves dist/ as static files, global CDN, SSL automatic
  │
  └── Cloudflare Web Analytics
        cookie-free traffic stats, no JS tracking, no server to run
```

Migrated 2026-07-29 from a VPS (Hetzner + Docker nginx + GoAccess) — the VPS
was justified by GoAccess's server-log analytics, but Cloudflare Web
Analytics gives the same zero-tracking guarantee for free, without needing
a server at all. See `HUMAN_INPUTS.md` A2 for the migration note.

## Data flows

| Flow | Where it happens |
|------|-----------------|
| User types text into a tool | Browser JS, never leaves device |
| User generates a password | Web Crypto API, local only |
| Page rendered | From static file on Cloudflare's CDN |
| Ad displayed (when enabled) | AdSense script loads from Google CDN |
| Traffic measured | Cloudflare Web Analytics (no cookies, no JS tracking script) |
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
