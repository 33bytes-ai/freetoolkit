(function () {
  "use strict";

  function calcConversionRate(conversions, visitors) {
    if (!visitors || visitors <= 0 || conversions == null || conversions < 0) return null;
    return (conversions / visitors) * 100;
  }

  function calcRevenueFromCR(visitors, cr, arpu) {
    if (!visitors || !cr || !arpu) return null;
    return visitors * (cr / 100) * arpu;
  }

  function calcCROImpact(visitors, currentCR, newCR, arpu) {
    if (!visitors || currentCR == null || newCR == null || !arpu) return null;
    var currentRevenue = visitors * (currentCR / 100) * arpu;
    var newRevenue = visitors * (newCR / 100) * arpu;
    return newRevenue - currentRevenue;
  }

  function crLabel(cr) {
    if (cr === null) return null;
    if (cr < 1) return { text: "Under 1% conversion. Most optimization efforts target 2–5% as a baseline.", type: "warning" };
    if (cr < 3) return { text: "1–3% conversion rate — average for most SaaS and e-commerce. Top performers hit 5–10%.", type: "info" };
    if (cr < 7) return { text: "3–7% conversion rate. You're above average. Test pricing page layout and social proof.", type: "info" };
    return { text: "Above 7% conversion rate — excellent! Focus on volume growth at this efficiency.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return (v >= 0 ? "+" : "") + "$" + Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var visitorsEl  = document.getElementById("cr-visitors");
    var conveEl     = document.getElementById("cr-conversions");
    var arpuEl      = document.getElementById("cr-arpu");
    var newCREl     = document.getElementById("cr-new-cr");
    var insightEl   = document.getElementById("cr-insight");
    var shareBtn    = document.getElementById("cr-share");
    var copyBtn     = document.getElementById("cr-copy");

    function update() {
      var visitors = parseFloat(visitorsEl.value) || 0;
      var conve    = parseFloat(conveEl.value) || 0;
      var arpu     = parseFloat(arpuEl.value) || 0;
      var newCR    = parseFloat(newCREl.value) || 0;

      var cr         = calcConversionRate(conve, visitors);
      var revenue    = calcRevenueFromCR(visitors, cr, arpu);
      var newRevenue = newCR > 0 && cr !== null ? calcRevenueFromCR(visitors, newCR, arpu) : null;
      var impact     = (newCR > 0 && cr !== null) ? calcCROImpact(visitors, cr, newCR, arpu) : null;

      document.getElementById("cr-rate").textContent       = cr !== null ? cr.toFixed(2) + "%" : "—";
      document.getElementById("cr-revenue").textContent    = revenue !== null ? "$" + revenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "—";
      document.getElementById("cr-new-revenue").textContent = newRevenue !== null ? "$" + newRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "—";
      document.getElementById("cr-impact").textContent     = impact !== null ? fmtCurrency(impact) + "/mo" : "—";

      window.FTK.hashSet({ v: visitorsEl.value, c: conveEl.value, a: arpuEl.value, n: newCREl.value });

      var ins = crLabel(cr);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.v) visitorsEl.value = h.v;
      if (h.c) conveEl.value = h.c;
      if (h.a) arpuEl.value = h.a;
      if (h.n && newCREl) newCREl.value = h.n;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var visitors = parseFloat(visitorsEl.value) || 0;
        var conve    = parseFloat(conveEl.value) || 0;
        var arpu     = parseFloat(arpuEl.value) || 0;
        var newCR    = parseFloat(newCREl.value) || 0;
        var cr         = calcConversionRate(conve, visitors);
        var revenue    = calcRevenueFromCR(visitors, cr, arpu);
        var impact     = (newCR > 0 && cr !== null) ? calcCROImpact(visitors, cr, newCR, arpu) : null;
        var lines = [
          "Monthly visitors: " + visitors.toLocaleString(),
          "Conversions: " + conve.toLocaleString(),
          "Conversion rate: " + (cr !== null ? cr.toFixed(2) + "%" : "—"),
          "Monthly revenue: " + (revenue !== null ? "$" + revenue.toFixed(0) : "—"),
          "Target CR: " + (newCR ? newCR + "%" : "—"),
          "Revenue impact: " + (impact !== null ? fmtCurrency(impact) : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [visitorsEl, conveEl, arpuEl, newCREl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcConversionRate, calcRevenueFromCR, calcCROImpact, crLabel };
  }
})();
