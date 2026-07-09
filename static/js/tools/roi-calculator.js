(function () {
  "use strict";

  function calcROI(netProfit, investmentCost) {
    if (!investmentCost || investmentCost <= 0 || netProfit == null) return null;
    return (netProfit / investmentCost) * 100;
  }

  function calcAnnualizedROI(roi, years) {
    if (roi === null || !years || years <= 0) return null;
    return (Math.pow(1 + roi / 100, 1 / years) - 1) * 100;
  }

  function calcBreakEvenMonths(investmentCost, monthlyNetProfit) {
    if (!monthlyNetProfit || monthlyNetProfit <= 0 || !investmentCost || investmentCost <= 0) return null;
    return investmentCost / monthlyNetProfit;
  }

  function calcNetProfit(revenue, costs) {
    return (revenue || 0) - (costs || 0);
  }

  function roiLabel(roi) {
    if (roi === null) return null;
    if (roi >= 100) return { text: "ROI " + roi.toFixed(0) + "% — Excellent. You doubled or more than doubled your investment. Strong return by any benchmark.", type: "info" };
    if (roi >= 30) return { text: "ROI " + roi.toFixed(0) + "% — Good. Solid return above typical business benchmarks (10–25%).", type: "info" };
    if (roi >= 0) return { text: "ROI " + roi.toFixed(0) + "% — Marginal. You're making money, but explore whether this capital is optimally deployed.", type: "warning" };
    return { text: "ROI " + roi.toFixed(0) + "% — Negative. This investment costs more than it returns. Review the assumptions and timeline.", type: "warning" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "--";
    if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var revEl     = document.getElementById("roi-revenue");
    var costEl    = document.getElementById("roi-costs");
    var invEl     = document.getElementById("roi-investment");
    var yrsEl     = document.getElementById("roi-years");
    var insEl     = document.getElementById("roi-insight");
    var shareBtn  = document.getElementById("roi-share");
    var copyBtn   = document.getElementById("roi-copy");

    function update() {
      var rev  = parseFloat(revEl.value) || 0;
      var cost = parseFloat(costEl.value) || 0;
      var inv  = parseFloat(invEl.value) || 0;
      var yrs  = parseFloat(yrsEl.value) || 1;

      var net       = calcNetProfit(rev, cost);
      var roi       = calcROI(net, inv);
      var annROI    = (yrs !== 1) ? calcAnnualizedROI(roi, yrs) : roi;
      var moProfit  = yrs > 0 ? net / (yrs * 12) : 0;
      var breakEven = calcBreakEvenMonths(inv, moProfit > 0 ? moProfit : null);

      document.getElementById("roi-result").textContent      = roi !== null ? roi.toFixed(1) + "%" : "--";
      document.getElementById("roi-net-profit").textContent  = fmtCurrency(net);
      document.getElementById("roi-ann-roi").textContent     = annROI !== null ? annROI.toFixed(1) + "%" : "--";
      document.getElementById("roi-breakeven").textContent   = breakEven !== null ? breakEven.toFixed(1) + " mo" : "--";

      window.FTK.hashSet({ r: revEl.value, c: costEl.value, i: invEl.value, y: yrsEl.value });

      var ins = roiLabel(roi);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revEl.value  = h.r;
      if (h.c) costEl.value = h.c;
      if (h.i) invEl.value  = h.i;
      if (h.y) yrsEl.value  = h.y;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var rev  = parseFloat(revEl.value) || 0;
        var cost = parseFloat(costEl.value) || 0;
        var inv  = parseFloat(invEl.value) || 0;
        var net  = calcNetProfit(rev, cost);
        var roi  = calcROI(net, inv);
        var lines = [
          "Revenue/returns: " + fmtCurrency(rev),
          "Costs: " + fmtCurrency(cost),
          "Investment: " + fmtCurrency(inv),
          "Net profit: " + fmtCurrency(net),
          "ROI: " + (roi !== null ? roi.toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revEl, costEl, invEl, yrsEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcROI, calcAnnualizedROI, calcBreakEvenMonths, calcNetProfit, roiLabel };
  }
})();
