(function () {
  "use strict";

  function calcPostMoneyValuation(preMoneyValuation, investmentAmount) {
    if (preMoneyValuation == null || investmentAmount == null || investmentAmount < 0) return null;
    return preMoneyValuation + investmentAmount;
  }

  function calcNewSharesIssued(preSharesOutstanding, investmentAmount, preMoneyValuation) {
    if (!preSharesOutstanding || preSharesOutstanding <= 0) return null;
    if (!investmentAmount || investmentAmount <= 0) return null;
    if (!preMoneyValuation || preMoneyValuation <= 0) return null;
    var pricePerShare = preMoneyValuation / preSharesOutstanding;
    return Math.round(investmentAmount / pricePerShare);
  }

  function calcDilutedOwnership(currentShares, newSharesIssued) {
    if (!currentShares || currentShares <= 0 || newSharesIssued == null || newSharesIssued < 0) return null;
    var totalShares = currentShares + newSharesIssued;
    return (currentShares / totalShares) * 100;
  }

  function calcInvestorOwnership(newSharesIssued, preSharesOutstanding) {
    if (!newSharesIssued || newSharesIssued <= 0 || !preSharesOutstanding || preSharesOutstanding <= 0) return null;
    var totalShares = preSharesOutstanding + newSharesIssued;
    return (newSharesIssued / totalShares) * 100;
  }

  function dilutionLabel(dilutedOwnershipPct, originalOwnershipPct) {
    if (dilutedOwnershipPct === null || originalOwnershipPct === null) return null;
    var dilution = originalOwnershipPct - dilutedOwnershipPct;
    if (dilution <= 5) return { text: "Light dilution: " + dilution.toFixed(1) + "pp. Your ownership dropped from " + originalOwnershipPct.toFixed(1) + "% to " + dilutedOwnershipPct.toFixed(1) + "% — typical for a small bridge round.", type: "info" };
    if (dilution <= 20) return { text: "Standard dilution: " + dilution.toFixed(1) + "pp. Ownership " + originalOwnershipPct.toFixed(1) + "% → " + dilutedOwnershipPct.toFixed(1) + "%. Typical for a Seed or Series A round.", type: "info" };
    return { text: "Heavy dilution: " + dilution.toFixed(1) + "pp. Ownership " + originalOwnershipPct.toFixed(1) + "% → " + dilutedOwnershipPct.toFixed(1) + "%. Consider whether the valuation reflects the dilution impact.", type: "warning" };
  }

  function init() {
    var preMoneyEl   = document.getElementById("ed-pre-money");
    var investEl     = document.getElementById("ed-investment");
    var sharesEl     = document.getElementById("ed-shares");
    var mySharesEl   = document.getElementById("ed-my-shares");
    var insEl        = document.getElementById("ed-insight");
    var shareBtn     = document.getElementById("ed-share");
    var copyBtn      = document.getElementById("ed-copy");

    function update() {
      var preMoney  = parseFloat(preMoneyEl.value)  || 0;
      var invest    = parseFloat(investEl.value)    || 0;
      var shares    = parseFloat(sharesEl.value)    || 0;
      var myShares  = parseFloat(mySharesEl.value)  || 0;

      var postMoney  = calcPostMoneyValuation(preMoney, invest);
      var newShares  = calcNewSharesIssued(shares, invest, preMoney);
      var myDiluted  = (newShares !== null && myShares) ? calcDilutedOwnership(myShares, newShares) : null;
      var myOriginal = (shares) ? (myShares / shares) * 100 : null;
      var invPct     = (newShares !== null) ? calcInvestorOwnership(newShares, shares) : null;

      document.getElementById("ed-post-money").textContent  = postMoney !== null ? "$" + (postMoney / 1000000).toFixed(2) + "M" : "--";
      document.getElementById("ed-new-shares").textContent  = newShares !== null ? newShares.toLocaleString() : "--";
      document.getElementById("ed-my-pct").textContent      = myDiluted  !== null ? myDiluted.toFixed(2)  + "%" : "--";
      document.getElementById("ed-investor-pct").textContent = invPct !== null ? invPct.toFixed(2) + "%" : "--";

      window.FTK.hashSet({ p: preMoneyEl.value, i: investEl.value, s: sharesEl.value, m: mySharesEl.value });

      var ins = (myDiluted !== null && myOriginal !== null) ? dilutionLabel(myDiluted, myOriginal) : null;
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) preMoneyEl.value  = h.p;
      if (h.i) investEl.value    = h.i;
      if (h.s) sharesEl.value    = h.s;
      if (h.m) mySharesEl.value  = h.m;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var preMoney = parseFloat(preMoneyEl.value) || 0;
        var invest   = parseFloat(investEl.value)   || 0;
        var shares   = parseFloat(sharesEl.value)   || 0;
        var myShares = parseFloat(mySharesEl.value) || 0;
        var newShares = calcNewSharesIssued(shares, invest, preMoney);
        var myDiluted = (newShares !== null && myShares) ? calcDilutedOwnership(myShares, newShares) : null;
        var lines = [
          "Pre-money valuation: $" + (preMoney / 1000000).toFixed(2) + "M",
          "Investment: $" + (invest / 1000000).toFixed(2) + "M",
          "Post-money: $" + ((preMoney + invest) / 1000000).toFixed(2) + "M",
          "Your diluted ownership: " + (myDiluted !== null ? myDiluted.toFixed(2) + "%" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [preMoneyEl, investEl, sharesEl, mySharesEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPostMoneyValuation, calcNewSharesIssued, calcDilutedOwnership, calcInvestorOwnership, dilutionLabel };
  }
})();
