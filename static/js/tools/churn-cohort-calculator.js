(function () {
  "use strict";

  function calcRetentionRate(churned, original) {
    if (!original || original <= 0 || churned < 0) return null;
    return Math.max(0, ((original - churned) / original) * 100);
  }

  function calcCohortLTV(monthlyRevenue, monthlyChurnPct) {
    if (!monthlyRevenue || monthlyRevenue <= 0 || !monthlyChurnPct || monthlyChurnPct <= 0 || monthlyChurnPct >= 100) return null;
    return monthlyRevenue / (monthlyChurnPct / 100);
  }

  function calcRetentionAtMonth(initialRetentionPct, monthlyChurnPct, months) {
    if (initialRetentionPct === null || !monthlyChurnPct || monthlyChurnPct <= 0) return null;
    return initialRetentionPct * Math.pow(1 - monthlyChurnPct / 100, months);
  }

  function calcMonthsToChurn50(monthlyChurnPct) {
    if (!monthlyChurnPct || monthlyChurnPct <= 0) return null;
    return Math.log(0.5) / Math.log(1 - monthlyChurnPct / 100);
  }

  function cohortLabel(retentionPct, months) {
    if (retentionPct === null) return null;
    var m = months || 12;
    if (retentionPct >= 80) return { text: "Strong retention: " + retentionPct.toFixed(1) + "% of the cohort remains after " + m + " months. Typical of sticky enterprise SaaS. NRR likely above 100%.", type: "info" };
    if (retentionPct >= 60) return { text: "Decent retention: " + retentionPct.toFixed(1) + "% after " + m + " months. Room to improve. Focus on months 2–4 — that's typically where most churn concentrates.", type: "info" };
    if (retentionPct >= 40) return { text: "Below-average retention: " + retentionPct.toFixed(1) + "% after " + m + " months. Suggests an onboarding or product-market fit issue. Analyze which cohorts churn earliest.", type: "warning" };
    return { text: "Critical churn: only " + retentionPct.toFixed(1) + "% retained after " + m + " months. Requires a full cohort audit — segment by acquisition channel, plan type, and onboarding path.", type: "warning" };
  }

  function init() {
    var originalEl = document.getElementById("cc-original");
    var churnedEl  = document.getElementById("cc-churned");
    var mrevenueEl = document.getElementById("cc-mrevenue");
    var mchurnEl   = document.getElementById("cc-mchurn");
    var monthsEl   = document.getElementById("cc-months");
    var insEl      = document.getElementById("cc-insight");
    var shareBtn   = document.getElementById("cc-share-btn");
    var copyBtn    = document.getElementById("cc-copy");

    function update() {
      var original = parseFloat(originalEl.value) || 0;
      var churned  = parseFloat(churnedEl.value)  || 0;
      var mrev     = parseFloat(mrevenueEl.value) || 0;
      var mchurn   = parseFloat(mchurnEl.value)   || 0;
      var months   = parseFloat(monthsEl.value)   || 12;

      var retention = original > 0 ? calcRetentionRate(churned, original) : null;
      var ltv       = mrev > 0 && mchurn > 0 ? calcCohortLTV(mrev, mchurn) : null;
      var ret12     = retention !== null && mchurn > 0 ? calcRetentionAtMonth(retention, mchurn, months) : null;
      var half      = mchurn > 0 ? calcMonthsToChurn50(mchurn) : null;

      function fmtPct(v) { return v !== null ? v.toFixed(1) + "%" : "--"; }
      function fmtCur(v) { return v !== null ? "$" + Math.round(v).toLocaleString() : "--"; }
      function fmtMo(v)  { return v !== null ? Math.round(v) + " mo" : "--"; }

      document.getElementById("cc-retention").textContent  = fmtPct(retention);
      document.getElementById("cc-ltv").textContent        = fmtCur(ltv);
      document.getElementById("cc-ret-proj").textContent   = fmtPct(ret12);
      document.getElementById("cc-half-life").textContent  = fmtMo(half);

      window.FTK.hashSet({ o: originalEl.value, c: churnedEl.value, r: mrevenueEl.value, m: mchurnEl.value, n: monthsEl.value });

      var ins = cohortLabel(ret12, months);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.o) originalEl.value = h.o;
      if (h.c) churnedEl.value  = h.c;
      if (h.r) mrevenueEl.value = h.r;
      if (h.m) mchurnEl.value   = h.m;
      if (h.n) monthsEl.value   = h.n;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var original = parseFloat(originalEl.value) || 0;
        var churned  = parseFloat(churnedEl.value)  || 0;
        var mrev     = parseFloat(mrevenueEl.value) || 0;
        var mchurn   = parseFloat(mchurnEl.value)   || 0;
        var months   = parseFloat(monthsEl.value)   || 12;
        var retention = original > 0 ? calcRetentionRate(churned, original) : null;
        var ltv = mrev > 0 && mchurn > 0 ? calcCohortLTV(mrev, mchurn) : null;
        var lines = [
          "Cohort retention: " + (retention !== null ? retention.toFixed(1) + "%" : "--"),
          "LTV from churn: " + (ltv !== null ? "$" + Math.round(ltv).toLocaleString() : "--"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [originalEl, churnedEl, mrevenueEl, mchurnEl, monthsEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcRetentionRate, calcCohortLTV, calcRetentionAtMonth, calcMonthsToChurn50, cohortLabel };
  }
})();
