/* MIRR Calculator — Modified Internal Rate of Return */
function calcMIRR(cashflows, financeRate, reinvestRate) {
  if (!cashflows || cashflows.length < 2) return null;
  var n = cashflows.length - 1;
  if (n === 0) return null;

  // PV of negative cash flows discounted at finance rate
  var pvNeg = 0;
  cashflows.forEach(function (cf, i) {
    if (cf < 0) {
      pvNeg += cf / Math.pow(1 + financeRate / 100, i);
    }
  });

  // FV of positive cash flows compounded at reinvestment rate
  var fvPos = 0;
  cashflows.forEach(function (cf, i) {
    if (cf > 0) {
      fvPos += cf * Math.pow(1 + reinvestRate / 100, n - i);
    }
  });

  if (pvNeg === 0 || fvPos === 0) return null;
  return (Math.pow(fvPos / Math.abs(pvNeg), 1 / n) - 1) * 100;
}

function mirrLabel(mirr, hurdleRate) {
  if (mirr === null) return { text: "Enter cash flows with at least one negative and one positive value.", type: "info" };
  if (hurdleRate !== null && mirr > hurdleRate) {
    return { text: "MIRR of " + mirr.toFixed(1) + "% exceeds hurdle rate of " + hurdleRate.toFixed(1) + "% — investment creates value.", type: "success" };
  }
  if (hurdleRate !== null && mirr <= hurdleRate) {
    return { text: "MIRR of " + mirr.toFixed(1) + "% is below hurdle rate of " + hurdleRate.toFixed(1) + "% — investment destroys value at this reinvestment assumption.", type: "danger" };
  }
  if (mirr < 0) return { text: "Negative MIRR — the investment returns less than it costs at these rates.", type: "danger" };
  if (mirr < 8) return { text: "MIRR of " + mirr.toFixed(1) + "% is low — only viable for low-risk projects.", type: "warning" };
  if (mirr < 15) return { text: "MIRR of " + mirr.toFixed(1) + "% is moderate — typical for real estate and infrastructure.", type: "info" };
  return { text: "MIRR of " + mirr.toFixed(1) + "% is strong — suitable for PE/growth equity thresholds.", type: "success" };
}

if (typeof document !== "undefined") {
  function getCFs() {
    var flows = [];
    document.querySelectorAll(".mirr-cf-input").forEach(function (el) {
      var v = parseFloat(el.value);
      if (!isNaN(v)) flows.push(v);
    });
    return flows;
  }

  function run() {
    var cfs = getCFs();
    var fr = parseFloat(document.getElementById("mirr-finance").value) || 0;
    var rr = parseFloat(document.getElementById("mirr-reinvest").value) || 0;
    var hurdle = parseFloat(document.getElementById("mirr-hurdle").value);
    var hurdleVal = isNaN(hurdle) ? null : hurdle;
    var mirr = calcMIRR(cfs, fr, rr);

    var e1 = document.getElementById("mirr-out-mirr");
    if (e1) e1.textContent = mirr !== null ? mirr.toFixed(2) + "%" : "—";

    if (window.FTK) {
      var lbl = mirrLabel(mirr, hurdleVal);
      window.FTK.showInsight(document.getElementById("mirr-insight"), lbl.text, lbl.type);
    }
  }

  function addRow(val) {
    var container = document.getElementById("mirr-cf-container");
    if (!container) return;
    var count = container.querySelectorAll(".mirr-cf-row").length;
    var row = document.createElement("div");
    row.className = "mirr-cf-row field" ;
    row.style.cssText = "display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem";
    row.innerHTML = '<label style="min-width:60px;font-size:0.82rem;color:var(--text-muted)">Year ' + count + '</label>'
      + '<input type="number" step="any" class="mirr-cf-input" value="' + (val !== undefined ? val : "") + '" placeholder="e.g. -50000" style="flex:1">'
      + '<button type="button" onclick="this.closest(\'.mirr-cf-row\').remove();window._mirrRun&&window._mirrRun()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;color:var(--text-muted)">✕</button>';
    row.querySelector(".mirr-cf-input").addEventListener("input", run);
    container.appendChild(row);
    run();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var addBtn = document.getElementById("mirr-add-row");
    if (addBtn) addBtn.addEventListener("click", function () { addRow(); });
    window._mirrRun = run;
    ["mirr-finance", "mirr-reinvest", "mirr-hurdle"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    [-100000, 25000, 30000, 35000, 40000].forEach(function (v) { addRow(v); });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcMIRR, mirrLabel };
