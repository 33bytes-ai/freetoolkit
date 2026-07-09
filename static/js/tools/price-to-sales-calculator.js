(function () {
  "use strict";

  function calcPSRatio(marketCap, annualRevenue) {
    if (!annualRevenue || annualRevenue <= 0) return null;
    return marketCap / annualRevenue;
  }

  function calcEVRevenue(enterpriseValue, annualRevenue) {
    if (!annualRevenue || annualRevenue <= 0) return null;
    return enterpriseValue / annualRevenue;
  }

  function calcImpliedValuation(annualRevenue, targetMultiple) {
    if (!annualRevenue || annualRevenue <= 0 || !targetMultiple || targetMultiple <= 0) return null;
    return annualRevenue * targetMultiple;
  }

  function calcImpliedRevenue(targetValuation, targetMultiple) {
    if (!targetMultiple || targetMultiple <= 0 || !targetValuation || targetValuation <= 0) return null;
    return targetValuation / targetMultiple;
  }

  function psLabel(psRatio, growthRate) {
    if (psRatio === null) return null;
    var growth = growthRate || 0;
    if (psRatio < 1) return { text: "Very low P/S of " + psRatio.toFixed(1) + "x. Deeply discounted relative to revenue — typical of slow-growth companies or undervalued opportunities. Verify there are no structural problems.", type: "info" };
    if (psRatio < 5) {
      if (growth >= 30) return { text: "Low P/S of " + psRatio.toFixed(1) + "x at " + growth + "% growth. Potentially undervalued — fast-growing companies often trade at 8–15x. Check if market has not yet priced in growth.", type: "info" };
      return { text: "Fair P/S of " + psRatio.toFixed(1) + "x. Typical for profitable or moderate-growth SaaS. Consistent with 10–30% ARR growth companies.", type: "info" };
    }
    if (psRatio < 15) return { text: "Premium P/S of " + psRatio.toFixed(1) + "x. Reflects high growth expectations. Requires 40%+ ARR growth and strong NRR (>120%) to justify at scale.", type: "info" };
    return { text: "Very high P/S of " + psRatio.toFixed(1) + "x. Requires exceptional growth (50%+ YoY) and a clear path to profitability. Watch Rule of 40 score closely.", type: "warning" };
  }

  function init() {
    var revenueEl  = document.getElementById("ps-revenue");
    var mcapEl     = document.getElementById("ps-mcap");
    var multEl     = document.getElementById("ps-target-mult");
    var growthEl   = document.getElementById("ps-growth");
    var insEl      = document.getElementById("ps-insight");
    var shareBtn   = document.getElementById("ps-share-btn");
    var copyBtn    = document.getElementById("ps-copy");

    function update() {
      var revenue = parseFloat(revenueEl.value) || 0;
      var mcap    = parseFloat(mcapEl.value)    || 0;
      var mult    = parseFloat(multEl.value)    || 0;
      var growth  = parseFloat(growthEl ? growthEl.value : 0) || 0;

      var ps      = revenue > 0 ? calcPSRatio(mcap, revenue) : null;
      var implied = revenue > 0 && mult > 0 ? calcImpliedValuation(revenue, mult) : null;
      var impliedRev = mcap > 0 && mult > 0 ? calcImpliedRevenue(mcap, mult) : null;

      function fmtM(v) {
        if (v >= 1000000000) return "$" + (v / 1000000000).toFixed(1) + "B";
        return "$" + (v / 1000000).toFixed(0) + "M";
      }

      document.getElementById("ps-ratio").textContent       = ps    ? ps.toFixed(1) + "x" : "--";
      document.getElementById("ps-implied").textContent     = implied ? fmtM(implied) : "--";
      document.getElementById("ps-implied-rev").textContent = impliedRev ? fmtM(impliedRev) : "--";
      document.getElementById("ps-growth-adj").textContent  = (ps && growth) ? (ps / (growth / 100)).toFixed(1) + "x" : "--";

      window.FTK.hashSet({ r: revenueEl.value, m: mcapEl.value, t: multEl.value, g: growthEl ? growthEl.value : "0" });

      var ins = psLabel(ps, growth);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revenueEl.value = h.r;
      if (h.m) mcapEl.value    = h.m;
      if (h.t) multEl.value    = h.t;
      if (h.g && growthEl) growthEl.value = h.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var revenue = parseFloat(revenueEl.value) || 0;
        var mcap    = parseFloat(mcapEl.value)    || 0;
        var mult    = parseFloat(multEl.value)    || 0;
        var ps      = revenue > 0 ? calcPSRatio(mcap, revenue) : null;
        var implied = revenue > 0 && mult > 0 ? calcImpliedValuation(revenue, mult) : null;
        function fmtM(v) {
          if (v >= 1000000000) return "$" + (v / 1000000000).toFixed(1) + "B";
          return "$" + (v / 1000000).toFixed(0) + "M";
        }
        var lines = ["P/S Ratio: " + (ps ? ps.toFixed(1) + "x" : "--"), "Implied Valuation: " + (implied ? fmtM(implied) : "--")];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    var els = [revenueEl, mcapEl, multEl, growthEl].filter(Boolean);
    els.forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPSRatio, calcEVRevenue, calcImpliedValuation, calcImpliedRevenue, psLabel };
  }
})();
