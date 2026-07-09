(function () {
  "use strict";

  function calcContributionMargin(sellingPrice, variableCost) {
    if (!sellingPrice || sellingPrice <= 0) return null;
    return sellingPrice - variableCost;
  }

  function calcContributionMarginRatio(sellingPrice, variableCost) {
    if (!sellingPrice || sellingPrice <= 0) return null;
    return ((sellingPrice - variableCost) / sellingPrice) * 100;
  }

  function calcBreakEvenUnits(fixedCosts, unitContributionMargin) {
    if (!unitContributionMargin || unitContributionMargin <= 0) return null;
    return Math.ceil(fixedCosts / unitContributionMargin);
  }

  function calcTargetProfitUnits(fixedCosts, targetProfit, unitContributionMargin) {
    if (!unitContributionMargin || unitContributionMargin <= 0) return null;
    return Math.ceil((fixedCosts + targetProfit) / unitContributionMargin);
  }

  function cmLabel(cmRatio) {
    if (cmRatio === null) return null;
    if (cmRatio >= 70) return { text: "Excellent CM ratio (" + cmRatio.toFixed(1) + "%). Strong pricing power and low variable costs — typical of SaaS and digital products.", type: "info" };
    if (cmRatio >= 50) return { text: "Healthy CM ratio (" + cmRatio.toFixed(1) + "%). Good unit economics. Focus on scaling volume to cover fixed costs.", type: "info" };
    if (cmRatio >= 30) return { text: "Moderate CM ratio (" + cmRatio.toFixed(1) + "%). Consider whether variable costs can be reduced or price increased to improve margins.", type: "info" };
    return { text: "Low CM ratio (" + cmRatio.toFixed(1) + "%). Each unit contributes little to covering fixed costs. Review your cost structure or pricing strategy.", type: "warning" };
  }

  function init() {
    var priceEl   = document.getElementById("cm-price");
    var varEl     = document.getElementById("cm-variable");
    var fixedEl   = document.getElementById("cm-fixed");
    var targetEl  = document.getElementById("cm-target");
    var insEl     = document.getElementById("cm-insight");
    var shareBtn  = document.getElementById("cm-share-btn");
    var copyBtn   = document.getElementById("cm-copy");

    function update() {
      var price  = parseFloat(priceEl.value)  || 0;
      var varcost = parseFloat(varEl.value)    || 0;
      var fixed  = parseFloat(fixedEl.value)  || 0;
      var target = parseFloat(targetEl.value) || 0;

      var cm    = calcContributionMargin(price, varcost);
      var cmr   = calcContributionMarginRatio(price, varcost);
      var beu   = cm ? calcBreakEvenUnits(fixed, cm) : null;
      var tpu   = cm ? calcTargetProfitUnits(fixed, target, cm) : null;

      document.getElementById("cm-result").textContent  = cm !== null ? "$" + cm.toFixed(2) : "--";
      document.getElementById("cm-ratio").textContent   = cmr !== null ? cmr.toFixed(1) + "%" : "--";
      document.getElementById("cm-beu").textContent     = beu !== null ? beu.toLocaleString() + " units" : "--";
      document.getElementById("cm-target-units").textContent = tpu !== null ? tpu.toLocaleString() + " units" : "--";

      window.FTK.hashSet({ p: priceEl.value, v: varEl.value, f: fixedEl.value, t: targetEl.value });

      var ins = cmLabel(cmr);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) priceEl.value  = h.p;
      if (h.v) varEl.value    = h.v;
      if (h.f) fixedEl.value  = h.f;
      if (h.t) targetEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var price   = parseFloat(priceEl.value)  || 0;
        var varcost = parseFloat(varEl.value)    || 0;
        var fixed   = parseFloat(fixedEl.value)  || 0;
        var target  = parseFloat(targetEl.value) || 0;
        var cm  = calcContributionMargin(price, varcost);
        var cmr = calcContributionMarginRatio(price, varcost);
        var beu = cm ? calcBreakEvenUnits(fixed, cm) : null;
        var tpu = cm ? calcTargetProfitUnits(fixed, target, cm) : null;
        var lines = [
          "Unit CM: $" + (cm !== null ? cm.toFixed(2) : "--"),
          "CM Ratio: " + (cmr !== null ? cmr.toFixed(1) + "%" : "--"),
          "Break-even units: " + (beu !== null ? beu.toLocaleString() : "--"),
          "Units for target profit: " + (tpu !== null ? tpu.toLocaleString() : "--"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [priceEl, varEl, fixedEl, targetEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcContributionMargin, calcContributionMarginRatio, calcBreakEvenUnits, calcTargetProfitUnits, cmLabel };
  }
})();
