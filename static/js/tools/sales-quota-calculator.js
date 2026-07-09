(function () {
  "use strict";

  function calculateQuota(revenueTarget, acv, closeRatePct, salesCycleDays) {
    if (acv <= 0 || closeRatePct <= 0) return null;
    var closeRate     = closeRatePct / 100;
    var dealsNeeded   = revenueTarget / acv;
    var leadsNeeded   = dealsNeeded / closeRate;
    var pipelineNeeded = dealsNeeded * acv / closeRate;
    var monthlyDeals  = dealsNeeded / 12;
    var monthlyLeads  = leadsNeeded / 12;
    var pipelineTurns = salesCycleDays > 0 ? (365 / salesCycleDays) : null;
    return {
      dealsNeeded:    dealsNeeded,
      leadsNeeded:    leadsNeeded,
      pipelineNeeded: pipelineNeeded,
      monthlyDeals:   monthlyDeals,
      monthlyLeads:   monthlyLeads,
      pipelineTurns:  pipelineTurns,
    };
  }

  function init() {
    var targetEl  = document.getElementById("sq-target");
    var acvEl     = document.getElementById("sq-acv");
    var closeEl   = document.getElementById("sq-close-rate");
    var cycleEl   = document.getElementById("sq-cycle-days");
    var dealsEl   = document.getElementById("sq-out-deals");
    var leadsEl   = document.getElementById("sq-out-leads");
    var pipeEl    = document.getElementById("sq-out-pipeline");
    var moDealsEl = document.getElementById("sq-out-mo-deals");
    var moLeadsEl = document.getElementById("sq-out-mo-leads");
    var insightEl = document.getElementById("sq-insight");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
      if (v >= 1000)    return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + Math.round(v).toLocaleString();
    }

    function update() {
      var target = parseFloat(targetEl.value) || 0;
      var acv    = parseFloat(acvEl.value)    || 0;
      var close  = parseFloat(closeEl.value)  || 0;
      var cycle  = parseFloat(cycleEl.value)  || 0;
      var result = calculateQuota(target, acv, close, cycle);
      if (!result) return;

      dealsEl.textContent   = Math.ceil(result.dealsNeeded);
      leadsEl.textContent   = Math.ceil(result.leadsNeeded);
      pipeEl.textContent    = fmt(result.pipelineNeeded);
      moDealsEl.textContent = result.monthlyDeals.toFixed(1);
      moLeadsEl.textContent = Math.ceil(result.monthlyLeads);

      if (result.monthlyLeads > 500) {
        window.FTK.showInsight(insightEl,
          "You need " + Math.ceil(result.monthlyLeads) + " qualified leads/month. " +
          "That volume typically requires a dedicated inbound engine (SEO, content, paid) + SDR team. " +
          "Consider raising ACV or improving close rate to reduce lead volume required.",
          "warning");
      } else if (close < 15) {
        window.FTK.showInsight(insightEl,
          "Close rate below 15% is low for most SaaS segments. " +
          "Improving close rate from " + close + "% to 20% reduces leads needed by " +
          Math.round((1 - close/20) * 100) + "%. " +
          "Invest in discovery call quality, ICP tightening, and competitive positioning.",
          "info");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ t: targetEl.value, a: acvEl.value, c: closeEl.value, cy: cycleEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.t) return;
      targetEl.value = s.t;
      acvEl.value    = s.a;
      closeEl.value  = s.c;
      cycleEl.value  = s.cy;
    }

    var copyBtn = document.getElementById("sq-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Deals: " + dealsEl.textContent + " | Leads: " + leadsEl.textContent + " | Pipeline: " + pipeEl.textContent + " | Monthly deals: " + moDealsEl.textContent + " | Monthly leads: " + moLeadsEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("sq-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [targetEl, acvEl, closeEl, cycleEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateQuota: calculateQuota };
  }
})();
