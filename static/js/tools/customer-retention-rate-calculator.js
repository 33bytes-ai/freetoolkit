(function () {
  "use strict";

  function calcRetentionRate(startCustomers, endCustomers, newCustomers) {
    if (startCustomers <= 0) return null;
    var retained = endCustomers - newCustomers;
    return (retained / startCustomers) * 100;
  }

  function calcChurnRate(retentionRate) {
    if (retentionRate === null || retentionRate === undefined) return null;
    return 100 - retentionRate;
  }

  function calcCustomersRetained(startCustomers, endCustomers, newCustomers) {
    return endCustomers - newCustomers;
  }

  function calcCustomersLost(startCustomers, retentionRate) {
    if (retentionRate === null) return null;
    return Math.round(startCustomers * (1 - retentionRate / 100));
  }

  function calcImpliedLTV(arpu, churnRate) {
    if (arpu <= 0 || churnRate <= 0) return null;
    return arpu / (churnRate / 100);
  }

  function retentionLabel(rate) {
    if (rate === null || rate === undefined) return "";
    if (rate >= 95) return "Excellent";
    if (rate >= 90) return "Good";
    if (rate >= 80) return "Average";
    return "High churn";
  }

  function init() {
    var startEl    = document.getElementById("ret-start");
    var endEl      = document.getElementById("ret-end");
    var newEl      = document.getElementById("ret-new");
    var arpuEl     = document.getElementById("ret-arpu");
    var insEl      = document.getElementById("ret-insight");
    var copyBtn    = document.getElementById("ret-copy");
    var shareBtn   = document.getElementById("ret-share");

    function update() {
      var start = parseFloat(startEl.value) || 1;
      var end   = parseFloat(endEl.value)   || 0;
      var newC  = parseFloat(newEl.value)   || 0;
      var arpu  = parseFloat(arpuEl.value)  || 0;

      var retention = calcRetentionRate(start, end, newC);
      var churn     = calcChurnRate(retention);
      var retained  = calcCustomersRetained(start, end, newC);
      var lost      = calcCustomersLost(start, retention);
      var ltv       = (arpu > 0 && churn !== null && churn > 0) ? calcImpliedLTV(arpu, churn) : null;

      document.getElementById("ret-rate").textContent     = retention !== null ? retention.toFixed(1) + "%" : "--";
      document.getElementById("ret-churn").textContent    = churn     !== null ? churn.toFixed(1) + "%"     : "--";
      document.getElementById("ret-retained").textContent = retained.toFixed(0);
      document.getElementById("ret-ltv").textContent      = ltv !== null ? "$" + ltv.toFixed(0) : "--";

      window.FTK.hashSet({ s: start, e: end, n: newC, a: arpu });

      if (retention !== null) {
        var label = retentionLabel(retention);
        var type  = retention >= 90 ? "success" : retention >= 80 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — " + retention.toFixed(1) + "% monthly retention (" + churn.toFixed(1) + "% churn). " +
          "Retained " + retained.toFixed(0) + " of " + start + " starting customers. " +
          (ltv !== null ? "Implied LTV at $" + arpu + " ARPU: $" + ltv.toFixed(0) + "." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s) startEl.value = h.s;
      if (h.e) endEl.value   = h.e;
      if (h.n) newEl.value   = h.n;
      if (h.a) arpuEl.value  = h.a;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var s = parseFloat(startEl.value) || 1;
        var e = parseFloat(endEl.value) || 0;
        var n = parseFloat(newEl.value) || 0;
        var ret = calcRetentionRate(s, e, n);
        var lines = [
          "Customer Retention Rate Results",
          "Starting Customers: " + s,
          "Ending Customers: " + e,
          "New Customers: " + n,
          "Retained: " + (e - n),
          "Retention Rate: " + (ret !== null ? ret.toFixed(1) + "%" : "--"),
          "Churn Rate: " + (ret !== null ? (100 - ret).toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [startEl, endEl, newEl, arpuEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcRetentionRate: calcRetentionRate, calcChurnRate: calcChurnRate, calcCustomersRetained: calcCustomersRetained, calcCustomersLost: calcCustomersLost, calcImpliedLTV: calcImpliedLTV, retentionLabel: retentionLabel };
  }
})();
