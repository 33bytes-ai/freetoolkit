(function () {
  "use strict";

  function calcSalePrice(originalPrice, discountPct) {
    if (!originalPrice || originalPrice <= 0 || discountPct == null || discountPct < 0) return null;
    return originalPrice * (1 - discountPct / 100);
  }

  function calcDiscountAmount(originalPrice, discountPct) {
    if (!originalPrice || originalPrice <= 0 || discountPct == null || discountPct < 0) return null;
    return originalPrice * (discountPct / 100);
  }

  function calcDiscountPct(originalPrice, salePrice) {
    if (!originalPrice || originalPrice <= 0 || !salePrice || salePrice < 0) return null;
    if (salePrice >= originalPrice) return 0;
    return ((originalPrice - salePrice) / originalPrice) * 100;
  }

  function calcMarginAfterDiscount(originalPrice, discountPct, cogsAmount) {
    if (!originalPrice || discountPct == null || !cogsAmount) return null;
    var salePrice = calcSalePrice(originalPrice, discountPct);
    if (!salePrice || salePrice <= 0) return null;
    return ((salePrice - cogsAmount) / salePrice) * 100;
  }

  function discountLabel(discountPct, marginAfter) {
    if (discountPct === null) return null;
    if (marginAfter !== null && marginAfter < 0) return { text: "Margin is negative at this discount — you lose money on each sale. Raise price or reduce COGS.", type: "warning" };
    if (marginAfter !== null && marginAfter < 10) return { text: "Margin is very thin at this discount rate. Ensure volume justifies the margin reduction.", type: "warning" };
    if (discountPct > 50) return { text: "Discount above 50% can anchor customers to the lower price permanently. Use sparingly.", type: "warning" };
    if (discountPct > 25) return { text: "Significant discount. Consider limiting to new customers or trial users only.", type: "info" };
    return { text: "Moderate discount. Common for introductory offers and promotions.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return "$" + v.toFixed(2);
  }

  function init() {
    var origEl     = document.getElementById("dc-original");
    var discEl     = document.getElementById("dc-discount");
    var saleEl     = document.getElementById("dc-sale");
    var cogsEl     = document.getElementById("dc-cogs");
    var insightEl  = document.getElementById("dc-insight");
    var shareBtn   = document.getElementById("dc-share");
    var copyBtn    = document.getElementById("dc-copy");
    var mode       = "pct"; // "pct" or "sale"

    function update() {
      var orig     = parseFloat(origEl.value) || 0;
      var discPct  = parseFloat(discEl.value);
      var saleP    = parseFloat(saleEl.value);
      var cogs     = parseFloat(cogsEl.value) || 0;

      var computedDiscPct, computedSaleP, discAmount, margin;
      if (!isNaN(discPct) && orig > 0) {
        computedDiscPct = discPct;
        computedSaleP   = calcSalePrice(orig, discPct);
      } else if (!isNaN(saleP) && orig > 0) {
        computedSaleP   = saleP;
        computedDiscPct = calcDiscountPct(orig, saleP);
      } else {
        computedDiscPct = null;
        computedSaleP   = null;
      }
      discAmount = calcDiscountAmount(orig, computedDiscPct);
      margin = cogs > 0 && computedDiscPct !== null ? calcMarginAfterDiscount(orig, computedDiscPct, cogs) : null;

      document.getElementById("dc-sale-price").textContent  = fmtCurrency(computedSaleP);
      document.getElementById("dc-disc-amount").textContent = fmtCurrency(discAmount);
      document.getElementById("dc-disc-pct").textContent    = computedDiscPct !== null ? computedDiscPct.toFixed(1) + "%" : "—";
      document.getElementById("dc-margin").textContent      = margin !== null ? margin.toFixed(1) + "%" : "—";

      window.FTK.hashSet({ o: origEl.value, d: discEl.value, s: saleEl.value, c: cogsEl.value });

      var ins = discountLabel(computedDiscPct, margin);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.o) origEl.value = h.o;
      if (h.d) discEl.value = h.d;
      if (h.s) saleEl.value = h.s;
      if (h.c) cogsEl.value = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var orig    = parseFloat(origEl.value) || 0;
        var discPct = parseFloat(discEl.value);
        var saleP   = parseFloat(saleEl.value);
        var cogs    = parseFloat(cogsEl.value) || 0;
        var computedDiscPct = !isNaN(discPct) ? discPct : calcDiscountPct(orig, saleP);
        var computedSaleP   = !isNaN(discPct) && orig ? calcSalePrice(orig, discPct) : saleP;
        var discAmount = calcDiscountAmount(orig, computedDiscPct);
        var margin = cogs > 0 && computedDiscPct !== null ? calcMarginAfterDiscount(orig, computedDiscPct, cogs) : null;
        var lines = [
          "Original price: " + fmtCurrency(orig),
          "Discount: " + (computedDiscPct !== null ? computedDiscPct.toFixed(1) + "%" : "—"),
          "Discount amount: " + fmtCurrency(discAmount),
          "Sale price: " + fmtCurrency(computedSaleP),
          "Margin after discount: " + (margin !== null ? margin.toFixed(1) + "%" : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [origEl, discEl, saleEl, cogsEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcSalePrice, calcDiscountAmount, calcDiscountPct, calcMarginAfterDiscount };
  }
})();
