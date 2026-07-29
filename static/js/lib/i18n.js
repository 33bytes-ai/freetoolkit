/* UI-chrome translation.
 *
 * English is canonical and is what crawlers see: translation happens
 * client-side, after load, and only for interface strings (nav, hero, labels).
 * The long-form calculator guides stay English -- see content/i18n.yaml for why
 * that boundary exists rather than bulk-translating 459 pages.
 *
 * No URLs change, so there is nothing here for hreflang to describe and no new
 * pages for Google to crawl.
 */
(function () {
  "use strict";

  var STORE_KEY = "ftk-lang";
  var DISMISS_KEY = "ftk-lang-prompted";
  var DEFAULT_LANG = "en";

  var node = document.getElementById("i18n-strings");
  if (!node) return;

  var STRINGS;
  try {
    STRINGS = JSON.parse(node.textContent);
  } catch (e) {
    return; // malformed payload: site stays English, which is a fine fallback
  }

  function t(lang, key) {
    return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS[DEFAULT_LANG] || {})[key] || "";
  }

  function apply(lang) {
    if (!STRINGS[lang]) lang = DEFAULT_LANG;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = t(lang, el.getAttribute("data-i18n"));
      if (val) el.textContent = val;
    });
    // Placeholders can't use textContent.
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
    document.documentElement.setAttribute("lang", lang);
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
  }

  function stored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  function detected() {
    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var base = String(langs[i]).toLowerCase().split("-")[0];
      if (STRINGS[base]) return base;
    }
    return null;
  }

  // ── Switcher dropdown ──────────────────────────────────────────────────
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
        apply(opt.getAttribute("data-lang"));
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dismissBanner();
      });
    });
  }

  // ── First-visit offer ──────────────────────────────────────────────────
  // Offer, don't force: auto-switching on a guess is disorienting, and the
  // guides they'd land on are English regardless.
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

    var note = document.createElement("span");
    note.className = "lang-banner-note";
    note.textContent = t(lang, "banner_note");

    var yes = document.createElement("button");
    yes.type = "button";
    yes.className = "lang-banner-accept";
    yes.textContent = t(lang, "banner_accept");
    yes.addEventListener("click", function () { apply(lang); dismissBanner(); });

    var no = document.createElement("button");
    no.type = "button";
    no.className = "lang-banner-dismiss";
    no.textContent = t(lang, "banner_dismiss");
    no.addEventListener("click", dismissBanner);

    banner.appendChild(msg);
    banner.appendChild(note);
    banner.appendChild(yes);
    banner.appendChild(no);
    document.body.appendChild(banner);
  }

  var choice = stored();
  if (choice) {
    if (choice !== DEFAULT_LANG) apply(choice);
    return;
  }

  var guess = detected();
  var alreadyAsked;
  try { alreadyAsked = localStorage.getItem(DISMISS_KEY); } catch (e) { alreadyAsked = null; }
  if (guess && guess !== DEFAULT_LANG && !alreadyAsked) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { offer(guess); });
    } else {
      offer(guess);
    }
  }
})();
