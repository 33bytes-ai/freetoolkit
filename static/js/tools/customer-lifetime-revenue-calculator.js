(function () {
  "use strict";

  function calcLTV(arpu, churnRatePct) {
    if (churnRatePct <= 0) return null;
    return arpu / (churnRatePct / 100);
  }

  function calcLTVWithMargin(arpu, grossMarginPct, churnRatePct) {
    if (churnRatePct <= 0) return null;
    return (arpu * (grossMarginPct / 100)) / (churnRatePct / 100);
  }

  function calcLTVCACRatio(ltv, cac) {
    if (cac <= 0) return null;
    return ltv / cac;
  }

  function calcAverageCustomerLifespan(churnRatePct) {
    if (churnRatePct <= 0) return null;
    return 1 / (churnRatePct / 100);
  }

  function calcPaybackPeriod(cac, arpu, grossMarginPct) {
    var monthlyContribution = arpu * (grossMarginPct / 100);
    if (monthlyContribution <= 0) return null;
    return cac / monthlyContribution;
  }

  function ltvCACLabel(ratio) {
    if (ratio === null || ratio === undefined) return "";
    if (ratio >= 5)   return "Excellent unit economics";
    if (ratio >= 3)   return "Healthy — benchmark for SaaS";
    if (ratio >= 1)   return "Marginal — acquisition costs high";
    return "Unprofitable customer acquisition";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(2);
  }

  function init() {
    var arpuEl   = document.getElementById("clr-arpu");
    var gmEl     = document.getElementById("clr-gm");
    var churnEl  = document.getElementById("clr-churn");
    var cacEl    = document.getElementById("clr-cac");
    var insEl    = document.getElementById("clr-insight");
    var copyBtn  = document.getElementById("clr-copy");
    var shareBtn = document.getElementById("clr-share");

    function update() {
      var arpu  = parseFloat(arpuEl.value)  || 0;
      var gm    = parseFloat(gmEl.value)    || 100;
      var churn = parseFloat(churnEl.value) || 0;
      var cac   = parseFloat(cacEl.value)   || 0;

      var ltv      = calcLTV(arpu, churn);
      var ltvM     = calcLTVWithMargin(arpu, gm, churn);
      var life     = calcAverageCustomerLifespan(churn);
      var ratio    = cac > 0 && ltvM !== null ? calcLTVCACRatio(ltvM, cac) : null;
      var payback  = cac > 0 ? calcPaybackPeriod(cac, arpu, gm) : null;

      document.getElementById("clr-ltv").textContent      = ltv  !== null ? fmt(ltv) : "--";
      document.getElementById("clr-ltv-gm").textContent   = ltvM !== null ? fmt(ltvM) : "--";
      document.getElementById("clr-life").textContent     = life !== null ? life.toFixed(1) + " mo" : "--";
      document.getElementById("clr-ratio").textContent    = ratio   !== null ? ratio.toFixed(1) + "x" : "--";
      document.getElementById("clr-payback").textContent  = payback !== null ? payback.toFixed(1) + " mo" : "--";

      window.FTK.hashSet({ a: arpu, g: gm, ch: churn, c: cac });

      if (ltvM !== null) {
        var label = ltvCACLabel(ratio);
        var type  = ratio !== null && ratio >= 3 ? "success" : ratio !== null && ratio >= 1 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          (label ? label + " — " : "") +
          "LTV (with margin): " + fmt(ltvM) + ". " +
          (ratio !== null ? "LTV:CAC ratio: " + ratio.toFixed(1) + "x. " : "") +
          (payback !== null ? "Payback period: " + payback.toFixed(1) + " months." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a)  arpuEl.value  = h.a;
      if (h.g)  gmEl.value    = h.g;
      if (h.ch) churnEl.value = h.ch;
      if (h.c)  cacEl.value   = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var arpu  = parseFloat(arpuEl.value)  || 0;
        var gm    = parseFloat(gmEl.value)    || 100;
        var churn = parseFloat(churnEl.value) || 0;
        var cac   = parseFloat(cacEl.value)   || 0;
        var ltvM  = calcLTVWithMargin(arpu, gm, churn);
        var ratio = cac > 0 && ltvM !== null ? calcLTVCACRatio(ltvM, cac) : null;
        var lines = [
          "Customer Lifetime Value Calculator",
          "ARPU: " + fmt(arpu) + "/mo",
          "LTV (gross): " + (calcLTV(arpu, churn) !== null ? fmt(calcLTV(arpu, churn)) : "--"),
          "LTV (with margin): " + (ltvM !== null ? fmt(ltvM) : "--"),
          "Avg Lifespan: " + (calcAverageCustomerLifespan(churn) !== null ? calcAverageCustomerLifespan(churn).toFixed(1) + " mo" : "--"),
          "LTV:CAC: " + (ratio !== null ? ratio.toFixed(1) + "x" : "--"),
          "Payback: " + (cac > 0 ? calcPaybackPeriod(cac, arpu, gm).toFixed(1) + " mo" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [arpuEl, gmEl, churnEl, cacEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcLTV: calcLTV, calcLTVWithMargin: calcLTVWithMargin, calcLTVCACRatio: calcLTVCACRatio, calcAverageCustomerLifespan: calcAverageCustomerLifespan, calcPaybackPeriod: calcPaybackPeriod, ltvCACLabel: ltvCACLabel };
  }
})();
