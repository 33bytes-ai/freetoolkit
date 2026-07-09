(function () {
  "use strict";

  function calcCAC(totalSalesMarketingCost, newCustomers) {
    if (!totalSalesMarketingCost || totalSalesMarketingCost <= 0 || !newCustomers || newCustomers <= 0) return null;
    return totalSalesMarketingCost / newCustomers;
  }

  function calcPaybackMonths(cac, arpu, grossMarginPct) {
    if (!cac || cac <= 0 || !arpu || arpu <= 0 || !grossMarginPct || grossMarginPct <= 0) return null;
    var monthlyGrossProfit = arpu * (grossMarginPct / 100);
    if (monthlyGrossProfit <= 0) return null;
    return cac / monthlyGrossProfit;
  }

  function calcLTVCACRatio(ltv, cac) {
    if (!ltv || ltv <= 0 || !cac || cac <= 0) return null;
    return ltv / cac;
  }

  function calcBlendedCAC(adSpend, salesPayroll, toolsCost, newCustomers) {
    if (!newCustomers || newCustomers <= 0) return null;
    var total = (adSpend || 0) + (salesPayroll || 0) + (toolsCost || 0);
    if (total <= 0) return null;
    return total / newCustomers;
  }

  function cacLabel(paybackMonths) {
    if (paybackMonths === null) return null;
    if (paybackMonths < 6) return { text: "Payback under 6 months. Excellent CAC efficiency — scale acquisition spend.", type: "info" };
    if (paybackMonths < 12) return { text: "Payback 6–12 months. Healthy for most SaaS models.", type: "info" };
    if (paybackMonths < 24) return { text: "Payback 12–24 months. Acceptable if churn is low. Improve conversion or reduce CPA.", type: "warning" };
    return { text: "Payback over 24 months. High CAC relative to revenue. Review channel mix and sales efficiency.", type: "warning" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return "$" + v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var adEl      = document.getElementById("cac-ad-spend");
    var salesEl   = document.getElementById("cac-sales");
    var toolsEl   = document.getElementById("cac-tools");
    var custEl    = document.getElementById("cac-customers");
    var arpuEl    = document.getElementById("cac-arpu");
    var marginEl  = document.getElementById("cac-margin");
    var insightEl = document.getElementById("cac-insight");
    var shareBtn  = document.getElementById("cac-share");
    var copyBtn   = document.getElementById("cac-copy");

    function update() {
      var ad      = parseFloat(adEl.value) || 0;
      var sales   = parseFloat(salesEl.value) || 0;
      var tools   = parseFloat(toolsEl.value) || 0;
      var cust    = parseFloat(custEl.value) || 0;
      var arpu    = parseFloat(arpuEl.value) || 0;
      var margin  = parseFloat(marginEl.value) || 0;

      var cac     = calcBlendedCAC(ad, sales, tools, cust);
      var payback = (cac !== null && arpu > 0 && margin > 0) ? calcPaybackMonths(cac, arpu, margin) : null;
      var totalCost = ad + sales + tools;

      document.getElementById("cac-result").textContent        = fmtCurrency(cac);
      document.getElementById("cac-payback").textContent       = payback !== null ? payback.toFixed(1) + " months" : "—";
      document.getElementById("cac-total-cost").textContent    = fmtCurrency(totalCost);
      document.getElementById("cac-cost-per-lead").textContent = (cac !== null && cust > 0) ? fmtCurrency(cac) : "—";

      window.FTK.hashSet({ a: adEl.value, s: salesEl.value, t: toolsEl.value, c: custEl.value, r: arpuEl.value, m: marginEl.value });

      var ins = cacLabel(payback);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a) adEl.value = h.a;
      if (h.s) salesEl.value = h.s;
      if (h.t) toolsEl.value = h.t;
      if (h.c) custEl.value = h.c;
      if (h.r) arpuEl.value = h.r;
      if (h.m) marginEl.value = h.m;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ad     = parseFloat(adEl.value) || 0;
        var sales  = parseFloat(salesEl.value) || 0;
        var tools  = parseFloat(toolsEl.value) || 0;
        var cust   = parseFloat(custEl.value) || 0;
        var arpu   = parseFloat(arpuEl.value) || 0;
        var margin = parseFloat(marginEl.value) || 0;
        var cac    = calcBlendedCAC(ad, sales, tools, cust);
        var payback = (cac !== null && arpu > 0 && margin > 0) ? calcPaybackMonths(cac, arpu, margin) : null;
        var lines = [
          "Ad spend: " + fmtCurrency(ad),
          "Sales & payroll: " + fmtCurrency(sales),
          "Tools & software: " + fmtCurrency(tools),
          "New customers: " + cust,
          "Blended CAC: " + fmtCurrency(cac),
          "Payback period: " + (payback !== null ? payback.toFixed(1) + " months" : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [adEl, salesEl, toolsEl, custEl, arpuEl, marginEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcCAC, calcPaybackMonths, calcLTVCACRatio, calcBlendedCAC };
  }
})();
