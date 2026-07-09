(function () {
  "use strict";

  function calcROAS(revenue, adCost) {
    if (!revenue || revenue < 0 || !adCost || adCost <= 0) return null;
    return revenue / adCost;
  }

  function calcBreakevenROAS(grossMarginPct) {
    if (grossMarginPct == null || grossMarginPct <= 0 || grossMarginPct >= 100) return null;
    return 100 / grossMarginPct;
  }

  function calcTargetROAS(grossMarginPct, targetProfitMarginPct) {
    if (grossMarginPct == null || targetProfitMarginPct == null) return null;
    var headroom = grossMarginPct - targetProfitMarginPct;
    if (headroom <= 0) return null;
    return 100 / headroom;
  }

  function roasLabel(roas, breakevenROAS) {
    if (roas === null) return null;
    if (breakevenROAS === null) {
      if (roas < 2) return { text: "Low ROAS. Most e-commerce requires 3–4× to be profitable.", type: "warning" };
      if (roas < 4) return { text: "Moderate ROAS. Profitability depends on your gross margin.", type: "info" };
      return { text: "Strong ROAS. Above 4× is excellent for most ad channels.", type: "info" };
    }
    if (roas < breakevenROAS) {
      return { text: "Unprofitable at current ROAS. You need " + breakevenROAS.toFixed(2) + "× just to break even.", type: "warning" };
    }
    return { text: "Profitable! Your ROAS of " + roas.toFixed(2) + "× exceeds the breakeven of " + breakevenROAS.toFixed(2) + "×.", type: "info" };
  }

  function init() {
    var spendEl   = document.getElementById("roas-spend");
    var revenueEl = document.getElementById("roas-revenue");
    var marginEl  = document.getElementById("roas-margin");
    var targetEl  = document.getElementById("roas-target-margin");
    var insightEl = document.getElementById("roas-insight");
    var shareBtn  = document.getElementById("roas-share");
    var copyBtn   = document.getElementById("roas-copy");

    function update() {
      var spend        = parseFloat(spendEl.value) || 0;
      var revenue      = parseFloat(revenueEl.value) || 0;
      var margin       = parseFloat(marginEl.value) || 0;
      var targetMargin = parseFloat(targetEl ? targetEl.value : 0) || 0;

      var roas          = calcROAS(revenue, spend);
      var breakevenROAS = margin > 0 ? calcBreakevenROAS(margin) : null;
      var targetROAS    = (margin > 0 && targetMargin > 0) ? calcTargetROAS(margin, targetMargin) : null;
      var netProfit     = (margin > 0 && spend > 0 && revenue > 0) ? revenue * (margin / 100) - spend : null;

      document.getElementById("roas-result").textContent   = roas !== null ? roas.toFixed(2) + "×" : "—";
      document.getElementById("roas-breakeven").textContent = breakevenROAS !== null ? breakevenROAS.toFixed(2) + "×" : "—";
      document.getElementById("roas-target").textContent   = targetROAS !== null ? targetROAS.toFixed(2) + "×" : "—";
      document.getElementById("roas-profit").textContent   = netProfit !== null ? (netProfit >= 0 ? "+" : "") + "$" + Math.abs(netProfit).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (netProfit < 0 ? " loss" : "") : "—";

      window.FTK.hashSet({ s: spendEl.value, r: revenueEl.value, m: marginEl.value, t: targetEl ? targetEl.value : "" });

      var ins = roasLabel(roas, breakevenROAS);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.s) spendEl.value = h.s;
      if (h.r) revenueEl.value = h.r;
      if (h.m) marginEl.value = h.m;
      if (h.t && targetEl) targetEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var spend        = parseFloat(spendEl.value) || 0;
        var revenue      = parseFloat(revenueEl.value) || 0;
        var margin       = parseFloat(marginEl.value) || 0;
        var targetMargin = parseFloat(targetEl ? targetEl.value : 0) || 0;
        var roas          = calcROAS(revenue, spend);
        var breakevenROAS = margin > 0 ? calcBreakevenROAS(margin) : null;
        var targetROAS    = (margin > 0 && targetMargin > 0) ? calcTargetROAS(margin, targetMargin) : null;
        var netProfit     = (margin > 0 && spend > 0 && revenue > 0) ? revenue * (margin / 100) - spend : null;
        var lines = [
          "Ad spend: $" + spend.toLocaleString(),
          "Revenue from ads: $" + revenue.toLocaleString(),
          "ROAS: " + (roas !== null ? roas.toFixed(2) + "×" : "—"),
          "Breakeven ROAS: " + (breakevenROAS !== null ? breakevenROAS.toFixed(2) + "×" : "—"),
          "Target ROAS: " + (targetROAS !== null ? targetROAS.toFixed(2) + "×" : "—"),
          "Net profit: " + (netProfit !== null ? "$" + netProfit.toFixed(0) : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [spendEl, revenueEl, marginEl, targetEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcROAS, calcBreakevenROAS, calcTargetROAS, roasLabel };
  }
})();
