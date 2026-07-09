(function () {
  "use strict";

  function calculateFreelanceRate(options) {
    var target = options.annualTarget || 0;
    var taxRate = (options.taxRatePct || 0) / 100;
    var expenses = options.annualExpenses || 0;
    var weeks = options.billableWeeks || 46;
    var billablePct = (options.billableHoursPct || 70) / 100;
    var hoursPerWeek = options.hoursPerWeek || 40;

    if (taxRate >= 1) return null;

    var requiredGross = (target + expenses) / (1 - taxRate);
    var billableHoursPerYear = weeks * hoursPerWeek * billablePct;

    if (billableHoursPerYear <= 0) return null;

    var hourlyRate = requiredGross / billableHoursPerYear;
    return {
      requiredGross: requiredGross,
      billableHours: billableHoursPerYear,
      hourlyRate: hourlyRate,
      dayRate: hourlyRate * 8,
    };
  }

  function init() {
    var targetEl = document.getElementById("fr-target");
    var taxEl = document.getElementById("fr-tax");
    var expEl = document.getElementById("fr-expenses");
    var weeksEl = document.getElementById("fr-weeks");
    var pctEl = document.getElementById("fr-billable-pct");
    var pctVal = document.getElementById("fr-billable-val");

    var grossEl = document.getElementById("fr-gross");
    var hoursEl = document.getElementById("fr-hours");
    var hourlyEl = document.getElementById("fr-hourly");
    var dailyEl = document.getElementById("fr-daily");

    pctEl.addEventListener("input", function () { pctVal.textContent = pctEl.value; update(); });

    function update() {
      var result = calculateFreelanceRate({
        annualTarget: parseFloat(targetEl.value),
        taxRatePct: parseFloat(taxEl.value),
        annualExpenses: parseFloat(expEl.value),
        billableWeeks: parseFloat(weeksEl.value),
        billableHoursPct: parseFloat(pctEl.value),
        hoursPerWeek: 40,
      });

      if (!result) return;
      grossEl.textContent = "$" + Math.round(result.requiredGross).toLocaleString();
      hoursEl.textContent = Math.round(result.billableHours) + " h";
      hourlyEl.textContent = "$" + Math.round(result.hourlyRate) + "/hr";
      dailyEl.textContent = "$" + Math.round(result.dayRate) + "/day";
      window.FTK.hashSet({ t: targetEl.value, tx: taxEl.value, e: expEl.value, w: weeksEl.value, p: pctEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.t) return;
      targetEl.value = s.t;
      taxEl.value    = s.tx;
      expEl.value    = s.e;
      weeksEl.value  = s.w;
      if (s.p) { pctEl.value = s.p; pctVal.textContent = s.p; }
    }

    var copyBtn = document.getElementById("fr-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Gross income: " + grossEl.textContent + " | Billable hours: " + hoursEl.textContent + " | Hourly rate: " + hourlyEl.textContent + " | Day rate: " + dailyEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("fr-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [targetEl, taxEl, expEl, weeksEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateFreelanceRate: calculateFreelanceRate };
  }
})();
