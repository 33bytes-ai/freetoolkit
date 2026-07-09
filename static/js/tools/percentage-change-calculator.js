(function () {
  "use strict";

  function calcPercentageChange(oldValue, newValue) {
    if (oldValue === 0) return null;
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  }

  function calcNewValueFromChange(oldValue, changePct) {
    return oldValue * (1 + changePct / 100);
  }

  function calcOldValueFromChange(newValue, changePct) {
    if (changePct === -100) return null;
    return newValue / (1 + changePct / 100);
  }

  function calcAbsoluteChange(oldValue, newValue) {
    return newValue - oldValue;
  }

  function calcCAGR(startValue, endValue, years) {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  }

  function changeLabel(pct) {
    if (pct === null || pct === undefined) return "";
    if (pct > 0) return "Increase";
    if (pct < 0) return "Decrease";
    return "No change";
  }

  function init() {
    var oldEl   = document.getElementById("pct-old");
    var newEl   = document.getElementById("pct-new");
    var yearsEl = document.getElementById("pct-years");
    var insEl   = document.getElementById("pct-insight");
    var copyBtn = document.getElementById("pct-copy");
    var shareBtn = document.getElementById("pct-share");

    function update() {
      var oldVal = parseFloat(oldEl.value);
      var newVal = parseFloat(newEl.value);
      var years  = parseFloat(yearsEl.value) || 1;

      var change   = (!isNaN(oldVal) && !isNaN(newVal)) ? calcPercentageChange(oldVal, newVal) : null;
      var absolute = (!isNaN(oldVal) && !isNaN(newVal)) ? calcAbsoluteChange(oldVal, newVal) : null;
      var cagr     = (years > 1 && oldVal > 0 && newVal > 0) ? calcCAGR(oldVal, newVal, years) : null;

      document.getElementById("pct-change").textContent   = change   !== null ? (change >= 0 ? "+" : "") + change.toFixed(2) + "%"   : "--";
      document.getElementById("pct-absolute").textContent = absolute !== null ? (absolute >= 0 ? "+" : "") + absolute.toFixed(2)     : "--";
      document.getElementById("pct-factor").textContent   = (!isNaN(oldVal) && oldVal !== 0 && !isNaN(newVal)) ? (newVal / oldVal).toFixed(3) + "×" : "--";
      document.getElementById("pct-cagr").textContent     = cagr !== null ? cagr.toFixed(2) + "%/yr" : "--";

      window.FTK.hashSet({ o: oldVal, n: newVal, y: years });

      if (change !== null) {
        var label = changeLabel(change);
        var type  = change >= 0 ? "success" : "warning";
        window.FTK.showInsight(insEl,
          label + " of " + Math.abs(change).toFixed(2) + "%. " +
          "Absolute change: " + (absolute >= 0 ? "+" : "") + absolute.toFixed(2) + ". " +
          (cagr !== null ? "CAGR over " + years + " years: " + cagr.toFixed(2) + "%/yr." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.o !== undefined) oldEl.value   = h.o;
      if (h.n !== undefined) newEl.value   = h.n;
      if (h.y) yearsEl.value = h.y;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var o = parseFloat(oldEl.value);
        var n = parseFloat(newEl.value);
        var lines = [
          "Percentage Change Calculator Results",
          "Original Value: " + o,
          "New Value: " + n,
          "% Change: " + (calcPercentageChange(o, n) !== null ? calcPercentageChange(o, n).toFixed(2) + "%" : "--"),
          "Absolute Change: " + (n - o).toFixed(2),
          "Factor: " + (o !== 0 ? (n / o).toFixed(3) + "×" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [oldEl, newEl, yearsEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPercentageChange: calcPercentageChange, calcNewValueFromChange: calcNewValueFromChange, calcOldValueFromChange: calcOldValueFromChange, calcAbsoluteChange: calcAbsoluteChange, calcCAGR: calcCAGR, changeLabel: changeLabel };
  }
})();
