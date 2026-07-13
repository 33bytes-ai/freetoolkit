/* Client-side analytics tracker — stores events in localStorage for /dashboard/ */
(function () {
  "use strict";

  var KEY = "ftk_analytics";
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;
  var SIZE_LIMIT = 500 * 1024;

  function fresh() {
    return { pageviews: {}, calc_uses: {}, affiliate_clicks: {}, first_seen: Date.now() };
  }

  function isExpired(data, now) {
    return now - (data.first_seen || 0) > TTL_MS;
  }

  // Object key order reflects insertion order for string keys, so the first
  // key in each category is the oldest tracked entry.
  function purgeOldestEntry(data) {
    var categories = ["pageviews", "calc_uses", "affiliate_clicks"];
    for (var i = 0; i < categories.length; i++) {
      var keys = Object.keys(data[categories[i]] || {});
      if (keys.length) {
        delete data[categories[i]][keys[0]];
        return true;
      }
    }
    return false;
  }

  // Re-serializing the whole object on every single-entry purge is O(n^2) for
  // large datasets. Estimate how many entries to drop per pass from the
  // average entry size so this converges in a handful of passes instead of
  // one JSON.stringify per purged entry.
  function enforceSizeLimit(data) {
    var str = JSON.stringify(data);
    while (str.length > SIZE_LIMIT) {
      var totalEntries =
        Object.keys(data.pageviews || {}).length +
        Object.keys(data.calc_uses || {}).length +
        Object.keys(data.affiliate_clicks || {}).length;
      if (!totalEntries) break;
      var avgEntrySize = str.length / totalEntries;
      var toPurge = Math.max(1, Math.ceil((str.length - SIZE_LIMIT) / avgEntrySize));
      var purgedAny = false;
      for (var i = 0; i < toPurge; i++) {
        if (!purgeOldestEntry(data)) break;
        purgedAny = true;
      }
      if (!purgedAny) break;
      str = JSON.stringify(data);
    }
    return str;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      fresh: fresh,
      isExpired: isExpired,
      purgeOldestEntry: purgeOldestEntry,
      enforceSizeLimit: enforceSizeLimit,
      TTL_MS: TTL_MS,
      SIZE_LIMIT: SIZE_LIMIT,
    };
  }

  if (typeof window === "undefined") return;

  // Respect DNT (Do Not Track): disable all localStorage tracking when set.
  var dntEnabled =
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    navigator.msDoNotTrack === "1";

  if (dntEnabled) {
    window.FTK = window.FTK || {};
    window.FTK.analytics = { load: function () { return null; }, trackCalcUse: function () {}, trackAffiliateClick: function () {}, KEY: KEY, dnt: true };
    return;
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      if (!data) return fresh();
      if (isExpired(data, Date.now())) {
        localStorage.removeItem(KEY);
        return fresh();
      }
      return data;
    } catch (e) {
      return fresh();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, enforceSizeLimit(data));
    } catch (e) {}
  }

  // Counts a path once per tab session (sessionStorage, cleared when the
  // tab closes) instead of once per page load -- a refresh or back/forward
  // navigation on the same path no longer inflates the dashboard's
  // pageview count. The dashboard is explicitly "local browser analytics
  // only", not a source of truth, but this keeps a solo user's own usage
  // reading honest during manual testing.
  function alreadyCountedThisSession(path) {
    try {
      var key = "ftk_pv_seen_" + path;
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, "1");
      return false;
    } catch (e) {
      return false;
    }
  }

  function trackPageview() {
    var path = window.location.pathname;
    if (alreadyCountedThisSession(path)) return;
    var data = load();
    if (!data.pageviews[path]) data.pageviews[path] = 0;
    data.pageviews[path]++;
    data.last_seen = Date.now();
    save(data);
  }

  function trackCalcUse(slug) {
    var data = load();
    if (!data.calc_uses[slug]) data.calc_uses[slug] = 0;
    data.calc_uses[slug]++;
    save(data);
  }

  function trackAffiliateClick(toolSlug, partnerName) {
    var data = load();
    var key = toolSlug + "|" + partnerName;
    if (!data.affiliate_clicks[key]) data.affiliate_clicks[key] = 0;
    data.affiliate_clicks[key]++;
    save(data);
  }

  // Auto-track page view
  trackPageview();

  // Auto-track affiliate link clicks
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a.affiliate-cta");
    if (!link) return;
    var card = link.closest(".affiliate-card");
    var name = card ? (card.querySelector("strong") || {}).textContent || "unknown" : "unknown";
    var toolEl = document.querySelector("[data-tool]");
    if (toolEl) trackAffiliateClick(toolEl.dataset.tool, name);
  });

  window.FTK = window.FTK || {};
  window.FTK.analytics = {
    load: load,
    trackCalcUse: trackCalcUse,
    trackAffiliateClick: trackAffiliateClick,
    KEY: KEY,
  };
})();
