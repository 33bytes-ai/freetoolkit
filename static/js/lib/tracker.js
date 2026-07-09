/* Client-side analytics tracker — stores events in localStorage for /dashboard/ */
(function () {
  "use strict";

  var KEY = "ftk_analytics";

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

  var TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var SIZE_LIMIT = 50 * 1024;

  function fresh() {
    return { pageviews: {}, calc_uses: {}, affiliate_clicks: {}, first_seen: Date.now() };
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      if (!data) return fresh();
      if (Date.now() - (data.first_seen || 0) > TTL_MS) {
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
      var str = JSON.stringify(data);
      if (str.length > SIZE_LIMIT) {
        data.pageviews = {};
        str = JSON.stringify(data);
      }
      localStorage.setItem(KEY, str);
    } catch (e) {}
  }

  function trackPageview() {
    var path = window.location.pathname;
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
