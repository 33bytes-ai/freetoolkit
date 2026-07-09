(function () {
  "use strict";

  function projectMRR(startMRR, monthlyChurnPct, newMRRPerMonth, months) {
    var mrr = startMRR;
    var churnRate = monthlyChurnPct / 100;
    for (var i = 0; i < months; i++) {
      mrr = mrr * (1 - churnRate) + newMRRPerMonth;
    }
    return mrr;
  }

  function churnReductionValue(startMRR, churnPct, reductionPct, newMRRPerMonth, months) {
    var base = projectMRR(startMRR, churnPct, newMRRPerMonth, months);
    var improved = projectMRR(startMRR, churnPct - reductionPct, newMRRPerMonth, months);
    return improved - base;
  }

  function init() {
    var mrrEl = document.getElementById("churn-mrr");
    var rateEl = document.getElementById("churn-rate");
    var newMRREl = document.getElementById("churn-new-mrr");
    var out3 = document.getElementById("churn-out-3mo");
    var out6 = document.getElementById("churn-out-6mo");
    var out12 = document.getElementById("churn-out-12mo");
    var outSaved = document.getElementById("churn-out-saved");
    var insightEl = document.getElementById("churn-insight");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
      if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + Math.round(v).toLocaleString();
    }

    function update() {
      var mrr = parseFloat(mrrEl.value) || 0;
      var rate = parseFloat(rateEl.value) || 0;
      var newMRR = parseFloat(newMRREl.value) || 0;

      out3.textContent = fmt(projectMRR(mrr, rate, newMRR, 3));
      out6.textContent = fmt(projectMRR(mrr, rate, newMRR, 6));
      out12.textContent = fmt(projectMRR(mrr, rate, newMRR, 12));
      outSaved.textContent = fmt(churnReductionValue(mrr, rate, 1, newMRR, 12));

      if (rate > 8) {
        window.FTK.showInsight(insightEl,
          "Monthly churn above 8% is critical — at this rate your MRR will shrink even with strong acquisition. " +
          "The root cause is almost always product-fit or onboarding. Talk to churned customers this week.",
          "danger"
        );
      } else if (rate > 5) {
        window.FTK.showInsight(insightEl,
          "Monthly churn above 5% makes compounding growth very hard to achieve. " +
          "Investing in retention (onboarding, proactive success, dunning) typically yields more per dollar than paid acquisition at this stage.",
          "warning"
        );
      } else if (rate > 2) {
        window.FTK.showInsight(insightEl,
          "Median SaaS monthly churn is 2–4%, so you're in a normal range. " +
          "Each percentage point you reduce churn compounds significantly over time — see the '1% less churn' value above.",
          "info"
        );
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ m: mrrEl.value, r: rateEl.value, n: newMRREl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.m) return;
      if (s.m) mrrEl.value = s.m;
      if (s.r) rateEl.value = s.r;
      if (s.n) newMRREl.value = s.n;
    }

    var copyBtn = document.getElementById("churn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = [
          "MRR 3mo: " + out3.textContent,
          "6mo: " + out6.textContent,
          "12mo: " + out12.textContent,
          "Value of 1% less churn: " + outSaved.textContent,
        ].join(" | ");
        window.FTK.copyToClipboard(text).then(function () {
          window.FTK.flash(copyBtn, "Copied!", 1500);
        });
      });
    }

    var shareBtn = document.getElementById("churn-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [mrrEl, rateEl, newMRREl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { projectMRR: projectMRR, churnReductionValue: churnReductionValue };
  }
})();
