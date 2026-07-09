/* Rule of 72 Calculator */
function calcDoublingTime(annualRate) {
  if (annualRate <= 0) return null;
  return 72 / annualRate;
}

function calcRuleOf72Rate(targetYears) {
  if (targetYears <= 0) return null;
  return 72 / targetYears;
}

function calcExactDoublingTime(annualRate) {
  if (annualRate <= 0) return null;
  var r = annualRate / 100;
  return Math.log(2) / Math.log(1 + r);
}

function calcFutureValue(principal, annualRate, years) {
  var r = annualRate / 100;
  return principal * Math.pow(1 + r, years);
}

function ro72Label(doublingYears) {
  if (doublingYears === null) return { text: "Enter an annual growth rate to see how long it takes to double your money.", type: "info" };
  if (doublingYears <= 5) return { text: "Your money doubles in " + doublingYears.toFixed(1) + " years. This is an aggressive growth rate — verify sustainability.", type: "success" };
  if (doublingYears <= 10) return { text: "Your money doubles in " + doublingYears.toFixed(1) + " years. Solid growth — typical of strong equity returns.", type: "success" };
  if (doublingYears <= 18) return { text: "Your money doubles in " + doublingYears.toFixed(1) + " years. Moderate growth — consider if this meets your financial goals.", type: "warning" };
  return { text: "Your money doubles in " + doublingYears.toFixed(1) + " years. Low growth rate — inflation may erode real purchasing power.", type: "danger" };
}

if (typeof document !== "undefined") {
  function run() {
    var rate = parseFloat(document.getElementById("r72-rate").value) || 0;
    var principal = parseFloat(document.getElementById("r72-principal").value) || 10000;
    var targetYears = parseFloat(document.getElementById("r72-years").value) || 0;

    var doublingYears = calcDoublingTime(rate);
    var exactYears = calcExactDoublingTime(rate);
    var rateForTarget = calcRuleOf72Rate(targetYears);
    var fv = rate > 0 ? calcFutureValue(principal, rate, doublingYears) : null;

    var fmtYrs = function(v) { return v !== null ? v.toFixed(1) + " yrs" : "—"; };
    var fmt$ = function(v) { return v !== null ? "$" + Math.round(v).toLocaleString("en-US") : "—"; };
    var fmtPct = function(v) { return v !== null ? v.toFixed(2) + "%" : "—"; };

    var e1 = document.getElementById("r72-out-double"); if (e1) e1.textContent = fmtYrs(doublingYears);
    var e2 = document.getElementById("r72-out-exact"); if (e2) e2.textContent = fmtYrs(exactYears);
    var e3 = document.getElementById("r72-out-rate-for-target"); if (e3) e3.textContent = fmtPct(rateForTarget);
    var e4 = document.getElementById("r72-out-fv"); if (e4) e4.textContent = fmt$(fv);

    if (window.FTK) {
      var lbl = ro72Label(doublingYears);
      window.FTK.showInsight(document.getElementById("r72-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["r72-rate","r72-principal","r72-years"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcDoublingTime, calcRuleOf72Rate, calcExactDoublingTime, calcFutureValue, ro72Label };
