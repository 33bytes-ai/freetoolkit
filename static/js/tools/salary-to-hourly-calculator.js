(function () {
  "use strict";

  function salaryToHourly(annualSalary, hoursPerWeek, weeksPerYear) {
    var totalHours = hoursPerWeek * weeksPerYear;
    if (totalHours <= 0) return null;
    return {
      hourly: annualSalary / totalHours,
      daily: annualSalary / totalHours * 8,
      weekly: annualSalary / weeksPerYear,
    };
  }

  function afterTaxHourly(grossHourly, effectiveTaxRatePct) {
    return grossHourly * (1 - effectiveTaxRatePct / 100);
  }

  function init() {
    var salaryEl = document.getElementById("s2h-salary");
    var hoursEl = document.getElementById("s2h-hours");
    var weeksEl = document.getElementById("s2h-weeks");
    var taxEl = document.getElementById("s2h-tax");

    var hourlyEl = document.getElementById("s2h-hourly");
    var dailyEl = document.getElementById("s2h-daily");
    var weeklyEl = document.getElementById("s2h-weekly");
    var afterTaxEl = document.getElementById("s2h-after-tax");

    function fmtD(v) { return "$" + v.toFixed(2); }

    function update() {
      var salary = parseFloat(salaryEl.value) || 0;
      var hours = parseFloat(hoursEl.value) || 40;
      var weeks = parseFloat(weeksEl.value) || 52;
      var tax = parseFloat(taxEl.value) || 0;

      var result = salaryToHourly(salary, hours, weeks);
      if (!result) return;

      hourlyEl.textContent = fmtD(result.hourly);
      dailyEl.textContent = fmtD(result.daily);
      weeklyEl.textContent = "$" + Math.round(result.weekly).toLocaleString();
      afterTaxEl.textContent = fmtD(afterTaxHourly(result.hourly, tax));
      window.FTK.hashSet({ s: salaryEl.value, h: hoursEl.value, w: weeksEl.value, t: taxEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.s) return;
      salaryEl.value = s.s;
      hoursEl.value  = s.h;
      weeksEl.value  = s.w;
      taxEl.value    = s.t;
    }

    var copyBtn = document.getElementById("s2h-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Hourly: " + hourlyEl.textContent + " | Daily: " + dailyEl.textContent + " | Weekly: " + weeklyEl.textContent + " | After-tax hourly: " + afterTaxEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("s2h-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [salaryEl, hoursEl, weeksEl, taxEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { salaryToHourly: salaryToHourly, afterTaxHourly: afterTaxHourly };
  }
})();
