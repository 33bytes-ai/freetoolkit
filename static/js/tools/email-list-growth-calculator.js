(function () {
  "use strict";

  function calcNetGrowth(listSize, newPerMonth, churnRatePct) {
    if (!listSize || listSize < 0 || !newPerMonth || churnRatePct == null) return null;
    var churned = listSize * (churnRatePct / 100);
    return newPerMonth - churned;
  }

  function calcGrowthRate(listSize, netGrowth) {
    if (!listSize || listSize <= 0 || netGrowth === null) return null;
    return (netGrowth / listSize) * 100;
  }

  function calcMonthsToTarget(listSize, newPerMonth, churnRatePct, targetSize) {
    if (!listSize || !newPerMonth || churnRatePct == null || !targetSize) return null;
    if (targetSize <= listSize) return 0;
    var churnRate = churnRatePct / 100;
    if (churnRate >= 1) return null;
    if (newPerMonth <= 0) return null;
    // Steady-state size = newPerMonth / churnRate
    var steadyState = churnRate > 0 ? newPerMonth / churnRate : Infinity;
    if (steadyState < targetSize) return null; // Never reaches target
    // Solve: size(t) = steadyState + (listSize - steadyState) * e^(-churnRate * t)
    // targetSize = steadyState + (listSize - steadyState) * e^(-churnRate * t)
    // But for simplicity, iterate month by month (more intuitive)
    var size = listSize;
    for (var i = 1; i <= 1200; i++) {
      size = size + newPerMonth - size * churnRate;
      if (size >= targetSize) return i;
    }
    return null;
  }

  function growthInsight(growthRate) {
    if (growthRate === null) return null;
    if (growthRate < 0) return { text: "Your list is shrinking. You need more new subscribers to offset churn.", type: "warning" };
    if (growthRate < 1) return { text: "Slow growth. At under 1%/month, consider a lead magnet or referral program.", type: "warning" };
    if (growthRate < 3) return { text: "Moderate growth. 2-3%/month is average — focus on higher-converting opt-in forms.", type: "info" };
    return { text: "Strong list growth! Above 3%/month is top-quartile for email marketers.", type: "info" };
  }

  function fmtNum(v) {
    if (v === null || isNaN(v)) return "—";
    if (Math.abs(v) >= 1000) return (v >= 0 ? "+" : "") + v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (v >= 0 ? "+" : "") + v.toFixed(0);
  }

  function init() {
    var listEl    = document.getElementById("elg-list");
    var newEl     = document.getElementById("elg-new");
    var churnEl   = document.getElementById("elg-churn");
    var targetEl  = document.getElementById("elg-target");
    var insightEl = document.getElementById("elg-insight");
    var shareBtn  = document.getElementById("elg-share");
    var copyBtn   = document.getElementById("elg-copy");

    function update() {
      var listSize  = parseFloat(listEl.value) || 0;
      var newPerMo  = parseFloat(newEl.value) || 0;
      var churn     = parseFloat(churnEl.value) || 0;
      var target    = parseFloat(targetEl ? targetEl.value : 0) || 0;

      var netGrowth = calcNetGrowth(listSize, newPerMo, churn);
      var growthRate = calcGrowthRate(listSize, netGrowth);
      var months    = target > listSize ? calcMonthsToTarget(listSize, newPerMo, churn, target) : null;

      document.getElementById("elg-net-growth").textContent = netGrowth !== null ? fmtNum(netGrowth) + "/mo" : "—";
      document.getElementById("elg-rate").textContent = growthRate !== null ? (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%" : "—";
      document.getElementById("elg-annual-rate").textContent = growthRate !== null ? (((Math.pow(1 + growthRate / 100, 12) - 1) * 100).toFixed(0)) + "%" : "—";
      document.getElementById("elg-months").textContent = months !== null ? months + " months" : (target <= listSize && target > 0 ? "Already there!" : "—");

      window.FTK.hashSet({ l: listEl.value, n: newEl.value, c: churnEl.value, t: targetEl ? targetEl.value : "" });

      var ins = growthInsight(growthRate);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.l) listEl.value = s.l;
      if (s.n) newEl.value = s.n;
      if (s.c) churnEl.value = s.c;
      if (s.t && targetEl) targetEl.value = s.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var listSize = parseFloat(listEl.value) || 0;
        var newPerMo = parseFloat(newEl.value) || 0;
        var churn = parseFloat(churnEl.value) || 0;
        var target = parseFloat(targetEl ? targetEl.value : 0) || 0;
        var netGrowth = calcNetGrowth(listSize, newPerMo, churn);
        var growthRate = calcGrowthRate(listSize, netGrowth);
        var months = target > listSize ? calcMonthsToTarget(listSize, newPerMo, churn, target) : null;
        var lines = [
          "List size: " + listSize.toLocaleString(),
          "Net monthly growth: " + (netGrowth !== null ? fmtNum(netGrowth) : "—"),
          "Monthly growth rate: " + (growthRate !== null ? growthRate.toFixed(1) + "%" : "—"),
          "Target: " + (target ? target.toLocaleString() : "—"),
          "Months to target: " + (months !== null ? months : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [listEl, newEl, churnEl, targetEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcNetGrowth, calcGrowthRate, calcMonthsToTarget };
  }
})();
