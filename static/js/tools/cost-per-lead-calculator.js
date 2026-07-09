/* Cost Per Lead Calculator */
function calcCPL(spend, leads) {
  if (!spend || !leads || leads === 0) return null;
  return spend / leads;
}

function calcRevenuePerLead(acv, convRate) {
  if (!acv || !convRate) return null;
  return acv * (convRate / 100);
}

function calcMarketingROI(revenue, spend) {
  if (!spend || spend === 0) return null;
  return ((revenue - spend) / spend) * 100;
}

function calcMaxAllowableCPL(acv, convRate, margin) {
  if (!acv || !convRate || !margin) return null;
  return acv * (convRate / 100) * (margin / 100);
}

function cplLabel(cpl, maxCpl) {
  if (maxCpl && cpl > maxCpl) return { text: "CPL exceeds maximum allowable — this channel is unprofitable at current conversion and deal size.", type: "danger" };
  if (maxCpl && cpl > maxCpl * 0.75) return { text: "CPL is approaching the ceiling. Small drops in conversion rate would make this channel unprofitable.", type: "warning" };
  return { text: "CPL is within profitable range. Track lead quality (MQL→SQL rate) to confirm channel efficiency.", type: "success" };
}

if (typeof document !== "undefined") {
  var ids = ["cpl-spend", "cpl-leads", "cpl-conv", "cpl-acv", "cpl-margin"];
  function run() {
    var spend   = parseFloat(document.getElementById("cpl-spend").value) || 0;
    var leads   = parseFloat(document.getElementById("cpl-leads").value) || 0;
    var conv    = parseFloat(document.getElementById("cpl-conv").value) || 0;
    var acv     = parseFloat(document.getElementById("cpl-acv").value) || 0;
    var margin  = parseFloat(document.getElementById("cpl-margin").value) || 0;

    var cpl     = calcCPL(spend, leads);
    var rpl     = calcRevenuePerLead(acv, conv);
    var maxCpl  = calcMaxAllowableCPL(acv, conv, margin);
    var revenue = rpl ? rpl * leads : null;
    var roi     = revenue !== null ? calcMarketingROI(revenue, spend) : null;

    var fmtMoney = function (v) { return v === null ? "—" : "$" + v.toFixed(2); };
    var fmtPct   = function (v) { return v === null ? "—" : v.toFixed(1) + "%"; };

    var el = document.getElementById("cpl-out-cpl");     if (el) el.textContent = fmtMoney(cpl);
    var e2 = document.getElementById("cpl-out-rpl");     if (e2) e2.textContent = fmtMoney(rpl);
    var e3 = document.getElementById("cpl-out-maxcpl");  if (e3) e3.textContent = fmtMoney(maxCpl);
    var e4 = document.getElementById("cpl-out-roi");     if (e4) e4.textContent = fmtPct(roi);

    if (cpl !== null && window.FTK) {
      var lbl = cplLabel(cpl, maxCpl);
      window.FTK.showInsight(document.getElementById("cpl-insight"), lbl.text, lbl.type);
    }
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", run);
  });
  run();
}

if (typeof module !== "undefined") module.exports = { calcCPL, calcRevenuePerLead, calcMarketingROI, calcMaxAllowableCPL, cplLabel };
