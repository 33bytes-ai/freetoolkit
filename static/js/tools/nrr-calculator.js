/* Net Revenue Retention (NRR) Calculator */
function calcNRR(startingMRR, expansionMRR, contractionMRR, churnedMRR) {
  if (startingMRR <= 0) return null;
  return ((startingMRR + expansionMRR - contractionMRR - churnedMRR) / startingMRR) * 100;
}

function calcGrossRevRetention(startingMRR, contractionMRR, churnedMRR) {
  if (startingMRR <= 0) return null;
  var retained = startingMRR - contractionMRR - churnedMRR;
  return (Math.min(retained, startingMRR) / startingMRR) * 100;
}

function calcNetNewMRR(expansionMRR, contractionMRR, churnedMRR) {
  return expansionMRR - contractionMRR - churnedMRR;
}

function nrrLabel(nrr) {
  if (nrr === null) return { text: "Enter your starting MRR and monthly revenue movements to calculate NRR.", type: "info" };
  if (nrr >= 130) return { text: "Exceptional NRR (" + nrr.toFixed(1) + "%). World-class SaaS. Existing customers are growing revenue faster than churn costs.", type: "success" };
  if (nrr >= 110) return { text: "Strong NRR (" + nrr.toFixed(1) + "%). Expansion revenue more than offsets churn — your cohorts grow over time.", type: "success" };
  if (nrr >= 100) return { text: "Good NRR (" + nrr.toFixed(1) + "%). Revenue from existing customers is growing. Upsells offset churn.", type: "success" };
  if (nrr >= 90) return { text: "Acceptable NRR (" + nrr.toFixed(1) + "%). Below 100% means churn exceeds expansion. Focus on reducing downgrades.", type: "warning" };
  return { text: "Low NRR (" + nrr.toFixed(1) + "%). Revenue from existing customers is shrinking significantly. Retention must improve.", type: "danger" };
}

if (typeof document !== "undefined") {
  function run() {
    var start = parseFloat(document.getElementById("nrr-start").value) || 0;
    var expansion = parseFloat(document.getElementById("nrr-expansion").value) || 0;
    var contraction = parseFloat(document.getElementById("nrr-contraction").value) || 0;
    var churned = parseFloat(document.getElementById("nrr-churned").value) || 0;

    var nrr = calcNRR(start, expansion, contraction, churned);
    var grr = calcGrossRevRetention(start, contraction, churned);
    var netNew = calcNetNewMRR(expansion, contraction, churned);
    var ending = start + netNew;

    var fmtPct = function(v) { return v !== null ? v.toFixed(1) + "%" : "—"; };
    var fmt$ = function(v) { return (v >= 0 ? "+" : "-") + "$" + Math.abs(Math.round(v)).toLocaleString("en-US"); };

    var e1 = document.getElementById("nrr-out-nrr");
    if (e1) { e1.textContent = fmtPct(nrr); e1.style.color = nrr !== null && nrr >= 100 ? "var(--success,#16a34a)" : nrr !== null && nrr < 90 ? "#dc2626" : ""; }
    var e2 = document.getElementById("nrr-out-grr"); if (e2) e2.textContent = fmtPct(grr);
    var e3 = document.getElementById("nrr-out-netnew");
    if (e3) { e3.textContent = fmt$(netNew); e3.style.color = netNew >= 0 ? "var(--success,#16a34a)" : "#dc2626"; }
    var e4 = document.getElementById("nrr-out-ending"); if (e4) e4.textContent = "$" + Math.round(ending).toLocaleString("en-US");

    if (window.FTK) {
      var lbl = nrrLabel(nrr);
      window.FTK.showInsight(document.getElementById("nrr-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["nrr-start","nrr-expansion","nrr-contraction","nrr-churned"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcNRR, calcGrossRevRetention, calcNetNewMRR, nrrLabel };
