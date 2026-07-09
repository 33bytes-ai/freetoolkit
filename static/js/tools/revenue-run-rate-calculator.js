(function () {
  "use strict";

  function calcRunRate(periodRevenue, periodMonths) {
    if (!periodMonths || periodMonths <= 0 || periodRevenue == null) return null;
    return (periodRevenue / periodMonths) * 12;
  }

  function calcMonthlyFromRunRate(annualRunRate) {
    if (!annualRunRate || annualRunRate <= 0) return null;
    return annualRunRate / 12;
  }

  function calcRunRateGrowth(currentRunRate, priorRunRate) {
    if (!priorRunRate || priorRunRate <= 0 || currentRunRate == null) return null;
    return ((currentRunRate - priorRunRate) / priorRunRate) * 100;
  }

  function calcProjectedRevenue(currentMonthlyRevenue, monthlyGrowthRate, months) {
    if (!currentMonthlyRevenue || currentMonthlyRevenue <= 0 || !months || months <= 0) return null;
    var rate = (monthlyGrowthRate || 0) / 100;
    if (rate === 0) return currentMonthlyRevenue * months;
    return currentMonthlyRevenue * ((Math.pow(1 + rate, months) - 1) / rate);
  }

  function runRateLabel(arr) {
    if (arr === null) return null;
    if (arr >= 10000000) return { text: "Run rate $" + (arr / 1000000).toFixed(1) + "M ARR — Series B+ range. Focus on efficient growth and path to profitability.", type: "info" };
    if (arr >= 1000000) return { text: "Run rate $" + (arr / 1000000).toFixed(1) + "M ARR — Series A range. Prove repeatability and build for scale.", type: "info" };
    if (arr >= 100000) return { text: "Run rate $" + (arr / 1000).toFixed(0) + "k ARR — Seed range. Validate PMF and find 2–3 scalable acquisition channels.", type: "info" };
    return { text: "Run rate $" + (arr / 1000).toFixed(1) + "k ARR — Pre-seed range. Focus on customer discovery and first $100k ARR.", type: "warning" };
  }

  function init() {
    var revEl    = document.getElementById("rrr-revenue");
    var moEl     = document.getElementById("rrr-months");
    var growEl   = document.getElementById("rrr-growth");
    var fwdEl    = document.getElementById("rrr-forward-months");
    var insEl    = document.getElementById("rrr-insight");
    var shareBtn = document.getElementById("rrr-share");
    var copyBtn  = document.getElementById("rrr-copy");

    function update() {
      var rev   = parseFloat(revEl.value) || 0;
      var mo    = parseFloat(moEl.value) || 1;
      var grow  = parseFloat(growEl.value) || 0;
      var fwd   = parseFloat(fwdEl.value) || 12;

      var rr      = calcRunRate(rev, mo);
      var monthly = rr ? calcMonthlyFromRunRate(rr) : null;
      var proj    = monthly ? calcProjectedRevenue(monthly, grow, fwd) : null;
      var fwdRR   = proj ? (proj / fwd) * 12 : null;

      document.getElementById("rrr-result").textContent    = rr !== null ? "$" + (rr / 1000).toFixed(1) + "k" : "--";
      document.getElementById("rrr-monthly").textContent   = monthly !== null ? "$" + monthly.toFixed(0) : "--";
      document.getElementById("rrr-projected").textContent = proj !== null ? "$" + (proj / 1000).toFixed(1) + "k" : "--";
      document.getElementById("rrr-fwd-rr").textContent    = fwdRR !== null ? "$" + (fwdRR / 1000).toFixed(1) + "k ARR" : "--";

      window.FTK.hashSet({ r: revEl.value, m: moEl.value, g: growEl.value, f: fwdEl.value });

      var ins = runRateLabel(rr);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revEl.value  = h.r;
      if (h.m) moEl.value   = h.m;
      if (h.g) growEl.value = h.g;
      if (h.f) fwdEl.value  = h.f;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var rev = parseFloat(revEl.value) || 0;
        var mo  = parseFloat(moEl.value) || 1;
        var rr  = calcRunRate(rev, mo);
        var lines = [
          "Revenue: $" + rev.toLocaleString(),
          "Over " + mo + " months",
          "Annual run rate: " + (rr !== null ? "$" + (rr / 1000).toFixed(1) + "k" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revEl, moEl, growEl, fwdEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcRunRate, calcMonthlyFromRunRate, calcRunRateGrowth, calcProjectedRevenue, runRateLabel };
  }
})();
