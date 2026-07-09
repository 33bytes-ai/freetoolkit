(function () {
  "use strict";

  function calcRevenuePerLead(totalRevenue, totalLeads) {
    if (!totalRevenue || totalRevenue <= 0 || !totalLeads || totalLeads <= 0) return null;
    return totalRevenue / totalLeads;
  }

  function calcCostPerLead(marketingSpend, totalLeads) {
    if (!marketingSpend || marketingSpend <= 0 || !totalLeads || totalLeads <= 0) return null;
    return marketingSpend / totalLeads;
  }

  function calcLeadROI(revenuePerLead, costPerLead) {
    if (!revenuePerLead || revenuePerLead <= 0 || !costPerLead || costPerLead <= 0) return null;
    return ((revenuePerLead - costPerLead) / costPerLead) * 100;
  }

  function calcLeadsNeededForRevenue(targetRevenue, revenuePerLead) {
    if (!targetRevenue || targetRevenue <= 0 || !revenuePerLead || revenuePerLead <= 0) return null;
    return Math.ceil(targetRevenue / revenuePerLead);
  }

  function rplLabel(rpl, cpl) {
    if (rpl === null) return null;
    if (cpl === null) return { text: "Revenue per lead: $" + rpl.toFixed(2) + ". Enter cost per lead to see channel ROI.", type: "info" };
    var ratio = rpl / cpl;
    if (ratio >= 5) return { text: "Excellent channel ROI: $" + rpl.toFixed(2) + " revenue per lead vs $" + cpl.toFixed(2) + " cost (" + ratio.toFixed(1) + "× return). Scale this channel.", type: "info" };
    if (ratio >= 2) return { text: "Healthy channel ROI: $" + rpl.toFixed(2) + " revenue per $" + cpl.toFixed(2) + " cost (" + ratio.toFixed(1) + "× return). Solid acquisition economics.", type: "info" };
    if (ratio >= 1) return { text: "Marginal channel ROI: " + ratio.toFixed(1) + "× return. Profitable but thin — optimize or test higher ACV segments.", type: "warning" };
    return { text: "Negative channel ROI: " + ratio.toFixed(2) + "× return. Cost per lead exceeds revenue per lead — this channel is losing money.", type: "warning" };
  }

  function init() {
    var revEl     = document.getElementById("rpl-revenue");
    var leadsEl   = document.getElementById("rpl-leads");
    var spendEl   = document.getElementById("rpl-spend");
    var targetEl  = document.getElementById("rpl-target");
    var insEl     = document.getElementById("rpl-insight");
    var shareBtn  = document.getElementById("rpl-share");
    var copyBtn   = document.getElementById("rpl-copy");

    function update() {
      var rev    = parseFloat(revEl.value)    || 0;
      var leads  = parseFloat(leadsEl.value)  || 0;
      var spend  = parseFloat(spendEl.value)  || 0;
      var target = parseFloat(targetEl.value) || 0;

      var rpl  = calcRevenuePerLead(rev, leads);
      var cpl  = spend ? calcCostPerLead(spend, leads) : null;
      var roi  = (rpl && cpl) ? calcLeadROI(rpl, cpl) : null;
      var need = (rpl && target) ? calcLeadsNeededForRevenue(target, rpl) : null;

      document.getElementById("rpl-result").textContent  = rpl  !== null ? "$" + rpl.toFixed(2)  : "--";
      document.getElementById("rpl-cpl").textContent     = cpl  !== null ? "$" + cpl.toFixed(2)  : "--";
      document.getElementById("rpl-roi").textContent     = roi  !== null ? roi.toFixed(1) + "%"  : "--";
      document.getElementById("rpl-needed").textContent  = need !== null ? need.toLocaleString() + " leads" : "--";

      window.FTK.hashSet({ r: revEl.value, l: leadsEl.value, s: spendEl.value, t: targetEl.value });

      var ins = rplLabel(rpl, cpl);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revEl.value    = h.r;
      if (h.l) leadsEl.value  = h.l;
      if (h.s) spendEl.value  = h.s;
      if (h.t) targetEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var rev   = parseFloat(revEl.value)   || 0;
        var leads = parseFloat(leadsEl.value) || 0;
        var spend = parseFloat(spendEl.value) || 0;
        var rpl   = calcRevenuePerLead(rev, leads);
        var cpl   = spend ? calcCostPerLead(spend, leads) : null;
        var lines = [
          "Revenue: $" + (rev / 1000).toFixed(1) + "k",
          "Leads: " + leads.toLocaleString(),
          "Revenue per Lead: " + (rpl !== null ? "$" + rpl.toFixed(2) : "--"),
          "Cost per Lead: " + (cpl !== null ? "$" + cpl.toFixed(2) : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revEl, leadsEl, spendEl, targetEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcRevenuePerLead, calcCostPerLead, calcLeadROI, calcLeadsNeededForRevenue, rplLabel };
  }
})();
