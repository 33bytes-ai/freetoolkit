(function () {
  "use strict";

  function rule40Score(growthRatePct, profitMarginPct) {
    return growthRatePct + profitMarginPct;
  }

  function rule40Label(score) {
    if (score >= 40) return "Passes Rule of 40 — healthy balance of growth and profitability";
    if (score >= 20) return "Below 40 — acceptable early-stage, needs improvement at scale";
    return "Significantly below 40 — growth or margin needs urgent attention";
  }

  function init() {
    var growthEl  = document.getElementById("r40-growth");
    var marginEl  = document.getElementById("r40-margin");
    var scoreEl   = document.getElementById("r40-out-score");
    var labelEl   = document.getElementById("r40-out-label");
    var insightEl = document.getElementById("r40-insight");

    function update() {
      var growth = parseFloat(growthEl.value) || 0;
      var margin = parseFloat(marginEl.value) || 0;
      var score  = rule40Score(growth, margin);

      scoreEl.textContent = (score > 0 ? "+" : "") + score.toFixed(1);
      labelEl.textContent = rule40Label(score);

      if (score >= 40) {
        window.FTK.showInsight(insightEl, null);
      } else if (score >= 20) {
        window.FTK.showInsight(insightEl,
          "You need +" + (40 - score).toFixed(0) + " points to reach 40. " +
          "Most VCs expect Rule of 40 compliance around $10M ARR. " +
          "The fastest lever is usually growth rate — or margin improvement by cutting low-ROI spend.",
          "info");
      } else {
        window.FTK.showInsight(insightEl,
          "Score below 20 signals neither strong growth nor near-term profitability. " +
          "Identify which lever — growth rate or margin — has the highest near-term improvement potential and focus there.",
          "danger");
      }
      window.FTK.hashSet({ g: growthEl.value, m: marginEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || s.g === undefined) return;
      growthEl.value = s.g;
      marginEl.value = s.m;
    }

    var copyBtn = document.getElementById("r40-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Rule of 40 Score: " + scoreEl.textContent + " | " + labelEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("r40-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [growthEl, marginEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { rule40Score: rule40Score, rule40Label: rule40Label };
  }
})();
