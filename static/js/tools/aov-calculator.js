(function () {
  "use strict";

  function calcAOV(totalRevenue, numberOfOrders) {
    if (numberOfOrders <= 0) return null;
    return totalRevenue / numberOfOrders;
  }

  function calcRevenueFromAOV(aov, targetOrders) {
    if (aov <= 0 || targetOrders <= 0) return null;
    return aov * targetOrders;
  }

  function calcOrdersNeeded(targetRevenue, aov) {
    if (aov <= 0) return null;
    return targetRevenue / aov;
  }

  function calcAOVImpact(currentAOV, newAOV, monthlyOrders) {
    if (monthlyOrders <= 0) return null;
    return (newAOV - currentAOV) * monthlyOrders;
  }

  function calcRevenuePerVisitor(totalRevenue, visitors) {
    if (visitors <= 0) return null;
    return totalRevenue / visitors;
  }

  function aovLabel(aov) {
    if (aov === null || aov === undefined) return "";
    if (aov >= 500) return "High AOV";
    if (aov >= 100) return "Mid-market AOV";
    if (aov >= 30)  return "Low-ticket";
    return "Micro-transaction";
  }

  function init() {
    var revenueEl  = document.getElementById("aov-revenue");
    var ordersEl   = document.getElementById("aov-orders");
    var visitorsEl = document.getElementById("aov-visitors");
    var targetEl   = document.getElementById("aov-target");
    var insEl      = document.getElementById("aov-insight");
    var copyBtn    = document.getElementById("aov-copy");
    var shareBtn   = document.getElementById("aov-share");

    function update() {
      var revenue  = parseFloat(revenueEl.value)  || 0;
      var orders   = parseFloat(ordersEl.value)   || 1;
      var visitors = parseFloat(visitorsEl.value) || 0;
      var target   = parseFloat(targetEl.value)   || 0;

      var aov    = calcAOV(revenue, orders);
      var rpv    = visitors > 0 ? calcRevenuePerVisitor(revenue, visitors) : null;
      var needed = (target > 0 && aov) ? calcOrdersNeeded(target, aov) : null;
      var impact = (target > 0 && aov && orders > 0) ? calcAOVImpact(aov, target, orders) : null;

      document.getElementById("aov-result").textContent  = aov   !== null ? "$" + aov.toFixed(2)   : "--";
      document.getElementById("aov-rpv").textContent     = rpv   !== null ? "$" + rpv.toFixed(2)   : "--";
      document.getElementById("aov-needed").textContent  = needed !== null ? Math.ceil(needed) + " orders" : "--";
      document.getElementById("aov-impact").textContent  = impact !== null ? (impact >= 0 ? "+" : "") + "$" + impact.toFixed(0) + "/mo" : "--";

      window.FTK.hashSet({ r: revenue, o: orders, v: visitors, t: target });

      if (aov !== null) {
        var label = aovLabel(aov);
        var type  = aov >= 100 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — $" + aov.toFixed(2) + " average order value. " +
          "A 10% AOV increase generates " + "$" + (aov * 0.10 * orders).toFixed(0) + "/month in additional revenue at current order volume, with no extra acquisition cost.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revenueEl.value  = h.r;
      if (h.o) ordersEl.value   = h.o;
      if (h.v) visitorsEl.value = h.v;
      if (h.t) targetEl.value   = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var r = parseFloat(revenueEl.value) || 0;
        var o = parseFloat(ordersEl.value) || 1;
        var aov = calcAOV(r, o);
        var lines = [
          "AOV Calculator Results",
          "Total Revenue: $" + r.toLocaleString(),
          "Orders: " + o.toLocaleString(),
          "Average Order Value: " + (aov !== null ? "$" + aov.toFixed(2) : "--"),
          "Revenue per Visitor: " + (document.getElementById("aov-rpv").textContent)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revenueEl, ordersEl, visitorsEl, targetEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcAOV: calcAOV, calcRevenueFromAOV: calcRevenueFromAOV, calcOrdersNeeded: calcOrdersNeeded, calcAOVImpact: calcAOVImpact, calcRevenuePerVisitor: calcRevenuePerVisitor, aovLabel: aovLabel };
  }
})();
