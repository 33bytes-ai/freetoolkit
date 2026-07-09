(function () {
  "use strict";

  function calcConcentrationRisk(topCustomerRevenues, totalRevenue) {
    if (!topCustomerRevenues || topCustomerRevenues.length === 0 || !totalRevenue || totalRevenue <= 0) return null;
    var topSum = topCustomerRevenues.reduce(function (a, b) { return a + (b || 0); }, 0);
    return (topSum / totalRevenue) * 100;
  }

  function calcHHIIndex(customerRevenues, totalRevenue) {
    if (!customerRevenues || customerRevenues.length === 0 || !totalRevenue || totalRevenue <= 0) return null;
    return customerRevenues.reduce(function (sum, rev) {
      var share = (rev || 0) / totalRevenue;
      return sum + (share * share * 10000);
    }, 0);
  }

  function calcLargestCustomerShare(largestRevenue, totalRevenue) {
    if (!largestRevenue || largestRevenue <= 0 || !totalRevenue || totalRevenue <= 0) return null;
    return (largestRevenue / totalRevenue) * 100;
  }

  function calcMaxSafeConcentration(churnBuffer, targetConcentration) {
    var target = targetConcentration != null ? targetConcentration : 20;
    return target;
  }

  function concentrationLabel(topNPct, largestPct) {
    if (topNPct === null) return null;
    if (largestPct !== null && largestPct >= 30) {
      return { text: "Critical concentration risk: single customer is " + largestPct.toFixed(1) + "% of revenue. Loss of this customer would be existential. Diversify immediately.", type: "warning" };
    }
    if (topNPct >= 80) return { text: "High concentration: top customers = " + topNPct.toFixed(1) + "% of revenue. Investor red flag above 50%. Build new customer pipeline to reduce dependency.", type: "warning" };
    if (topNPct >= 50) return { text: "Moderate concentration: top customers = " + topNPct.toFixed(1) + "% of revenue. Acceptable at early stage but build pipeline. Target <30% for top customer.", type: "warning" };
    return { text: "Healthy diversification: top customers = " + topNPct.toFixed(1) + "% of revenue. Good spread — continue growing the long tail of customers.", type: "info" };
  }

  function init() {
    var totalEl = document.getElementById("cc-total");
    var c1El    = document.getElementById("cc-c1");
    var c2El    = document.getElementById("cc-c2");
    var c3El    = document.getElementById("cc-c3");
    var c4El    = document.getElementById("cc-c4");
    var c5El    = document.getElementById("cc-c5");
    var insEl   = document.getElementById("cc-insight");
    var shareBtn = document.getElementById("cc-share");
    var copyBtn  = document.getElementById("cc-copy");

    function getCustRevs() {
      return [c1El, c2El, c3El, c4El, c5El]
        .map(function (el) { return el && el.value !== "" ? parseFloat(el.value) || 0 : 0; })
        .filter(function (v) { return v > 0; });
    }

    function update() {
      var total = parseFloat(totalEl.value) || 0;
      var revs  = getCustRevs();
      var largest = revs.length > 0 ? Math.max.apply(null, revs) : 0;

      var topNPct = total ? calcConcentrationRisk(revs, total) : null;
      var largePct = (total && largest) ? calcLargestCustomerShare(largest, total) : null;
      var hhi = total ? calcHHIIndex(revs, total) : null;
      var remaining = total && revs.length > 0 ? ((total - revs.reduce(function (a, b) { return a + b; }, 0)) / total * 100) : null;

      document.getElementById("cc-top-pct").textContent   = topNPct  !== null ? topNPct.toFixed(1)  + "%" : "--";
      document.getElementById("cc-largest").textContent   = largePct !== null ? largePct.toFixed(1) + "%" : "--";
      document.getElementById("cc-hhi").textContent       = hhi      !== null ? hhi.toFixed(0)             : "--";
      document.getElementById("cc-remaining").textContent = remaining !== null ? remaining.toFixed(1) + "%" : "--";

      window.FTK.hashSet({ t: totalEl.value, c1: c1El.value, c2: c2El.value, c3: c3El.value, c4: c4El.value, c5: c5El.value });

      var ins = concentrationLabel(topNPct, largePct);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.t)  totalEl.value = h.t;
      if (h.c1) c1El.value    = h.c1;
      if (h.c2) c2El.value    = h.c2;
      if (h.c3) c3El.value    = h.c3;
      if (h.c4) c4El.value    = h.c4;
      if (h.c5) c5El.value    = h.c5;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var total   = parseFloat(totalEl.value) || 0;
        var revs    = getCustRevs();
        var topNPct = total ? calcConcentrationRisk(revs, total) : null;
        var lines   = [
          "Total ARR: $" + (total / 1000).toFixed(1) + "k",
          "Top " + revs.length + " customer concentration: " + (topNPct !== null ? topNPct.toFixed(1) + "%" : "--"),
          "Target: <30% for any single customer, <50% for top N"
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [totalEl, c1El, c2El, c3El, c4El, c5El].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcConcentrationRisk, calcHHIIndex, calcLargestCustomerShare, calcMaxSafeConcentration, concentrationLabel };
  }
})();
