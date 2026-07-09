(function () {
  "use strict";

  function calcElasticity(pctDemandChange, pctPriceChange) {
    if (!pctPriceChange || pctPriceChange === 0) return null;
    return pctDemandChange / pctPriceChange;
  }

  function calcNewDemand(currentDemand, pctPriceChange, elasticity) {
    if (!currentDemand || currentDemand <= 0 || elasticity === null) return null;
    var demandChangePct = elasticity * pctPriceChange;
    return currentDemand * (1 + demandChangePct / 100);
  }

  function calcRevenueImpact(currentDemand, currentPrice, newDemand, newPrice) {
    if (!currentDemand || !currentPrice || !newDemand || !newPrice) return null;
    var currentRevenue = currentDemand * currentPrice;
    var newRevenue = newDemand * newPrice;
    return newRevenue - currentRevenue;
  }

  function elasticityLabel(e) {
    if (e === null) return null;
    var abs = Math.abs(e);
    if (abs < 0.5) return { text: "Highly inelastic demand (|E| < 0.5). Customers are price-insensitive — raise prices safely.", type: "info" };
    if (abs < 1) return { text: "Inelastic demand (|E| < 1). A price increase reduces demand less than proportionally — revenue still increases.", type: "info" };
    if (abs === 1) return { text: "Unit elastic demand (|E| = 1). Revenue stays constant under any price change.", type: "info" };
    if (abs < 2) return { text: "Elastic demand (|E| > 1). Demand is sensitive to price. A price increase will reduce total revenue.", type: "warning" };
    return { text: "Highly elastic demand (|E| > 2). Customers will reduce purchases sharply with any price increase.", type: "warning" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    var sign = v < 0 ? "-" : "+";
    return sign + "$" + Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var priceEl   = document.getElementById("pe-price");
    var demandEl  = document.getElementById("pe-demand");
    var newPriceEl = document.getElementById("pe-new-price");
    var elasEl    = document.getElementById("pe-elasticity");
    var insightEl = document.getElementById("pe-insight");
    var shareBtn  = document.getElementById("pe-share");
    var copyBtn   = document.getElementById("pe-copy");

    function update() {
      var price    = parseFloat(priceEl.value) || 0;
      var demand   = parseFloat(demandEl.value) || 0;
      var newPrice = parseFloat(newPriceEl.value) || 0;
      var elasticity = parseFloat(elasEl.value);
      if (isNaN(elasticity)) elasticity = -1.2;

      var pctPriceChange = price > 0 ? ((newPrice - price) / price) * 100 : 0;
      var newDemand  = calcNewDemand(demand, pctPriceChange, elasticity);
      var revenueImpact = calcRevenueImpact(demand, price, newDemand, newPrice);
      var currentRevenue = demand * price;
      var newRevenue = newDemand !== null ? newDemand * newPrice : null;

      document.getElementById("pe-pct-change").textContent = pctPriceChange !== 0 ? (pctPriceChange > 0 ? "+" : "") + pctPriceChange.toFixed(1) + "%" : "—";
      document.getElementById("pe-new-demand").textContent = newDemand !== null ? Math.max(0, newDemand).toFixed(0) : "—";
      document.getElementById("pe-current-rev").textContent = "$" + currentRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      document.getElementById("pe-revenue-impact").textContent = revenueImpact !== null ? fmtCurrency(revenueImpact) : "—";

      window.FTK.hashSet({ p: priceEl.value, d: demandEl.value, n: newPriceEl.value, e: elasEl.value });

      var ins = elasticityLabel(elasticity);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) priceEl.value = h.p;
      if (h.d) demandEl.value = h.d;
      if (h.n) newPriceEl.value = h.n;
      if (h.e && elasEl) elasEl.value = h.e;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var price    = parseFloat(priceEl.value) || 0;
        var demand   = parseFloat(demandEl.value) || 0;
        var newPrice = parseFloat(newPriceEl.value) || 0;
        var elasticity = parseFloat(elasEl.value) || -1.2;
        var pctPriceChange = price > 0 ? ((newPrice - price) / price) * 100 : 0;
        var newDemand = calcNewDemand(demand, pctPriceChange, elasticity);
        var revenueImpact = calcRevenueImpact(demand, price, newDemand, newPrice);
        var lines = [
          "Current price: $" + price,
          "Current demand: " + demand,
          "New price: $" + newPrice,
          "Price change: " + (pctPriceChange > 0 ? "+" : "") + pctPriceChange.toFixed(1) + "%",
          "Elasticity: " + elasticity,
          "New demand: " + (newDemand !== null ? Math.max(0, newDemand).toFixed(0) : "—"),
          "Revenue impact: " + (revenueImpact !== null ? fmtCurrency(revenueImpact) : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [priceEl, demandEl, newPriceEl, elasEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcElasticity, calcNewDemand, calcRevenueImpact, elasticityLabel };
  }
})();
