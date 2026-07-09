(function () {
  "use strict";

  function calcROE(netIncome, shareholdersEquity) {
    if (!shareholdersEquity || shareholdersEquity === 0) return null;
    return (netIncome / shareholdersEquity) * 100;
  }

  function calcDupontROE(netProfitMargin, assetTurnover, equityMultiplier) {
    return netProfitMargin * assetTurnover * equityMultiplier;
  }

  function calcEquityMultiplier(totalAssets, shareholdersEquity) {
    if (!shareholdersEquity || shareholdersEquity === 0) return null;
    return totalAssets / shareholdersEquity;
  }

  function calcRetainedEarningsGrowth(roe, payoutRatio) {
    return roe * (1 - payoutRatio / 100);
  }

  function roeLabel(roe) {
    if (roe === null) return null;
    if (roe >= 20) return { text: "Excellent ROE (" + roe.toFixed(1) + "%). The business generates strong returns on shareholder capital. Compare against your industry benchmark — high ROE driven by profit margins and asset efficiency is more sustainable than high ROE driven purely by financial leverage.", type: "info" };
    if (roe >= 15) return { text: "Good ROE (" + roe.toFixed(1) + "%). Above the long-run average for US equities (~13–15%). Indicates efficient capital use.", type: "info" };
    if (roe >= 10) return { text: "Acceptable ROE (" + roe.toFixed(1) + "%). In line with the broad market average. Investors may require higher ROE to justify an above-average valuation multiple.", type: "info" };
    return { text: "Low ROE (" + roe.toFixed(1) + "%). Below typical cost of equity (~10%). At this level, the business may be destroying value relative to investor expectations. Use DuPont analysis to identify which component — margin, turnover, or leverage — most needs improvement.", type: "warning" };
  }

  function init() {
    var netIncomeEl  = document.getElementById("roe-net-income");
    var equityEl     = document.getElementById("roe-equity");
    var outROE       = document.getElementById("roe-out-roe");
    var outLabel     = document.getElementById("roe-out-label");
    var insEl        = document.getElementById("roe-insight");
    var shareBtn     = document.getElementById("roe-share");
    var copyBtn      = document.getElementById("roe-copy");

    function update() {
      var netIncome = parseFloat(netIncomeEl ? netIncomeEl.value : 0) || 0;
      var equity    = parseFloat(equityEl    ? equityEl.value    : 0) || 0;

      var roe = calcROE(netIncome, equity);

      if (outROE)   outROE.textContent   = roe !== null ? roe.toFixed(1) + "%" : "--";
      if (outLabel) outLabel.textContent = roe !== null ? (roe >= 20 ? "Excellent" : roe >= 15 ? "Good" : roe >= 10 ? "Acceptable" : "Needs improvement") : "--";

      window.FTK.hashSet({ ni: netIncomeEl ? netIncomeEl.value : "", eq: equityEl ? equityEl.value : "" });

      var ins = roeLabel(roe);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      function s(el, v) { if (el && v !== undefined) el.value = v; }
      s(netIncomeEl, h.ni); s(equityEl, h.eq);
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ni = parseFloat(netIncomeEl ? netIncomeEl.value : 0) || 0;
        var eq = parseFloat(equityEl ? equityEl.value : 0) || 0;
        var roe = calcROE(ni, eq);
        window.FTK.copyToClipboard("ROE: " + (roe !== null ? roe.toFixed(1) + "%" : "--"))
          .then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [netIncomeEl, equityEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcROE, calcDupontROE, calcEquityMultiplier, calcRetainedEarningsGrowth, roeLabel };
  }
})();
