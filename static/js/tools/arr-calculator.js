(function () {
  "use strict";

  function calcARR(mrr) {
    if (!mrr || mrr <= 0) return null;
    return mrr * 12;
  }

  function calcMRRFromARR(arr) {
    if (!arr || arr <= 0) return null;
    return arr / 12;
  }

  function calcARRGrowth(currentARR, previousARR) {
    if (!currentARR || !previousARR || previousARR <= 0) return null;
    return ((currentARR - previousARR) / previousARR) * 100;
  }

  function calcProjectedARR(currentARR, monthlyGrowthRate, months) {
    if (!currentARR || currentARR <= 0 || monthlyGrowthRate == null || !months || months <= 0) return null;
    return currentARR * Math.pow(1 + monthlyGrowthRate / 100, months);
  }

  function arrLabel(arr) {
    if (arr === null) return null;
    if (arr < 100000) return { text: "Pre-seed range. Focus on product-market fit over ARR growth.", type: "info" };
    if (arr < 1000000) return { text: "Seed stage. Key milestone: reach $1M ARR to qualify for most Series A rounds.", type: "info" };
    if (arr < 5000000) return { text: "$1M-$5M ARR. Series A territory. Investors look for 2x+ YoY growth at this stage.", type: "info" };
    if (arr < 20000000) return { text: "$5M-$20M ARR. Series B territory. Efficiency metrics become as important as growth.", type: "info" };
    return { text: "$20M+ ARR. Growth stage. NRR, gross margin, and payback period are the key investor metrics.", type: "info" };
  }

  function fmtARR(v) {
    if (v === null || isNaN(v)) return "--";
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var mrrEl    = document.getElementById("arr-mrr");
    var prevEl   = document.getElementById("arr-prev-arr");
    var growthEl = document.getElementById("arr-growth-rate");
    var insightEl = document.getElementById("arr-insight");
    var shareBtn = document.getElementById("arr-share");
    var copyBtn  = document.getElementById("arr-copy");

    function update() {
      var mrr      = parseFloat(mrrEl.value) || 0;
      var prevARR  = parseFloat(prevEl.value) || 0;
      var growthPct = parseFloat(growthEl.value) || 0;

      var arr      = calcARR(mrr);
      var yoyGrowth = (arr !== null && prevARR > 0) ? calcARRGrowth(arr, prevARR) : null;
      var proj12   = (arr !== null && growthPct !== 0) ? calcProjectedARR(arr, growthPct, 12) : null;
      var proj24   = (arr !== null && growthPct !== 0) ? calcProjectedARR(arr, growthPct, 24) : null;

      document.getElementById("arr-result").textContent  = fmtARR(arr);
      document.getElementById("arr-yoy").textContent     = yoyGrowth !== null ? (yoyGrowth >= 0 ? "+" : "") + yoyGrowth.toFixed(1) + "%" : "--";
      document.getElementById("arr-proj12").textContent  = fmtARR(proj12);
      document.getElementById("arr-proj24").textContent  = fmtARR(proj24);

      window.FTK.hashSet({ m: mrrEl.value, p: prevEl.value, g: growthEl.value });

      var ins = arrLabel(arr);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.m) mrrEl.value    = h.m;
      if (h.p) prevEl.value   = h.p;
      if (h.g) growthEl.value = h.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var mrr   = parseFloat(mrrEl.value) || 0;
        var arr   = calcARR(mrr);
        var lines = ["MRR: " + fmtARR(mrr), "ARR: " + fmtARR(arr)];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [mrrEl, prevEl, growthEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcARR, calcMRRFromARR, calcARRGrowth, calcProjectedARR };
  }
})();
