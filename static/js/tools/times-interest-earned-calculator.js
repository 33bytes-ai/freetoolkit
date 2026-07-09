(function () {
  "use strict";

  function calcTIE(ebit, interestExpense) {
    if (interestExpense <= 0) return null;
    return ebit / interestExpense;
  }

  function calcEBIT(revenue, cogs, operatingExpenses) {
    return revenue - cogs - operatingExpenses;
  }

  function calcMaxDebt(ebit, targetTIE, interestRatePct) {
    if (targetTIE <= 0 || interestRatePct <= 0) return null;
    var maxInterest = ebit / targetTIE;
    return (maxInterest / (interestRatePct / 100));
  }

  function calcInterestCoverageBuffer(tie) {
    if (tie === null) return null;
    return ((tie - 1) / tie) * 100;
  }

  function tieLabel(tie) {
    if (tie === null || tie === undefined) return "";
    if (tie >= 5)   return "Strong coverage";
    if (tie >= 3)   return "Adequate coverage";
    if (tie >= 1.5) return "Tight coverage";
    if (tie >= 1)   return "Minimal coverage";
    return "Cannot cover interest";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var ebitEl  = document.getElementById("tie-ebit");
    var intEl   = document.getElementById("tie-interest");
    var insEl   = document.getElementById("tie-insight");
    var copyBtn = document.getElementById("tie-copy");
    var shareBtn = document.getElementById("tie-share");

    function update() {
      var ebit = parseFloat(ebitEl.value)  || 0;
      var inte = parseFloat(intEl.value)   || 0;

      var tie    = calcTIE(ebit, inte);
      var buffer = calcInterestCoverageBuffer(tie);

      document.getElementById("tie-result").textContent   = tie !== null ? tie.toFixed(2) + "×" : "--";
      document.getElementById("tie-buffer").textContent   = buffer !== null ? buffer.toFixed(1) + "%" : "--";
      document.getElementById("tie-ebit-show").textContent = fmt(ebit);

      window.FTK.hashSet({ e: ebit, i: inte });

      if (tie !== null) {
        var label = tieLabel(tie);
        var type  = tie >= 3 ? "success" : tie >= 1.5 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — TIE of " + tie.toFixed(2) + "×. " +
          "EBIT can drop by " + (buffer !== null ? buffer.toFixed(1) + "%" : "--") + " before interest cannot be covered. " +
          "Lenders typically require TIE ≥ 1.5; investment grade: ≥ 3.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.e) ebitEl.value = h.e;
      if (h.i) intEl.value  = h.i;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ebit = parseFloat(ebitEl.value) || 0;
        var inte = parseFloat(intEl.value)  || 0;
        var tie  = calcTIE(ebit, inte);
        var lines = [
          "Times Interest Earned (TIE) Calculator",
          "EBIT: " + fmt(ebit),
          "Interest Expense: " + fmt(inte),
          "TIE Ratio: " + (tie !== null ? tie.toFixed(2) + "×" : "--"),
          "Coverage Buffer: " + (calcInterestCoverageBuffer(tie) !== null ? calcInterestCoverageBuffer(tie).toFixed(1) + "%" : "--"),
          "Assessment: " + tieLabel(tie)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [ebitEl, intEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcTIE: calcTIE, calcEBIT: calcEBIT, calcMaxDebt: calcMaxDebt, calcInterestCoverageBuffer: calcInterestCoverageBuffer, tieLabel: tieLabel };
  }
})();
