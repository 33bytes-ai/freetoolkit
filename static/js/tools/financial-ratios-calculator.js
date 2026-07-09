(function () {
  "use strict";

  function calcCurrentRatio(currentAssets, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return currentAssets / currentLiabilities;
  }

  function calcDebtToEquity(totalDebt, totalEquity) {
    if (totalEquity <= 0) return null;
    return totalDebt / totalEquity;
  }

  function calcROE(netIncome, shareholdersEquity) {
    if (shareholdersEquity <= 0) return null;
    return (netIncome / shareholdersEquity) * 100;
  }

  function calcROA(netIncome, totalAssets) {
    if (totalAssets <= 0) return null;
    return (netIncome / totalAssets) * 100;
  }

  function calcGrossMargin(revenue, cogs) {
    if (revenue <= 0) return null;
    return ((revenue - cogs) / revenue) * 100;
  }

  function calcNetMargin(netIncome, revenue) {
    if (revenue <= 0) return null;
    return (netIncome / revenue) * 100;
  }

  function init() {
    var revenueEl  = document.getElementById("fr-revenue");
    var cogsEl     = document.getElementById("fr-cogs");
    var netIncEl   = document.getElementById("fr-net-income");
    var assetsEl   = document.getElementById("fr-assets");
    var equityEl   = document.getElementById("fr-equity");
    var debtEl     = document.getElementById("fr-debt");
    var currAEl    = document.getElementById("fr-curr-assets");
    var currLEl    = document.getElementById("fr-curr-liab");
    var insEl      = document.getElementById("fr-insight");
    var copyBtn    = document.getElementById("fr-copy");
    var shareBtn   = document.getElementById("fr-share");

    function update() {
      var revenue = parseFloat(revenueEl.value)  || 0;
      var cogs    = parseFloat(cogsEl.value)     || 0;
      var ni      = parseFloat(netIncEl.value)   || 0;
      var assets  = parseFloat(assetsEl.value)   || 1;
      var equity  = parseFloat(equityEl.value)   || 1;
      var debt    = parseFloat(debtEl.value)      || 0;
      var ca      = parseFloat(currAEl.value)    || 0;
      var cl      = parseFloat(currLEl.value)    || 1;

      var gm   = calcGrossMargin(revenue, cogs);
      var nm   = calcNetMargin(ni, revenue);
      var roe  = calcROE(ni, equity);
      var roa  = calcROA(ni, assets);
      var dte  = calcDebtToEquity(debt, equity);
      var cur  = calcCurrentRatio(ca, cl);

      document.getElementById("fr-gross-margin").textContent  = gm  !== null ? gm.toFixed(1) + "%"   : "--";
      document.getElementById("fr-net-margin").textContent    = nm  !== null ? nm.toFixed(1) + "%"   : "--";
      document.getElementById("fr-roe").textContent           = roe !== null ? roe.toFixed(1) + "%"  : "--";
      document.getElementById("fr-roa").textContent           = roa !== null ? roa.toFixed(1) + "%"  : "--";
      document.getElementById("fr-dte").textContent           = dte !== null ? dte.toFixed(2) + "×"  : "--";
      document.getElementById("fr-current-ratio").textContent = cur !== null ? cur.toFixed(2) + "×"  : "--";

      window.FTK.hashSet({ rv: revenue, cg: cogs, ni: ni, a: assets, eq: equity, d: debt, ca: ca, cl: cl });

      if (nm !== null || roe !== null) {
        var type = (nm !== null && nm >= 10) || (roe !== null && roe >= 15) ? "success" : "info";
        window.FTK.showInsight(insEl,
          "Summary: " +
          (gm !== null ? "Gross " + gm.toFixed(1) + "%, " : "") +
          (nm !== null ? "Net " + nm.toFixed(1) + "%, " : "") +
          (roe !== null ? "ROE " + roe.toFixed(1) + "%, " : "") +
          (roa !== null ? "ROA " + roa.toFixed(1) + "%, " : "") +
          (dte !== null ? "D/E " + dte.toFixed(2) + "×, " : "") +
          (cur !== null ? "Current " + cur.toFixed(2) + "×" : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.rv) revenueEl.value = h.rv;
      if (h.cg) cogsEl.value    = h.cg;
      if (h.ni) netIncEl.value  = h.ni;
      if (h.a)  assetsEl.value  = h.a;
      if (h.eq) equityEl.value  = h.eq;
      if (h.d)  debtEl.value    = h.d;
      if (h.ca) currAEl.value   = h.ca;
      if (h.cl) currLEl.value   = h.cl;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var lines = [
          "Financial Ratios Dashboard",
          "Gross Margin: " + document.getElementById("fr-gross-margin").textContent,
          "Net Margin: " + document.getElementById("fr-net-margin").textContent,
          "ROE: " + document.getElementById("fr-roe").textContent,
          "ROA: " + document.getElementById("fr-roa").textContent,
          "D/E Ratio: " + document.getElementById("fr-dte").textContent,
          "Current Ratio: " + document.getElementById("fr-current-ratio").textContent
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revenueEl, cogsEl, netIncEl, assetsEl, equityEl, debtEl, currAEl, currLEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcCurrentRatio: calcCurrentRatio, calcDebtToEquity: calcDebtToEquity, calcROE: calcROE, calcROA: calcROA, calcGrossMargin: calcGrossMargin, calcNetMargin: calcNetMargin };
  }
})();
