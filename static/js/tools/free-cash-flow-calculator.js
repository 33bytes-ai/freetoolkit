(function () {
  "use strict";

  function calcFCF(operatingCashFlow, capex) {
    if (operatingCashFlow == null || capex == null) return null;
    return operatingCashFlow - capex;
  }

  function calcFCFMargin(fcf, revenue) {
    if (fcf == null || !revenue || revenue <= 0) return null;
    return (fcf / revenue) * 100;
  }

  function calcFCFYield(fcf, marketCap) {
    if (fcf == null || !marketCap || marketCap <= 0) return null;
    return (fcf / marketCap) * 100;
  }

  function calcFCFGrowth(currentFCF, priorFCF) {
    if (currentFCF == null || priorFCF == null || priorFCF === 0) return null;
    return ((currentFCF - priorFCF) / Math.abs(priorFCF)) * 100;
  }

  function fcfLabel(margin) {
    if (margin === null) return null;
    if (margin >= 25) return { text: "World-class FCF margin: " + margin.toFixed(1) + "%. Top-quartile SaaS companies (Shopify, Veeva) operate at 20–30%+ FCF margins.", type: "info" };
    if (margin >= 10) return { text: "Healthy FCF margin: " + margin.toFixed(1) + "%. Generating meaningful free cash for reinvestment, buybacks, or debt reduction.", type: "info" };
    if (margin >= 0) return { text: "Breakeven FCF: " + margin.toFixed(1) + "%. Cash-neutral. Focus on improving operating efficiency or reducing capex intensity.", type: "warning" };
    return { text: "Negative FCF: " + margin.toFixed(1) + "%. Burning cash. Track runway and ensure investments have clear path to positive FCF.", type: "warning" };
  }

  function init() {
    var ocfEl    = document.getElementById("fcf-ocf");
    var capexEl  = document.getElementById("fcf-capex");
    var revEl    = document.getElementById("fcf-revenue");
    var mcapEl   = document.getElementById("fcf-market-cap");
    var insEl    = document.getElementById("fcf-insight");
    var shareBtn = document.getElementById("fcf-share");
    var copyBtn  = document.getElementById("fcf-copy");

    function update() {
      var ocf   = parseFloat(ocfEl.value)   || 0;
      var capex = parseFloat(capexEl.value) || 0;
      var rev   = parseFloat(revEl.value)   || 0;
      var mcap  = parseFloat(mcapEl.value)  || 0;

      var fcf    = calcFCF(ocf, capex);
      var margin = (fcf !== null && rev)  ? calcFCFMargin(fcf, rev)   : null;
      var fyield = (fcf !== null && mcap) ? calcFCFYield(fcf, mcap)   : null;

      document.getElementById("fcf-result").textContent  = fcf    !== null ? "$" + (fcf / 1000).toFixed(1)    + "k" : "--";
      document.getElementById("fcf-margin").textContent  = margin !== null ? margin.toFixed(1) + "%"  : "--";
      document.getElementById("fcf-yield").textContent   = fyield !== null ? fyield.toFixed(2) + "%"  : "--";
      document.getElementById("fcf-monthly").textContent = fcf    !== null ? "$" + (fcf / 12 / 1000).toFixed(1) + "k/mo" : "--";

      window.FTK.hashSet({ o: ocfEl.value, c: capexEl.value, r: revEl.value, m: mcapEl.value });

      var ins = fcfLabel(margin);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.o) ocfEl.value   = h.o;
      if (h.c) capexEl.value = h.c;
      if (h.r) revEl.value   = h.r;
      if (h.m) mcapEl.value  = h.m;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ocf   = parseFloat(ocfEl.value)   || 0;
        var capex = parseFloat(capexEl.value) || 0;
        var fcf   = calcFCF(ocf, capex);
        var rev   = parseFloat(revEl.value)   || 0;
        var lines = [
          "Operating Cash Flow: $" + (ocf / 1000).toFixed(1) + "k",
          "Capital Expenditures: $" + (capex / 1000).toFixed(1) + "k",
          "Free Cash Flow: " + (fcf !== null ? "$" + (fcf / 1000).toFixed(1) + "k" : "--"),
          "FCF Margin: " + (rev && fcf !== null ? calcFCFMargin(fcf, rev).toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [ocfEl, capexEl, revEl, mcapEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcFCF, calcFCFMargin, calcFCFYield, calcFCFGrowth, fcfLabel };
  }
})();
