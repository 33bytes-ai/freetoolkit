(function () {
  "use strict";

  function calcDSCR(noi, annualDebtService) {
    if (annualDebtService <= 0) return null;
    return noi / annualDebtService;
  }

  function calcMaxDebtService(noi, minDscr) {
    if (minDscr <= 0) return null;
    return noi / minDscr;
  }

  function calcAnnualDebtService(principal, annualRatePct, termMonths) {
    if (principal <= 0 || annualRatePct <= 0 || termMonths <= 0) return null;
    var r = annualRatePct / 100 / 12;
    var n = termMonths;
    var monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return monthly * 12;
  }

  function calcImpliedLoanAmount(maxAnnualDebt, annualRatePct, termMonths) {
    if (maxAnnualDebt <= 0 || annualRatePct <= 0 || termMonths <= 0) return null;
    var r = annualRatePct / 100 / 12;
    var n = termMonths;
    var maxMonthly = maxAnnualDebt / 12;
    return maxMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  }

  function dscrLabel(dscr) {
    if (dscr === null || dscr === undefined) return "";
    if (dscr >= 1.5) return "Strong";
    if (dscr >= 1.25) return "Acceptable";
    if (dscr >= 1.0) return "Marginal";
    return "Below Coverage";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var p = prefix || "";
    if (n >= 1000000) return p + (n / 1000000).toFixed(2) + "M";
    if (n >= 1000) return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(2);
  }

  function init() {
    var noiEl      = document.getElementById("dscr-noi");
    var debtEl     = document.getElementById("dscr-debt");
    var minEl      = document.getElementById("dscr-min");
    var rateEl     = document.getElementById("dscr-rate");
    var termEl     = document.getElementById("dscr-term");
    var insEl      = document.getElementById("dscr-insight");
    var copyBtn    = document.getElementById("dscr-copy");
    var shareBtn   = document.getElementById("dscr-share");

    function update() {
      var noi     = parseFloat(noiEl.value)   || 0;
      var debt    = parseFloat(debtEl.value)  || 1;
      var minDscr = parseFloat(minEl.value)   || 1.25;
      var rate    = parseFloat(rateEl.value)  || 7;
      var term    = parseFloat(termEl.value)  || 120;

      var ratio    = calcDSCR(noi, debt);
      var maxSvc   = calcMaxDebtService(noi, minDscr);
      var maxLoan  = maxSvc ? calcImpliedLoanAmount(maxSvc, rate, term) : null;
      var label    = ratio !== null ? dscrLabel(ratio) : "--";

      document.getElementById("dscr-result").textContent      = ratio !== null ? ratio.toFixed(2) + "×" : "--";
      document.getElementById("dscr-max-service").textContent = maxSvc  ? fmt(maxSvc, "$")  : "--";
      document.getElementById("dscr-max-loan").textContent    = maxLoan ? fmt(maxLoan, "$") : "--";
      document.getElementById("dscr-label").textContent       = label;

      window.FTK.hashSet({ n: noi, d: debt, m: minDscr, r: rate, t: term });

      if (ratio !== null) {
        var type = ratio >= 1.25 ? "success" : ratio >= 1.0 ? "warning" : "danger";
        window.FTK.showInsight(insEl,
          label + " — DSCR of " + ratio.toFixed(2) + "×. " +
          (ratio >= 1.25
            ? "Your NOI covers debt service with a " + ((ratio - 1) * 100).toFixed(0) + "% cushion. Lenders typically approve at this level."
            : ratio >= 1.0
              ? "Cash flow barely covers debt obligations. Limited lender options at this coverage level."
              : "Cash flow is insufficient to cover debt service. Reduce borrowing or increase NOI before applying."), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.n) noiEl.value   = h.n;
      if (h.d) debtEl.value  = h.d;
      if (h.m) minEl.value   = h.m;
      if (h.r) rateEl.value  = h.r;
      if (h.t) termEl.value  = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var noi  = parseFloat(noiEl.value) || 0;
        var debt = parseFloat(debtEl.value) || 1;
        var ratio = calcDSCR(noi, debt);
        var maxSvc = calcMaxDebtService(noi, parseFloat(minEl.value) || 1.25);
        var maxLoan = maxSvc ? calcImpliedLoanAmount(maxSvc, parseFloat(rateEl.value) || 7, parseFloat(termEl.value) || 120) : null;
        var lines = [
          "DSCR Calculator Results",
          "NOI: " + fmt(noi, "$"),
          "Annual Debt Service: " + fmt(debt, "$"),
          "DSCR: " + (ratio !== null ? ratio.toFixed(2) + "×" : "--"),
          "Coverage Status: " + (ratio !== null ? dscrLabel(ratio) : "--"),
          "Max Supportable Debt Service: " + (maxSvc ? fmt(maxSvc, "$") : "--"),
          "Implied Max Loan: " + (maxLoan ? fmt(maxLoan, "$") : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [noiEl, debtEl, minEl, rateEl, termEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcDSCR: calcDSCR, calcMaxDebtService: calcMaxDebtService, calcAnnualDebtService: calcAnnualDebtService, calcImpliedLoanAmount: calcImpliedLoanAmount, dscrLabel: dscrLabel };
  }
})();
