(function () {
  "use strict";

  function calcQuickRatio(newMRR, expansionMRR, contractionMRR, churnedMRR) {
    var lost = (contractionMRR || 0) + (churnedMRR || 0);
    if (lost <= 0) return null;
    return ((newMRR || 0) + (expansionMRR || 0)) / lost;
  }

  function calcGrowthMRR(newMRR, expansionMRR) {
    return (newMRR || 0) + (expansionMRR || 0);
  }

  function calcLostMRR(contractionMRR, churnedMRR) {
    return (contractionMRR || 0) + (churnedMRR || 0);
  }

  function calcNetNewMRR(newMRR, expansionMRR, contractionMRR, churnedMRR) {
    return calcGrowthMRR(newMRR, expansionMRR) - calcLostMRR(contractionMRR, churnedMRR);
  }

  function quickRatioLabel(qr) {
    if (qr === null) return null;
    if (qr >= 4) return { text: "Quick Ratio " + qr.toFixed(2) + "x — Exceptional. Growing 4x faster than you're losing MRR. World-class retention and expansion.", type: "info" };
    if (qr >= 2) return { text: "Quick Ratio " + qr.toFixed(2) + "x — Good. Healthy growth. Optimize expansion revenue and reduce churn to push above 4x.", type: "info" };
    if (qr >= 1) return { text: "Quick Ratio " + qr.toFixed(2) + "x — Breakeven-ish. You're growing, but barely faster than you lose customers. Focus on churn reduction.", type: "warning" };
    return { text: "Quick Ratio " + qr.toFixed(2) + "x — Declining. You're losing more MRR than you're adding. Immediate action required on churn.", type: "warning" };
  }

  function fmtMRR(v) {
    if (v === null || isNaN(v)) return "--";
    if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var newEl   = document.getElementById("sqr-new-mrr");
    var expEl   = document.getElementById("sqr-expansion-mrr");
    var conEl   = document.getElementById("sqr-contraction-mrr");
    var chuEl   = document.getElementById("sqr-churned-mrr");
    var insEl   = document.getElementById("sqr-insight");
    var shareBtn = document.getElementById("sqr-share");
    var copyBtn  = document.getElementById("sqr-copy");

    function update() {
      var n = parseFloat(newEl.value) || 0;
      var e = parseFloat(expEl.value) || 0;
      var c = parseFloat(conEl.value) || 0;
      var h = parseFloat(chuEl.value) || 0;

      var qr      = calcQuickRatio(n, e, c, h);
      var growth  = calcGrowthMRR(n, e);
      var lost    = calcLostMRR(c, h);
      var netNew  = calcNetNewMRR(n, e, c, h);

      document.getElementById("sqr-result").textContent      = qr !== null ? qr.toFixed(2) + "x" : "--";
      document.getElementById("sqr-growth-mrr").textContent  = fmtMRR(growth);
      document.getElementById("sqr-lost-mrr").textContent    = fmtMRR(lost);
      document.getElementById("sqr-net-new-mrr").textContent = fmtMRR(netNew);

      window.FTK.hashSet({ n: newEl.value, e: expEl.value, c: conEl.value, h: chuEl.value });

      var ins = quickRatioLabel(qr);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.n) newEl.value = h.n;
      if (h.e) expEl.value = h.e;
      if (h.c) conEl.value = h.c;
      if (h.h) chuEl.value = h.h;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var n = parseFloat(newEl.value) || 0;
        var e = parseFloat(expEl.value) || 0;
        var c = parseFloat(conEl.value) || 0;
        var h = parseFloat(chuEl.value) || 0;
        var qr = calcQuickRatio(n, e, c, h);
        var lines = [
          "New MRR: " + fmtMRR(n),
          "Expansion MRR: " + fmtMRR(e),
          "Contraction MRR: " + fmtMRR(c),
          "Churned MRR: " + fmtMRR(h),
          "SaaS Quick Ratio: " + (qr !== null ? qr.toFixed(2) + "x" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [newEl, expEl, conEl, chuEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcQuickRatio, calcGrowthMRR, calcLostMRR, calcNetNewMRR, quickRatioLabel };
  }
})();
