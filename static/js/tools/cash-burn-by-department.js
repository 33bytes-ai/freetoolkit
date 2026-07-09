/* Cash Burn by Department Calculator */
function calcDeptBurn(depts) {
  return depts.reduce(function (sum, d) { return sum + (d.cost || 0); }, 0);
}

function calcNetBurn(grossBurn, revenue) {
  return grossBurn - revenue;
}

function calcRunway(cash, netBurn) {
  if (netBurn <= 0) return null;
  return cash / netBurn;
}

function calcDeptShares(depts) {
  var total = calcDeptBurn(depts);
  if (total === 0) return depts.map(function () { return 0; });
  return depts.map(function (d) { return ((d.cost || 0) / total) * 100; });
}

function burnLabel(runway) {
  if (runway === null) return { text: "Revenue exceeds or equals gross burn — you are cash flow positive. No burn to track.", type: "success" };
  if (runway < 3) return { text: "Critical: only " + runway.toFixed(1) + " months of runway. Immediate action required.", type: "danger" };
  if (runway < 6) return { text: runway.toFixed(1) + " months of runway. Begin fundraising now — typical raise takes 3–6 months.", type: "warning" };
  if (runway < 12) return { text: runway.toFixed(1) + " months of runway. Consider optimizing burn while pursuing growth.", type: "info" };
  return { text: runway.toFixed(1) + " months of runway — healthy position. Focus on efficient growth.", type: "success" };
}

if (typeof document !== "undefined") {
  var DEPT_IDS = ["eng", "sales", "mkt", "ga"];

  function getDepts() {
    return DEPT_IDS.map(function (id) {
      var el = document.getElementById("burn-" + id);
      return { id: id, cost: el ? (parseFloat(el.value) || 0) : 0 };
    });
  }

  function run() {
    var rev = parseFloat(document.getElementById("burn-revenue").value) || 0;
    var cash = parseFloat(document.getElementById("burn-cash").value) || 0;
    var depts = getDepts();
    var gross = calcDeptBurn(depts);
    var net = calcNetBurn(gross, rev);
    var runway = cash > 0 ? calcRunway(cash, net) : null;
    var shares = calcDeptShares(depts);

    var e1 = document.getElementById("burn-out-gross");
    if (e1) e1.textContent = "$" + gross.toLocaleString("en-US", { maximumFractionDigits: 0 });
    var e2 = document.getElementById("burn-out-net");
    if (e2) e2.textContent = net <= 0 ? "CF+" : "$" + net.toLocaleString("en-US", { maximumFractionDigits: 0 });
    var e3 = document.getElementById("burn-out-runway");
    if (e3) e3.textContent = runway !== null ? runway.toFixed(1) + " mo" : (net <= 0 ? "∞" : "—");

    DEPT_IDS.forEach(function (id, i) {
      var el = document.getElementById("burn-share-" + id);
      if (el) el.textContent = gross > 0 ? shares[i].toFixed(0) + "%" : "—";
    });

    if (window.FTK) {
      var lbl = burnLabel(runway);
      window.FTK.showInsight(document.getElementById("burn-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["burn-revenue", "burn-cash", "burn-eng", "burn-sales", "burn-mkt", "burn-ga"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcDeptBurn, calcNetBurn, calcRunway, calcDeptShares, burnLabel };
