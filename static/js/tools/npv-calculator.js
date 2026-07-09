(function () {
  "use strict";

  function calcPresentValue(cashFlow, discountRate, period) {
    if (cashFlow == null || discountRate == null || !period || period <= 0) return null;
    if (discountRate < 0) return null;
    return cashFlow / Math.pow(1 + discountRate / 100, period);
  }

  function calcNPV(initialInvestment, cashFlows, discountRate) {
    if (initialInvestment == null || !cashFlows || cashFlows.length === 0) return null;
    if (discountRate == null || discountRate < 0) return null;
    var npv = -initialInvestment;
    for (var i = 0; i < cashFlows.length; i++) {
      if (cashFlows[i] != null) {
        npv += cashFlows[i] / Math.pow(1 + discountRate / 100, i + 1);
      }
    }
    return npv;
  }

  function calcProfitabilityIndex(npv, initialInvestment) {
    if (npv == null || !initialInvestment || initialInvestment <= 0) return null;
    return (npv + initialInvestment) / initialInvestment;
  }

  function calcSimplePayback(initialInvestment, annualCashFlow) {
    if (!initialInvestment || initialInvestment <= 0 || !annualCashFlow || annualCashFlow <= 0) return null;
    return initialInvestment / annualCashFlow;
  }

  function npvLabel(npv, initialInvestment) {
    if (npv === null) return null;
    if (npv > 0) {
      var roi = (npv / initialInvestment) * 100;
      return { text: "Positive NPV: $" + (npv / 1000).toFixed(1) + "k — investment creates value. NPV ROI: +" + roi.toFixed(1) + "% of initial investment.", type: "info" };
    }
    if (npv === 0) return { text: "NPV = $0 — investment exactly meets the required rate of return. IRR equals the discount rate.", type: "info" };
    return { text: "Negative NPV: $" + (npv / 1000).toFixed(1) + "k — investment destroys value at this discount rate. Consider a higher-return project or lower cost of capital.", type: "warning" };
  }

  function init() {
    var investEl  = document.getElementById("npv-invest");
    var rateEl    = document.getElementById("npv-rate");
    var cf1El     = document.getElementById("npv-cf1");
    var cf2El     = document.getElementById("npv-cf2");
    var cf3El     = document.getElementById("npv-cf3");
    var cf4El     = document.getElementById("npv-cf4");
    var cf5El     = document.getElementById("npv-cf5");
    var insEl     = document.getElementById("npv-insight");
    var shareBtn  = document.getElementById("npv-share");
    var copyBtn   = document.getElementById("npv-copy");

    function getCashFlows() {
      return [cf1El, cf2El, cf3El, cf4El, cf5El]
        .map(function (el) { return el && el.value !== "" ? parseFloat(el.value) : null; })
        .filter(function (v) { return v !== null; });
    }

    function update() {
      var invest = parseFloat(investEl.value) || 0;
      var rate   = parseFloat(rateEl.value)   || 10;
      var cfs    = getCashFlows();
      var totalCF = cfs.reduce(function (a, b) { return a + b; }, 0);

      var npv = calcNPV(invest, cfs, rate);
      var pi  = npv !== null ? calcProfitabilityIndex(npv, invest) : null;
      var pb  = calcSimplePayback(invest, totalCF / Math.max(cfs.length, 1));

      document.getElementById("npv-result").textContent  = npv !== null ? "$" + (npv / 1000).toFixed(2) + "k" : "--";
      document.getElementById("npv-pi").textContent      = pi  !== null ? pi.toFixed(3)    : "--";
      document.getElementById("npv-payback").textContent = pb  !== null ? pb.toFixed(1) + " yrs" : "--";
      document.getElementById("npv-total-cf").textContent = "$" + (totalCF / 1000).toFixed(1) + "k";

      window.FTK.hashSet({ i: investEl.value, r: rateEl.value, c1: cf1El.value, c2: cf2El.value, c3: cf3El.value, c4: cf4El.value, c5: cf5El.value });

      var ins = npvLabel(npv, invest);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.i)  investEl.value = h.i;
      if (h.r)  rateEl.value   = h.r;
      if (h.c1) cf1El.value    = h.c1;
      if (h.c2) cf2El.value    = h.c2;
      if (h.c3) cf3El.value    = h.c3;
      if (h.c4) cf4El.value    = h.c4;
      if (h.c5) cf5El.value    = h.c5;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var invest = parseFloat(investEl.value) || 0;
        var rate   = parseFloat(rateEl.value)   || 10;
        var cfs    = getCashFlows();
        var npv    = calcNPV(invest, cfs, rate);
        var lines  = [
          "Initial investment: $" + (invest / 1000).toFixed(1) + "k",
          "Discount rate: " + rate + "%",
          "Cash flows: " + cfs.map(function (v, i) { return "Y" + (i + 1) + ": $" + (v / 1000).toFixed(1) + "k"; }).join(", "),
          "NPV: " + (npv !== null ? "$" + (npv / 1000).toFixed(2) + "k" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [investEl, rateEl, cf1El, cf2El, cf3El, cf4El, cf5El].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPresentValue, calcNPV, calcProfitabilityIndex, calcSimplePayback, npvLabel };
  }
})();
