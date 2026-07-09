/* CAC Payback Period Calculator */
function calcPaybackMonths(cac, arpu, grossMarginPct) {
  if (arpu <= 0 || grossMarginPct <= 0) return null;
  var monthlyGrossProfit = arpu * (grossMarginPct / 100);
  if (monthlyGrossProfit <= 0) return null;
  return cac / monthlyGrossProfit;
}

function calcMonthlyGrossProfit(arpu, grossMarginPct) {
  return arpu * (grossMarginPct / 100);
}

function calcBreakEvenMRR(cac, paybackMonths) {
  if (paybackMonths <= 0) return null;
  return cac / paybackMonths;
}

function paybackLabel(months) {
  if (months === null) return { text: "Enter CAC, ARPU, and gross margin to calculate payback period.", type: "info" };
  if (months <= 6) return { text: "Payback in " + months.toFixed(1) + " months. Excellent — you recover CAC quickly, enabling aggressive growth.", type: "success" };
  if (months <= 12) return { text: "Payback in " + months.toFixed(1) + " months. Good — within the 12-month benchmark VCs look for.", type: "success" };
  if (months <= 18) return { text: "Payback in " + months.toFixed(1) + " months. Acceptable for enterprise SaaS. Consider reducing CAC or improving margin.", type: "warning" };
  if (months <= 24) return { text: "Payback in " + months.toFixed(1) + " months. High — ensure LTV is 3× CAC or more at this payback period.", type: "warning" };
  return { text: "Payback in " + months.toFixed(1) + " months. Very long payback. Reduce CAC through organic growth or improve product pricing.", type: "danger" };
}

if (typeof document !== "undefined") {
  function run() {
    var cac = parseFloat(document.getElementById("cpp-cac").value) || 0;
    var arpu = parseFloat(document.getElementById("cpp-arpu").value) || 0;
    var margin = parseFloat(document.getElementById("cpp-margin").value) || 0;

    var months = calcPaybackMonths(cac, arpu, margin);
    var mgp = calcMonthlyGrossProfit(arpu, margin);
    var years = months !== null ? months / 12 : null;
    var ltv3x = cac > 0 ? cac * 3 : null;

    var fmtMo = function(v) { return v !== null ? v.toFixed(1) + " mo" : "—"; };
    var fmtYr = function(v) { return v !== null ? v.toFixed(2) + " yrs" : "—"; };
    var fmt$ = function(v) { return v !== null ? "$" + Math.round(v).toLocaleString("en-US") : "—"; };

    var e1 = document.getElementById("cpp-out-months"); if (e1) { e1.textContent = fmtMo(months); e1.style.color = months !== null && months <= 12 ? "var(--success,#16a34a)" : months !== null && months > 24 ? "#dc2626" : ""; }
    var e2 = document.getElementById("cpp-out-years"); if (e2) e2.textContent = fmtYr(years);
    var e3 = document.getElementById("cpp-out-mgp"); if (e3) e3.textContent = fmt$(mgp);
    var e4 = document.getElementById("cpp-out-ltv3x"); if (e4) e4.textContent = fmt$(ltv3x);

    if (window.FTK) {
      var lbl = paybackLabel(months);
      window.FTK.showInsight(document.getElementById("cpp-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["cpp-cac","cpp-arpu","cpp-margin"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcPaybackMonths, calcMonthlyGrossProfit, calcBreakEvenMRR, paybackLabel };
