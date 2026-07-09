(function () {
  "use strict";

  function calculateBreakEven(fixedCosts, pricePerUnit, variableCostPerUnit) {
    var contributionMargin = pricePerUnit - variableCostPerUnit;
    if (pricePerUnit <= 0) return { ok: false, error: "Price per unit must be greater than zero." };
    if (contributionMargin <= 0) {
      return { ok: false, error: "Variable cost per unit is equal to or greater than price — this product cannot break even." };
    }
    var contributionMarginPct = (contributionMargin / pricePerUnit) * 100;
    var breakEvenUnits = fixedCosts / contributionMargin;
    var breakEvenRevenue = breakEvenUnits * pricePerUnit;
    return {
      ok: true,
      contributionMargin: contributionMargin,
      contributionMarginPct: contributionMarginPct,
      breakEvenUnits: breakEvenUnits,
      breakEvenRevenue: breakEvenRevenue,
    };
  }

  function init() {
    var fixedEl = document.getElementById("be-fixed");
    var priceEl = document.getElementById("be-price");
    var varEl = document.getElementById("be-variable");
    var errorEl = document.getElementById("be-error");

    function update() {
      var result = calculateBreakEven(
        parseFloat(fixedEl.value) || 0,
        parseFloat(priceEl.value) || 0,
        parseFloat(varEl.value) || 0
      );
      var price = parseFloat(priceEl.value) || 0;
      var varCost = parseFloat(varEl.value) || 0;
      if (window.FTK) {
        window.FTK.setFieldError(priceEl, price <= 0 ? "Must be greater than zero" : null);
        window.FTK.setFieldError(varEl, varCost >= price && price > 0 ? "Variable cost must be less than price" : null);
      }
      if (!result.ok) {
        window.FTK.showError(errorEl, result.error);
        return;
      }
      window.FTK.showError(errorEl, null);
      document.getElementById("be-contribution").textContent = "$" + result.contributionMargin.toFixed(2);
      document.getElementById("be-cm-pct").textContent = result.contributionMarginPct.toFixed(1) + "%";
      document.getElementById("be-units").textContent = Math.ceil(result.breakEvenUnits).toLocaleString();
      document.getElementById("be-revenue").textContent = "$" + Math.round(result.breakEvenRevenue).toLocaleString();
      window.FTK.hashSet({ f: fixedEl.value, p: priceEl.value, v: varEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.f) return;
      if (s.f) fixedEl.value = s.f;
      if (s.p) priceEl.value = s.p;
      if (s.v) varEl.value = s.v;
    }

    var copyBtn = document.getElementById("be-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = [
          "Contribution margin: " + document.getElementById("be-contribution").textContent,
          "CM%: " + document.getElementById("be-cm-pct").textContent,
          "Break-even units: " + document.getElementById("be-units").textContent,
          "Break-even revenue: " + document.getElementById("be-revenue").textContent,
        ].join(" | ");
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("be-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [fixedEl, priceEl, varEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateBreakEven: calculateBreakEven };
  }
})();
