(function () {
  "use strict";

  function calcBurnMultiple(netBurn, netNewARR) {
    if (!netNewARR || netNewARR <= 0 || netBurn == null) return null;
    return netBurn / netNewARR;
  }

  function calcNetBurn(cashSpent, revenueCollected) {
    return (cashSpent || 0) - (revenueCollected || 0);
  }

  function calcCAC(netBurn, newCustomers) {
    if (!newCustomers || newCustomers <= 0 || netBurn == null || netBurn < 0) return null;
    return netBurn / newCustomers;
  }

  function calcRunwayMonths(cashOnHand, monthlyNetBurn) {
    if (!cashOnHand || cashOnHand <= 0 || !monthlyNetBurn || monthlyNetBurn <= 0) return null;
    return cashOnHand / monthlyNetBurn;
  }

  function burnMultipleLabel(bm) {
    if (bm === null) return null;
    if (bm < 0) return { text: "Negative burn multiple: you're generating ARR faster than spending — this is exceptional.", type: "info" };
    if (bm < 1) return { text: "Burn multiple < 1x. World-class capital efficiency. Every dollar spent generates more than a dollar of ARR.", type: "info" };
    if (bm < 1.5) return { text: "Burn multiple 1-1.5x. Excellent. Top-quartile early-stage SaaS efficiency.", type: "info" };
    if (bm < 2) return { text: "Burn multiple 1.5-2x. Good. Acceptable for rapid growth phases with strong NRR.", type: "info" };
    if (bm < 3) return { text: "Burn multiple 2-3x. Borderline. Investors will scrutinize — improve before Series B.", type: "warning" };
    return { text: "Burn multiple 3x+. Concerning. Each $3+ spent generates only $1 of ARR. Focus on CAC efficiency.", type: "warning" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "--";
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var burnEl    = document.getElementById("bm-net-burn");
    var arrEl     = document.getElementById("bm-new-arr");
    var cashEl    = document.getElementById("bm-cash");
    var custEl    = document.getElementById("bm-new-customers");
    var insightEl = document.getElementById("bm-insight");
    var shareBtn  = document.getElementById("bm-share");
    var copyBtn   = document.getElementById("bm-copy");

    function update() {
      var burn  = parseFloat(burnEl.value) || 0;
      var arr   = parseFloat(arrEl.value) || 0;
      var cash  = parseFloat(cashEl.value) || 0;
      var cust  = parseFloat(custEl.value) || 0;

      var bm      = calcBurnMultiple(burn, arr);
      var runway  = (cash > 0 && burn > 0) ? calcRunwayMonths(cash, burn / 12) : null;
      var cac     = (cust > 0 && burn > 0) ? calcCAC(burn / 12, cust / 12) : null;

      document.getElementById("bm-result").textContent   = bm !== null ? bm.toFixed(2) + "x" : "--";
      document.getElementById("bm-runway").textContent   = runway !== null ? runway.toFixed(0) + " months" : "--";
      document.getElementById("bm-cac").textContent      = fmtCurrency(cac);
      document.getElementById("bm-arr-ratio").textContent = (burn > 0 && arr > 0) ? (arr / burn * 100).toFixed(0) + "%" : "--";

      window.FTK.hashSet({ b: burnEl.value, a: arrEl.value, c: cashEl.value, n: custEl.value });

      var ins = burnMultipleLabel(bm);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.b) burnEl.value = h.b;
      if (h.a) arrEl.value  = h.a;
      if (h.c) cashEl.value = h.c;
      if (h.n) custEl.value = h.n;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var burn = parseFloat(burnEl.value) || 0;
        var arr  = parseFloat(arrEl.value) || 0;
        var bm   = calcBurnMultiple(burn, arr);
        var lines = ["Annual net burn: " + fmtCurrency(burn), "Net new ARR: " + fmtCurrency(arr), "Burn multiple: " + (bm !== null ? bm.toFixed(2) + "x" : "--")];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [burnEl, arrEl, cashEl, custEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcBurnMultiple, calcNetBurn, calcCAC, calcRunwayMonths, burnLabel: burnMultipleLabel };
  }
})();
