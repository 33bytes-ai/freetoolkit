(function () {
  "use strict";

  function calcVariance(actual, budget) {
    return actual - budget;
  }

  function calcVariancePct(actual, budget) {
    if (budget === 0) return null;
    return ((actual - budget) / Math.abs(budget)) * 100;
  }

  function calcFavorableVariance(variance, isExpense) {
    if (isExpense) return variance <= 0;
    return variance >= 0;
  }

  function calcCumulativeVariance(actuals, budgets) {
    if (!actuals || !budgets || actuals.length !== budgets.length) return null;
    var totalActual = actuals.reduce(function (s, v) { return s + v; }, 0);
    var totalBudget = budgets.reduce(function (s, v) { return s + v; }, 0);
    return calcVariance(totalActual, totalBudget);
  }

  function varianceLabel(pct, isExpense) {
    if (pct === null || pct === undefined) return "";
    var favorable = calcFavorableVariance(pct > 0 ? 1 : pct < 0 ? -1 : 0, isExpense);
    var absPct = Math.abs(pct);
    if (favorable) {
      if (absPct >= 10) return "Significantly favorable";
      if (absPct >= 5)  return "Favorable";
      return "On budget";
    } else {
      if (absPct >= 10) return "Significantly unfavorable";
      if (absPct >= 5)  return "Unfavorable";
      return "Slight unfavorable variance";
    }
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var actualEl  = document.getElementById("bv-actual");
    var budgetEl  = document.getElementById("bv-budget");
    var typeEl    = document.getElementById("bv-type");
    var insEl     = document.getElementById("bv-insight");
    var copyBtn   = document.getElementById("bv-copy");
    var shareBtn  = document.getElementById("bv-share");

    function update() {
      var actual = parseFloat(actualEl.value) || 0;
      var budget = parseFloat(budgetEl.value) || 0;
      var isExp  = typeEl.value === "expense";

      var variance    = calcVariance(actual, budget);
      var variancePct = calcVariancePct(actual, budget);
      var favorable   = variancePct !== null ? calcFavorableVariance(variance, isExp) : null;

      document.getElementById("bv-variance").textContent     = fmt(variance);
      document.getElementById("bv-variance-pct").textContent = variancePct !== null ? variancePct.toFixed(1) + "%" : "--";
      document.getElementById("bv-status").textContent       = favorable !== null ? (favorable ? "Favorable" : "Unfavorable") : "--";

      window.FTK.hashSet({ a: actual, b: budget, t: typeEl.value });

      if (variancePct !== null) {
        var label = varianceLabel(variancePct, isExp);
        var type  = favorable ? "success" : "warning";
        window.FTK.showInsight(insEl,
          label + " — Variance: " + fmt(variance) + " (" + variancePct.toFixed(1) + "%). " +
          "Actual " + (isExp ? "spend" : "revenue") + ": " + fmt(actual) + " vs budget: " + fmt(budget) + ".", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a) actualEl.value = h.a;
      if (h.b) budgetEl.value = h.b;
      if (h.t && typeEl) typeEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var actual = parseFloat(actualEl.value) || 0;
        var budget = parseFloat(budgetEl.value) || 0;
        var isExp  = typeEl.value === "expense";
        var v      = calcVariance(actual, budget);
        var vp     = calcVariancePct(actual, budget);
        var lines  = [
          "Budget Variance Calculator",
          "Type: " + (isExp ? "Expense" : "Revenue"),
          "Actual: " + fmt(actual),
          "Budget: " + fmt(budget),
          "Variance: " + fmt(v),
          "Variance %: " + (vp !== null ? vp.toFixed(1) + "%" : "--"),
          "Assessment: " + varianceLabel(vp, isExp)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [actualEl, budgetEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    if (typeEl) typeEl.addEventListener("change", update);
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcVariance: calcVariance, calcVariancePct: calcVariancePct, calcFavorableVariance: calcFavorableVariance, calcCumulativeVariance: calcCumulativeVariance, varianceLabel: varianceLabel };
  }
})();
