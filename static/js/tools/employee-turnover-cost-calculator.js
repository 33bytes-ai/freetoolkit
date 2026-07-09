/* Employee Turnover Cost Calculator */
function calcTurnoverCostPerExit(annualSalary, daysToFill, recruitingCost) {
  if (!annualSalary) return null;
  var dailyRate       = annualSalary / 260;
  var separationCost  = annualSalary * 0.04;
  var vacancyCost     = dailyRate * (daysToFill || 42);
  var recruitCost     = recruitingCost || annualSalary * 0.15;
  var onboardingCost  = annualSalary * 0.12;
  var rampCost        = annualSalary * 0.25;
  return separationCost + vacancyCost + recruitCost + onboardingCost + rampCost;
}

function calcAnnualTurnoverCost(costPerExit, headcount, turnoverRate) {
  if (!costPerExit || !headcount || !turnoverRate) return null;
  return costPerExit * headcount * (turnoverRate / 100);
}

function calcTurnoverCostAsPctPayroll(annualTurnoverCost, headcount, avgSalary) {
  if (!annualTurnoverCost || !headcount || !avgSalary) return null;
  return (annualTurnoverCost / (headcount * avgSalary)) * 100;
}

function turnoverLabel(pctSalary) {
  if (pctSalary < 50)  return { text: "Below benchmark — SHRM estimates typical turnover costs 50–200% of annual salary per exit. Check your inputs.", type: "info" };
  if (pctSalary < 100) return { text: "Within SHRM benchmark range (50–100% of salary). Structured onboarding can cut this by 30–50%.", type: "success" };
  if (pctSalary < 150) return { text: "Above average — replacing these roles costs 1–1.5× annual salary. Focus on retention before recruiting.", type: "warning" };
  return { text: "High replacement cost. Consider compensation benchmarking, stay interviews, and manager training to reduce attrition.", type: "danger" };
}

if (typeof document !== "undefined") {
  var ids = ["etc-salary", "etc-headcount", "etc-turnover", "etc-days", "etc-recruiting"];
  function run() {
    var salary     = parseFloat(document.getElementById("etc-salary").value) || 0;
    var headcount  = parseFloat(document.getElementById("etc-headcount").value) || 0;
    var turnover   = parseFloat(document.getElementById("etc-turnover").value) || 0;
    var days       = parseFloat(document.getElementById("etc-days").value) || 42;
    var recruiting = parseFloat(document.getElementById("etc-recruiting").value) || 0;

    var costPerExit   = calcTurnoverCostPerExit(salary, days, recruiting || null);
    var annualCost    = calcAnnualTurnoverCost(costPerExit, headcount, turnover);
    var pctSalary     = salary ? (costPerExit / salary) * 100 : null;
    var pctPayroll    = calcTurnoverCostAsPctPayroll(annualCost, headcount, salary);

    var fmtK = function (v) {
      if (v === null || isNaN(v)) return "—";
      return v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + Math.round(v);
    };
    var fmtPct = function (v) { return v === null ? "—" : v.toFixed(1) + "%"; };

    var e1 = document.getElementById("etc-out-per-exit");    if (e1) e1.textContent = fmtK(costPerExit);
    var e2 = document.getElementById("etc-out-annual");      if (e2) e2.textContent = fmtK(annualCost);
    var e3 = document.getElementById("etc-out-pct-salary");  if (e3) e3.textContent = fmtPct(pctSalary);
    var e4 = document.getElementById("etc-out-pct-payroll"); if (e4) e4.textContent = fmtPct(pctPayroll);

    if (costPerExit !== null && window.FTK) {
      var lbl = turnoverLabel(pctSalary);
      window.FTK.showInsight(document.getElementById("etc-insight"), lbl.text, lbl.type);
    }
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", run);
  });
  run();
}

if (typeof module !== "undefined") module.exports = { calcTurnoverCostPerExit, calcAnnualTurnoverCost, calcTurnoverCostAsPctPayroll, turnoverLabel };
