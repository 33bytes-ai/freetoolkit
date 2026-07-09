(function () {
  "use strict";

  var PLANS = {
    basic:    { name: "Basic",    monthly: 39,  txFee: 0.020, procRate: 0.029, procFixed: 0.30 },
    shopify:  { name: "Shopify",  monthly: 105, txFee: 0.010, procRate: 0.026, procFixed: 0.30 },
    advanced: { name: "Advanced", monthly: 399, txFee: 0.005, procRate: 0.024, procFixed: 0.30 },
  };

  function calculateShopifyFee(saleAmount, planKey, useShopifyPayments) {
    if (saleAmount <= 0) return null;
    var plan = PLANS[planKey] || PLANS.basic;
    var processingFee  = saleAmount * plan.procRate + plan.procFixed;
    var transactionFee = useShopifyPayments ? 0 : saleAmount * plan.txFee;
    var totalFee       = processingFee + transactionFee;
    return {
      processingFee:  processingFee,
      transactionFee: transactionFee,
      totalFee:       totalFee,
      net:            saleAmount - totalFee,
      effectiveRate:  (totalFee / saleAmount) * 100,
      txFeeRate:      plan.txFee,
    };
  }

  function init() {
    var amountEl    = document.getElementById("sh-amount");
    var planEl      = document.getElementById("sh-plan");
    var shopifyPayEl = document.getElementById("sh-shopify-pay");
    var procFeeEl   = document.getElementById("sh-out-proc");
    var txFeeEl     = document.getElementById("sh-out-tx");
    var totalFeeEl  = document.getElementById("sh-out-total");
    var netEl       = document.getElementById("sh-out-net");
    var insightEl   = document.getElementById("sh-insight");

    function fmt(v) { return "$" + v.toFixed(2); }

    function update() {
      var amount = parseFloat(amountEl.value) || 0;
      var plan   = planEl.value;
      var result = calculateShopifyFee(amount, plan, shopifyPayEl.checked);
      if (!result) return;

      procFeeEl.textContent  = fmt(result.processingFee);
      txFeeEl.textContent    = fmt(result.transactionFee);
      totalFeeEl.textContent = fmt(result.totalFee);
      netEl.textContent      = fmt(result.net);

      if (!shopifyPayEl.checked && result.transactionFee > 0) {
        window.FTK.showInsight(insightEl,
          "Enabling Shopify Payments would save $" + result.transactionFee.toFixed(2) +
          " on this sale (" + (result.txFeeRate * 100).toFixed(1) + "% transaction fee eliminated). " +
          "Shopify Payments is available in 17+ countries — check eligibility in your store settings.",
          "info");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ a: amountEl.value, p: planEl.value, sp: shopifyPayEl.checked ? "1" : "0" });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.a) return;
      if (s.a) amountEl.value = s.a;
      if (s.p) planEl.value = s.p;
      if (s.sp !== undefined) shopifyPayEl.checked = s.sp === "1";
    }

    var shareBtn = document.getElementById("sh-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [amountEl, planEl, shopifyPayEl].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateShopifyFee: calculateShopifyFee, PLANS: PLANS };
  }
})();
