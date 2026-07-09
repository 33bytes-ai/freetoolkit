(function () {
  "use strict";

  function calcOCF(netIncome, depreciation, workingCapitalChange) {
    if (netIncome == null || depreciation == null || workingCapitalChange == null) return null;
    return netIncome + depreciation + workingCapitalChange;
  }

  function calcCashConversionRatio(ocf, netIncome) {
    if (!netIncome || netIncome === 0 || ocf === null) return null;
    return ocf / netIncome;
  }

  function calcFreeCashFlow(ocf, capex) {
    if (ocf === null || capex == null) return null;
    return ocf - capex;
  }

  function ocfLabel(ccr) {
    if (ccr === null) return null;
    if (ccr < 0) return { text: "Negative OCF despite positive net income — working capital is consuming cash. Investigate receivables and inventory.", type: "warning" };
    if (ccr < 0.8) return { text: "Cash conversion ratio below 0.8×. Your reported income exceeds your cash generation — watch receivables and accruals.", type: "warning" };
    if (ccr < 1.2) return { text: "Cash conversion ratio near 1× — income and cash flow are well aligned.", type: "info" };
    return { text: "Cash conversion above 1.2× — OCF exceeds net income. Usually positive: depreciation adds back non-cash charges.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    var sign = v < 0 ? "-" : "";
    return sign + "$" + Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function init() {
    var niEl    = document.getElementById("ocf-net-income");
    var daEl    = document.getElementById("ocf-da");
    var wcEl    = document.getElementById("ocf-wc");
    var capexEl = document.getElementById("ocf-capex");
    var insightEl = document.getElementById("ocf-insight");
    var shareBtn  = document.getElementById("ocf-share");
    var copyBtn   = document.getElementById("ocf-copy");

    function update() {
      var ni    = parseFloat(niEl.value) || 0;
      var da    = parseFloat(daEl.value) || 0;
      var wc    = parseFloat(wcEl.value) || 0;
      var capex = parseFloat(capexEl.value) || 0;

      var ocf = calcOCF(ni, da, wc);
      var ccr = calcCashConversionRatio(ocf, ni);
      var fcf = calcFreeCashFlow(ocf, capex);

      document.getElementById("ocf-result").textContent = fmtCurrency(ocf);
      document.getElementById("ocf-ccr").textContent    = ccr !== null ? ccr.toFixed(2) + "×" : "—";
      document.getElementById("ocf-fcf").textContent    = fmtCurrency(fcf);
      document.getElementById("ocf-ni-display").textContent = fmtCurrency(ni);

      window.FTK.hashSet({ n: niEl.value, d: daEl.value, w: wcEl.value, k: capexEl.value });

      var ins = ocfLabel(ccr);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.n) niEl.value = h.n;
      if (h.d) daEl.value = h.d;
      if (h.w) wcEl.value = h.w;
      if (h.k) capexEl.value = h.k;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ni    = parseFloat(niEl.value) || 0;
        var da    = parseFloat(daEl.value) || 0;
        var wc    = parseFloat(wcEl.value) || 0;
        var capex = parseFloat(capexEl.value) || 0;
        var ocf = calcOCF(ni, da, wc);
        var ccr = calcCashConversionRatio(ocf, ni);
        var fcf = calcFreeCashFlow(ocf, capex);
        var lines = [
          "Net income: " + fmtCurrency(ni),
          "D&A: " + fmtCurrency(da),
          "Working capital change: " + fmtCurrency(wc),
          "Operating cash flow: " + fmtCurrency(ocf),
          "Cash conversion ratio: " + (ccr !== null ? ccr.toFixed(2) + "×" : "—"),
          "CapEx: " + fmtCurrency(capex),
          "Free cash flow: " + fmtCurrency(fcf),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [niEl, daEl, wcEl, capexEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcOCF, calcCashConversionRatio, calcFreeCashFlow, ocfLabel };
  }
})();
