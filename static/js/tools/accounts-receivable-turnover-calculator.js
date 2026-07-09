(function () {
  "use strict";

  function calcARTurnover(netCreditSales, avgAccountsReceivable) {
    if (avgAccountsReceivable <= 0) return null;
    return netCreditSales / avgAccountsReceivable;
  }

  function calcDSO(avgAccountsReceivable, netCreditSales) {
    if (netCreditSales <= 0) return null;
    return (avgAccountsReceivable / netCreditSales) * 365;
  }

  function calcAvgAR(beginningAR, endingAR) {
    return (beginningAR + endingAR) / 2;
  }

  function calcIdealAR(netCreditSales, targetDSO) {
    if (targetDSO <= 0) return null;
    return (netCreditSales / 365) * targetDSO;
  }

  function calcExcessAR(currentAR, idealAR) {
    return currentAR - idealAR;
  }

  function arTurnoverLabel(turnover) {
    if (turnover === null || turnover === undefined) return "";
    if (turnover >= 10) return "Excellent collection";
    if (turnover >= 7)  return "Good";
    if (turnover >= 4)  return "Adequate";
    return "Slow collections — review credit terms";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var salesEl  = document.getElementById("art-sales");
    var beginEl  = document.getElementById("art-begin-ar");
    var endEl    = document.getElementById("art-end-ar");
    var tdsoEl   = document.getElementById("art-target-dso");
    var insEl    = document.getElementById("art-insight");
    var copyBtn  = document.getElementById("art-copy");
    var shareBtn = document.getElementById("art-share");

    function update() {
      var sales = parseFloat(salesEl.value)  || 0;
      var bAR   = parseFloat(beginEl.value)  || 0;
      var eAR   = parseFloat(endEl.value)    || 0;
      var tDSO  = parseFloat(tdsoEl.value)   || 30;

      var avgAR   = calcAvgAR(bAR, eAR);
      var art     = calcARTurnover(sales, avgAR);
      var dso     = calcDSO(avgAR, sales);
      var ideal   = calcIdealAR(sales, tDSO);
      var excess  = ideal !== null ? calcExcessAR(avgAR, ideal) : null;

      document.getElementById("art-avg-ar").textContent   = fmt(avgAR);
      document.getElementById("art-result").textContent   = art !== null ? art.toFixed(1) + "x" : "--";
      document.getElementById("art-dso").textContent      = dso !== null ? dso.toFixed(0) + " days" : "--";
      document.getElementById("art-excess").textContent   = excess !== null ? fmt(excess) : "--";

      window.FTK.hashSet({ s: sales, b: bAR, e: eAR, t: tDSO });

      if (dso !== null) {
        var label = arTurnoverLabel(art);
        var type  = dso <= tDSO ? "success" : dso <= tDSO * 1.5 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — DSO: " + dso.toFixed(0) + " days vs target " + tDSO + " days. " +
          "AR turnover: " + (art !== null ? art.toFixed(1) + "x per year." : "--") +
          (excess !== null && excess > 0 ? " Excess AR tied up in collections: " + fmt(excess) + "." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s) salesEl.value = h.s;
      if (h.b) beginEl.value = h.b;
      if (h.e) endEl.value   = h.e;
      if (h.t) tdsoEl.value  = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var sales = parseFloat(salesEl.value) || 0;
        var bAR   = parseFloat(beginEl.value) || 0;
        var eAR   = parseFloat(endEl.value)   || 0;
        var avgAR = calcAvgAR(bAR, eAR);
        var art   = calcARTurnover(sales, avgAR);
        var dso   = calcDSO(avgAR, sales);
        var lines = [
          "Accounts Receivable Turnover Calculator",
          "Net Credit Sales: " + fmt(sales),
          "Avg AR: " + fmt(avgAR),
          "AR Turnover: " + (art !== null ? art.toFixed(1) + "x" : "--"),
          "DSO: " + (dso !== null ? dso.toFixed(0) + " days" : "--"),
          "Assessment: " + arTurnoverLabel(art)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [salesEl, beginEl, endEl, tdsoEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcARTurnover: calcARTurnover, calcDSO: calcDSO, calcAvgAR: calcAvgAR, calcIdealAR: calcIdealAR, calcExcessAR: calcExcessAR, arTurnoverLabel: arTurnoverLabel };
  }
})();
