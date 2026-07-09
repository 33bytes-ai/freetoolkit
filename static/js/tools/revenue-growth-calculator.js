(function () {
  "use strict";

  function calcGrowthRate(current, prior) {
    if (!current || !prior || prior <= 0 || current < 0) return null;
    return ((current - prior) / prior) * 100;
  }

  function calcCAGR(current, prior, years) {
    if (!current || !prior || !years || prior <= 0 || current <= 0 || years <= 0) return null;
    return (Math.pow(current / prior, 1 / years) - 1) * 100;
  }

  function calcDoublingTime(annualGrowthPct) {
    if (!annualGrowthPct || annualGrowthPct <= 0) return null;
    return 72 / annualGrowthPct;
  }

  function growthInsight(momPct) {
    if (momPct === null) return null;
    if (momPct >= 20) return { text: "Exceptional MoM growth (20%+). Sustaining this = ~9× annual growth.", type: "info" };
    if (momPct >= 10) return { text: "Strong MoM growth (10–20%). T2D3 pace requires ~26% MoM in early years.", type: "info" };
    if (momPct >= 5) return { text: "Solid MoM growth (5–10%). Annualises to 80–214% YoY — venture-backable territory.", type: "info" };
    if (momPct >= 0) return { text: "Modest growth. Below 5% MoM — focus on activation and retention to accelerate.", type: "warning" };
    return { text: "Negative growth. Diagnose before investing in acquisition.", type: "warning" };
  }

  function fmt(v, decimals) {
    if (v === null || isNaN(v)) return "—";
    return v.toFixed(decimals != null ? decimals : 1) + "%";
  }

  function fmtYears(v) {
    if (v === null || isNaN(v)) return "—";
    if (v < 1) return Math.round(v * 12) + " months";
    return v.toFixed(1) + " yrs";
  }

  function init() {
    var currentEl  = document.getElementById("rg-current");
    var priorEl    = document.getElementById("rg-prior");
    var yearsEl    = document.getElementById("rg-years");
    var insightEl  = document.getElementById("rg-insight");
    var shareBtn   = document.getElementById("rg-share");
    var copyBtn    = document.getElementById("rg-copy");

    function update() {
      var current = parseFloat(currentEl.value);
      var prior   = parseFloat(priorEl.value);
      var years   = parseFloat(yearsEl ? yearsEl.value : 1);

      var mom  = calcGrowthRate(current, prior);
      var cagr = calcCAGR(current, prior, years);
      var dt   = calcDoublingTime(cagr !== null ? cagr : mom);

      // Annualised from MoM: (1 + rate/100)^12 - 1
      var annualFromMom = mom !== null ? (Math.pow(1 + mom / 100, 12) - 1) * 100 : null;

      document.getElementById("rg-mom").textContent    = fmt(mom);
      document.getElementById("rg-annual").textContent  = annualFromMom !== null ? fmt(annualFromMom) : "—";
      document.getElementById("rg-cagr").textContent   = cagr !== null ? fmt(cagr) : "—";
      document.getElementById("rg-doubling").textContent = fmtYears(dt);

      window.FTK.hashSet({ c: currentEl.value, p: priorEl.value, y: yearsEl ? yearsEl.value : "" });

      var ins = growthInsight(mom);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
      else window.FTK.showInsight(insightEl, null);
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.c) currentEl.value = s.c;
      if (s.p) priorEl.value = s.p;
      if (s.y && yearsEl) yearsEl.value = s.y;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var current = parseFloat(currentEl.value);
        var prior   = parseFloat(priorEl.value);
        var years   = parseFloat(yearsEl ? yearsEl.value : 1);
        var mom  = calcGrowthRate(current, prior);
        var cagr = calcCAGR(current, prior, years);
        var annualFromMom = mom !== null ? (Math.pow(1 + mom / 100, 12) - 1) * 100 : null;
        var lines = [
          "MoM growth: " + fmt(mom),
          "Annualised MoM: " + (annualFromMom !== null ? fmt(annualFromMom) : "—"),
          "CAGR (" + (isNaN(years) ? "?" : years) + " yr): " + (cagr !== null ? fmt(cagr) : "—"),
          "Doubling time: " + fmtYears(calcDoublingTime(cagr !== null ? cagr : mom)),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [currentEl, priorEl, yearsEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGrowthRate, calcCAGR, calcDoublingTime };
  }
})();
