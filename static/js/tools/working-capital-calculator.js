(function () {
  "use strict";

  function calcWorkingCapital(currentAssets, currentLiabilities) {
    return currentAssets - currentLiabilities;
  }

  function calcCurrentRatio(currentAssets, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return currentAssets / currentLiabilities;
  }

  function calcWorkingCapitalRatio(currentAssets, currentLiabilities) {
    return calcCurrentRatio(currentAssets, currentLiabilities);
  }

  function calcQuickRatioFinancial(currentAssets, inventory, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return (currentAssets - inventory) / currentLiabilities;
  }

  function calcDaysWorkingCapital(workingCapital, annualRevenue) {
    if (annualRevenue <= 0) return null;
    return (workingCapital / annualRevenue) * 365;
  }

  function calcCashConversionCycle(dso, dio, dpo) {
    return dso + dio - dpo;
  }

  function calcDSO(accountsReceivable, dailyRevenue) {
    if (dailyRevenue <= 0) return null;
    return accountsReceivable / dailyRevenue;
  }

  function calcDPO(accountsPayable, dailyCOGS) {
    if (dailyCOGS <= 0) return null;
    return accountsPayable / dailyCOGS;
  }

  function calcDIO(inventory, dailyCOGS) {
    if (dailyCOGS <= 0) return null;
    return inventory / dailyCOGS;
  }

  function workingCapitalLabel(wc, ratio) {
    if (ratio === null) return "";
    if (ratio >= 2)    return "Well-funded";
    if (ratio >= 1.5)  return "Healthy";
    if (ratio >= 1)    return "Adequate";
    return "Underfunded";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var caEl     = document.getElementById("wc-curr-assets");
    var clEl     = document.getElementById("wc-curr-liab");
    var insEl    = document.getElementById("wc-insight");
    var copyBtn  = document.getElementById("wc-copy");
    var shareBtn = document.getElementById("wc-share");

    function update() {
      var ca = parseFloat(caEl.value) || 0;
      var cl = parseFloat(clEl.value) || 0;

      var wc    = calcWorkingCapital(ca, cl);
      var ratio = calcCurrentRatio(ca, cl);

      document.getElementById("wc-result").textContent = fmt(wc);
      document.getElementById("wc-ratio").textContent  = ratio !== null ? ratio.toFixed(2) + "x" : "--";
      document.getElementById("wc-label").textContent  = workingCapitalLabel(wc, ratio);

      window.FTK.hashSet({ ca: ca, cl: cl });

      if (ratio !== null) {
        var label = workingCapitalLabel(wc, ratio);
        var type  = ratio >= 1.5 ? "success" : ratio >= 1 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " -- Net working capital: " + fmt(wc) + ". " +
          "Current ratio: " + ratio.toFixed(2) + "x. " +
          "A current ratio below 1.0 means current liabilities exceed current assets -- a short-term liquidity risk.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.ca) caEl.value = h.ca;
      if (h.cl) clEl.value = h.cl;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ca    = parseFloat(caEl.value) || 0;
        var cl    = parseFloat(clEl.value) || 0;
        var wc    = calcWorkingCapital(ca, cl);
        var ratio = calcCurrentRatio(ca, cl);
        var lines = [
          "Working Capital Calculator",
          "Current Assets: " + fmt(ca),
          "Current Liabilities: " + fmt(cl),
          "Working Capital: " + fmt(wc),
          "Current Ratio: " + (ratio !== null ? ratio.toFixed(2) + "x" : "--"),
          "Assessment: " + workingCapitalLabel(wc, ratio)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [caEl, clEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      calcWorkingCapital: calcWorkingCapital,
      calcCurrentRatio: calcCurrentRatio,
      calcWorkingCapitalRatio: calcWorkingCapitalRatio,
      calcQuickRatioFinancial: calcQuickRatioFinancial,
      calcDaysWorkingCapital: calcDaysWorkingCapital,
      calcCashConversionCycle: calcCashConversionCycle,
      calcDSO: calcDSO,
      calcDPO: calcDPO,
      calcDIO: calcDIO,
      workingCapitalLabel: workingCapitalLabel
    };
  }
})();
