/* Payroll Tax Calculator — US federal employer taxes */
var SS_RATE   = 0.062;
var SS_WAGE_BASE = 160200;
var MEDICARE_RATE = 0.0145;
var FUTA_RATE = 0.006;
var FUTA_WAGE_BASE = 7000;

function calcSocialSecurity(salary) {
  return Math.min(salary, SS_WAGE_BASE) * SS_RATE;
}

function calcMedicare(salary) {
  return salary * MEDICARE_RATE;
}

function calcFUTA(salary) {
  return Math.min(salary, FUTA_WAGE_BASE) * FUTA_RATE;
}

function calcTotalPayrollTax(salary) {
  return calcSocialSecurity(salary) + calcMedicare(salary) + calcFUTA(salary);
}

function calcTotalEmploymentCost(salary) {
  return salary + calcTotalPayrollTax(salary);
}

function payrollLabel(pct) {
  if (pct < 8)  return { text: "Effective employer tax rate is below average. This is likely because salary is above the Social Security wage base.", type: "info" };
  if (pct < 10) return { text: "Typical employer tax burden. Expect ~8–10% on top of salary in federal payroll taxes.", type: "success" };
  return { text: "For budgeting: total employment cost including health insurance and 401k match is typically 1.25–1.40× base salary.", type: "info" };
}

if (typeof document !== "undefined") {
  function run() {
    var salary = parseFloat(document.getElementById("pt-salary").value) || 0;

    var ss       = calcSocialSecurity(salary);
    var medicare = calcMedicare(salary);
    var futa     = calcFUTA(salary);
    var total    = ss + medicare + futa;
    var fullCost = calcTotalEmploymentCost(salary);
    var pct      = salary ? (total / salary) * 100 : 0;

    var fmt = function (v) { return "$" + Math.round(v).toLocaleString(); };
    var e1 = document.getElementById("pt-out-ss");       if (e1) e1.textContent = fmt(ss);
    var e2 = document.getElementById("pt-out-medicare"); if (e2) e2.textContent = fmt(medicare);
    var e3 = document.getElementById("pt-out-futa");     if (e3) e3.textContent = fmt(futa);
    var e4 = document.getElementById("pt-out-total");    if (e4) e4.textContent = fmt(total);
    var e5 = document.getElementById("pt-out-full");     if (e5) e5.textContent = fmt(fullCost);

    if (window.FTK) {
      var lbl = payrollLabel(pct);
      window.FTK.showInsight(document.getElementById("pt-insight"), lbl.text, lbl.type);
    }
  }
  var el = document.getElementById("pt-salary");
  if (el) el.addEventListener("input", run);
  run();
}

if (typeof module !== "undefined") module.exports = { calcSocialSecurity, calcMedicare, calcFUTA, calcTotalPayrollTax, calcTotalEmploymentCost, payrollLabel };
