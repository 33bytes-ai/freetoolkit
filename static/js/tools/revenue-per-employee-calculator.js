(function () {
  "use strict";

  function calcRevenuePerEmployee(annualRevenue, headcount) {
    if (!annualRevenue || annualRevenue <= 0 || !headcount || headcount <= 0) return null;
    return annualRevenue / headcount;
  }

  function calcHeadcountAtRevenue(annualRevenue, targetRPE) {
    if (!annualRevenue || annualRevenue <= 0 || !targetRPE || targetRPE <= 0) return null;
    return annualRevenue / targetRPE;
  }

  function calcRevenueAtHeadcount(headcount, targetRPE) {
    if (!headcount || headcount <= 0 || !targetRPE || targetRPE <= 0) return null;
    return headcount * targetRPE;
  }

  function calcCostPerEmployee(totalPayrollCost, headcount) {
    if (!totalPayrollCost || totalPayrollCost <= 0 || !headcount || headcount <= 0) return null;
    return totalPayrollCost / headcount;
  }

  var BENCHMARKS = {
    saas_early: 150000,
    saas_growth: 250000,
    saas_mature: 400000,
    enterprise: 600000,
  };

  function rpeLabel(rpe) {
    if (rpe === null) return null;
    if (rpe < 100000) return { text: "Below $100k per employee. Very early stage or high headcount relative to revenue.", type: "warning" };
    if (rpe < 200000) return { text: "Below industry average for SaaS (~$200k). Consider headcount efficiency before next hire.", type: "warning" };
    if (rpe < 400000) return { text: "Healthy range for growth-stage SaaS ($200k–$400k). Benchmark: Series B+ median.", type: "info" };
    if (rpe < 700000) return { text: "Strong RPE above $400k. Top quartile for high-growth SaaS.", type: "info" };
    return { text: "Exceptional RPE above $700k. Indicates highly automated or product-led model.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var revenueEl  = document.getElementById("rpe-revenue");
    var headEl     = document.getElementById("rpe-headcount");
    var payrollEl  = document.getElementById("rpe-payroll");
    var insightEl  = document.getElementById("rpe-insight");
    var shareBtn   = document.getElementById("rpe-share");
    var copyBtn    = document.getElementById("rpe-copy");

    function update() {
      var revenue  = parseFloat(revenueEl.value) || 0;
      var head     = parseFloat(headEl.value) || 0;
      var payroll  = parseFloat(payrollEl.value) || 0;

      var rpe            = calcRevenuePerEmployee(revenue, head);
      var costPerEmp     = payroll > 0 ? calcCostPerEmployee(payroll, head) : null;
      var revenueMultiple = (rpe !== null && costPerEmp !== null && costPerEmp > 0) ? rpe / costPerEmp : null;

      document.getElementById("rpe-result").textContent    = fmtCurrency(rpe);
      document.getElementById("rpe-cost").textContent      = fmtCurrency(costPerEmp);
      document.getElementById("rpe-multiple").textContent  = revenueMultiple !== null ? revenueMultiple.toFixed(2) + "×" : "—";
      document.getElementById("rpe-benchmark").textContent = rpe !== null ? (rpe >= BENCHMARKS.saas_growth ? "Above median SaaS" : "Below median SaaS") : "—";

      window.FTK.hashSet({ r: revenueEl.value, h: headEl.value, p: payrollEl.value });

      var ins = rpeLabel(rpe);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revenueEl.value = h.r;
      if (h.h) headEl.value = h.h;
      if (h.p) payrollEl.value = h.p;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var revenue  = parseFloat(revenueEl.value) || 0;
        var head     = parseFloat(headEl.value) || 0;
        var payroll  = parseFloat(payrollEl.value) || 0;
        var rpe      = calcRevenuePerEmployee(revenue, head);
        var cpe      = payroll > 0 ? calcCostPerEmployee(payroll, head) : null;
        var lines = [
          "Annual revenue: " + fmtCurrency(revenue),
          "Headcount: " + head,
          "Revenue per employee: " + fmtCurrency(rpe),
          "Payroll cost: " + fmtCurrency(payroll),
          "Cost per employee: " + fmtCurrency(cpe),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revenueEl, headEl, payrollEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcRevenuePerEmployee, calcHeadcountAtRevenue, calcRevenueAtHeadcount, calcCostPerEmployee, BENCHMARKS };
  }
})();
