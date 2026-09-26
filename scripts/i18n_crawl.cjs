// Records every string i18n.js would try to translate, for coverage.
//
// It reads the live DOM of every built page, skipping what i18n.js skips
// ([data-i18n] keys, [data-i18n-region] blocks, translate="no", scripts), so
// the inventory matches what visitors see rather than what an HTML parser
// guesses. On tool pages it also varies each input and toggles every
// select/checkbox: result sentences are built by concatenation
// ("World-class FCF margin: " + x + "%. ..."), so only running the
// calculators shows their real text. Output: content/i18n/_runtime_strings.json,
// one example per template, read by scripts/i18n_coverage.py.
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

// Runs in the page: every string under `selector` that i18n.js would see.
function collect(selector) {
  const out = [];
  const root = document.querySelector(selector);
  if (!root) return out;
  const OFF = "[data-i18n],[data-i18n-region],[translate='no'],script,style,noscript,textarea,code,pre";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (el && !el.closest(OFF)) out.push(walker.currentNode.data);
  }
  root.querySelectorAll("[placeholder],[aria-label],[title],[alt],[data-tooltip]").forEach((el) => {
    if (el.closest(OFF)) return;
    for (const a of ["placeholder", "aria-label", "title", "alt", "data-tooltip"]) {
      const v = el.getAttribute(a);
      if (v) out.push(v);
    }
  });
  return out;
}

function builtPages() {
  const skip = /^(embed|dashboard|i18n|static|tools\/[^/]+)\//;
  const found = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name === "index.html") found.push("/" + path.relative(DIST, dir).split(path.sep).join("/") + "/");
    }
  })(DIST);
  return found.map((p) => p.replace("//", "/")).filter((p) => !skip.test(p.slice(1)));
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
      add(await page.evaluate(collect, "body"));
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
          add(await page.evaluate(collect, ".tool-widget"));
        }
        await input.fill(orig);
        await input.dispatchEvent("input");
      }
      for (const sel of await page.$$(".tool-widget select")) {
        for (const opt of await sel.$$eval("option", (os) => os.map((o) => o.value))) {
          await sel.selectOption(opt);
          await page.waitForTimeout(60);
          add(await page.evaluate(collect, ".tool-widget"));
        }
      }
      for (const box of await page.$$(".tool-widget input[type=checkbox], .tool-widget input[type=radio]")) {
        await box.click({ force: true }).catch(() => {});
        await page.waitForTimeout(60);
        add(await page.evaluate(collect, ".tool-widget"));
      }
    } catch (e) {
      console.error(`${slug}: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  for (const url of builtPages()) {
    const page = await browser.newPage();
    try {
      await page.goto(base + url, { waitUntil: "load" });
      await page.waitForTimeout(200);
      add(await page.evaluate(collect, "body"));
    } catch (e) {
      console.error(`${url}: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await browser.close();
  server.close();
  const list = [...seen.values()].sort();
  fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + "\n");
  console.log(`${list.length} strings from ${tools.length} tools + other pages -> ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
