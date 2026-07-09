(function () {
  "use strict";

  var FICA_EMPLOYER  = 0.0765;   // 6.2% SS + 1.45% Medicare
  var FUTA_RATE      = 0.006;    // 0.6% effective federal unemployment (after credit)
  var FUTA_WAGE_BASE = 7000;
  var SUTA_DEFAULT   = 0.027;    // average state unemployment

  function calcPayrollTaxes(salary) {
    if (!salary || salary <= 0) return null;
    var fica = salary * FICA_EMPLOYER;
    var futa = Math.min(salary, FUTA_WAGE_BASE) * FUTA_RATE;
    var suta = Math.min(salary, 7000) * SUTA_DEFAULT;
    return fica + futa + suta;
  }

  function calcTotalCost(salary, benefitsCost, bonusAndEquity) {
    if (!salary || salary <= 0) return null;
    var taxes = calcPayrollTaxes(salary) || 0;
    return salary + (benefitsCost || 0) + (bonusAndEquity || 0) + taxes;
  }

  function calcCostMultiplier(salary, benefitsCost, bonusAndEquity) {
    if (!salary || salary <= 0) return null;
    var total = calcTotalCost(salary, benefitsCost, bonusAndEquity);
    return total / salary;
  }

  function calcHourlyCost(totalAnnualCost) {
    if (!totalAnnualCost || totalAnnualCost <= 0) return null;
    return totalAnnualCost / (52 * 40);
  }

  function costLabel(multiplier) {
    if (multiplier === null) return null;
    var pct = ((multiplier - 1) * 100).toFixed(0);
    if (multiplier < 1.20) return { text: "Low overhead multiplier (" + pct + "% above salary). Verify benefits are adequate to attract and retain talent — underinvesting here often costs more in turnover.", type: "info" };
    if (multiplier < 1.35) return { text: "Typical multiplier (" + pct + "% above salary). In line with most US knowledge-worker employers providing health insurance and modest benefits.", type: "info" };
    if (multiplier < 1.50) return { text: "Higher multiplier (" + pct + "% above salary). Common for generous benefits packages, or high-SUTA states. Consider whether benefits are competitive or excessive.", type: "info" };
    return { text: "Very high multiplier (" + pct + "% above salary). Review benefits cost allocation — at this level, consider a benefits audit or self-insured health plan at larger headcount.", type: "warning" };
  }

  function init() {
    var salaryEl   = document.getElementById("ec-salary");
    var benefitsEl = document.getElementById("ec-benefits");
    var bonusEl    = document.getElementById("ec-bonus");
    var insEl      = document.getElementById("ec-insight");
    var shareBtn   = document.getElementById("ec-share-btn");
    var copyBtn    = document.getElementById("ec-copy");

    function update() {
      var salary   = parseFloat(salaryEl.value)   || 0;
      var benefits = parseFloat(benefitsEl.value) || 0;
      var bonus    = parseFloat(bonusEl.value)    || 0;

      var taxes      = salary > 0 ? calcPayrollTaxes(salary) : null;
      var total      = salary > 0 ? calcTotalCost(salary, benefits, bonus) : null;
      var multiplier = salary > 0 ? calcCostMultiplier(salary, benefits, bonus) : null;
      var hourly     = total  ? calcHourlyCost(total) : null;

      function fmt(v) { return "$" + Math.round(v).toLocaleString(); }

      document.getElementById("ec-taxes").textContent     = taxes    ? fmt(taxes)      : "--";
      document.getElementById("ec-total").textContent     = total    ? fmt(total)      : "--";
      document.getElementById("ec-multiplier").textContent = multiplier ? multiplier.toFixed(2) + "x" : "--";
      document.getElementById("ec-hourly").textContent    = hourly   ? "$" + hourly.toFixed(2) + "/hr" : "--";

      window.FTK.hashSet({ s: salaryEl.value, b: benefitsEl.value, x: bonusEl.value });

      var ins = costLabel(multiplier);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s) salaryEl.value   = h.s;
      if (h.b) benefitsEl.value = h.b;
      if (h.x) bonusEl.value    = h.x;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var salary   = parseFloat(salaryEl.value)   || 0;
        var benefits = parseFloat(benefitsEl.value) || 0;
        var bonus    = parseFloat(bonusEl.value)    || 0;
        var taxes    = salary > 0 ? calcPayrollTaxes(salary) : null;
        var total    = salary > 0 ? calcTotalCost(salary, benefits, bonus) : null;
        var multiplier = salary > 0 ? calcCostMultiplier(salary, benefits, bonus) : null;
        function fmt(v) { return "$" + Math.round(v).toLocaleString(); }
        var lines = [
          "Base salary: " + fmt(salary),
          "Payroll taxes: " + (taxes ? fmt(taxes) : "--"),
          "Total employer cost: " + (total ? fmt(total) : "--"),
          "Cost multiplier: " + (multiplier ? multiplier.toFixed(2) + "x" : "--"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [salaryEl, benefitsEl, bonusEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPayrollTaxes, calcTotalCost, calcCostMultiplier, calcHourlyCost, costLabel, FICA_EMPLOYER };
  }
})();
