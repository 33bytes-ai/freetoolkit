(function () {
  "use strict";

  function calculatePriceImpact(currentPrice, customers, newPrice) {
    if (currentPrice <= 0 || customers <= 0 || newPrice <= 0) return null;
    var currentRevenue        = currentPrice * customers;
    var fullRetentionRevenue  = newPrice * customers;
    var breakEvenRetention    = (currentRevenue / fullRetentionRevenue) * 100;
    var priceChangePct        = ((newPrice - currentPrice) / currentPrice) * 100;
    return {
      currentRevenue:       currentRevenue,
      fullRetentionRevenue: fullRetentionRevenue,
      breakEvenRetention:   breakEvenRetention,
      priceChangePct:       priceChangePct,
      revenueDelta:         fullRetentionRevenue - currentRevenue,
    };
  }

  function init() {
    var priceEl    = document.getElementById("pi-current-price");
    var custEl     = document.getElementById("pi-customers");
    var newPriceEl = document.getElementById("pi-new-price");
    var curRevEl   = document.getElementById("pi-out-current-rev");
    var newRevEl   = document.getElementById("pi-out-new-rev");
    var deltaEl    = document.getElementById("pi-out-delta");
    var beEl       = document.getElementById("pi-out-breakeven");
    var insightEl  = document.getElementById("pi-insight");

    function fmt(v) {
      var abs = Math.abs(v);
      var sign = v < 0 ? "-" : (v > 0 ? "+" : "");
      if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(2) + "M";
      if (abs >= 1000)    return sign + "$" + (abs / 1000).toFixed(1) + "k";
      return sign + "$" + Math.round(abs).toLocaleString();
    }

    function update() {
      var cp     = parseFloat(priceEl.value)    || 0;
      var cust   = parseFloat(custEl.value)     || 0;
      var np     = parseFloat(newPriceEl.value) || 0;
      var result = calculatePriceImpact(cp, cust, np);
      if (!result) return;

      curRevEl.textContent = "$" + Math.round(result.currentRevenue).toLocaleString();
      newRevEl.textContent = "$" + Math.round(result.fullRetentionRevenue).toLocaleString();
      deltaEl.textContent  = fmt(result.revenueDelta) + "/mo at full retention";
      beEl.textContent     = result.breakEvenRetention.toFixed(1) + "% customers retained";

      if (result.priceChangePct > 0) {
        var be = result.breakEvenRetention;
        if (be <= 80) {
          window.FTK.showInsight(insightEl,
            "You break even even after losing " + (100 - be).toFixed(0) + "% of customers. " +
            "B2B SaaS typically loses 0–10% on modest increases. This price hike very likely pays off.",
            "success");
        } else if (be <= 90) {
          window.FTK.showInsight(insightEl,
            "You need to retain " + be.toFixed(0) + "% of customers. " +
            "Communicate the value-add clearly, grandfather existing customers for 3–6 months, and test with new customers first.",
            "warning");
        } else {
          window.FTK.showInsight(insightEl,
            "The break-even retention (" + be.toFixed(0) + "%) is very tight. " +
            "Consider a smaller increment or testing a price increase on new customers only before rolling out broadly.",
            "danger");
        }
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ cp: priceEl.value, cu: custEl.value, np: newPriceEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.cp) return;
      priceEl.value    = s.cp;
      custEl.value     = s.cu;
      newPriceEl.value = s.np;
    }

    var copyBtn = document.getElementById("pi-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Current MRR: " + curRevEl.textContent + " | New MRR: " + newRevEl.textContent + " | Revenue gain: " + deltaEl.textContent + " | Break-even retention: " + beEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("pi-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [priceEl, custEl, newPriceEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculatePriceImpact: calculatePriceImpact };
  }
})();
