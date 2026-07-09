(function () {
  "use strict";

  function estimateProject(hourlyRate, estimatedHours, contingencyPct) {
    if (hourlyRate <= 0 || estimatedHours <= 0) return null;
    var baseCost    = hourlyRate * estimatedHours;
    var contingency = baseCost * (contingencyPct / 100);
    var total       = baseCost + contingency;
    return {
      baseCost:    baseCost,
      contingency: contingency,
      total:       total,
      days:        estimatedHours / 8,
      dayRate:     hourlyRate * 8,
    };
  }

  function init() {
    var rateEl        = document.getElementById("pe-rate");
    var hoursEl       = document.getElementById("pe-hours");
    var contingencyEl = document.getElementById("pe-contingency");
    var baseEl        = document.getElementById("pe-out-base");
    var contingOutEl  = document.getElementById("pe-out-contingency");
    var totalEl       = document.getElementById("pe-out-total");
    var daysEl        = document.getElementById("pe-out-days");
    var insightEl     = document.getElementById("pe-insight");

    function fmt(v) { return "$" + Math.round(v).toLocaleString(); }

    function update() {
      var rate   = parseFloat(rateEl.value)        || 0;
      var hours  = parseFloat(hoursEl.value)       || 0;
      var contin = parseFloat(contingencyEl.value) || 0;
      var result = estimateProject(rate, hours, contin);
      if (!result) return;

      baseEl.textContent       = fmt(result.baseCost);
      contingOutEl.textContent = fmt(result.contingency);
      totalEl.textContent      = fmt(result.total);
      daysEl.textContent       = result.days.toFixed(1) + " days at " + fmt(result.dayRate) + "/day";

      if (contin < 15) {
        window.FTK.showInsight(insightEl,
          "Contingency below 15% is risky — most projects overrun their initial estimate by 20–50%. " +
          "20% is the industry standard; 30% for unclear or research-heavy requirements.",
          "warning");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ r: rateEl.value, h: hoursEl.value, c: contingencyEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.r) return;
      rateEl.value        = s.r;
      hoursEl.value       = s.h;
      contingencyEl.value = s.c;
    }

    var copyBtn = document.getElementById("pe-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Base: " + baseEl.textContent + " | Contingency: " + contingOutEl.textContent + " | Total: " + totalEl.textContent + " | " + daysEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("pe-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [rateEl, hoursEl, contingencyEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { estimateProject: estimateProject };
  }
})();
