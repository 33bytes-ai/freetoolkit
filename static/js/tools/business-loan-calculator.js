(function () {
  "use strict";

  function calcMonthlyPayment(principal, annualRatePct, termMonths) {
    if (!principal || principal <= 0 || !termMonths || termMonths <= 0) return null;
    if (annualRatePct == null || annualRatePct < 0) return null;
    if (annualRatePct === 0) return principal / termMonths;
    var r = annualRatePct / 100 / 12;
    return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  }

  function calcTotalPaid(monthlyPayment, termMonths) {
    if (monthlyPayment == null || monthlyPayment <= 0 || !termMonths || termMonths <= 0) return null;
    return monthlyPayment * termMonths;
  }

  function calcTotalInterest(monthlyPayment, termMonths, principal) {
    var total = calcTotalPaid(monthlyPayment, termMonths);
    if (total === null || principal == null) return null;
    return total - principal;
  }

  function calcRemainingBalance(principal, annualRatePct, termMonths, paymentsMade) {
    if (!principal || principal <= 0 || !termMonths || termMonths <= 0) return null;
    if (paymentsMade == null || paymentsMade < 0 || paymentsMade > termMonths) return null;
    if (annualRatePct === 0) return principal * (1 - paymentsMade / termMonths);
    var r = annualRatePct / 100 / 12;
    var m = calcMonthlyPayment(principal, annualRatePct, termMonths);
    return principal * Math.pow(1 + r, paymentsMade) - m * (Math.pow(1 + r, paymentsMade) - 1) / r;
  }

  function loanLabel(monthlyPayment, monthlyRevenue) {
    if (monthlyPayment === null) return null;
    if (!monthlyRevenue || monthlyRevenue <= 0) {
      return { text: "Monthly payment: $" + monthlyPayment.toFixed(0) + ". Enter monthly revenue to see affordability ratio.", type: "info" };
    }
    var pct = (monthlyPayment / monthlyRevenue) * 100;
    if (pct <= 5)  return { text: "Affordable: loan payment is " + pct.toFixed(1) + "% of monthly revenue. Well within typical debt service guidelines (≤10%).", type: "info" };
    if (pct <= 10) return { text: "Manageable: loan payment is " + pct.toFixed(1) + "% of monthly revenue. Within typical guidelines but leaves limited buffer.", type: "info" };
    if (pct <= 20) return { text: "Elevated: loan payment is " + pct.toFixed(1) + "% of monthly revenue. Consider a longer term, smaller loan, or waiting for higher revenue.", type: "warning" };
    return { text: "High debt burden: loan payment is " + pct.toFixed(1) + "% of monthly revenue. This is above safe debt service limits — review carefully.", type: "warning" };
  }

  function init() {
    var principalEl = document.getElementById("bl-principal");
    var rateEl      = document.getElementById("bl-rate");
    var termEl      = document.getElementById("bl-term");
    var revEl       = document.getElementById("bl-revenue");
    var insEl       = document.getElementById("bl-insight");
    var shareBtn    = document.getElementById("bl-share");
    var copyBtn     = document.getElementById("bl-copy");

    function update() {
      var principal = parseFloat(principalEl.value) || 0;
      var rate      = parseFloat(rateEl.value)      || 0;
      var term      = parseFloat(termEl.value)      || 60;
      var rev       = parseFloat(revEl.value)       || 0;

      var monthly   = calcMonthlyPayment(principal, rate, term);
      var total     = monthly ? calcTotalPaid(monthly, term) : null;
      var interest  = monthly ? calcTotalInterest(monthly, term, principal) : null;
      var midBal    = monthly ? calcRemainingBalance(principal, rate, term, Math.floor(term / 2)) : null;

      document.getElementById("bl-result").textContent   = monthly  !== null ? "$" + monthly.toFixed(2)                  : "--";
      document.getElementById("bl-total").textContent    = total    !== null ? "$" + (total / 1000).toFixed(1) + "k"      : "--";
      document.getElementById("bl-interest").textContent = interest !== null ? "$" + (interest / 1000).toFixed(1) + "k"   : "--";
      document.getElementById("bl-midbal").textContent   = midBal   !== null ? "$" + (midBal / 1000).toFixed(1) + "k"     : "--";

      window.FTK.hashSet({ p: principalEl.value, r: rateEl.value, t: termEl.value, v: revEl.value });

      var ins = loanLabel(monthly, rev);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) principalEl.value = h.p;
      if (h.r) rateEl.value      = h.r;
      if (h.t) termEl.value      = h.t;
      if (h.v) revEl.value       = h.v;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var principal = parseFloat(principalEl.value) || 0;
        var rate      = parseFloat(rateEl.value)      || 0;
        var term      = parseFloat(termEl.value)      || 60;
        var monthly   = calcMonthlyPayment(principal, rate, term);
        var total     = monthly ? calcTotalPaid(monthly, term) : null;
        var interest  = monthly ? calcTotalInterest(monthly, term, principal) : null;
        var lines = [
          "Loan amount: $" + (principal / 1000).toFixed(1) + "k",
          "Rate: " + rate + "% APR",
          "Term: " + term + " months",
          "Monthly payment: " + (monthly !== null ? "$" + monthly.toFixed(2) : "--"),
          "Total interest: " + (interest !== null ? "$" + (interest / 1000).toFixed(1) + "k" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [principalEl, rateEl, termEl, revEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcMonthlyPayment, calcTotalPaid, calcTotalInterest, calcRemainingBalance, loanLabel };
  }
})();
