(function () {
  "use strict";

  function calcEBITDA(revenue, cogs, opex, sga, rd) {
    if (!revenue || revenue < 0) return null;
    var operatingExpenses = (cogs || 0) + (opex || 0) + (sga || 0) + (rd || 0);
    return revenue - operatingExpenses;
  }

  function calcEBITDAMargin(ebitda, revenue) {
    if (!revenue || revenue <= 0 || ebitda === null) return null;
    return (ebitda / revenue) * 100;
  }

  function calcEBIT(ebitda, depreciation, amortization) {
    if (ebitda === null) return null;
    return ebitda - (depreciation || 0) - (amortization || 0);
  }

  function calcImpliedValuation(ebitda, multiple) {
    if (ebitda === null || ebitda <= 0 || !multiple || multiple <= 0) return null;
    return ebitda * multiple;
  }

  function ebitdaLabel(margin) {
    if (margin === null) return null;
    if (margin < 0) return { text: "Negative EBITDA. Operating expenses exceed revenue. Review cost structure before scaling.", type: "warning" };
    if (margin < 10) return { text: "EBITDA margin under 10%. Low for most business models. Identify largest cost buckets to reduce.", type: "warning" };
    if (margin < 20) return { text: "EBITDA margin 10-20%. Developing. Target 20%+ to attract growth investment.", type: "info" };
    if (margin < 35) return { text: "EBITDA margin 20-35%. Solid. This range supports sustainable growth and debt service.", type: "info" };
    return { text: "EBITDA margin above 35%. Strong operating efficiency. Top quartile for most industries.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "--";
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var revEl    = document.getElementById("ebitda-revenue");
    var cogsEl   = document.getElementById("ebitda-cogs");
    var opexEl   = document.getElementById("ebitda-opex");
    var sgaEl    = document.getElementById("ebitda-sga");
    var rdEl     = document.getElementById("ebitda-rd");
    var daEl     = document.getElementById("ebitda-da");
    var multEl   = document.getElementById("ebitda-multiple");
    var insightEl = document.getElementById("ebitda-insight");
    var shareBtn = document.getElementById("ebitda-share");
    var copyBtn  = document.getElementById("ebitda-copy");

    function update() {
      var rev  = parseFloat(revEl.value) || 0;
      var cogs = parseFloat(cogsEl.value) || 0;
      var opex = parseFloat(opexEl.value) || 0;
      var sga  = parseFloat(sgaEl.value) || 0;
      var rd   = parseFloat(rdEl.value) || 0;
      var da   = parseFloat(daEl.value) || 0;
      var mult = parseFloat(multEl.value) || 0;

      var ebitda  = calcEBITDA(rev, cogs, opex, sga, rd);
      var margin  = calcEBITDAMargin(ebitda, rev);
      var ebit    = (ebitda !== null && da > 0) ? calcEBIT(ebitda, da, 0) : null;
      var valuation = (ebitda !== null && mult > 0) ? calcImpliedValuation(ebitda, mult) : null;

      document.getElementById("ebitda-result").textContent    = fmtCurrency(ebitda);
      document.getElementById("ebitda-margin").textContent    = margin !== null ? margin.toFixed(1) + "%" : "--";
      document.getElementById("ebitda-ebit").textContent      = fmtCurrency(ebit);
      document.getElementById("ebitda-valuation").textContent = fmtCurrency(valuation);

      window.FTK.hashSet({ r: revEl.value, c: cogsEl.value, o: opexEl.value, s: sgaEl.value, d: rdEl.value, da: daEl.value, m: multEl.value });

      var ins = ebitdaLabel(margin);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r)  revEl.value  = h.r;
      if (h.c)  cogsEl.value = h.c;
      if (h.o)  opexEl.value = h.o;
      if (h.s)  sgaEl.value  = h.s;
      if (h.d)  rdEl.value   = h.d;
      if (h.da) daEl.value   = h.da;
      if (h.m)  multEl.value = h.m;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var rev  = parseFloat(revEl.value) || 0;
        var cogs = parseFloat(cogsEl.value) || 0;
        var opex = parseFloat(opexEl.value) || 0;
        var sga  = parseFloat(sgaEl.value) || 0;
        var rd   = parseFloat(rdEl.value) || 0;
        var ebitda = calcEBITDA(rev, cogs, opex, sga, rd);
        var margin = calcEBITDAMargin(ebitda, rev);
        var lines = ["Revenue: " + fmtCurrency(rev), "COGS: " + fmtCurrency(cogs), "OpEx: " + fmtCurrency(opex), "SG&A: " + fmtCurrency(sga), "R&D: " + fmtCurrency(rd), "EBITDA: " + fmtCurrency(ebitda), "EBITDA margin: " + (margin !== null ? margin.toFixed(1) + "%" : "--")];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revEl, cogsEl, opexEl, sgaEl, rdEl, daEl, multEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcEBITDA, calcEBITDAMargin, calcEBIT, calcImpliedValuation };
  }
})();
