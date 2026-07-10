(function () {
  "use strict";

  function calcBreakEvenRevenue(fixedCosts, variableMarginPct) {
    if (!fixedCosts || fixedCosts <= 0 || !variableMarginPct || variableMarginPct <= 0 || variableMarginPct >= 100) return null;
    return fixedCosts / (variableMarginPct / 100);
  }

  function calcSafetyMargin(actualRevenue, breakEvenRevenue) {
    if (!actualRevenue || !breakEvenRevenue || breakEvenRevenue <= 0) return null;
    return ((actualRevenue - breakEvenRevenue) / actualRevenue) * 100;
  }

  function breakEvenLabel(safetyMargin) {
    if (safetyMargin === null) return null;
    if (safetyMargin < 0) return { text: "Revenue is below break-even. You're operating at a loss.", type: "warning" };
    if (safetyMargin < 10) return { text: "Safety margin below 10%. Small revenue decline would push you into a loss.", type: "warning" };
    if (safetyMargin < 25) return { text: "Moderate safety margin. Consider reducing fixed costs or increasing prices.", type: "info" };
    return { text: "Healthy safety margin above 25%. Revenue significantly covers fixed costs.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return "$" + v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var fixedEl    = document.getElementById("be-fixed");
    var marginEl   = document.getElementById("be-margin");
    var revenueEl  = document.getElementById("be-revenue");
    var insightEl  = document.getElementById("be-insight");
    var shareBtn   = document.getElementById("be-share");
    var copyBtn    = document.getElementById("be-copy");

    function update() {
      var fixed   = parseFloat(fixedEl.value) || 0;
      var margin  = parseFloat(marginEl.value) || 0;
      var revenue = parseFloat(revenueEl.value) || 0;

      var beRevenue   = calcBreakEvenRevenue(fixed, margin);
      var safetyMargin = (revenue > 0 && beRevenue !== null) ? calcSafetyMargin(revenue, beRevenue) : null;
      var revenueToProfit = beRevenue !== null && revenue > 0 ? revenue - beRevenue : null;

      document.getElementById("be-result").textContent       = fmtCurrency(beRevenue);
      document.getElementById("be-safety").textContent       = safetyMargin !== null ? safetyMargin.toFixed(1) + "%" : "—";
      document.getElementById("be-profit").textContent       = revenueToProfit !== null ? (revenueToProfit >= 0 ? "+" : "") + fmtCurrency(revenueToProfit) : "—";
      document.getElementById("be-gap").textContent          = (beRevenue !== null && revenue > 0 && revenue < beRevenue) ? fmtCurrency(beRevenue - revenue) + " needed" : (revenue >= beRevenue && beRevenue !== null ? "Break-even!" : "—");

      window.FTK.hashSet({ f: fixedEl.value, m: marginEl.value, r: revenueEl.value });

      var ins = breakEvenLabel(safetyMargin);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.f) fixedEl.value = h.f;
      if (h.m) marginEl.value = h.m;
      if (h.r) revenueEl.value = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var fixed   = parseFloat(fixedEl.value) || 0;
        var margin  = parseFloat(marginEl.value) || 0;
        var revenue = parseFloat(revenueEl.value) || 0;
        var beRevenue = calcBreakEvenRevenue(fixed, margin);
        var safetyMargin = (revenue > 0 && beRevenue !== null) ? calcSafetyMargin(revenue, beRevenue) : null;
        var lines = [
          "Fixed costs: " + fmtCurrency(fixed),
          "Contribution margin: " + margin + "%",
          "Break-even revenue: " + fmtCurrency(beRevenue),
          "Current revenue: " + fmtCurrency(revenue),
          "Safety margin: " + (safetyMargin !== null ? safetyMargin.toFixed(1) + "%" : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [fixedEl, marginEl, revenueEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcBreakEvenRevenue, calcSafetyMargin };
  }
})();
