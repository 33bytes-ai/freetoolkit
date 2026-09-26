// Records the text calculators write at runtime, for translation coverage.
//
// Result sentences are built by concatenation ("World-class FCF margin: " +
// x + "%. ..."), so scraping JS string literals gives fragments that never
// match what is on screen. This loads every tool page from the built site,
// varies each input, toggles every select/checkbox, and saves each distinct
// text node / tooltip / placeholder seen inside the widget to
// content/i18n/_runtime_strings.json. scripts/i18n_coverage.py reads it.
//
//   make build && make i18n-crawl        (uses Google Chrome, no npm install)
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { templatize } = require("../static/js/lib/i18n.js");

function loadPlaywright() {
  try { return require("playwright-core"); } catch (e) { /* fall through */ }
  // `npx -p playwright-core` puts <pkg>/node_modules/.bin on PATH but not on
  // the require path.
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const candidate = path.join(dir, "..", "playwright-core");
    if (fs.existsSync(candidate)) return require(candidate);
  }
  throw new Error("playwright-core not found: run via `make i18n-crawl`");
}

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "content", "i18n", "_runtime_strings.json");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Runs in the page: every visible string inside the widget.
function collect() {
  const out = [];
  const w = document.querySelector(".tool-widget");
  if (!w) return out;
  const walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (el && !/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName)) out.push(walker.currentNode.data);
  }
  w.querySelectorAll("[placeholder],[aria-label],[title],[alt],[data-tooltip]").forEach((el) => {
    for (const a of ["placeholder", "aria-label", "title", "alt", "data-tooltip"]) {
      const v = el.getAttribute(a);
      if (v) out.push(v);
    }
  });
  return out;
}

async function main() {
  const { chromium } = loadPlaywright();
  const tools = fs.readdirSync(path.join(DIST, "tools")).filter((d) => fs.existsSync(path.join(DIST, "tools", d, "index.html")));
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const seen = new Map(); // template -> one example as it appeared
  const add = (list) => list.forEach((s) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (/[A-Za-z]{2}/.test(t) && !seen.has(templatize(t))) seen.set(templatize(t), t);
  });

  for (const slug of tools) {
    const page = await browser.newPage();
    try {
      await page.goto(`${base}/tools/${slug}/`, { waitUntil: "load" });
      await page.waitForTimeout(300);
      add(await page.evaluate(collect));
      // Push each input across ranges that trip the calculators' branches.
      const inputs = await page.$$(".tool-widget input[type=number], .tool-widget input[type=text], .tool-widget input:not([type])");
      for (const input of inputs) {
        if (!(await input.isVisible()) || !(await input.isEditable())) continue;
        const orig = await input.inputValue();
        for (const v of ["0", "1", "15", "60", "250", "5000", "250000", "-40"]) {
          await input.fill(v, { timeout: 2000 });
          await input.dispatchEvent("input");
          await input.dispatchEvent("change");
          await page.waitForTimeout(60);
          add(await page.evaluate(collect));
        }
        await input.fill(orig);
        await input.dispatchEvent("input");
      }
      for (const sel of await page.$$(".tool-widget select")) {
        for (const opt of await sel.$$eval("option", (os) => os.map((o) => o.value))) {
          await sel.selectOption(opt);
          await page.waitForTimeout(60);
          add(await page.evaluate(collect));
        }
      }
      for (const box of await page.$$(".tool-widget input[type=checkbox], .tool-widget input[type=radio]")) {
        await box.click({ force: true }).catch(() => {});
        await page.waitForTimeout(60);
        add(await page.evaluate(collect));
      }
    } catch (e) {
      console.error(`${slug}: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await browser.close();
  server.close();
  const list = [...seen.values()].sort();
  fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + "\n");
  console.log(`${list.length} runtime strings from ${tools.length} tools -> ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
