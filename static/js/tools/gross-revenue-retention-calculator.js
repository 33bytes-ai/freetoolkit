(function () {
  "use strict";

  function calcGRR(startMRR, churnedMRR, contractedMRR) {
    if (startMRR <= 0) return null;
    return ((startMRR - churnedMRR - contractedMRR) / startMRR) * 100;
  }

  function calcAnnualGRR(monthlyGRR) {
    if (monthlyGRR === null) return null;
    return Math.pow(monthlyGRR / 100, 12) * 100;
  }

  function calcLogoChurnRate(churned, total) {
    if (total <= 0) return null;
    return (churned / total) * 100;
  }

  function calcImpliedARPULost(churnedMRR, churnedCustomers) {
    if (churnedCustomers <= 0) return null;
    return churnedMRR / churnedCustomers;
  }

  function grrLabel(grr) {
    if (grr === null || grr === undefined) return "";
    if (grr >= 95)  return "Best-in-class";
    if (grr >= 90)  return "Strong";
    if (grr >= 85)  return "Acceptable";
    if (grr >= 80)  return "Below average";
    return "High churn — retention problem";
  }

  function init() {
    var startEl    = document.getElementById("grr-start-mrr");
    var churnEl    = document.getElementById("grr-churned-mrr");
    var contractEl = document.getElementById("grr-contracted-mrr");
    var insEl      = document.getElementById("grr-insight");
    var copyBtn    = document.getElementById("grr-copy");
    var shareBtn   = document.getElementById("grr-share");

    function update() {
      var start    = parseFloat(startEl.value)    || 0;
      var churned  = parseFloat(churnEl.value)    || 0;
      var contracted = parseFloat(contractEl.value) || 0;

      var grr    = calcGRR(start, churned, contracted);
      var annGRR = grr !== null ? calcAnnualGRR(grr) : null;

      document.getElementById("grr-result").textContent    = grr    !== null ? grr.toFixed(1) + "%" : "--";
      document.getElementById("grr-annual").textContent    = annGRR !== null ? annGRR.toFixed(1) + "%" : "--";
      document.getElementById("grr-mrr-lost").textContent  = "$" + (churned + contracted).toLocaleString();

      window.FTK.hashSet({ s: start, ch: churned, cn: contracted });

      if (grr !== null) {
        var label = grrLabel(grr);
        var type  = grr >= 90 ? "success" : grr >= 85 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — Monthly GRR: " + grr.toFixed(1) + "%. " +
          "Implied annual GRR: " + (annGRR !== null ? annGRR.toFixed(1) + "%" : "--") + ". " +
          "Revenue lost to churn and downgrades: $" + (churned + contracted).toLocaleString() + "/mo.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s)  startEl.value      = h.s;
      if (h.ch) churnEl.value      = h.ch;
      if (h.cn) contractEl.value   = h.cn;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var start    = parseFloat(startEl.value)    || 0;
        var churned  = parseFloat(churnEl.value)    || 0;
        var cn       = parseFloat(contractEl.value) || 0;
        var grr      = calcGRR(start, churned, cn);
        var lines    = [
          "Gross Revenue Retention Calculator",
          "Starting MRR: $" + start.toLocaleString(),
          "Churned MRR: $" + churned.toLocaleString(),
          "Contracted MRR: $" + cn.toLocaleString(),
          "GRR: " + (grr !== null ? grr.toFixed(1) + "%" : "--"),
          "Assessment: " + grrLabel(grr)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [startEl, churnEl, contractEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGRR: calcGRR, calcAnnualGRR: calcAnnualGRR, calcLogoChurnRate: calcLogoChurnRate, calcImpliedARPULost: calcImpliedARPULost, grrLabel: grrLabel };
  }
})();
