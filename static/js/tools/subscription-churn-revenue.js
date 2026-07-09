(function () {
  "use strict";

  function calcChurnRevenueLoss(mrr, churnRate) {
    var monthlyLoss = mrr * (churnRate / 100);
    return {
      monthlyLoss:     monthlyLoss,
      annualLoss:      monthlyLoss * 12,
      avgCustomerLife: churnRate > 0 ? 1 / (churnRate / 100) : null,
    };
  }

  function calcNewMrrNeeded(mrr, churnRate, targetGrowthPct) {
    var churned = mrr * (churnRate / 100);
    var delta = mrr * (targetGrowthPct / 100);
    return churned + delta;
  }

  function init() {
    var mrrEl    = document.getElementById("scr-mrr");
    var churnEl  = document.getElementById("scr-churn");
    var growthEl = document.getElementById("scr-growth");
    var insightEl = document.getElementById("scr-insight");
    var shareBtn  = document.getElementById("scr-share");
    var copyBtn   = document.getElementById("scr-copy");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
      if (v >= 1000)    return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + v.toFixed(0);
    }

    function update() {
      var mrr    = parseFloat(mrrEl.value) || 0;
      var churn  = parseFloat(churnEl.value) || 0;
      var growth = parseFloat(growthEl.value) || 0;
      if (mrr <= 0 || churn <= 0) return;

      var r = calcChurnRevenueLoss(mrr, churn);
      var newMrrNeeded = calcNewMrrNeeded(mrr, churn, growth);

      document.getElementById("scr-monthly-loss").textContent   = fmt(r.monthlyLoss);
      document.getElementById("scr-annual-loss").textContent    = fmt(r.annualLoss);
      document.getElementById("scr-breakeven-mrr").textContent  = fmt(r.monthlyLoss);
      document.getElementById("scr-new-mrr-needed").textContent = fmt(newMrrNeeded);
      document.getElementById("scr-avg-life").textContent       =
        r.avgCustomerLife ? r.avgCustomerLife.toFixed(1) + " mo" : "—";

      window.FTK.hashSet({ m: mrrEl.value, c: churnEl.value, g: growthEl.value });

      var msg;
      if (churn >= 10) {
        msg = "At " + churn + "% monthly churn your average customer lasts " +
          (r.avgCustomerLife ? r.avgCustomerLife.toFixed(1) : "?") + " months. " +
          "This is critical — reduce churn before scaling acquisition.";
        window.FTK.showInsight(insightEl, msg, "warning");
      } else {
        msg = "You lose " + fmt(r.monthlyLoss) + " MRR each month to churn. " +
          "To grow " + growth + "% monthly you must acquire " + fmt(newMrrNeeded) + " new MRR/mo.";
        window.FTK.showInsight(insightEl, msg, "info");
      }
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.m) mrrEl.value    = s.m;
      if (s.c) churnEl.value  = s.c;
      if (s.g) growthEl.value = s.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var lines = [
          "Monthly revenue lost: " + document.getElementById("scr-monthly-loss").textContent,
          "Annual revenue lost: "  + document.getElementById("scr-annual-loss").textContent,
          "New MRR to break even: " + document.getElementById("scr-breakeven-mrr").textContent,
          "New MRR to hit growth target: " + document.getElementById("scr-new-mrr-needed").textContent,
          "Avg customer lifetime: " + document.getElementById("scr-avg-life").textContent,
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [mrrEl, churnEl, growthEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcChurnRevenueLoss: calcChurnRevenueLoss, calcNewMrrNeeded: calcNewMrrNeeded };
  }
})();
