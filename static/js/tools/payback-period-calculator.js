(function () {
  "use strict";

  function calcPaybackMonths(initialInvestment, monthlyNetCashFlow) {
    if (!monthlyNetCashFlow || monthlyNetCashFlow <= 0 || !initialInvestment || initialInvestment <= 0) return null;
    return initialInvestment / monthlyNetCashFlow;
  }

  function calcPaybackYears(initialInvestment, annualNetCashFlow) {
    if (!annualNetCashFlow || annualNetCashFlow <= 0 || !initialInvestment || initialInvestment <= 0) return null;
    return initialInvestment / annualNetCashFlow;
  }

  function calcDiscountedPayback(initialInvestment, annualCashFlow, discountRate, maxYears) {
    if (!annualCashFlow || annualCashFlow <= 0 || !initialInvestment || initialInvestment <= 0) return null;
    var remaining = initialInvestment;
    var rate = (discountRate || 0) / 100;
    for (var yr = 1; yr <= (maxYears || 20); yr++) {
      var pv = annualCashFlow / Math.pow(1 + rate, yr);
      remaining -= pv;
      if (remaining <= 0) return yr - 1 + (remaining + pv) / pv;
    }
    return null;
  }

  function calcROIAtYear(initialInvestment, annualCashFlow, years) {
    if (!initialInvestment || initialInvestment <= 0 || !years || years <= 0) return null;
    return ((annualCashFlow * years - initialInvestment) / initialInvestment) * 100;
  }

  function paybackLabel(months) {
    if (months === null) return null;
    if (months <= 6) return { text: "Payback in " + months.toFixed(1) + " months — Exceptional. Under 6 months is world-class for most investment types.", type: "info" };
    if (months <= 12) return { text: "Payback in " + months.toFixed(1) + " months — Excellent. Under 12 months means the investment pays for itself within a year.", type: "info" };
    if (months <= 24) return { text: "Payback in " + months.toFixed(1) + " months — Good. 12–24 month payback is standard for most business investments.", type: "info" };
    if (months <= 48) return { text: "Payback in " + months.toFixed(1) + " months — Acceptable. Consider whether this capital is optimally deployed over 2–4 years.", type: "warning" };
    return { text: "Payback in " + months.toFixed(1) + " months — Long. 4+ year payback carries significant risk. Requires very stable cash flows to justify.", type: "warning" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "--";
    if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var invEl    = document.getElementById("pp-investment");
    var cfEl     = document.getElementById("pp-cashflow");
    var discEl   = document.getElementById("pp-discount");
    var yrsEl    = document.getElementById("pp-years");
    var insEl    = document.getElementById("pp-insight");
    var shareBtn = document.getElementById("pp-share");
    var copyBtn  = document.getElementById("pp-copy");

    function update() {
      var inv   = parseFloat(invEl.value) || 0;
      var cf    = parseFloat(cfEl.value) || 0;
      var disc  = parseFloat(discEl.value) || 0;
      var yrs   = parseFloat(yrsEl.value) || 5;

      var simple  = calcPaybackYears(inv, cf);
      var months  = simple ? simple * 12 : null;
      var discPB  = disc > 0 ? calcDiscountedPayback(inv, cf, disc, 20) : null;
      var roi     = calcROIAtYear(inv, cf, yrs);

      document.getElementById("pp-result").textContent     = simple !== null ? simple.toFixed(2) + " yrs" : "--";
      document.getElementById("pp-months").textContent     = months !== null ? months.toFixed(1) + " mo" : "--";
      document.getElementById("pp-disc-pb").textContent    = discPB !== null ? discPB.toFixed(2) + " yrs" : (disc > 0 ? "Never" : "--");
      document.getElementById("pp-roi-yrs").textContent    = roi !== null ? roi.toFixed(0) + "%" : "--";

      window.FTK.hashSet({ i: invEl.value, c: cfEl.value, d: discEl.value, y: yrsEl.value });

      var ins = paybackLabel(months);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.i) invEl.value  = h.i;
      if (h.c) cfEl.value   = h.c;
      if (h.d) discEl.value = h.d;
      if (h.y) yrsEl.value  = h.y;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var inv  = parseFloat(invEl.value) || 0;
        var cf   = parseFloat(cfEl.value) || 0;
        var pb   = calcPaybackYears(inv, cf);
        var lines = [
          "Initial investment: " + fmtCurrency(inv),
          "Annual net cash flow: " + fmtCurrency(cf),
          "Payback period: " + (pb !== null ? pb.toFixed(2) + " years" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [invEl, cfEl, discEl, yrsEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPaybackMonths, calcPaybackYears, calcDiscountedPayback, calcROIAtYear, paybackLabel };
  }
})();
