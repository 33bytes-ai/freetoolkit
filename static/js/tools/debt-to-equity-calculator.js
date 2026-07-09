(function () {
  "use strict";

  function calcDebtToEquity(totalDebt, totalEquity) {
    if (totalEquity <= 0) return null;
    return totalDebt / totalEquity;
  }

  function calcEquityRatio(totalEquity, totalAssets) {
    if (totalAssets <= 0) return null;
    return (totalEquity / totalAssets) * 100;
  }

  function calcDebtRatio(totalDebt, totalAssets) {
    if (totalAssets <= 0) return null;
    return (totalDebt / totalAssets) * 100;
  }

  function calcFinancialLeverage(totalAssets, totalEquity) {
    if (totalEquity <= 0) return null;
    return totalAssets / totalEquity;
  }

  function debtToEquityLabel(ratio) {
    if (ratio === null || ratio === undefined) return "";
    if (ratio <= 0.5) return "Conservative";
    if (ratio <= 1.0) return "Moderate";
    if (ratio <= 2.0) return "Leveraged";
    return "Highly Leveraged";
  }

  function init() {
    var debtEl   = document.getElementById("dte-debt");
    var equityEl = document.getElementById("dte-equity");
    var assetsEl = document.getElementById("dte-assets");
    var insEl    = document.getElementById("dte-insight");
    var copyBtn  = document.getElementById("dte-copy");
    var shareBtn = document.getElementById("dte-share");

    function update() {
      var debt   = parseFloat(debtEl.value)   || 0;
      var equity = parseFloat(equityEl.value) || 1;
      var assets = parseFloat(assetsEl.value) || (debt + equity);

      var dte      = calcDebtToEquity(debt, equity);
      var eqRatio  = calcEquityRatio(equity, assets);
      var debtR    = calcDebtRatio(debt, assets);
      var leverage = calcFinancialLeverage(assets, equity);

      document.getElementById("dte-result").textContent    = dte      !== null ? dte.toFixed(2) + "×"         : "--";
      document.getElementById("dte-eq-ratio").textContent  = eqRatio  !== null ? eqRatio.toFixed(1) + "%"      : "--";
      document.getElementById("dte-debt-ratio").textContent = debtR   !== null ? debtR.toFixed(1) + "%"        : "--";
      document.getElementById("dte-leverage").textContent  = leverage !== null ? leverage.toFixed(2) + "×"     : "--";

      window.FTK.hashSet({ d: debt, e: equity, a: assets });

      if (dte !== null) {
        var label = debtToEquityLabel(dte);
        var type  = dte <= 1.0 ? "success" : dte <= 2.0 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — D/E ratio of " + dte.toFixed(2) + "×. " +
          "For every $1 of equity, the business carries $" + dte.toFixed(2) + " in debt. " +
          (dte > 2 ? "High leverage amplifies returns but increases financial risk and interest burden." :
           dte <= 0.5 ? "Conservative capital structure — limited use of financial leverage." :
           "Balanced use of debt and equity financing."), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.d) debtEl.value   = h.d;
      if (h.e) equityEl.value = h.e;
      if (h.a) assetsEl.value = h.a;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var d = parseFloat(debtEl.value) || 0;
        var e = parseFloat(equityEl.value) || 1;
        var a = parseFloat(assetsEl.value) || (d + e);
        var lines = [
          "Debt-to-Equity Calculator Results",
          "Total Debt: $" + d.toLocaleString(),
          "Total Equity: $" + e.toLocaleString(),
          "D/E Ratio: " + (calcDebtToEquity(d, e) !== null ? calcDebtToEquity(d, e).toFixed(2) + "×" : "--"),
          "Equity Ratio: " + (calcEquityRatio(e, a) !== null ? calcEquityRatio(e, a).toFixed(1) + "%" : "--"),
          "Debt Ratio: " + (calcDebtRatio(d, a) !== null ? calcDebtRatio(d, a).toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [debtEl, equityEl, assetsEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcDebtToEquity: calcDebtToEquity, calcEquityRatio: calcEquityRatio, calcDebtRatio: calcDebtRatio, calcFinancialLeverage: calcFinancialLeverage, debtToEquityLabel: debtToEquityLabel };
  }
})();
