(function () {
  "use strict";

  function calculateRunway(cash, expenses, revenue) {
    var netBurn = expenses - revenue;
    if (netBurn <= 0) return { netBurn: netBurn, months: Infinity, profitable: true };
    return { netBurn: netBurn, months: cash / netBurn, profitable: false };
  }

  function runwayEndDate(months) {
    if (!isFinite(months)) return null;
    var date = new Date();
    date.setMonth(date.getMonth() + Math.floor(months));
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  }

  function monthsToBreakEven(expenses, revenue, growthRatePct) {
    if (revenue >= expenses) return 0;
    if (growthRatePct <= 0) return Infinity;
    var rate = growthRatePct / 100;
    var months = 0;
    var rev = revenue;
    while (rev < expenses && months < 240) {
      rev = rev * (1 + rate);
      months++;
    }
    return months;
  }

  function init() {
    var cashEl = document.getElementById("rw-cash");
    var expEl = document.getElementById("rw-expenses");
    var revEl = document.getElementById("rw-revenue");
    var growthEl = document.getElementById("rw-growth");
    var burnEl = document.getElementById("rw-burn");
    var runwayEl = document.getElementById("rw-runway");
    var endDateEl = document.getElementById("rw-end-date");
    var breakevenEl = document.getElementById("rw-breakeven");
    var insightEl = document.getElementById("rw-insight");

    function fmtUSD(v) { return "$" + Math.abs(Math.round(v)).toLocaleString(); }

    function update() {
      var cash = parseFloat(cashEl.value) || 0;
      var expenses = parseFloat(expEl.value) || 0;
      var revenue = parseFloat(revEl.value) || 0;
      var growth = parseFloat(growthEl.value) || 0;

      var result = calculateRunway(cash, expenses, revenue);

      burnEl.textContent = fmtUSD(result.netBurn) + (result.netBurn <= 0 ? " (profitable)" : "");
      runwayEl.textContent = isFinite(result.months) ? Math.floor(result.months) + " mo" : "∞";
      endDateEl.textContent = result.profitable ? "Already profitable" : (runwayEndDate(result.months) || "—");

      var be = monthsToBreakEven(expenses, revenue, growth);
      breakevenEl.textContent = isFinite(be) ? (be === 0 ? "Now" : be + " mo") : "Never at current growth";

      if (!result.profitable && isFinite(result.months)) {
        if (result.months < 6) {
          window.FTK.showInsight(insightEl,
            "Under 6 months of runway — this is a fundraising emergency. " +
            "Start investor conversations immediately and identify costs that can be cut this week.",
            "danger"
          );
        } else if (result.months < 12) {
          window.FTK.showInsight(insightEl,
            "Under 12 months of runway. Investors typically take 3–6 months to close. " +
            "Start fundraising now, or model a path to default-alive by reducing burn.",
            "warning"
          );
        } else {
          window.FTK.showInsight(insightEl, null);
        }
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ c: cashEl.value, e: expEl.value, r: revEl.value, g: growthEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.c) return;
      if (s.c) cashEl.value = s.c;
      if (s.e) expEl.value = s.e;
      if (s.r) revEl.value = s.r;
      if (s.g) growthEl.value = s.g;
    }

    var copyBtn = document.getElementById("rw-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = [
          "Net burn: " + burnEl.textContent,
          "Runway: " + runwayEl.textContent,
          "Cash-out: " + endDateEl.textContent,
          "Break-even: " + breakevenEl.textContent,
        ].join(" | ");
        window.FTK.copyToClipboard(text).then(function () {
          window.FTK.flash(copyBtn, "Copied!", 1500);
        });
      });
    }

    var shareBtn = document.getElementById("rw-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [cashEl, expEl, revEl, growthEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateRunway: calculateRunway, monthsToBreakEven: monthsToBreakEven, runwayEndDate: runwayEndDate };
  }
})();
