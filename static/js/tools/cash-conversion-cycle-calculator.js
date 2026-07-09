(function () {
  "use strict";

  function calcDIO(avgInventory, cogs) {
    if (!avgInventory || avgInventory < 0 || !cogs || cogs <= 0) return null;
    return (avgInventory / cogs) * 365;
  }

  function calcDSO(avgAccountsReceivable, revenue) {
    if (!avgAccountsReceivable || avgAccountsReceivable < 0 || !revenue || revenue <= 0) return null;
    return (avgAccountsReceivable / revenue) * 365;
  }

  function calcDPO(avgAccountsPayable, cogs) {
    if (!avgAccountsPayable || avgAccountsPayable < 0 || !cogs || cogs <= 0) return null;
    return (avgAccountsPayable / cogs) * 365;
  }

  function calcCCC(dio, dso, dpo) {
    if (dio === null || dso === null || dpo === null) return null;
    return dio + dso - dpo;
  }

  function cccLabel(ccc) {
    if (ccc === null) return null;
    if (ccc < 0) return { text: "Negative CCC — you collect cash before paying suppliers. This is excellent working capital efficiency.", type: "info" };
    if (ccc < 30) return { text: "CCC under 30 days. Efficient cash conversion. Low working capital requirement.", type: "info" };
    if (ccc < 60) return { text: "CCC 30-60 days. Moderate. Review DSO and DPO for improvement opportunities.", type: "warning" };
    return { text: "CCC over 60 days. High working capital tied up in operations. Prioritize reducing DSO or increasing DPO.", type: "warning" };
  }

  function init() {
    var invEl   = document.getElementById("ccc-inventory");
    var cogsEl  = document.getElementById("ccc-cogs");
    var arEl    = document.getElementById("ccc-ar");
    var revEl   = document.getElementById("ccc-revenue");
    var apEl    = document.getElementById("ccc-ap");
    var insightEl = document.getElementById("ccc-insight");
    var shareBtn = document.getElementById("ccc-share");
    var copyBtn  = document.getElementById("ccc-copy");

    function update() {
      var inv   = parseFloat(invEl.value) || 0;
      var cogs  = parseFloat(cogsEl.value) || 0;
      var ar    = parseFloat(arEl.value) || 0;
      var rev   = parseFloat(revEl.value) || 0;
      var ap    = parseFloat(apEl.value) || 0;

      var dio = calcDIO(inv, cogs);
      var dso = calcDSO(ar, rev);
      var dpo = calcDPO(ap, cogs);
      var ccc = calcCCC(dio, dso, dpo);

      document.getElementById("ccc-result").textContent  = ccc !== null ? ccc.toFixed(1) + " days" : "--";
      document.getElementById("ccc-dio").textContent     = dio !== null ? dio.toFixed(1) + " days" : "--";
      document.getElementById("ccc-dso").textContent     = dso !== null ? dso.toFixed(1) + " days" : "--";
      document.getElementById("ccc-dpo").textContent     = dpo !== null ? dpo.toFixed(1) + " days" : "--";

      window.FTK.hashSet({ i: invEl.value, c: cogsEl.value, a: arEl.value, r: revEl.value, p: apEl.value });

      var ins = cccLabel(ccc);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.i) invEl.value  = h.i;
      if (h.c) cogsEl.value = h.c;
      if (h.a) arEl.value   = h.a;
      if (h.r) revEl.value  = h.r;
      if (h.p) apEl.value   = h.p;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var inv  = parseFloat(invEl.value) || 0;
        var cogs = parseFloat(cogsEl.value) || 0;
        var ar   = parseFloat(arEl.value) || 0;
        var rev  = parseFloat(revEl.value) || 0;
        var ap   = parseFloat(apEl.value) || 0;
        var dio  = calcDIO(inv, cogs);
        var dso  = calcDSO(ar, rev);
        var dpo  = calcDPO(ap, cogs);
        var ccc  = calcCCC(dio, dso, dpo);
        var lines = ["DIO: " + (dio !== null ? dio.toFixed(1) + " days" : "--"), "DSO: " + (dso !== null ? dso.toFixed(1) + " days" : "--"), "DPO: " + (dpo !== null ? dpo.toFixed(1) + " days" : "--"), "CCC: " + (ccc !== null ? ccc.toFixed(1) + " days" : "--")];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [invEl, cogsEl, arEl, revEl, apEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcDIO, calcDSO, calcDPO, calcCCC };
  }
})();
