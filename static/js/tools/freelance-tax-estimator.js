(function () {
  "use strict";

  var SE_TAX_RATE = 0.1530;   // 15.3% self-employment tax
  var SE_DEDUCTION = 0.5;     // deduct half of SE tax from income

  function calcSETax(netProfit) {
    if (!netProfit || netProfit <= 0) return null;
    return netProfit * SE_TAX_RATE;
  }

  function calcFederalIncomeTax(taxableIncome, filingStatus) {
    if (!taxableIncome || taxableIncome <= 0) return 0;
    var brackets;
    if (filingStatus === "mfj") {
      brackets = [
        [23200, 0.10], [94300, 0.12], [201050, 0.22],
        [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]
      ];
    } else {
      brackets = [
        [11600, 0.10], [47150, 0.12], [100525, 0.22],
        [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]
      ];
    }
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < brackets.length; i++) {
      var limit = brackets[i][0];
      var rate  = brackets[i][1];
      if (taxableIncome <= prev) break;
      tax += Math.min(taxableIncome - prev, limit - prev) * rate;
      prev = limit;
    }
    return tax;
  }

  function calcQuarterlyPayment(annualNetProfit, otherIncome, filingStatus) {
    if (!annualNetProfit || annualNetProfit <= 0) return null;
    var seTax       = calcSETax(annualNetProfit);
    var seDeduction = seTax * SE_DEDUCTION;
    var taxableIncome = annualNetProfit - seDeduction + (otherIncome || 0);
    var fedTax      = calcFederalIncomeTax(Math.max(0, taxableIncome), filingStatus || "single");
    var totalAnnual = (seTax || 0) + fedTax;
    return Math.max(0, totalAnnual / 4);
  }

  function calcEffectiveRate(annualNetProfit, totalTax) {
    if (!annualNetProfit || annualNetProfit <= 0) return null;
    return (totalTax / annualNetProfit) * 100;
  }

  function taxLabel(effectiveRate) {
    if (effectiveRate === null) return null;
    if (effectiveRate < 15) return { text: "Low effective rate (" + effectiveRate.toFixed(1) + "%). Typical for early-stage freelancers. Consider a SEP-IRA or Solo 401(k) to reduce taxable income further.", type: "info" };
    if (effectiveRate < 25) return { text: "Moderate effective rate (" + effectiveRate.toFixed(1) + "%). At this level, retirement contributions ($7k Roth IRA or $23k Solo 401(k)) can meaningfully lower your tax bill.", type: "info" };
    if (effectiveRate < 35) return { text: "High effective rate (" + effectiveRate.toFixed(1) + "%). Explore all deductions: home office, health insurance premiums, business expenses, and retirement accounts.", type: "info" };
    return { text: "Very high effective rate (" + effectiveRate.toFixed(1) + "%). Consider an S-Corp election — at this income level, reasonable salary + distribution split can reduce SE tax exposure significantly.", type: "warning" };
  }

  function init() {
    var profitEl   = document.getElementById("fte-profit");
    var otherEl    = document.getElementById("fte-other");
    var statusEl   = document.getElementById("fte-status");
    var insEl      = document.getElementById("fte-insight");
    var shareBtn   = document.getElementById("fte-share-btn");
    var copyBtn    = document.getElementById("fte-copy");

    function update() {
      var profit = parseFloat(profitEl.value)  || 0;
      var other  = parseFloat(otherEl.value)   || 0;
      var status = statusEl ? statusEl.value : "single";

      var seTax   = calcSETax(profit);
      var seDeduction = seTax ? seTax * SE_DEDUCTION : 0;
      var taxable = profit - seDeduction + other;
      var fedTax  = calcFederalIncomeTax(Math.max(0, taxable), status);
      var total   = (seTax || 0) + fedTax;
      var quarterly = profit > 0 ? total / 4 : null;
      var effRate = calcEffectiveRate(profit, total);

      function fmt(v) { return "$" + Math.round(v).toLocaleString(); }

      document.getElementById("fte-se-tax").textContent    = seTax  ? fmt(seTax)    : "--";
      document.getElementById("fte-fed-tax").textContent   = profit > 0 ? fmt(fedTax) : "--";
      document.getElementById("fte-total").textContent     = profit > 0 ? fmt(total)   : "--";
      document.getElementById("fte-quarterly").textContent = quarterly ? fmt(quarterly) : "--";

      window.FTK.hashSet({ p: profitEl.value, o: otherEl.value, s: status });

      var ins = taxLabel(effRate);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) profitEl.value = h.p;
      if (h.o) otherEl.value  = h.o;
      if (h.s && statusEl) statusEl.value = h.s;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var profit = parseFloat(profitEl.value) || 0;
        var other  = parseFloat(otherEl.value)  || 0;
        var status = statusEl ? statusEl.value : "single";
        var seTax     = calcSETax(profit);
        var seDeduction = seTax ? seTax * SE_DEDUCTION : 0;
        var taxable   = profit - seDeduction + other;
        var fedTax    = calcFederalIncomeTax(Math.max(0, taxable), status);
        var total     = (seTax || 0) + fedTax;
        function fmt(v) { return "$" + Math.round(v).toLocaleString(); }
        var lines = [
          "SE Tax: " + (seTax ? fmt(seTax) : "--"),
          "Federal Income Tax: " + (profit > 0 ? fmt(fedTax) : "--"),
          "Total Estimated Tax: " + (profit > 0 ? fmt(total) : "--"),
          "Quarterly Payment: " + (profit > 0 ? fmt(total / 4) : "--"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [profitEl, otherEl, statusEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcSETax, calcFederalIncomeTax, calcQuarterlyPayment, calcEffectiveRate, taxLabel, SE_TAX_RATE };
  }
})();
