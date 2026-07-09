(function () {
  "use strict";

  function calcInventoryTurnover(cogs, avgInventory) {
    if (!cogs || cogs <= 0 || !avgInventory || avgInventory <= 0) return null;
    return cogs / avgInventory;
  }

  function calcDSI(inventoryTurnover) {
    if (!inventoryTurnover || inventoryTurnover <= 0) return null;
    return 365 / inventoryTurnover;
  }

  function calcSellThroughRate(unitsSold, unitsReceived) {
    if (!unitsReceived || unitsReceived <= 0 || unitsSold == null || unitsSold < 0) return null;
    return (unitsSold / unitsReceived) * 100;
  }

  function calcAvgInventory(beginningInventory, endingInventory) {
    if (beginningInventory == null || endingInventory == null) return null;
    if (beginningInventory < 0 || endingInventory < 0) return null;
    return (beginningInventory + endingInventory) / 2;
  }

  function inventoryLabel(turnover) {
    if (turnover === null) return null;
    if (turnover >= 12) return { text: "High turnover: " + turnover.toFixed(1) + "× — excellent inventory efficiency. " + (365 / turnover).toFixed(0) + " days of inventory on hand.", type: "info" };
    if (turnover >= 6)  return { text: "Healthy turnover: " + turnover.toFixed(1) + "× — strong stock management. " + (365 / turnover).toFixed(0) + " days of inventory on hand.", type: "info" };
    if (turnover >= 3)  return { text: "Moderate turnover: " + turnover.toFixed(1) + "× — " + (365 / turnover).toFixed(0) + " days of inventory. Review slow-moving SKUs.", type: "warning" };
    return { text: "Low turnover: " + turnover.toFixed(1) + "× — " + (365 / turnover).toFixed(0) + " days of inventory on hand. High carrying costs and obsolescence risk.", type: "warning" };
  }

  function init() {
    var cogsEl      = document.getElementById("inv-cogs");
    var beginEl     = document.getElementById("inv-begin");
    var endEl       = document.getElementById("inv-end");
    var soldEl      = document.getElementById("inv-sold");
    var receivedEl  = document.getElementById("inv-received");
    var insEl       = document.getElementById("inv-insight");
    var shareBtn    = document.getElementById("inv-share");
    var copyBtn     = document.getElementById("inv-copy");

    function update() {
      var cogs     = parseFloat(cogsEl.value)     || 0;
      var begin    = parseFloat(beginEl.value)    || 0;
      var end      = parseFloat(endEl.value)      || 0;
      var sold     = parseFloat(soldEl.value)     || 0;
      var received = parseFloat(receivedEl.value) || 0;

      var avgInv   = calcAvgInventory(begin, end);
      var turnover = (avgInv !== null) ? calcInventoryTurnover(cogs, avgInv) : null;
      var dsi      = turnover ? calcDSI(turnover) : null;
      var sellThru = (sold || received) ? calcSellThroughRate(sold, received) : null;

      document.getElementById("inv-turnover").textContent  = turnover !== null ? turnover.toFixed(2) + "×" : "--";
      document.getElementById("inv-dsi").textContent       = dsi      !== null ? dsi.toFixed(0) + " days"  : "--";
      document.getElementById("inv-avg").textContent       = avgInv   !== null ? "$" + (avgInv / 1000).toFixed(1) + "k" : "--";
      document.getElementById("inv-sellthru").textContent  = sellThru !== null ? sellThru.toFixed(1) + "%" : "--";

      window.FTK.hashSet({ c: cogsEl.value, b: beginEl.value, e: endEl.value, s: soldEl.value, r: receivedEl.value });

      var ins = inventoryLabel(turnover);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.c) cogsEl.value     = h.c;
      if (h.b) beginEl.value    = h.b;
      if (h.e) endEl.value      = h.e;
      if (h.s) soldEl.value     = h.s;
      if (h.r) receivedEl.value = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var cogs  = parseFloat(cogsEl.value)  || 0;
        var begin = parseFloat(beginEl.value) || 0;
        var end   = parseFloat(endEl.value)   || 0;
        var avg   = calcAvgInventory(begin, end);
        var turns = avg ? calcInventoryTurnover(cogs, avg) : null;
        var dsi   = turns ? calcDSI(turns) : null;
        var lines = [
          "COGS: $" + (cogs / 1000).toFixed(1) + "k",
          "Avg Inventory: " + (avg !== null ? "$" + (avg / 1000).toFixed(1) + "k" : "--"),
          "Inventory Turnover: " + (turns !== null ? turns.toFixed(2) + "×" : "--"),
          "Days Sales of Inventory: " + (dsi !== null ? dsi.toFixed(0) + " days" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [cogsEl, beginEl, endEl, soldEl, receivedEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcInventoryTurnover, calcDSI, calcSellThroughRate, calcAvgInventory, inventoryLabel };
  }
})();
