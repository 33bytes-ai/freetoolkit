(function () {
  "use strict";

  function calcSalesVelocity(opportunities, winRate, acv, salesCycleDays) {
    if (!opportunities || opportunities <= 0) return null;
    if (winRate == null || winRate < 0) return null;
    if (!acv || acv <= 0) return null;
    if (!salesCycleDays || salesCycleDays <= 0) return null;
    return (opportunities * (winRate / 100) * acv) / salesCycleDays;
  }

  function calcAnnualRevenue(salesVelocityPerDay) {
    if (salesVelocityPerDay == null || salesVelocityPerDay < 0) return null;
    return salesVelocityPerDay * 365;
  }

  function calcPipelineValue(opportunities, acv) {
    if (!opportunities || opportunities <= 0 || !acv || acv <= 0) return null;
    return opportunities * acv;
  }

  function calcRequiredOpportunities(targetVelocity, winRate, acv, salesCycleDays) {
    if (!targetVelocity || targetVelocity <= 0) return null;
    if (!winRate || winRate <= 0) return null;
    if (!acv || acv <= 0) return null;
    if (!salesCycleDays || salesCycleDays <= 0) return null;
    return (targetVelocity * salesCycleDays) / ((winRate / 100) * acv);
  }

  function salesVelocityLabel(velocityPerDay) {
    if (velocityPerDay === null) return null;
    var annual = velocityPerDay * 365;
    if (annual >= 10000000) return { text: "Exceptional pipeline — $" + (annual / 1000000).toFixed(1) + "M annualized. Focus on maintaining cycle time as deal volume grows.", type: "info" };
    if (annual >= 1000000) return { text: "Strong pipeline velocity — $" + (annual / 1000000).toFixed(1) + "M annualized. Scale prospecting or reduce cycle time to hit next milestone.", type: "info" };
    if (annual >= 100000) return { text: "Growing pipeline — $" + (annual / 1000).toFixed(0) + "k annualized. Improve win rate or ACV to move toward $1M ARR.", type: "info" };
    return { text: "Early-stage velocity — $" + (annual / 1000).toFixed(1) + "k annualized. Increase opportunities and tighten your sales process.", type: "warning" };
  }

  function init() {
    var oppsEl    = document.getElementById("sv-opportunities");
    var winEl     = document.getElementById("sv-win-rate");
    var acvEl     = document.getElementById("sv-acv");
    var cycleEl   = document.getElementById("sv-cycle");
    var insEl     = document.getElementById("sv-insight");
    var shareBtn  = document.getElementById("sv-share");
    var copyBtn   = document.getElementById("sv-copy");

    function update() {
      var opps  = parseFloat(oppsEl.value)  || 0;
      var win   = parseFloat(winEl.value)   || 0;
      var acv   = parseFloat(acvEl.value)   || 0;
      var cycle = parseFloat(cycleEl.value) || 90;

      var velocity = calcSalesVelocity(opps, win, acv, cycle);
      var annual   = velocity !== null ? calcAnnualRevenue(velocity) : null;
      var pipeline = calcPipelineValue(opps, acv);

      document.getElementById("sv-result").textContent   = velocity !== null ? "$" + velocity.toFixed(2) + "/day" : "--";
      document.getElementById("sv-annual").textContent   = annual   !== null ? "$" + (annual / 1000).toFixed(1) + "k" : "--";
      document.getElementById("sv-pipeline").textContent = pipeline !== null ? "$" + (pipeline / 1000).toFixed(1) + "k" : "--";
      document.getElementById("sv-won").textContent      = (opps && win) ? Math.round(opps * win / 100) + " deals" : "--";

      window.FTK.hashSet({ o: oppsEl.value, w: winEl.value, a: acvEl.value, c: cycleEl.value });

      var ins = salesVelocityLabel(velocity);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.o) oppsEl.value  = h.o;
      if (h.w) winEl.value   = h.w;
      if (h.a) acvEl.value   = h.a;
      if (h.c) cycleEl.value = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var opps  = parseFloat(oppsEl.value)  || 0;
        var win   = parseFloat(winEl.value)   || 0;
        var acv   = parseFloat(acvEl.value)   || 0;
        var cycle = parseFloat(cycleEl.value) || 90;
        var v     = calcSalesVelocity(opps, win, acv, cycle);
        var lines = [
          "Opportunities: " + opps,
          "Win Rate: " + win + "%",
          "ACV: $" + acv.toLocaleString(),
          "Sales Cycle: " + cycle + " days",
          "Sales Velocity: " + (v !== null ? "$" + v.toFixed(2) + "/day" : "--"),
          "Annualized: " + (v !== null ? "$" + (v * 365 / 1000).toFixed(1) + "k" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [oppsEl, winEl, acvEl, cycleEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcSalesVelocity, calcAnnualRevenue, calcPipelineValue, calcRequiredOpportunities, salesVelocityLabel };
  }
})();
