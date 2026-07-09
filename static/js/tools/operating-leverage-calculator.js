/* Operating Leverage Calculator */
function calcContributionMargin(revenue, variableCosts) {
  return revenue - variableCosts;
}

function calcOperatingIncome(revenue, variableCosts, fixedCosts) {
  return revenue - variableCosts - fixedCosts;
}

function calcDOL(revenue, variableCosts, fixedCosts) {
  var cm = calcContributionMargin(revenue, variableCosts);
  var oi = calcOperatingIncome(revenue, variableCosts, fixedCosts);
  if (oi === 0) return null;
  return cm / oi;
}

function calcBreakEvenRevenue(variableCosts, revenue, fixedCosts) {
  if (revenue === 0) return null;
  var vcRatio = variableCosts / revenue;
  if (vcRatio >= 1) return null;
  return fixedCosts / (1 - vcRatio);
}

function dolLabel(dol) {
  if (dol === null) return { text: "Operating income is zero — you are exactly at break-even.", type: "info" };
  if (dol < 0) return { text: "Negative DOL — operating income is negative. Each 1% revenue increase reduces the loss by " + Math.abs(dol).toFixed(1) + "×.", type: "warning" };
  if (dol < 2) return { text: "DOL of " + dol.toFixed(2) + "× — low operating leverage. Revenue growth has limited amplification on profit.", type: "info" };
  if (dol < 4) return { text: "DOL of " + dol.toFixed(2) + "× — moderate leverage. A 10% revenue increase → " + (dol * 10).toFixed(0) + "% operating income increase.", type: "success" };
  return { text: "DOL of " + dol.toFixed(2) + "× — high operating leverage. Growth amplifies strongly; so does a revenue decline.", type: "warning" };
}

if (typeof document !== "undefined") {
  function run() {
    var rev = parseFloat(document.getElementById("ol-revenue").value) || 0;
    var vc = parseFloat(document.getElementById("ol-variable").value) || 0;
    var fc = parseFloat(document.getElementById("ol-fixed").value) || 0;

    var cm = calcContributionMargin(rev, vc);
    var oi = calcOperatingIncome(rev, vc, fc);
    var dol = calcDOL(rev, vc, fc);
    var ber = calcBreakEvenRevenue(vc, rev, fc);
    var cmPct = rev > 0 ? (cm / rev * 100) : 0;

    var fmt$ = function (v) { return "$" + Math.round(v).toLocaleString("en-US"); };
    var e1 = document.getElementById("ol-out-cm"); if (e1) e1.textContent = fmt$(cm);
    var e2 = document.getElementById("ol-out-cmpct"); if (e2) e2.textContent = cmPct.toFixed(1) + "%";
    var e3 = document.getElementById("ol-out-oi"); if (e3) e3.textContent = fmt$(oi);
    var e4 = document.getElementById("ol-out-dol"); if (e4) e4.textContent = dol !== null ? dol.toFixed(2) + "×" : "—";
    var e5 = document.getElementById("ol-out-ber"); if (e5) e5.textContent = ber !== null ? fmt$(ber) : "—";

    if (window.FTK) {
      var lbl = dolLabel(dol);
      window.FTK.showInsight(document.getElementById("ol-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["ol-revenue", "ol-variable", "ol-fixed"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcContributionMargin, calcOperatingIncome, calcDOL, calcBreakEvenRevenue, dolLabel };
