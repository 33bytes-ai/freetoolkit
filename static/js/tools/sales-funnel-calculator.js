(function () {
  "use strict";

  function calcFunnelStage(leads, rate) {
    if (leads < 0 || rate < 0 || rate > 100) return null;
    return leads * (rate / 100);
  }

  function calcFunnelOutput(leads, mqlRate, sqlRate, oppRate, closeRate, acv) {
    if (leads <= 0 || acv < 0) return null;
    var mqls = leads * (mqlRate / 100);
    var sqls = mqls * (sqlRate / 100);
    var opps = sqls * (oppRate / 100);
    var customers = opps * (closeRate / 100);
    var mrr = customers * acv;
    var overallConversion = leads > 0 ? (customers / leads) * 100 : 0;
    return { mqls: mqls, sqls: sqls, opps: opps, customers: customers, mrr: mrr, overallConversion: overallConversion };
  }

  function calcCostPerCustomer(spend, customers) {
    if (customers <= 0) return null;
    return spend / customers;
  }

  function calcLeadsRequired(targetCustomers, mqlRate, sqlRate, oppRate, closeRate) {
    if (mqlRate <= 0 || sqlRate <= 0 || oppRate <= 0 || closeRate <= 0) return null;
    return targetCustomers / ((mqlRate / 100) * (sqlRate / 100) * (oppRate / 100) * (closeRate / 100));
  }

  function funnelEfficiencyLabel(overallConversion) {
    if (overallConversion >= 5) return "Excellent";
    if (overallConversion >= 2) return "Good";
    if (overallConversion >= 0.5) return "Average";
    return "Needs work";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined) return "--";
    var p = prefix || "";
    if (n >= 1000000) return p + (n / 1000000).toFixed(1) + "M";
    if (n >= 10000) return p + (n / 1000).toFixed(1) + "k";
    if (n >= 1000) return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(n >= 10 ? 0 : 1);
  }

  function init() {
    var leadsEl    = document.getElementById("sf-leads");
    var acvEl      = document.getElementById("sf-acv");
    var mqlRateEl  = document.getElementById("sf-mql-rate");
    var sqlRateEl  = document.getElementById("sf-sql-rate");
    var oppRateEl  = document.getElementById("sf-opp-rate");
    var closeEl    = document.getElementById("sf-close-rate");
    var insEl      = document.getElementById("sf-insight");
    var copyBtn    = document.getElementById("sf-copy");
    var shareBtn   = document.getElementById("sf-share");

    function update() {
      var leads    = parseFloat(leadsEl.value)   || 0;
      var acv      = parseFloat(acvEl.value)     || 0;
      var mqlRate  = parseFloat(mqlRateEl.value) || 0;
      var sqlRate  = parseFloat(sqlRateEl.value) || 0;
      var oppRate  = parseFloat(oppRateEl.value) || 0;
      var closeRate = parseFloat(closeEl.value)  || 0;

      var r = calcFunnelOutput(leads, mqlRate, sqlRate, oppRate, closeRate, acv);

      document.getElementById("sf-mqls").textContent       = r ? fmt(r.mqls) : "--";
      document.getElementById("sf-sqls").textContent       = r ? fmt(r.sqls) : "--";
      document.getElementById("sf-opps").textContent       = r ? fmt(r.opps) : "--";
      document.getElementById("sf-customers").textContent  = r ? fmt(r.customers) : "--";
      document.getElementById("sf-mrr").textContent        = r ? fmt(r.mrr, "$") : "--";
      document.getElementById("sf-conversion").textContent = r ? r.overallConversion.toFixed(2) + "%" : "--";

      if (r) {
        window.FTK.hashSet({ l: leads, a: acv, m: mqlRate, s: sqlRate, o: oppRate, c: closeRate });
        var label = funnelEfficiencyLabel(r.overallConversion);
        var type = r.overallConversion >= 2 ? "success" : r.overallConversion >= 0.5 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — " + fmt(r.customers, "") + " customers/month generating " + fmt(r.mrr, "$") + " MRR. " +
          "Overall lead-to-close: " + r.overallConversion.toFixed(2) + "%. " +
          "You need " + Math.ceil(calcLeadsRequired(1, mqlRate, sqlRate, oppRate, closeRate)) + " leads per customer won.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.l) leadsEl.value   = h.l;
      if (h.a) acvEl.value     = h.a;
      if (h.m) mqlRateEl.value = h.m;
      if (h.s) sqlRateEl.value = h.s;
      if (h.o) oppRateEl.value = h.o;
      if (h.c) closeEl.value   = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var r = calcFunnelOutput(
          parseFloat(leadsEl.value) || 0,
          parseFloat(mqlRateEl.value) || 0,
          parseFloat(sqlRateEl.value) || 0,
          parseFloat(oppRateEl.value) || 0,
          parseFloat(closeEl.value) || 0,
          parseFloat(acvEl.value) || 0
        );
        var lines = [
          "Sales Funnel Results",
          "Leads / month: " + leadsEl.value,
          "MQLs / month: " + (r ? fmt(r.mqls) : "--"),
          "SQLs / month: " + (r ? fmt(r.sqls) : "--"),
          "Opportunities: " + (r ? fmt(r.opps) : "--"),
          "New Customers: " + (r ? fmt(r.customers) : "--"),
          "MRR from Funnel: " + (r ? fmt(r.mrr, "$") : "--"),
          "Overall Conversion: " + (r ? r.overallConversion.toFixed(2) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [leadsEl, acvEl, mqlRateEl, sqlRateEl, oppRateEl, closeEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcFunnelStage: calcFunnelStage, calcFunnelOutput: calcFunnelOutput, calcCostPerCustomer: calcCostPerCustomer, calcLeadsRequired: calcLeadsRequired, funnelEfficiencyLabel: funnelEfficiencyLabel };
  }
})();
