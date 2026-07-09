(function () {
  "use strict";

  function calcCurrentRatio(currentAssets, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return currentAssets / currentLiabilities;
  }

  function calcQuickRatio(currentAssets, inventory, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return (currentAssets - inventory) / currentLiabilities;
  }

  function calcCashRatio(cashAndEquivalents, currentLiabilities) {
    if (currentLiabilities <= 0) return null;
    return cashAndEquivalents / currentLiabilities;
  }

  function calcNetWorkingCapital(currentAssets, currentLiabilities) {
    return currentAssets - currentLiabilities;
  }

  function currentRatioLabel(ratio) {
    if (ratio === null || ratio === undefined) return "";
    if (ratio >= 2.0) return "Strong";
    if (ratio >= 1.5) return "Healthy";
    if (ratio >= 1.0) return "Adequate";
    return "Liquidity Risk";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var p = prefix || "";
    if (Math.abs(n) >= 1000000) return p + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(0);
  }

  function init() {
    var assetsEl  = document.getElementById("cr-assets");
    var liabEl    = document.getElementById("cr-liabilities");
    var invEl     = document.getElementById("cr-inventory");
    var cashEl    = document.getElementById("cr-cash");
    var insEl     = document.getElementById("cr-insight");
    var copyBtn   = document.getElementById("cr-copy");
    var shareBtn  = document.getElementById("cr-share");

    function update() {
      var assets = parseFloat(assetsEl.value) || 0;
      var liab   = parseFloat(liabEl.value)   || 1;
      var inv    = parseFloat(invEl.value)    || 0;
      var cash   = parseFloat(cashEl.value)   || 0;

      var cr  = calcCurrentRatio(assets, liab);
      var qr  = calcQuickRatio(assets, inv, liab);
      var csr = calcCashRatio(cash, liab);
      var nwc = calcNetWorkingCapital(assets, liab);

      document.getElementById("cr-result").textContent  = cr  !== null ? cr.toFixed(2)  : "--";
      document.getElementById("cr-quick").textContent   = qr  !== null ? qr.toFixed(2)  : "--";
      document.getElementById("cr-cash-r").textContent  = csr !== null ? csr.toFixed(2) : "--";
      document.getElementById("cr-nwc").textContent     = fmt(nwc, "$");

      window.FTK.hashSet({ a: assets, l: liab, i: inv, c: cash });

      if (cr !== null) {
        var label = currentRatioLabel(cr);
        var type  = cr >= 1.5 ? "success" : cr >= 1.0 ? "warning" : "danger";
        window.FTK.showInsight(insEl,
          label + " — Current ratio of " + cr.toFixed(2) + "×. " +
          (cr >= 2.0 ? "Business has strong short-term liquidity — can cover current liabilities 2× over." :
           cr >= 1.5 ? "Good liquidity buffer. Most lenders consider 1.5–2× healthy." :
           cr >= 1.0 ? "Adequate but limited buffer. A drop in receivables or spike in payables could cause stress." :
           "Liabilities exceed current assets. Immediate liquidity review needed."), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a) assetsEl.value = h.a;
      if (h.l) liabEl.value   = h.l;
      if (h.i) invEl.value    = h.i;
      if (h.c) cashEl.value   = h.c;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var a = parseFloat(assetsEl.value) || 0;
        var l = parseFloat(liabEl.value) || 1;
        var i = parseFloat(invEl.value) || 0;
        var c = parseFloat(cashEl.value) || 0;
        var lines = [
          "Liquidity Ratios",
          "Current Ratio: " + (calcCurrentRatio(a, l) || "--"),
          "Quick Ratio: " + (calcQuickRatio(a, i, l) || "--"),
          "Cash Ratio: " + (calcCashRatio(c, l) || "--"),
          "Net Working Capital: " + fmt(calcNetWorkingCapital(a, l), "$")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [assetsEl, liabEl, invEl, cashEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcCurrentRatio: calcCurrentRatio, calcQuickRatio: calcQuickRatio, calcCashRatio: calcCashRatio, calcNetWorkingCapital: calcNetWorkingCapital, currentRatioLabel: currentRatioLabel };
  }
})();
