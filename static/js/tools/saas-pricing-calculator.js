(function () {
  "use strict";

  function calcMinPrice(costPerCustomer, targetMarginPct) {
    if (costPerCustomer <= 0 || targetMarginPct >= 100) return null;
    return costPerCustomer / (1 - targetMarginPct / 100);
  }

  function calcTierRevenue(price, customers, conversionPct) {
    return price * customers * (conversionPct / 100);
  }

  function calcAnnualDiscount(monthlyPrice, discountPct) {
    return monthlyPrice * 12 * (1 - discountPct / 100);
  }

  function init() {
    var cogsEl       = document.getElementById("spc-cogs");
    var marginEl     = document.getElementById("spc-margin");
    var customersEl  = document.getElementById("spc-customers");
    var competitorEl = document.getElementById("spc-competitor");
    var insightEl    = document.getElementById("spc-insight");
    var shareBtn     = document.getElementById("spc-share");
    var copyBtn      = document.getElementById("spc-copy");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
      if (v >= 1000)    return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + v.toFixed(0);
    }

    function update() {
      var cogs       = parseFloat(cogsEl.value) || 0;
      var margin     = parseFloat(marginEl.value) || 70;
      var customers  = parseInt(customersEl.value, 10) || 100;
      var competitor = parseFloat(competitorEl.value) || 49;
      if (cogs <= 0) return;

      var minPrice = calcMinPrice(cogs, margin);
      if (!minPrice) return;

      var starterPrice  = Math.max(minPrice, competitor * 0.6);
      var proPrice      = Math.max(minPrice, competitor);
      var businessPrice = Math.max(minPrice, competitor * 2.2);

      starterPrice  = Math.ceil(starterPrice / 5) * 5 - 1;
      proPrice      = Math.ceil(proPrice / 10) * 10 - 1;
      businessPrice = Math.ceil(businessPrice / 25) * 25 - 1;

      var starterMRR  = calcTierRevenue(starterPrice, customers, 40);
      var proMRR      = calcTierRevenue(proPrice, customers, 40);
      var businessMRR = calcTierRevenue(businessPrice, customers, 20);

      var starterAnnual  = calcAnnualDiscount(starterPrice, 17);
      var proAnnual      = calcAnnualDiscount(proPrice, 17);

      var actualMargin = ((starterPrice - cogs) / starterPrice) * 100;

      document.getElementById("spc-min-price").textContent       = "$" + minPrice.toFixed(2);
      document.getElementById("spc-starter-price").textContent   = "$" + starterPrice;
      document.getElementById("spc-pro-price").textContent       = "$" + proPrice;
      document.getElementById("spc-business-price").textContent  = "$" + businessPrice;
      document.getElementById("spc-starter-mrr").textContent     = fmt(starterMRR);
      document.getElementById("spc-pro-mrr").textContent         = fmt(proMRR);
      document.getElementById("spc-gross-margin").textContent    = actualMargin.toFixed(1) + "%";
      document.getElementById("spc-annual-starter").textContent  = "$" + starterAnnual.toFixed(0) + "/yr";
      document.getElementById("spc-annual-pro").textContent      = "$" + proAnnual.toFixed(0) + "/yr";

      window.FTK.hashSet({ g: cogsEl.value, m: marginEl.value, c: customersEl.value, cp: competitorEl.value });

      var msg;
      if (actualMargin < 60) {
        msg = "Gross margin of " + actualMargin.toFixed(1) + "% is below the 70% SaaS benchmark. Reduce COGS (optimize infrastructure, automate support) or increase prices.";
        window.FTK.showInsight(insightEl, msg, "warning");
      } else {
        msg = "Minimum price at " + margin + "% gross margin: $" + minPrice.toFixed(2) + "/mo. " +
          "Pro tier at $" + proPrice + " generates " + fmt(proMRR) + " MRR at 40% conversion.";
        window.FTK.showInsight(insightEl, msg, "info");
      }
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.g)  cogsEl.value       = s.g;
      if (s.m)  marginEl.value     = s.m;
      if (s.c)  customersEl.value  = s.c;
      if (s.cp) competitorEl.value = s.cp;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var lines = [
          "Minimum price: "    + document.getElementById("spc-min-price").textContent,
          "Starter: "          + document.getElementById("spc-starter-price").textContent + "/mo",
          "Pro: "              + document.getElementById("spc-pro-price").textContent + "/mo",
          "Business: "         + document.getElementById("spc-business-price").textContent + "/mo",
          "Gross margin: "     + document.getElementById("spc-gross-margin").textContent,
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [cogsEl, marginEl, customersEl, competitorEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcMinPrice: calcMinPrice, calcTierRevenue: calcTierRevenue, calcAnnualDiscount: calcAnnualDiscount };
  }
})();
