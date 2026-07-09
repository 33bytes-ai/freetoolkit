(function () {
  "use strict";

  function calcARRGrowth(currentARR, previousARR) {
    if (previousARR <= 0) return null;
    return ((currentARR - previousARR) / previousARR) * 100;
  }

  function calcYearsToTarget(currentARR, targetARR, annualGrowthRate) {
    if (currentARR <= 0 || targetARR <= currentARR || annualGrowthRate <= 0) return null;
    return Math.log(targetARR / currentARR) / Math.log(1 + annualGrowthRate / 100);
  }

  function calcT2D3Status(currentARR, yearsSinceSeed) {
    // T2D3: triple twice (years 1-2), then double three times (years 3-5)
    // Assumes $1M ARR at seed round
    var thresholds = [3, 9, 27, 54, 108];
    var expected = yearsSinceSeed <= 5 ? thresholds[yearsSinceSeed - 1] || null : null;
    return expected;
  }

  function init() {
    var currentEl  = document.getElementById("agr-current");
    var previousEl = document.getElementById("agr-previous");
    var targetEl   = document.getElementById("agr-target");
    var insightEl  = document.getElementById("agr-insight");
    var shareBtn   = document.getElementById("agr-share");
    var copyBtn    = document.getElementById("agr-copy");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
      if (v >= 1000)    return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + v.toFixed(0);
    }

    function update() {
      var current  = parseFloat(currentEl.value) || 0;
      var previous = parseFloat(previousEl.value) || 0;
      var target   = parseFloat(targetEl.value) || 0;
      if (current <= 0 || previous <= 0) return;

      var growthRate = calcARRGrowth(current, previous);
      if (growthRate === null) return;

      var yearsToTarget = target > current ? calcYearsToTarget(current, target, growthRate) : null;
      var arr3y = current * Math.pow(1 + growthRate / 100, 3);
      var arr5y = current * Math.pow(1 + growthRate / 100, 5);

      document.getElementById("agr-growth-rate").textContent  = growthRate.toFixed(1) + "%";
      document.getElementById("agr-net-new-arr").textContent  = fmt(current - previous);
      document.getElementById("agr-arr-3y").textContent       = fmt(arr3y);
      document.getElementById("agr-arr-5y").textContent       = fmt(arr5y);
      document.getElementById("agr-years-to-target").textContent =
        yearsToTarget !== null ? yearsToTarget.toFixed(1) + " yr" : "—";

      window.FTK.hashSet({ c: currentEl.value, p: previousEl.value, t: targetEl.value });

      var msg;
      if (growthRate >= 100) {
        msg = "You're growing at " + growthRate.toFixed(1) + "% YoY — T2D3 pace. At this rate you'll reach " + fmt(arr3y) + " ARR in 3 years.";
        window.FTK.showInsight(insightEl, msg, "info");
      } else if (growthRate >= 50) {
        msg = "Solid " + growthRate.toFixed(1) + "% YoY growth. You'll reach " + fmt(arr5y) + " ARR in 5 years at this pace.";
        window.FTK.showInsight(insightEl, msg, "info");
      } else if (growthRate > 0) {
        msg = "At " + growthRate.toFixed(1) + "% annual growth you're doubling every " + (72 / growthRate).toFixed(1) + " years (Rule of 72).";
        window.FTK.showInsight(insightEl, msg, "info");
      } else {
        msg = "ARR declined " + Math.abs(growthRate).toFixed(1) + "% YoY. Focus on reducing churn and expanding existing accounts.";
        window.FTK.showInsight(insightEl, msg, "warning");
      }
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.c) currentEl.value  = s.c;
      if (s.p) previousEl.value = s.p;
      if (s.t) targetEl.value   = s.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var lines = [
          "YoY growth rate: " + document.getElementById("agr-growth-rate").textContent,
          "Net new ARR: "     + document.getElementById("agr-net-new-arr").textContent,
          "ARR in 3 years: "  + document.getElementById("agr-arr-3y").textContent,
          "ARR in 5 years: "  + document.getElementById("agr-arr-5y").textContent,
          "Years to target: " + document.getElementById("agr-years-to-target").textContent,
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [currentEl, previousEl, targetEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcARRGrowth: calcARRGrowth, calcYearsToTarget: calcYearsToTarget };
  }
})();
