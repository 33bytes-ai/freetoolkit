(function () {
  "use strict";

  function calcROA(netIncome, totalAssets) {
    if (totalAssets <= 0) return null;
    return (netIncome / totalAssets) * 100;
  }

  function calcAssetTurnover(revenue, totalAssets) {
    if (totalAssets <= 0) return null;
    return revenue / totalAssets;
  }

  function calcNetProfitMargin(netIncome, revenue) {
    if (revenue <= 0) return null;
    return (netIncome / revenue) * 100;
  }

  function calcROADuPont(netProfitMargin, assetTurnover) {
    return netProfitMargin * assetTurnover;
  }

  function roaLabel(roa) {
    if (roa === null || roa === undefined) return "";
    if (roa >= 10) return "Excellent";
    if (roa >= 5)  return "Good";
    if (roa >= 2)  return "Average";
    if (roa >= 0)  return "Below average";
    return "Unprofitable";
  }

  function fmt(n, suffix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    return n.toFixed(2) + (suffix || "");
  }

  function init() {
    var incomeEl  = document.getElementById("roa-income");
    var assetsEl  = document.getElementById("roa-assets");
    var revenueEl = document.getElementById("roa-revenue");
    var insEl     = document.getElementById("roa-insight");
    var copyBtn   = document.getElementById("roa-copy");
    var shareBtn  = document.getElementById("roa-share");

    function update() {
      var income  = parseFloat(incomeEl.value)  || 0;
      var assets  = parseFloat(assetsEl.value)  || 1;
      var revenue = parseFloat(revenueEl.value) || 0;

      var roa      = calcROA(income, assets);
      var turnover = revenue > 0 ? calcAssetTurnover(revenue, assets) : null;
      var margin   = (revenue > 0) ? calcNetProfitMargin(income, revenue) : null;

      document.getElementById("roa-result").textContent   = roa      !== null ? roa.toFixed(2) + "%"      : "--";
      document.getElementById("roa-turnover").textContent = turnover !== null ? turnover.toFixed(2) + "×"  : "--";
      document.getElementById("roa-margin").textContent   = margin   !== null ? margin.toFixed(2) + "%"    : "--";
      document.getElementById("roa-assets-d").textContent = "$" + (assets / 1000000 >= 1 ? (assets / 1000000).toFixed(2) + "M" : (assets / 1000).toFixed(1) + "k");

      window.FTK.hashSet({ i: income, a: assets, r: revenue });

      if (roa !== null) {
        var label = roaLabel(roa);
        var type  = roa >= 5 ? "success" : roa >= 2 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — ROA of " + roa.toFixed(2) + "%. " +
          "For every dollar of assets, the business generates " + (roa / 100).toFixed(3) + " in net income. " +
          (turnover !== null ? "Asset turnover: " + turnover.toFixed(2) + "×. " : "") +
          (margin !== null ? "Net margin: " + margin.toFixed(1) + "%." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.i) incomeEl.value  = h.i;
      if (h.a) assetsEl.value  = h.a;
      if (h.r) revenueEl.value = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var i = parseFloat(incomeEl.value) || 0;
        var a = parseFloat(assetsEl.value) || 1;
        var r = parseFloat(revenueEl.value) || 0;
        var lines = [
          "ROA Calculator Results",
          "Net Income: $" + i.toLocaleString(),
          "Total Assets: $" + a.toLocaleString(),
          "ROA: " + (calcROA(i, a) !== null ? calcROA(i, a).toFixed(2) + "%" : "--"),
          "Asset Turnover: " + (r > 0 ? calcAssetTurnover(r, a).toFixed(2) + "×" : "--"),
          "Net Margin: " + (r > 0 ? calcNetProfitMargin(i, r).toFixed(2) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [incomeEl, assetsEl, revenueEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcROA: calcROA, calcAssetTurnover: calcAssetTurnover, calcNetProfitMargin: calcNetProfitMargin, calcROADuPont: calcROADuPont, roaLabel: roaLabel };
  }
})();
