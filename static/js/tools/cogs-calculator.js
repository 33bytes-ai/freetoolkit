(function () {
  "use strict";

  function calcCOGS(beginningInventory, purchases, endingInventory) {
    return beginningInventory + purchases - endingInventory;
  }

  function calcGrossProfit(revenue, cogs) {
    return revenue - cogs;
  }

  function calcGrossMarginPct(revenue, cogs) {
    if (revenue <= 0) return null;
    return ((revenue - cogs) / revenue) * 100;
  }

  function calcInventoryTurnover(cogs, avgInventory) {
    if (avgInventory <= 0) return null;
    return cogs / avgInventory;
  }

  function calcAvgInventory(beginningInventory, endingInventory) {
    return (beginningInventory + endingInventory) / 2;
  }

  function cogsLabel(grossMarginPct) {
    if (grossMarginPct === null || grossMarginPct === undefined) return "";
    if (grossMarginPct >= 60) return "High margin";
    if (grossMarginPct >= 30) return "Mid margin";
    if (grossMarginPct >= 10) return "Low margin";
    return "Loss on product";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var p = prefix || "";
    if (Math.abs(n) >= 1000000) return p + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(2);
  }

  function init() {
    var beginEl     = document.getElementById("cogs-begin");
    var purchaseEl  = document.getElementById("cogs-purchases");
    var endEl       = document.getElementById("cogs-end");
    var revenueEl   = document.getElementById("cogs-revenue");
    var insEl       = document.getElementById("cogs-insight");
    var copyBtn     = document.getElementById("cogs-copy");
    var shareBtn    = document.getElementById("cogs-share");

    function update() {
      var begin    = parseFloat(beginEl.value)    || 0;
      var purchases = parseFloat(purchaseEl.value) || 0;
      var end      = parseFloat(endEl.value)      || 0;
      var revenue  = parseFloat(revenueEl.value)  || 0;

      var cogs     = calcCOGS(begin, purchases, end);
      var gp       = revenue > 0 ? calcGrossProfit(revenue, cogs) : null;
      var margin   = revenue > 0 ? calcGrossMarginPct(revenue, cogs) : null;
      var avgInv   = calcAvgInventory(begin, end);
      var turnover = avgInv > 0 ? calcInventoryTurnover(cogs, avgInv) : null;

      document.getElementById("cogs-result").textContent   = fmt(cogs, "$");
      document.getElementById("cogs-gp").textContent       = gp      !== null ? fmt(gp, "$")                  : "--";
      document.getElementById("cogs-margin").textContent   = margin  !== null ? margin.toFixed(1) + "%"        : "--";
      document.getElementById("cogs-turnover").textContent = turnover !== null ? turnover.toFixed(2) + "×"     : "--";

      window.FTK.hashSet({ b: begin, p: purchases, e: end, r: revenue });

      if (margin !== null) {
        var label = cogsLabel(margin);
        var type  = margin >= 30 ? "success" : margin >= 10 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — COGS of " + fmt(cogs, "$") + " on " + fmt(revenue, "$") + " revenue. " +
          "Gross margin: " + margin.toFixed(1) + "%. " +
          (turnover !== null ? "Inventory turns " + turnover.toFixed(1) + "× per year." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.b) beginEl.value    = h.b;
      if (h.p) purchaseEl.value = h.p;
      if (h.e) endEl.value      = h.e;
      if (h.r) revenueEl.value  = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var b = parseFloat(beginEl.value) || 0;
        var p = parseFloat(purchaseEl.value) || 0;
        var e = parseFloat(endEl.value) || 0;
        var r = parseFloat(revenueEl.value) || 0;
        var c = calcCOGS(b, p, e);
        var lines = [
          "COGS Calculator Results",
          "Beginning Inventory: " + fmt(b, "$"),
          "Purchases: " + fmt(p, "$"),
          "Ending Inventory: " + fmt(e, "$"),
          "COGS: " + fmt(c, "$"),
          "Gross Profit: " + (r > 0 ? fmt(r - c, "$") : "--"),
          "Gross Margin: " + (r > 0 ? calcGrossMarginPct(r, c).toFixed(1) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [beginEl, purchaseEl, endEl, revenueEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcCOGS: calcCOGS, calcGrossProfit: calcGrossProfit, calcGrossMarginPct: calcGrossMarginPct, calcInventoryTurnover: calcInventoryTurnover, calcAvgInventory: calcAvgInventory, cogsLabel: cogsLabel };
  }
})();
