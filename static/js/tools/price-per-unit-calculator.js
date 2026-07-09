(function () {
  "use strict";

  function calcPricePerUnit(totalCost, quantity) {
    if (quantity <= 0) return null;
    return totalCost / quantity;
  }

  function calcTotalCost(pricePerUnit, quantity) {
    return pricePerUnit * quantity;
  }

  function calcBestValue(options) {
    if (!options || options.length === 0) return null;
    var best = null;
    var bestPPU = Infinity;
    options.forEach(function (opt) {
      var ppu = calcPricePerUnit(opt.cost, opt.qty);
      if (ppu !== null && ppu < bestPPU) {
        bestPPU = ppu;
        best = opt;
      }
    });
    return best;
  }

  function calcSavingsPct(highPPU, lowPPU) {
    if (highPPU <= 0) return null;
    return ((highPPU - lowPPU) / highPPU) * 100;
  }

  function calcUnitsNeeded(totalBudget, pricePerUnit) {
    if (pricePerUnit <= 0) return null;
    return Math.floor(totalBudget / pricePerUnit);
  }

  function init() {
    var cost1El  = document.getElementById("ppu-cost1");
    var qty1El   = document.getElementById("ppu-qty1");
    var cost2El  = document.getElementById("ppu-cost2");
    var qty2El   = document.getElementById("ppu-qty2");
    var insEl    = document.getElementById("ppu-insight");
    var copyBtn  = document.getElementById("ppu-copy");
    var shareBtn = document.getElementById("ppu-share");

    function update() {
      var c1 = parseFloat(cost1El.value) || 0;
      var q1 = parseFloat(qty1El.value)  || 0;
      var c2 = parseFloat(cost2El.value) || 0;
      var q2 = parseFloat(qty2El.value)  || 0;

      var ppu1 = calcPricePerUnit(c1, q1);
      var ppu2 = q2 > 0 ? calcPricePerUnit(c2, q2) : null;

      document.getElementById("ppu-result1").textContent = ppu1 !== null ? "$" + ppu1.toFixed(4) + "/unit" : "--";
      document.getElementById("ppu-result2").textContent = ppu2 !== null ? "$" + ppu2.toFixed(4) + "/unit" : (q2 > 0 ? "--" : "N/A");

      var savings = null;
      var cheaperLabel = "";
      if (ppu1 !== null && ppu2 !== null) {
        if (ppu1 < ppu2) {
          savings = calcSavingsPct(ppu2, ppu1);
          cheaperLabel = "Option 1 is cheaper by " + (savings !== null ? savings.toFixed(1) + "%" : "--");
        } else if (ppu2 < ppu1) {
          savings = calcSavingsPct(ppu1, ppu2);
          cheaperLabel = "Option 2 is cheaper by " + (savings !== null ? savings.toFixed(1) + "%" : "--");
        } else {
          cheaperLabel = "Same price per unit";
        }
      }
      document.getElementById("ppu-verdict").textContent = cheaperLabel || "--";

      window.FTK.hashSet({ c1: c1, q1: q1, c2: c2, q2: q2 });

      if (ppu1 !== null) {
        var msg = "Option 1: $" + ppu1.toFixed(4) + "/unit. ";
        if (ppu2 !== null) msg += "Option 2: $" + ppu2.toFixed(4) + "/unit. " + cheaperLabel + ".";
        window.FTK.showInsight(insEl, msg, ppu2 !== null ? "success" : "info");
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.c1) cost1El.value = h.c1;
      if (h.q1) qty1El.value  = h.q1;
      if (h.c2) cost2El.value = h.c2;
      if (h.q2) qty2El.value  = h.q2;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var c1 = parseFloat(cost1El.value) || 0;
        var q1 = parseFloat(qty1El.value)  || 0;
        var c2 = parseFloat(cost2El.value) || 0;
        var q2 = parseFloat(qty2El.value)  || 0;
        var ppu1 = calcPricePerUnit(c1, q1);
        var ppu2 = q2 > 0 ? calcPricePerUnit(c2, q2) : null;
        var lines = [
          "Price Per Unit Calculator",
          "Option 1: $" + c1 + " for " + q1 + " units = " + (ppu1 !== null ? "$" + ppu1.toFixed(4) + "/unit" : "--"),
          ppu2 !== null ? "Option 2: $" + c2 + " for " + q2 + " units = $" + ppu2.toFixed(4) + "/unit" : null
        ].filter(Boolean);
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [cost1El, qty1El, cost2El, qty2El].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPricePerUnit: calcPricePerUnit, calcTotalCost: calcTotalCost, calcSavingsPct: calcSavingsPct, calcUnitsNeeded: calcUnitsNeeded, calcBestValue: calcBestValue };
  }
})();
