(function () {
  "use strict";

  function calcGrowthRate(previousRevenue, currentRevenue) {
    if (previousRevenue <= 0) return null;
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  }

  function calcCAGR(startRevenue, endRevenue, years) {
    if (startRevenue <= 0 || years <= 0) return null;
    return (Math.pow(endRevenue / startRevenue, 1 / years) - 1) * 100;
  }

  function calcRevenueToHitTarget(currentRevenue, targetGrowthPct) {
    return currentRevenue * (1 + targetGrowthPct / 100);
  }

  function calcRevenueAtCAGR(startRevenue, cagrPct, years) {
    return startRevenue * Math.pow(1 + cagrPct / 100, years);
  }

  function calcRuleOf40(growthRatePct, profitMarginPct) {
    return growthRatePct + profitMarginPct;
  }

  function growthLabel(growthPct) {
    if (growthPct === null || growthPct === undefined) return "";
    if (growthPct >= 100) return "Hypergrowth";
    if (growthPct >= 50)  return "High growth";
    if (growthPct >= 20)  return "Strong growth";
    if (growthPct >= 10)  return "Moderate growth";
    if (growthPct >= 0)   return "Slow growth";
    return "Declining";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var prevEl    = document.getElementById("rgr-prev");
    var currEl    = document.getElementById("rgr-curr");
    var yearsEl   = document.getElementById("rgr-years");
    var marginEl  = document.getElementById("rgr-margin");
    var insEl     = document.getElementById("rgr-insight");
    var copyBtn   = document.getElementById("rgr-copy");
    var shareBtn  = document.getElementById("rgr-share");

    function update() {
      var prev   = parseFloat(prevEl.value)   || 0;
      var curr   = parseFloat(currEl.value)   || 0;
      var years  = parseFloat(yearsEl.value)  || 1;
      var margin = parseFloat(marginEl.value) || 0;

      var growth  = calcGrowthRate(prev, curr);
      var cagr    = years > 1 ? calcCAGR(prev, curr, years) : null;
      var r40     = growth !== null ? calcRuleOf40(growth, margin) : null;

      document.getElementById("rgr-result").textContent  = growth !== null ? growth.toFixed(1) + "%" : "--";
      document.getElementById("rgr-cagr").textContent    = cagr   !== null ? cagr.toFixed(1) + "%" : (years <= 1 ? "N/A" : "--");
      document.getElementById("rgr-r40").textContent     = r40    !== null ? r40.toFixed(0)  : "--";

      window.FTK.hashSet({ p: prev, c: curr, y: years, m: margin });

      if (growth !== null) {
        var label  = growthLabel(growth);
        var r40msg = r40 !== null ? " Rule of 40: " + r40.toFixed(0) + (r40 >= 40 ? " (healthy)" : " (below target)") + "." : "";
        var type   = growth >= 20 ? "success" : growth >= 0 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — " + growth.toFixed(1) + "% YoY growth." +
          (cagr !== null ? " CAGR over " + years + " years: " + cagr.toFixed(1) + "%." : "") +
          r40msg, type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) prevEl.value   = h.p;
      if (h.c) currEl.value   = h.c;
      if (h.y) yearsEl.value  = h.y;
      if (h.m) marginEl.value = h.m;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var prev  = parseFloat(prevEl.value) || 0;
        var curr  = parseFloat(currEl.value) || 0;
        var years = parseFloat(yearsEl.value) || 1;
        var margin = parseFloat(marginEl.value) || 0;
        var growth = calcGrowthRate(prev, curr);
        var cagr = years > 1 ? calcCAGR(prev, curr, years) : null;
        var r40 = growth !== null ? calcRuleOf40(growth, margin) : null;
        var lines = [
          "Revenue Growth Rate Calculator",
          "Previous Revenue: " + fmt(prev),
          "Current Revenue: " + fmt(curr),
          "Growth Rate: " + (growth !== null ? growth.toFixed(1) + "%" : "--"),
          cagr !== null ? "CAGR (" + years + " yrs): " + cagr.toFixed(1) + "%" : null,
          r40 !== null ? "Rule of 40: " + r40.toFixed(0) : null
        ].filter(Boolean);
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [prevEl, currEl, yearsEl, marginEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGrowthRate: calcGrowthRate, calcCAGR: calcCAGR, calcRevenueToHitTarget: calcRevenueToHitTarget, calcRevenueAtCAGR: calcRevenueAtCAGR, calcRuleOf40: calcRuleOf40, growthLabel: growthLabel };
  }
})();
