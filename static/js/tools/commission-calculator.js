(function () {
  "use strict";

  function calcFlatCommission(revenue, ratePct) {
    if (revenue < 0 || ratePct < 0) return null;
    return revenue * (ratePct / 100);
  }

  function calcTieredCommission(revenue, tiers) {
    if (revenue <= 0 || !tiers || tiers.length === 0) return null;
    var total = 0;
    var remaining = revenue;
    var sorted = tiers.slice().sort(function (a, b) { return a.floor - b.floor; });
    for (var i = 0; i < sorted.length; i++) {
      var tier = sorted[i];
      var nextFloor = (i + 1 < sorted.length) ? sorted[i + 1].floor : Infinity;
      var tierRevenue = Math.min(remaining, nextFloor - tier.floor);
      if (tierRevenue <= 0) break;
      total += tierRevenue * (tier.rate / 100);
      remaining -= tierRevenue;
      if (remaining <= 0) break;
    }
    return total;
  }

  function calcEffectiveRate(revenue, commission) {
    if (revenue <= 0) return null;
    return (commission / revenue) * 100;
  }

  function calcOTEAttainment(earned, ote) {
    if (ote <= 0) return null;
    return (earned / ote) * 100;
  }

  function commissionLabel(attainmentPct) {
    if (attainmentPct === null || attainmentPct === undefined) return "";
    if (attainmentPct >= 100) return "Quota achieved";
    if (attainmentPct >= 75)  return "On track";
    if (attainmentPct >= 50)  return "Below target";
    return "Significantly behind";
  }

  function init() {
    var revenueEl  = document.getElementById("comm-revenue");
    var rateEl     = document.getElementById("comm-rate");
    var oteEl      = document.getElementById("comm-ote");
    var baseEl     = document.getElementById("comm-base");
    var insEl      = document.getElementById("comm-insight");
    var copyBtn    = document.getElementById("comm-copy");
    var shareBtn   = document.getElementById("comm-share");

    function update() {
      var revenue = parseFloat(revenueEl.value) || 0;
      var rate    = parseFloat(rateEl.value)    || 0;
      var ote     = parseFloat(oteEl.value)     || 0;
      var base    = parseFloat(baseEl.value)    || 0;

      var commission  = calcFlatCommission(revenue, rate);
      var totalComp   = commission !== null ? base + commission : null;
      var effRate     = calcEffectiveRate(revenue, commission || 0);
      var attainment  = (ote > 0 && commission !== null) ? calcOTEAttainment(commission + base, ote) : null;

      document.getElementById("comm-result").textContent     = commission !== null ? "$" + commission.toFixed(2) : "--";
      document.getElementById("comm-total").textContent      = totalComp  !== null ? "$" + totalComp.toFixed(2)  : "--";
      document.getElementById("comm-eff-rate").textContent   = effRate    !== null ? effRate.toFixed(2) + "%"     : "--";
      document.getElementById("comm-attainment").textContent = attainment !== null ? attainment.toFixed(1) + "%"  : "--";

      window.FTK.hashSet({ r: revenue, rt: rate, o: ote, b: base });

      if (commission !== null) {
        var label = ote > 0 && attainment !== null ? commissionLabel(attainment) : "";
        var type  = attainment !== null ? (attainment >= 100 ? "success" : attainment >= 75 ? "info" : "warning") : "info";
        window.FTK.showInsight(insEl,
          (label ? label + " — " : "") +
          "Commission earned: $" + commission.toFixed(2) + " at " + rate + "% on $" + revenue.toLocaleString() + " in revenue. " +
          (ote > 0 && attainment !== null ? "OTE attainment: " + attainment.toFixed(1) + "% ($" + (totalComp || 0).toFixed(0) + " total comp)." : ""), type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r)  revenueEl.value = h.r;
      if (h.rt) rateEl.value    = h.rt;
      if (h.o)  oteEl.value     = h.o;
      if (h.b)  baseEl.value    = h.b;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var r = parseFloat(revenueEl.value) || 0;
        var rt = parseFloat(rateEl.value) || 0;
        var b = parseFloat(baseEl.value) || 0;
        var comm = calcFlatCommission(r, rt);
        var lines = [
          "Commission Calculator Results",
          "Revenue: $" + r.toLocaleString(),
          "Commission Rate: " + rt + "%",
          "Commission Earned: " + (comm !== null ? "$" + comm.toFixed(2) : "--"),
          "Base Salary: $" + b.toLocaleString(),
          "Total Compensation: " + (comm !== null ? "$" + (b + comm).toFixed(2) : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revenueEl, rateEl, oteEl, baseEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcFlatCommission: calcFlatCommission, calcTieredCommission: calcTieredCommission, calcEffectiveRate: calcEffectiveRate, calcOTEAttainment: calcOTEAttainment, commissionLabel: commissionLabel };
  }
})();
