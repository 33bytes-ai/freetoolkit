/* Price Elasticity of Demand Calculator */
function calcPED(p1, q1, p2, q2) {
  if (p1 === 0 || q1 === 0) return null;
  var pctQ = (q2 - q1) / q1;
  var pctP = (p2 - p1) / p1;
  if (pctP === 0) return null;
  return pctQ / pctP;
}

function calcRevenue(price, quantity) {
  return price * quantity;
}

function calcRevenueChange(p1, q1, p2, q2) {
  return calcRevenue(p2, q2) - calcRevenue(p1, q1);
}

function pedLabel(ped, revChange) {
  if (ped === null) return { text: "Enter original and new price/quantity to calculate elasticity.", type: "info" };
  var abs = Math.abs(ped);
  var revDir = revChange >= 0 ? "increases" : "decreases";
  var revAmt = Math.abs(Math.round(revChange)).toLocaleString("en-US");
  if (abs < 0.5) return { text: "Highly inelastic (PED = " + ped.toFixed(2) + "). Customers are price-insensitive. Revenue " + revDir + " by $" + revAmt + ".", type: "success" };
  if (abs < 1) return { text: "Inelastic demand (PED = " + ped.toFixed(2) + "). Price increase raises revenue. Revenue " + revDir + " by $" + revAmt + ".", type: "success" };
  if (Math.abs(abs - 1) < 0.05) return { text: "Unit elastic (PED ≈ −1). Revenue change is minimal.", type: "info" };
  if (abs < 2) return { text: "Elastic demand (PED = " + ped.toFixed(2) + "). Price increase reduces revenue. Revenue " + revDir + " by $" + revAmt + ".", type: "warning" };
  return { text: "Highly elastic (PED = " + ped.toFixed(2) + "). Customers are very price-sensitive. Revenue " + revDir + " by $" + revAmt + ".", type: "danger" };
}

if (typeof document !== "undefined") {
  function run() {
    var p1 = parseFloat(document.getElementById("ped-p1").value) || 0;
    var q1 = parseFloat(document.getElementById("ped-q1").value) || 0;
    var p2 = parseFloat(document.getElementById("ped-p2").value) || 0;
    var q2 = parseFloat(document.getElementById("ped-q2").value) || 0;

    var ped = calcPED(p1, q1, p2, q2);
    var rev1 = calcRevenue(p1, q1);
    var rev2 = calcRevenue(p2, q2);
    var revChange = calcRevenueChange(p1, q1, p2, q2);

    var fmt$ = function (v) { return "$" + Math.round(v).toLocaleString("en-US"); };
    var e1 = document.getElementById("ped-out-ped"); if (e1) e1.textContent = ped !== null ? ped.toFixed(2) : "—";
    var e2 = document.getElementById("ped-out-rev1"); if (e2) e2.textContent = fmt$(rev1);
    var e3 = document.getElementById("ped-out-rev2"); if (e3) e3.textContent = fmt$(rev2);
    var e4 = document.getElementById("ped-out-revchange"); if (e4) {
      e4.textContent = (revChange >= 0 ? "+" : "") + fmt$(revChange);
      e4.style.color = revChange >= 0 ? "var(--success,#16a34a)" : "#dc2626";
    }

    if (window.FTK) {
      var lbl = pedLabel(ped, revChange);
      window.FTK.showInsight(document.getElementById("ped-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["ped-p1", "ped-q1", "ped-p2", "ped-q2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcPED, calcRevenue, calcRevenueChange, pedLabel };
