(function () {
  "use strict";

  function calcTurnoverRate(employeesSeparated, avgHeadcount) {
    if (avgHeadcount <= 0) return null;
    return (employeesSeparated / avgHeadcount) * 100;
  }

  function calcAvgHeadcount(startHeadcount, endHeadcount) {
    return (startHeadcount + endHeadcount) / 2;
  }

  function calcReplacementCost(avgSalary, replacementCostPct) {
    return avgSalary * (replacementCostPct / 100);
  }

  function calcAnnualTurnoverCost(employeesSeparated, avgSalary, replacementCostPct) {
    return employeesSeparated * calcReplacementCost(avgSalary, replacementCostPct);
  }

  function calcRetentionRate(turnoverRate) {
    if (turnoverRate === null) return null;
    return 100 - turnoverRate;
  }

  function turnoverLabel(rate) {
    if (rate === null || rate === undefined) return "";
    if (rate <= 5)   return "Very low — strong retention";
    if (rate <= 10)  return "Low — healthy";
    if (rate <= 15)  return "Average";
    if (rate <= 25)  return "High — above average";
    return "Very high — critical retention problem";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(0) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var sepEl     = document.getElementById("et-separated");
    var startEl   = document.getElementById("et-start-hc");
    var endEl     = document.getElementById("et-end-hc");
    var salEl     = document.getElementById("et-avg-salary");
    var replEl    = document.getElementById("et-repl-pct");
    var insEl     = document.getElementById("et-insight");
    var copyBtn   = document.getElementById("et-copy");
    var shareBtn  = document.getElementById("et-share");

    function update() {
      var sep   = parseFloat(sepEl.value)   || 0;
      var start = parseFloat(startEl.value) || 0;
      var end   = parseFloat(endEl.value)   || 0;
      var sal   = parseFloat(salEl.value)   || 0;
      var repl  = parseFloat(replEl.value)  || 33;

      var avgHC    = calcAvgHeadcount(start, end);
      var rate     = calcTurnoverRate(sep, avgHC);
      var ret      = calcRetentionRate(rate);
      var annCost  = sep > 0 && sal > 0 ? calcAnnualTurnoverCost(sep, sal, repl) : null;

      document.getElementById("et-result").textContent   = rate    !== null ? rate.toFixed(1) + "%" : "--";
      document.getElementById("et-retention").textContent = ret    !== null ? ret.toFixed(1) + "%" : "--";
      document.getElementById("et-cost").textContent     = annCost !== null ? fmt(annCost) : "--";

      window.FTK.hashSet({ s: sep, sh: start, eh: end, sal: sal, r: repl });

      if (rate !== null) {
        var label = turnoverLabel(rate);
        var type  = rate <= 10 ? "success" : rate <= 15 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — " + rate.toFixed(1) + "% annual turnover. " +
          (annCost !== null ? "Estimated annual replacement cost: " + fmt(annCost) + " (at " + repl + "% of salary)." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s)   sepEl.value   = h.s;
      if (h.sh)  startEl.value = h.sh;
      if (h.eh)  endEl.value   = h.eh;
      if (h.sal) salEl.value   = h.sal;
      if (h.r)   replEl.value  = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var sep   = parseFloat(sepEl.value)   || 0;
        var start = parseFloat(startEl.value) || 0;
        var end   = parseFloat(endEl.value)   || 0;
        var sal   = parseFloat(salEl.value)   || 0;
        var repl  = parseFloat(replEl.value)  || 33;
        var avgHC = calcAvgHeadcount(start, end);
        var rate  = calcTurnoverRate(sep, avgHC);
        var lines = [
          "Employee Turnover Calculator",
          "Employees Separated: " + sep,
          "Avg Headcount: " + avgHC.toFixed(0),
          "Turnover Rate: " + (rate !== null ? rate.toFixed(1) + "%" : "--"),
          "Retention Rate: " + (rate !== null ? calcRetentionRate(rate).toFixed(1) + "%" : "--"),
          sal > 0 ? "Annual Replacement Cost: " + fmt(calcAnnualTurnoverCost(sep, sal, repl)) : null
        ].filter(Boolean);
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [sepEl, startEl, endEl, salEl, replEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcTurnoverRate: calcTurnoverRate, calcAvgHeadcount: calcAvgHeadcount, calcReplacementCost: calcReplacementCost, calcAnnualTurnoverCost: calcAnnualTurnoverCost, calcRetentionRate: calcRetentionRate, turnoverLabel: turnoverLabel };
  }
})();
