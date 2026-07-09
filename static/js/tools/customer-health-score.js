(function () {
  "use strict";

  var WEIGHTS = { usage: 0.30, engagement: 0.25, nps: 0.20, support: 0.15, growth: 0.10 };

  function calcHealthScore(scores) {
    var total = 0;
    var keys = Object.keys(WEIGHTS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = scores[k];
      if (val === null || val === undefined || isNaN(val)) return null;
      if (val < 0 || val > 100) return null;
      total += val * WEIGHTS[k];
    }
    return Math.round(total);
  }

  function healthLabel(score) {
    if (score >= 80) return { label: "Healthy", color: "#16a34a", risk: "Low churn risk — candidate for expansion." };
    if (score >= 60) return { label: "Neutral", color: "#ca8a04", risk: "Monitor closely — engagement gaps may lead to churn in 60–90 days." };
    if (score >= 40) return { label: "At Risk", color: "#dc2626", risk: "Intervene now. Assign a CSM and schedule a check-in call." };
    return { label: "Critical", color: "#7c2d12", risk: "High churn probability. Escalate immediately." };
  }

  function init() {
    var usageEl      = document.getElementById("chs-usage");
    var engagementEl = document.getElementById("chs-engagement");
    var npsEl        = document.getElementById("chs-nps");
    var supportEl    = document.getElementById("chs-support");
    var growthEl     = document.getElementById("chs-growth");
    var insightEl    = document.getElementById("chs-insight");
    var shareBtn     = document.getElementById("chs-share");
    var copyBtn      = document.getElementById("chs-copy");

    function getScores() {
      return {
        usage:      parseFloat(usageEl.value),
        engagement: parseFloat(engagementEl.value),
        nps:        parseFloat(npsEl.value),
        support:    parseFloat(supportEl.value),
        growth:     parseFloat(growthEl.value),
      };
    }

    function update() {
      var scores = getScores();
      var score = calcHealthScore(scores);
      if (score === null) return;
      var info = healthLabel(score);

      document.getElementById("chs-score").textContent = score;
      document.getElementById("chs-score").style.color = info.color;
      document.getElementById("chs-label").textContent = info.label;
      document.getElementById("chs-label").style.color = info.color;

      window.FTK.hashSet({
        u: usageEl.value, e: engagementEl.value, n: npsEl.value,
        s: supportEl.value, g: growthEl.value
      });

      window.FTK.showInsight(insightEl, info.risk, score >= 60 ? "info" : "warning");
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.u) usageEl.value      = s.u;
      if (s.e) engagementEl.value = s.e;
      if (s.n) npsEl.value        = s.n;
      if (s.s) supportEl.value    = s.s;
      if (s.g) growthEl.value     = s.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var scores = getScores();
        var score = calcHealthScore(scores);
        var info = score !== null ? healthLabel(score) : { label: "—" };
        var lines = [
          "Health Score: " + (score !== null ? score : "—") + " / 100",
          "Status: " + info.label,
          "Usage score: " + usageEl.value,
          "Engagement score: " + engagementEl.value,
          "NPS score: " + npsEl.value,
          "Support score: " + supportEl.value,
          "Growth/upsell score: " + growthEl.value,
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [usageEl, engagementEl, npsEl, supportEl, growthEl].forEach(function (el) {
      el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcHealthScore: calcHealthScore, healthLabel: healthLabel, WEIGHTS: WEIGHTS };
  }
})();
