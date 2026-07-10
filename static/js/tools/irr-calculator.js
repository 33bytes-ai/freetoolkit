/* IRR Calculator — Newton-Raphson iteration */
function calcNPV(rate, cashflows) {
  return cashflows.reduce(function (acc, cf, i) {
    return acc + cf / Math.pow(1 + rate, i);
  }, 0);
}

function calcIRR(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  if (cashflows[0] >= 0) return null; // no initial outflow
  var hasPositive = cashflows.slice(1).some(function (v) { return v > 0; });
  if (!hasPositive) return null;

  var rate = 0.1;
  for (var i = 0; i < 1000; i++) {
    var npv = calcNPV(rate, cashflows);
    var dNPV = cashflows.reduce(function (acc, cf, j) {
      return j === 0 ? acc : acc - j * cf / Math.pow(1 + rate, j + 1);
    }, 0);
    if (Math.abs(dNPV) < 1e-12) break;
    var newRate = rate - npv / dNPV;
    if (Math.abs(newRate - rate) < 1e-8) { rate = newRate; break; }
    rate = newRate;
    if (rate < -0.999) rate = -0.5;
  }
  if (!isFinite(rate) || Math.abs(calcNPV(rate, cashflows)) > 1) return null;
  return rate * 100;
}

function calcNPVAtRate(cashflows, discountRate) {
  return calcNPV(discountRate / 100, cashflows);
}

function irrLabel(irr, hurdle) {
  if (irr === null) return { text: "Could not compute IRR. Ensure there is an initial investment (negative value) and at least one positive cash flow.", type: "warning" };
  if (hurdle && irr < hurdle) return { text: "IRR (" + irr.toFixed(1) + "%) is below the hurdle rate (" + hurdle + "%). This project destroys value at your cost of capital.", type: "danger" };
  if (hurdle && irr >= hurdle) return { text: "IRR (" + irr.toFixed(1) + "%) exceeds the hurdle rate (" + hurdle + "%). This project creates value.", type: "success" };
  if (irr < 0)  return { text: "Negative IRR — the project produces a net loss at any positive discount rate.", type: "danger" };
  if (irr < 8)  return { text: "Low IRR. Compare to your WACC or hurdle rate to determine if this is acceptable.", type: "warning" };
  if (irr < 20) return { text: "Moderate IRR. Above typical WACC for most established businesses.", type: "info" };
  return { text: "Strong IRR. Likely exceeds most hurdle rates.", type: "success" };
}

if (typeof document !== "undefined") {
  var irrRowSeq = 0;

  function getFlows() {
    var flows = [];
    var rows = document.querySelectorAll(".irr-cf-row");
    rows.forEach(function (row) {
      var v = parseFloat(row.querySelector(".irr-cf-val").value);
      if (!isNaN(v)) flows.push(v);
    });
    return flows;
  }

  function run() {
    var flows = getFlows();
    var hurdle = parseFloat(document.getElementById("irr-hurdle").value) || null;
    var irr = calcIRR(flows);
    var npvAtHurdle = flows.length ? calcNPVAtRate(flows, hurdle || 10) : null;

    var e1 = document.getElementById("irr-out-irr");
    if (e1) e1.textContent = irr !== null ? irr.toFixed(2) + "%" : "—";
    var e2 = document.getElementById("irr-out-npv");
    if (e2) e2.textContent = npvAtHurdle !== null ? "$" + Math.round(npvAtHurdle).toLocaleString() : "—";
    var e3 = document.getElementById("irr-out-decision");
    if (e3 && hurdle && irr !== null) e3.textContent = irr >= hurdle ? "Accept ✓" : "Reject ✗";
    else if (e3) e3.textContent = "—";

    if (window.FTK) {
      var lbl = irrLabel(irr, hurdle);
      window.FTK.showInsight(document.getElementById("irr-insight"), lbl.text, lbl.type);
    }
  }

  function addRow(value) {
    var container = document.getElementById("irr-cf-container");
    if (!container) return;
    var count = container.querySelectorAll(".irr-cf-row").length;
    if (count >= 10) return;
    var row = document.createElement("div");
    row.className = "irr-cf-row field-row";
    row.style.marginBottom = "0.5rem";
    var inputId = "irr-cf-input-" + (irrRowSeq++);
    var label = document.createElement("label");
    label.textContent = "Year " + count;
    label.htmlFor = inputId;
    label.style.cssText = "font-size:0.82rem;color:var(--text-muted);flex:0 0 50px";
    var input = document.createElement("input");
    input.type = "number";
    input.id = inputId;
    input.step = "1000";
    input.value = value !== undefined ? value : "";
    input.placeholder = count === 0 ? "e.g. -100000 (investment)" : "e.g. 30000";
    input.className = "irr-cf-val";
    input.style.flex = "1";
    input.addEventListener("input", run);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "✕";
    btn.setAttribute("aria-label", "Remove row");
    btn.style.cssText = "flex:0 0 2rem;padding:0.2rem;font-size:0.8rem;background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-muted)";
    btn.addEventListener("click", function () { container.removeChild(row); run(); });
    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(btn);
    container.appendChild(row);
    // Relabel all years
    Array.from(container.querySelectorAll(".irr-cf-row")).forEach(function (r, i) {
      r.querySelector("label").textContent = "Year " + i;
    });
    run();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var addBtn = document.getElementById("irr-add-row");
    if (addBtn) addBtn.addEventListener("click", function () { addRow(); });
    var hurdle = document.getElementById("irr-hurdle");
    if (hurdle) hurdle.addEventListener("input", run);
    // Pre-populate
    var defaults = [-100000, 30000, 35000, 40000, 40000];
    defaults.forEach(function (v) { addRow(v); });
  });
}

if (typeof module !== "undefined") module.exports = { calcIRR, calcNPV, calcNPVAtRate, irrLabel };
