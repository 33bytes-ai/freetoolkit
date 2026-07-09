(function () {
  "use strict";

  function calcEarlyPaymentDiscount(invoiceAmount, discountPct) {
    return invoiceAmount * (discountPct / 100);
  }

  function calcNetPayment(invoiceAmount, discountPct) {
    return invoiceAmount * (1 - discountPct / 100);
  }

  function calcAnnualizedCostOfCredit(discountPct, discountDays, netDays) {
    var daysGained = netDays - discountDays;
    if (daysGained <= 0 || discountPct >= 100) return null;
    return (discountPct / (100 - discountPct)) * (365 / daysGained) * 100;
  }

  function calcDynamicDiscountRate(annualRatePct, daysEarly) {
    if (daysEarly <= 0) return 0;
    return (annualRatePct / 100) * (daysEarly / 365) * 100;
  }

  function discountCostLabel(annualizedRate) {
    if (annualizedRate === null || annualizedRate === undefined) return "";
    if (annualizedRate <= 5)    return "Cheap financing";
    if (annualizedRate <= 15)   return "Moderate cost";
    if (annualizedRate <= 25)   return "Expensive";
    return "Very expensive — equivalent to high-interest debt";
  }

  function fmt(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var d = digits !== undefined ? digits : 2;
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(d) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(d) + "k";
    return "$" + n.toFixed(d);
  }

  function init() {
    var invEl    = document.getElementById("id-invoice");
    var discEl   = document.getElementById("id-discount");
    var pdayEl   = document.getElementById("id-pay-days");
    var ndayEl   = document.getElementById("id-net-days");
    var insEl    = document.getElementById("id-insight");
    var copyBtn  = document.getElementById("id-copy");
    var shareBtn = document.getElementById("id-share");

    function update() {
      var inv   = parseFloat(invEl.value)   || 0;
      var disc  = parseFloat(discEl.value)  || 0;
      var pdays = parseFloat(pdayEl.value)  || 10;
      var ndays = parseFloat(ndayEl.value)  || 30;

      var savings  = calcEarlyPaymentDiscount(inv, disc);
      var netPay   = calcNetPayment(inv, disc);
      var annual   = calcAnnualizedCostOfCredit(disc, pdays, ndays);

      document.getElementById("id-savings").textContent   = fmt(savings);
      document.getElementById("id-net-pay").textContent   = fmt(netPay);
      document.getElementById("id-annual-rate").textContent = annual !== null ? annual.toFixed(1) + "%" : "--";

      window.FTK.hashSet({ i: inv, d: disc, p: pdays, n: ndays });

      if (annual !== null) {
        var label = discountCostLabel(annual);
        var type  = annual <= 10 ? "success" : annual <= 20 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — Early payment saves " + fmt(savings) + " on " + fmt(inv) + " invoice. " +
          "Annualized cost of passing on discount: " + annual.toFixed(1) + "%. " +
          "Compare against your cost of capital to decide whether to take the discount.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.i) invEl.value   = h.i;
      if (h.d) discEl.value  = h.d;
      if (h.p) pdayEl.value  = h.p;
      if (h.n) ndayEl.value  = h.n;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var inv  = parseFloat(invEl.value)  || 0;
        var disc = parseFloat(discEl.value) || 0;
        var pd   = parseFloat(pdayEl.value) || 10;
        var nd   = parseFloat(ndayEl.value) || 30;
        var lines = [
          "Invoice Early Payment Discount Calculator",
          "Invoice Amount: " + fmt(inv),
          "Discount: " + disc + "%",
          "Savings: " + fmt(calcEarlyPaymentDiscount(inv, disc)),
          "Net Payment: " + fmt(calcNetPayment(inv, disc)),
          "Annualized Cost: " + (calcAnnualizedCostOfCredit(disc, pd, nd) !== null ? calcAnnualizedCostOfCredit(disc, pd, nd).toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [invEl, discEl, pdayEl, ndayEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcEarlyPaymentDiscount: calcEarlyPaymentDiscount, calcNetPayment: calcNetPayment, calcAnnualizedCostOfCredit: calcAnnualizedCostOfCredit, calcDynamicDiscountRate: calcDynamicDiscountRate, discountCostLabel: discountCostLabel };
  }
})();
