/* Client-side translation.
 *
 * English is canonical and is all crawlers ever see: no URL changes, nothing
 * for hreflang to describe. A visitor who picks FR/ES/DE gets the same page
 * with its text replaced in place, from three sources:
 *
 *   - data-i18n keys (#i18n-strings, content/i18n.yaml): nav, hero, footer
 *   - /i18n/<lang>/strings.json: any text node or placeholder/aria-label/
 *     title/alt/data-tooltip whose English matches, site-wide. Text with numbers matches
 *     by template ("Pro at {0} is {1}"), so calculator results translate as
 *     the calculators write them (MutationObserver).
 *   - /i18n/<lang>/<path>/index.json: long-form regions of this page
 *     ([data-i18n-region]), rendered at build time from content/i18n/<lang>/.
 *
 * Switching language reloads the page, so going back to English is the
 * untouched original rather than a best-effort undo. i18n-boot.js hides the
 * body while a non-English page is being translated (CSS failsafe: 1.5 s).
 */
(function () {
  "use strict";

  // ── Pure helpers (unit-tested in tests/test_tools.js) ────────────────────
  // Must stay equivalent to templatize() in src/freetoolkit/i18n.py.
  var NUM_RE = /[-−+]?[$€£¥]?\d+(?:[.,]\d+)*[kKMB]?%?/g;
  // An existing {n} counts as one slot, so keys and live text line up.
  var SLOT_RE = /\{\d+\}|[-−+]?[$€£¥]?\d+(?:[.,]\d+)*[kKMB]?%?/g;

  function templatize(text) {
    var i = 0;
    return text.replace(/\s+/g, " ").trim().replace(SLOT_RE, function () { return "{" + (i++) + "}"; });
  }

  function translateText(dict, text) {
    var core = text.replace(/\s+/g, " ").trim();
    if (!core || !/[A-Za-z]/.test(core)) return null;
    var hit = Object.prototype.hasOwnProperty.call(dict, core) ? dict[core] : undefined;
    if (hit === undefined) {
      var nums = core.match(NUM_RE);
      if (!nums) return null;
      var tpl = dict[templatize(core)];
      if (tpl === undefined) return null;
      hit = tpl.replace(/\{(\d+)\}/g, function (m, i) { return nums[+i] !== undefined ? nums[+i] : m; });
    }
    return text.match(/^\s*/)[0] + hit + text.match(/\s*$/)[0];
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { templatize: templatize, translateText: translateText };
    return;
  }

  var STORE_KEY = "ftk-lang";
  var DISMISS_KEY = "ftk-lang-prompted";
  var DEFAULT_LANG = "en";
  var root = document.documentElement;

  function reveal() { root.classList.remove("i18n-pending"); }

  var node = document.getElementById("i18n-strings");
  if (!node) { reveal(); return; }

  var STRINGS;
  try {
    STRINGS = JSON.parse(node.textContent);
  } catch (e) {
    reveal();
    return; // malformed payload: site stays English, which is a fine fallback
  }

  function t(lang, key) {
    return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS[DEFAULT_LANG] || {})[key] || "";
  }

  // ── Interface strings (data-i18n keys) ───────────────────────────────────
  function applyChrome(lang) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = t(lang, el.getAttribute("data-i18n"));
      if (val) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var val = t(lang, el.getAttribute("data-i18n-placeholder"));
      if (val) el.setAttribute("placeholder", val);
    });
    var code = document.getElementById("lang-switch-code");
    if (code) code.textContent = lang.toUpperCase();

    // Currency tracks the language's main market (fr/es/de -> EUR, en -> USD)
    // unless this page opted out (fee/tax tools) or the visitor set one.
    if (window.FTK && window.FTK.setCurrency && !window.FTK.currencyLocked()) {
      var explicit = null;
      try { explicit = localStorage.getItem("ftk-currency-explicit"); } catch (e) { /* ignore */ }
      if (!explicit) {
        var byLang = { en: "USD", fr: "EUR", es: "EUR", de: "EUR" };
        if (byLang[lang]) window.FTK.setCurrency(byLang[lang]);
      }
    }
    // lang attribute must track the visible text for screen readers.
    root.setAttribute("lang", lang);
  }

  // ── Page content ─────────────────────────────────────────────────────────
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var OFF = "[data-i18n],[data-i18n-done],[translate='no']";
  var ATTRS = ["placeholder", "aria-label", "title", "alt", "data-tooltip"];
  var dict = {};
  var written = new WeakMap(); // text node -> text we last wrote into it

  function translateNode(n) {
    if (written.get(n) === n.data) return;
    var out = translateText(dict, n.data);
    if (out !== null && out !== n.data) n.data = out;
    written.set(n, n.data);
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (!v) continue;
      var out = translateText(dict, v);
      if (out !== null && out !== v) el.setAttribute(ATTRS[i], out);
    }
  }

  function translateTree(start) {
    if (start.nodeType === 3) {
      var p = start.parentElement;
      if (p && !SKIP[p.tagName] && !p.closest(OFF)) translateNode(start);
      return;
    }
    if (start.nodeType !== 1 || SKIP[start.tagName] || start.closest(OFF)) return;
    var walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var el = n.parentElement;
        return !el || SKIP[el.tagName] || el.closest(OFF) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);
    translateAttrs(start);
    start.querySelectorAll("[placeholder],[aria-label],[title],[alt],[data-tooltip]").forEach(translateAttrs);
  }

  function getJSON(url) {
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  function applyContent(lang) {
    var meta = document.querySelector('meta[name="ftk-i18n"]');
    var v = meta ? meta.getAttribute("content") : "";
    var base = "/i18n/" + lang + "/";
    var path = location.pathname.replace(/^\/+/, "").replace(/index\.html$/, "");
    if (path && path.slice(-1) !== "/") path += "/";

    return Promise.all([
      getJSON(base + "strings.json?v=" + v),
      getJSON(base + path + "index.json?v=" + v)
    ]).then(function (res) {
      dict = res[0] || {};
      var page = res[1] || {};
      var regions = page.regions || {};

      document.querySelectorAll("[data-i18n-region]").forEach(function (el) {
        var html = regions[el.getAttribute("data-i18n-region")];
        if (html) {
          el.innerHTML = html;
          el.setAttribute("data-i18n-done", "");
        }
      });

      var sep = " — ";
      var parts = document.title.split(sep);
      var head = page.title || (translateText(dict, parts[0]) || parts[0]).trim();
      document.title = parts.length > 1 ? head + sep + parts.slice(1).join(sep) : head;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && page.description) desc.setAttribute("content", page.description);

      translateTree(document.body);

      // Calculators rewrite their results on every keystroke.
      new MutationObserver(function (records) {
        records.forEach(function (r) {
          if (r.type === "characterData") translateTree(r.target);
          else r.addedNodes.forEach(translateTree);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  function stored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  function detected() {
    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var b = String(langs[i]).toLowerCase().split("-")[0];
      if (STRINGS[b]) return b;
    }
    return null;
  }

  var current = stored() || DEFAULT_LANG;
  if (!STRINGS[current]) current = DEFAULT_LANG;

  function choose(lang) {
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
    if (lang !== current) location.reload();
  }

  // ── Switcher dropdown ────────────────────────────────────────────────────
  var wrap = document.getElementById("lang-switch");
  var btn = document.getElementById("lang-switch-btn");
  var menu = document.getElementById("lang-switch-menu");

  if (btn && menu) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (wrap && !wrap.contains(e.target)) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    menu.querySelectorAll(".lang-switch-opt").forEach(function (opt) {
      opt.addEventListener("click", function () {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dismissBanner();
        choose(opt.getAttribute("data-lang"));
      });
    });
  }

  // ── First-visit offer ────────────────────────────────────────────────────
  // Offer, don't force: auto-switching on a guess is disorienting.
  var banner;
  function dismissBanner() {
    if (banner) { banner.remove(); banner = null; }
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) { /* ignore */ }
  }

  function offer(lang) {
    banner = document.createElement("div");
    banner.className = "lang-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Language suggestion");

    var msg = document.createElement("span");
    msg.className = "lang-banner-msg";
    msg.textContent = t(lang, "banner_offer").replace("{lang}", t(lang, "label"));

    var yes = document.createElement("button");
    yes.type = "button";
    yes.className = "lang-banner-accept";
    yes.textContent = t(lang, "banner_accept");
    yes.addEventListener("click", function () { dismissBanner(); choose(lang); });

    var no = document.createElement("button");
    no.type = "button";
    no.className = "lang-banner-dismiss";
    no.textContent = t(lang, "banner_dismiss");
    no.addEventListener("click", dismissBanner);

    banner.appendChild(msg);
    banner.appendChild(yes);
    banner.appendChild(no);
    document.body.appendChild(banner);
  }

  if (current !== DEFAULT_LANG) {
    applyChrome(current);
    applyContent(current).then(reveal, reveal);
    return;
  }
  reveal();

  var guess = detected();
  var alreadyAsked;
  try { alreadyAsked = localStorage.getItem(DISMISS_KEY); } catch (e) { alreadyAsked = null; }
  if (!stored() && guess && guess !== DEFAULT_LANG && !alreadyAsked) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { offer(guess); });
    } else {
      offer(guess);
    }
  }
})();
