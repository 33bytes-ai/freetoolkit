/* WACC Calculator */
function calcWACC(equity, debt, costEquity, costDebt, taxRate) {
  if (equity < 0 || debt < 0 || equity + debt === 0) return null;
  var total = equity + debt;
  var eWeight = equity / total;
  var dWeight = debt / total;
  return eWeight * costEquity + dWeight * costDebt * (1 - taxRate / 100);
}

function calcEquityWeight(equity, debt) {
  var total = equity + debt;
  if (total === 0) return null;
  return (equity / total) * 100;
}

function calcDebtWeight(equity, debt) {
  var total = equity + debt;
  if (total === 0) return null;
  return (debt / total) * 100;
}

function calcAfterTaxDebt(costDebt, taxRate) {
  return costDebt * (1 - taxRate / 100);
}

function waccLabel(wacc) {
  if (wacc < 5)  return { text: "Very low WACC — typical of utilities or investment-grade debt-heavy companies.", type: "info" };
  if (wacc < 10) return { text: "Moderate WACC — common for established profitable businesses.", type: "success" };
  if (wacc < 15) return { text: "High WACC — typical of growth companies or those with significant equity risk.", type: "warning" };
  return { text: "Very high WACC — reflects high perceived risk. Ensure cost of equity inputs are correct.", type: "danger" };
}

if (typeof document !== "undefined") {
  var ids = ["wacc-equity", "wacc-debt", "wacc-cost-equity", "wacc-cost-debt", "wacc-tax"];
  function run() {
    var equity     = parseFloat(document.getElementById("wacc-equity").value) || 0;
    var debt       = parseFloat(document.getElementById("wacc-debt").value) || 0;
    var costEquity = parseFloat(document.getElementById("wacc-cost-equity").value) || 0;
    var costDebt   = parseFloat(document.getElementById("wacc-cost-debt").value) || 0;
    var taxRate    = parseFloat(document.getElementById("wacc-tax").value) || 0;

    var equityEl = document.getElementById("wacc-equity");
    var debtEl   = document.getElementById("wacc-debt");
    if (window.FTK) {
      window.FTK.setFieldError(equityEl, equity < 0 ? "Must be 0 or positive" : null);
      window.FTK.setFieldError(debtEl,   debt < 0   ? "Must be 0 or positive" : null);
      if (equity === 0 && debt === 0) {
        window.FTK.setFieldError(equityEl, "Equity and debt cannot both be zero");
      }
    }

    var wacc       = calcWACC(equity, debt, costEquity, costDebt, taxRate);
    var eWt        = calcEquityWeight(equity, debt);
    var dWt        = calcDebtWeight(equity, debt);
    var afterDebt  = calcAfterTaxDebt(costDebt, taxRate);

    var fmt = function (v, d) { return v === null ? "—" : v.toFixed(d !== undefined ? d : 2) + "%"; };

    var out = document.getElementById("wacc-out-wacc");
    if (out) out.textContent = fmt(wacc);
    var ew = document.getElementById("wacc-out-equity-wt");
    if (ew) ew.textContent = fmt(eWt);
    var dw = document.getElementById("wacc-out-debt-wt");
    if (dw) dw.textContent = fmt(dWt);
    var ad = document.getElementById("wacc-out-after-debt");
    if (ad) ad.textContent = fmt(afterDebt);

    if (wacc !== null && window.FTK) {
      var lbl = waccLabel(wacc);
      window.FTK.showInsight(document.getElementById("wacc-insight"), lbl.text, lbl.type);
    }
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", run);
  });
  run();
}

if (typeof module !== "undefined") module.exports = { calcWACC, calcEquityWeight, calcDebtWeight, calcAfterTaxDebt, waccLabel };
