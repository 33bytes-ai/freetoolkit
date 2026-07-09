(function () {
  "use strict";

  function calcARPU(totalMRR, activeUsers) {
    if (!activeUsers || activeUsers <= 0 || totalMRR == null) return null;
    return totalMRR / activeUsers;
  }

  function calcARPUA(totalARR, activeUsers) {
    if (!activeUsers || activeUsers <= 0 || totalARR == null) return null;
    return totalARR / activeUsers;
  }

  function calcUsersNeededForMRR(targetMRR, arpu) {
    if (!arpu || arpu <= 0 || !targetMRR || targetMRR <= 0) return null;
    return targetMRR / arpu;
  }

  function calcMRRFromUsersAndARPU(users, arpu) {
    return (users || 0) * (arpu || 0);
  }

  function arpuLabel(arpu) {
    if (arpu === null) return null;
    if (arpu >= 1000) return { text: "ARPU $" + arpu.toFixed(0) + "/month — Enterprise-tier pricing. High ACV typically means longer sales cycles but better retention and LTV.", type: "info" };
    if (arpu >= 200) return { text: "ARPU $" + arpu.toFixed(0) + "/month — Mid-market pricing. Strong unit economics if CAC payback is under 18 months.", type: "info" };
    if (arpu >= 50) return { text: "ARPU $" + arpu.toFixed(0) + "/month — SMB/prosumer pricing. Requires efficient low-touch or product-led acquisition to maintain strong CAC ratios.", type: "info" };
    return { text: "ARPU $" + arpu.toFixed(2) + "/month — Consumer/freemium pricing. Extremely high volume needed to generate meaningful MRR. Ensure CAC payback is achievable.", type: "warning" };
  }

  function init() {
    var mrrEl   = document.getElementById("arpu-mrr");
    var usrEl   = document.getElementById("arpu-users");
    var tgtEl   = document.getElementById("arpu-target-mrr");
    var insEl   = document.getElementById("arpu-insight");
    var shareBtn = document.getElementById("arpu-share");
    var copyBtn  = document.getElementById("arpu-copy");

    function update() {
      var mrr  = parseFloat(mrrEl.value) || 0;
      var usr  = parseFloat(usrEl.value) || 0;
      var tgt  = parseFloat(tgtEl.value) || 0;

      var arpu        = calcARPU(mrr, usr);
      var arpuAnn     = arpu ? arpu * 12 : null;
      var usersNeeded = (arpu && tgt) ? calcUsersNeededForMRR(tgt, arpu) : null;
      var mrrAt2x     = arpu ? calcMRRFromUsersAndARPU(usr * 2, arpu) : null;

      document.getElementById("arpu-result").textContent      = arpu !== null ? "$" + arpu.toFixed(2) : "--";
      document.getElementById("arpu-annual").textContent      = arpuAnn !== null ? "$" + arpuAnn.toFixed(0) : "--";
      document.getElementById("arpu-users-needed").textContent = usersNeeded !== null ? Math.ceil(usersNeeded).toLocaleString() : "--";
      document.getElementById("arpu-mrr-2x").textContent      = mrrAt2x !== null ? "$" + (mrrAt2x / 1000).toFixed(1) + "k" : "--";

      window.FTK.hashSet({ m: mrrEl.value, u: usrEl.value, t: tgtEl.value });

      var ins = arpuLabel(arpu);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.m) mrrEl.value = h.m;
      if (h.u) usrEl.value = h.u;
      if (h.t) tgtEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var mrr  = parseFloat(mrrEl.value) || 0;
        var usr  = parseFloat(usrEl.value) || 0;
        var arpu = calcARPU(mrr, usr);
        var lines = [
          "Monthly MRR: $" + mrr.toLocaleString(),
          "Active users: " + usr.toLocaleString(),
          "ARPU: " + (arpu !== null ? "$" + arpu.toFixed(2) + "/month" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [mrrEl, usrEl, tgtEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcARPU, calcARPUA, calcUsersNeededForMRR, calcMRRFromUsersAndARPU, arpuLabel };
  }
})();
