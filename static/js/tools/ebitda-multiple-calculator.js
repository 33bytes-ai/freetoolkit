(function () {
  "use strict";

  function calcEVFromEBITDA(ebitda, multiple) {
    if (ebitda <= 0 || multiple <= 0) return null;
    return ebitda * multiple;
  }

  function calcEVFromRevenue(revenue, multiple) {
    if (revenue <= 0 || multiple <= 0) return null;
    return revenue * multiple;
  }

  function calcEquityValue(ev, totalDebt, cash) {
    return ev - totalDebt + cash;
  }

  function calcImpliedMultiple(ev, ebitda) {
    if (ebitda <= 0) return null;
    return ev / ebitda;
  }

  function calcEBITDAMargin(ebitda, revenue) {
    if (revenue <= 0) return null;
    return (ebitda / revenue) * 100;
  }

  function multipleLabel(multiple) {
    if (multiple === null || multiple === undefined) return "";
    if (multiple >= 20) return "High-growth premium";
    if (multiple >= 10) return "Above market";
    if (multiple >= 6)  return "Market range";
    if (multiple >= 3)  return "Below market";
    return "Distressed / cyclical";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var p = prefix || "";
    if (Math.abs(n) >= 1000000000) return p + (n / 1000000000).toFixed(2) + "B";
    if (Math.abs(n) >= 1000000)    return p + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)       return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(0);
  }

  function init() {
    var ebitdaEl    = document.getElementById("em-ebitda");
    var multipleEl  = document.getElementById("em-multiple");
    var revenueEl   = document.getElementById("em-revenue");
    var revMultEl   = document.getElementById("em-rev-multiple");
    var debtEl      = document.getElementById("em-debt");
    var cashEl      = document.getElementById("em-cash");
    var insEl       = document.getElementById("em-insight");
    var copyBtn     = document.getElementById("em-copy");
    var shareBtn    = document.getElementById("em-share");

    function update() {
      var ebitda    = parseFloat(ebitdaEl.value)   || 0;
      var multiple  = parseFloat(multipleEl.value) || 0;
      var revenue   = parseFloat(revenueEl.value)  || 0;
      var revMult   = parseFloat(revMultEl.value)  || 0;
      var debt      = parseFloat(debtEl.value)     || 0;
      var cash      = parseFloat(cashEl.value)     || 0;

      var evEbitda  = calcEVFromEBITDA(ebitda, multiple);
      var evRevenue = calcEVFromRevenue(revenue, revMult);
      var equity    = evEbitda !== null ? calcEquityValue(evEbitda, debt, cash) : null;
      var margin    = calcEBITDAMargin(ebitda, revenue);

      document.getElementById("em-ev-ebitda").textContent  = evEbitda  !== null ? fmt(evEbitda, "$")  : "--";
      document.getElementById("em-ev-revenue").textContent = evRevenue !== null ? fmt(evRevenue, "$") : "--";
      document.getElementById("em-equity").textContent     = equity    !== null ? fmt(equity, "$")    : "--";
      document.getElementById("em-margin").textContent     = margin    !== null ? margin.toFixed(1) + "%" : "--";

      window.FTK.hashSet({ e: ebitda, m: multiple, r: revenue, rm: revMult, d: debt, c: cash });

      if (evEbitda !== null) {
        var label = multipleLabel(multiple);
        var type = multiple >= 6 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " at " + multiple + "×. " +
          "EV (EBITDA basis): " + fmt(evEbitda, "$") + ". " +
          (equity !== null ? "Equity value after " + fmt(debt, "$") + " debt and " + fmt(cash, "$") + " cash: " + fmt(equity, "$") + ". " : "") +
          (margin !== null ? "EBITDA margin: " + margin.toFixed(1) + "%." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.e)  ebitdaEl.value   = h.e;
      if (h.m)  multipleEl.value = h.m;
      if (h.r)  revenueEl.value  = h.r;
      if (h.rm) revMultEl.value  = h.rm;
      if (h.d)  debtEl.value     = h.d;
      if (h.c)  cashEl.value     = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ebitda   = parseFloat(ebitdaEl.value)   || 0;
        var multiple = parseFloat(multipleEl.value) || 0;
        var revenue  = parseFloat(revenueEl.value)  || 0;
        var revMult  = parseFloat(revMultEl.value)  || 0;
        var debt     = parseFloat(debtEl.value)     || 0;
        var cash     = parseFloat(cashEl.value)     || 0;
        var evE  = calcEVFromEBITDA(ebitda, multiple);
        var evR  = calcEVFromRevenue(revenue, revMult);
        var eq   = evE !== null ? calcEquityValue(evE, debt, cash) : null;
        var mg   = calcEBITDAMargin(ebitda, revenue);
        var lines = [
          "EBITDA Multiple Calculator Results",
          "EBITDA: " + fmt(ebitda, "$"),
          "EV/EBITDA Multiple: " + multiple + "×",
          "EV (EBITDA basis): " + (evE ? fmt(evE, "$") : "--"),
          "EV (Revenue basis): " + (evR ? fmt(evR, "$") : "--"),
          "Equity Value: " + (eq !== null ? fmt(eq, "$") : "--"),
          "EBITDA Margin: " + (mg !== null ? mg.toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [ebitdaEl, multipleEl, revenueEl, revMultEl, debtEl, cashEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcEVFromEBITDA: calcEVFromEBITDA, calcEVFromRevenue: calcEVFromRevenue, calcEquityValue: calcEquityValue, calcImpliedMultiple: calcImpliedMultiple, calcEBITDAMargin: calcEBITDAMargin, multipleLabel: multipleLabel };
  }
})();
