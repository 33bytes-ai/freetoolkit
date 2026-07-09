(function () {
  "use strict";

  function calcDSO(accountsReceivable, totalCreditSales, days) {
    if (!totalCreditSales || totalCreditSales <= 0) return null;
    if (!days || days <= 0) return null;
    return (accountsReceivable / totalCreditSales) * days;
  }

  function calcARTurnover(totalCreditSales, accountsReceivable) {
    if (!accountsReceivable || accountsReceivable <= 0) return null;
    return totalCreditSales / accountsReceivable;
  }

  function calcCashCollected(totalCreditSales, startAR, endAR) {
    return totalCreditSales + startAR - endAR;
  }

  function calcTargetAR(dailySales, targetDSO) {
    if (!dailySales || dailySales <= 0) return null;
    if (!targetDSO || targetDSO <= 0) return null;
    return dailySales * targetDSO;
  }

  function dsoLabel(dso) {
    if (dso === null) return null;
    if (dso <= 30) return { text: "Excellent DSO (" + dso.toFixed(1) + " days). Customers are paying promptly. You have minimal working capital tied up in receivables.", type: "info" };
    if (dso <= 45) return { text: "Good DSO (" + dso.toFixed(1) + " days). In line with standard Net 30–45 terms. Monitor for any upward drift.", type: "info" };
    if (dso <= 60) return { text: "Acceptable DSO (" + dso.toFixed(1) + " days). Approaching the upper bound for Net 30 terms. Review your collections process and follow-up cadence.", type: "info" };
    return { text: "High DSO (" + dso.toFixed(1) + " days). Significant working capital is locked in receivables. Consider tighter credit terms, early-payment discounts, or more aggressive collections.", type: "warning" };
  }

  function init() {
    var arEl    = document.getElementById("dso-ar");
    var salesEl = document.getElementById("dso-sales");
    var daysEl  = document.getElementById("dso-days");
    var outDSO  = document.getElementById("dso-out-dso");
    var outTurn = document.getElementById("dso-out-turnover");
    var outTgtAR = document.getElementById("dso-out-target-ar");
    var insEl   = document.getElementById("dso-insight");
    var shareBtn = document.getElementById("dso-share");
    var copyBtn  = document.getElementById("dso-copy");

    function update() {
      var ar    = parseFloat(arEl ? arEl.value : 0) || 0;
      var sales = parseFloat(salesEl ? salesEl.value : 0) || 0;
      var days  = parseFloat(daysEl ? daysEl.value : 90) || 90;

      var dso     = calcDSO(ar, sales, days);
      var turnover = calcARTurnover(sales, ar);
      var dailySales = sales > 0 && days > 0 ? sales / days : 0;
      var targetAR  = calcTargetAR(dailySales, 30);

      if (outDSO)  outDSO.textContent  = dso     !== null ? dso.toFixed(1) + " days" : "--";
      if (outTurn) outTurn.textContent = turnover !== null ? turnover.toFixed(2) + "×" : "--";
      if (outTgtAR) outTgtAR.textContent = targetAR !== null ? "$" + Math.round(targetAR).toLocaleString() : "--";

      window.FTK.hashSet({ ar: arEl ? arEl.value : "", s: salesEl ? salesEl.value : "", d: daysEl ? daysEl.value : "" });

      var ins = dsoLabel(dso);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      function s(el, v) { if (el && v !== undefined) el.value = v; }
      s(arEl, h.ar); s(salesEl, h.s); s(daysEl, h.d);
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ar = parseFloat(arEl ? arEl.value : 0) || 0;
        var sales = parseFloat(salesEl ? salesEl.value : 0) || 0;
        var days = parseFloat(daysEl ? daysEl.value : 90) || 90;
        var dso = calcDSO(ar, sales, days);
        window.FTK.copyToClipboard("DSO: " + (dso !== null ? dso.toFixed(1) + " days" : "--"))
          .then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [arEl, salesEl, daysEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcDSO, calcARTurnover, calcCashCollected, calcTargetAR, dsoLabel };
  }
})();
