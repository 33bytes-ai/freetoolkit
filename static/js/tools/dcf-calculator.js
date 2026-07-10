/* DCF Calculator — Discounted Cash Flow */
function calcPVCashFlows(cashflows, discountRate) {
  var r = discountRate / 100;
  return cashflows.reduce(function (sum, cf, i) {
    return sum + cf / Math.pow(1 + r, i + 1);
  }, 0);
}

function calcTerminalValue(lastCF, discountRate, terminalGrowth) {
  var r = discountRate / 100;
  var g = terminalGrowth / 100;
  if (r <= g) return null;
  return (lastCF * (1 + g)) / (r - g);
}

function calcPVTerminalValue(terminalValue, discountRate, years) {
  if (terminalValue === null) return null;
  var r = discountRate / 100;
  return terminalValue / Math.pow(1 + r, years);
}

function calcEnterpriseValue(pvCF, pvTV) {
  if (pvTV === null) return null;
  return pvCF + pvTV;
}

function dcfLabel(ev, pvTV, totalPV) {
  if (ev === null) return { text: "Terminal growth rate must be less than the discount rate.", type: "danger" };
  var tvPct = pvTV / ev * 100;
  if (tvPct > 90) return { text: "Terminal value is " + tvPct.toFixed(0) + "% of enterprise value — highly sensitive to terminal growth rate assumption. Sensitise your model.", type: "warning" };
  if (tvPct > 75) return { text: "Terminal value represents " + tvPct.toFixed(0) + "% of enterprise value — normal for growth companies.", type: "info" };
  return { text: "Terminal value is " + tvPct.toFixed(0) + "% of enterprise value. Forecast cash flows provide good coverage.", type: "success" };
}

if (typeof document !== "undefined") {
  var dcfRowSeq = 0;

  function getCFs() {
    var flows = [];
    document.querySelectorAll(".dcf-cf-input").forEach(function (el) {
      var v = parseFloat(el.value);
      if (!isNaN(v)) flows.push(v);
    });
    return flows;
  }

  function run() {
    var cfs = getCFs();
    var dr = parseFloat(document.getElementById("dcf-rate").value) || 10;
    var tg = parseFloat(document.getElementById("dcf-tgrowth").value) || 3;
    if (!cfs.length) return;
    var lastCF = cfs[cfs.length - 1];

    var pvCF = calcPVCashFlows(cfs, dr);
    var tv = calcTerminalValue(lastCF, dr, tg);
    var pvTV = calcPVTerminalValue(tv, dr, cfs.length);
    var ev = calcEnterpriseValue(pvCF, pvTV);

    var fmt = function (v) { return v === null ? "—" : "$" + Math.round(v).toLocaleString("en-US"); };
    var e1 = document.getElementById("dcf-out-pvcf"); if (e1) e1.textContent = fmt(pvCF);
    var e2 = document.getElementById("dcf-out-tv"); if (e2) e2.textContent = tv !== null ? fmt(tv) : "—";
    var e3 = document.getElementById("dcf-out-pvtv"); if (e3) e3.textContent = fmt(pvTV);
    var e4 = document.getElementById("dcf-out-ev"); if (e4) e4.textContent = fmt(ev);

    if (window.FTK) {
      var lbl = dcfLabel(ev, pvTV, pvCF);
      window.FTK.showInsight(document.getElementById("dcf-insight"), lbl.text, lbl.type);
    }
  }

  function addRow(val) {
    var container = document.getElementById("dcf-cf-container");
    if (!container) return;
    var count = container.querySelectorAll(".dcf-cf-row").length;
    if (count >= 10) return;
    var row = document.createElement("div");
    row.className = "dcf-cf-row field";
    row.style.cssText = "display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem";
    var inputId = "dcf-cf-input-" + (dcfRowSeq++);
    row.innerHTML = '<label for="' + inputId + '" style="min-width:60px;font-size:0.82rem;color:var(--text-muted)">Year ' + (count + 1) + '</label>'
      + '<input type="number" step="any" id="' + inputId + '" class="dcf-cf-input" value="' + (val !== undefined ? val : "") + '" placeholder="e.g. 500000" style="flex:1">'
      + '<button type="button" aria-label="Remove row" onclick="this.closest(\'.dcf-cf-row\').remove();window._dcfRun&&window._dcfRun()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;color:var(--text-muted)">✕</button>';
    row.querySelector(".dcf-cf-input").addEventListener("input", run);
    container.appendChild(row);
    run();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var addBtn = document.getElementById("dcf-add-year");
    if (addBtn) addBtn.addEventListener("click", function () { addRow(); });
    window._dcfRun = run;
    ["dcf-rate", "dcf-tgrowth"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    [500000, 700000, 950000, 1200000, 1500000].forEach(function (v) { addRow(v); });
  });
}

if (typeof module !== "undefined") module.exports = { calcPVCashFlows, calcTerminalValue, calcPVTerminalValue, calcEnterpriseValue, dcfLabel };
