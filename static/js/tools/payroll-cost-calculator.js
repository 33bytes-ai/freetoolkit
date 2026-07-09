(function () {
  "use strict";

  var FICA_RATE = 0.0765; // employer Social Security (6.2%) + Medicare (1.45%)
  var FUTA_RATE = 0.006;  // Federal Unemployment Tax Act (after state credits)
  var SUTA_RATE_DEFAULT = 0.027; // State Unemployment Tax — varies; use 2.7% as default

  function calcPayrollTax(salary, sutaRate) {
    var suta = typeof sutaRate === "number" ? sutaRate : SUTA_RATE_DEFAULT;
    var fica = salary * FICA_RATE;
    var futa = Math.min(salary, 7000) * FUTA_RATE; // FUTA only on first $7,000
    var sutaAmount = Math.min(salary, 10000) * suta; // approximate state wage base
    return fica + futa + sutaAmount;
  }

  function calcTotalEmployerCost(salary, benefitsCost, sutaRate) {
    if (!salary || salary <= 0) return null;
    var taxes = calcPayrollTax(salary, sutaRate);
    return salary + taxes + (benefitsCost || 0);
  }

  function calcEffectiveRate(salary, totalCost) {
    if (!salary || salary <= 0 || !totalCost) return null;
    return (totalCost / salary) * 100;
  }

  function costLabel(effectiveRate) {
    if (effectiveRate === null) return null;
    if (effectiveRate < 110) return { text: "Employer overhead below 10%. This may undercount benefits or assumes minimal perks.", type: "warning" };
    if (effectiveRate < 125) return { text: "Total employer cost 10–25% above salary. Typical for minimal-benefits roles.", type: "info" };
    if (effectiveRate < 140) return { text: "Total employer cost 25–40% above salary. Typical for US full-time employment with standard benefits.", type: "info" };
    return { text: "Total employer cost 40%+ above salary. Includes comprehensive benefits, equity, or high-tax jurisdiction.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return "$" + v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var salaryEl   = document.getElementById("pr-salary");
    var benefitsEl = document.getElementById("pr-benefits");
    var sutaEl     = document.getElementById("pr-suta");
    var insightEl  = document.getElementById("pr-insight");
    var shareBtn   = document.getElementById("pr-share");
    var copyBtn    = document.getElementById("pr-copy");

    function update() {
      var salary   = parseFloat(salaryEl.value) || 0;
      var benefits = parseFloat(benefitsEl.value) || 0;
      var suta     = parseFloat(sutaEl.value) / 100 || SUTA_RATE_DEFAULT;

      var taxes    = salary > 0 ? calcPayrollTax(salary, suta) : 0;
      var total    = calcTotalEmployerCost(salary, benefits, suta);
      var rate     = calcEffectiveRate(salary, total);

      document.getElementById("pr-taxes").textContent   = salary > 0 ? fmtCurrency(taxes) : "—";
      document.getElementById("pr-total").textContent   = fmtCurrency(total);
      document.getElementById("pr-monthly").textContent = total !== null ? fmtCurrency(total / 12) + "/mo" : "—";
      document.getElementById("pr-rate").textContent    = rate !== null ? rate.toFixed(1) + "%" : "—";

      window.FTK.hashSet({ s: salaryEl.value, b: benefitsEl.value, u: sutaEl.value });

      var ins = costLabel(rate);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s) salaryEl.value = h.s;
      if (h.b) benefitsEl.value = h.b;
      if (h.u && sutaEl) sutaEl.value = h.u;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var salary   = parseFloat(salaryEl.value) || 0;
        var benefits = parseFloat(benefitsEl.value) || 0;
        var suta     = parseFloat(sutaEl.value) / 100 || SUTA_RATE_DEFAULT;
        var taxes    = salary > 0 ? calcPayrollTax(salary, suta) : 0;
        var total    = calcTotalEmployerCost(salary, benefits, suta);
        var rate     = calcEffectiveRate(salary, total);
        var lines = [
          "Annual salary: " + fmtCurrency(salary),
          "Payroll taxes (employer): " + fmtCurrency(taxes),
          "Benefits: " + fmtCurrency(benefits),
          "Total employer cost: " + fmtCurrency(total),
          "Monthly cost: " + (total !== null ? fmtCurrency(total / 12) : "—"),
          "Effective cost rate: " + (rate !== null ? rate.toFixed(1) + "%" : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [salaryEl, benefitsEl, sutaEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPayrollTax, calcTotalEmployerCost, calcEffectiveRate, FICA_RATE };
  }
})();
