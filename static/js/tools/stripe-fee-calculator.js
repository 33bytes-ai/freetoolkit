(function () {
  "use strict";

  var PRESETS = {
    domestic: { rate: 0.029, fixed: 0.30 },
    international: { rate: 0.044, fixed: 0.30 },
  };

  function calculateFee(amount, rate, fixed) {
    var fee = amount * rate + fixed;
    var net = amount - fee;
    return { chargeAmount: amount, fee: fee, net: net };
  }

  function calculatePassthrough(targetNet, rate, fixed) {
    var chargeAmount = (targetNet + fixed) / (1 - rate);
    var fee = chargeAmount - targetNet;
    return { chargeAmount: chargeAmount, fee: fee, net: targetNet };
  }

  function calculate(amount, rate, fixed, passthrough) {
    if (typeof amount !== "number" || amount <= 0) return null;
    if (typeof rate !== "number" || rate < 0 || rate >= 1) return null;
    if (typeof fixed !== "number" || fixed < 0) return null;
    return passthrough
      ? calculatePassthrough(amount, rate, fixed)
      : calculateFee(amount, rate, fixed);
  }

  function formatCurrency(value) {
    return "$" + value.toFixed(2);
  }

  function fmtK(v) {
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var amountEl = document.getElementById("stripe-amount");
    var cardTypeEl = document.getElementById("stripe-card-type");
    var customRow = document.getElementById("stripe-custom-row");
    var customPct = document.getElementById("stripe-custom-pct");
    var customFixed = document.getElementById("stripe-custom-fixed");
    var passthrough = document.getElementById("stripe-passthrough");
    var feedback = document.getElementById("stripe-feedback");
    var outputs = {
      charge: document.getElementById("stripe-out-charge"),
      fee: document.getElementById("stripe-out-fee"),
      net: document.getElementById("stripe-out-net"),
    };
    var insightEl = document.getElementById("stripe-insight");
    var monthlyTxnEl    = document.getElementById("stripe-monthly-txn");
    var volumeStats     = document.getElementById("stripe-volume-stats");
    var volumeInsightEl = document.getElementById("stripe-volume-insight");

    function getParams() {
      var type = cardTypeEl.value;
      var rate, fixed;
      if (type === "custom") {
        rate = parseFloat(customPct.value) / 100;
        fixed = parseFloat(customFixed.value);
      } else {
        var preset = PRESETS[type];
        rate = preset.rate;
        fixed = preset.fixed;
      }
      return {
        amount: parseFloat(amountEl.value),
        rate: rate,
        fixed: fixed,
        passthrough: passthrough.checked,
      };
    }

    function updateVolume(feePerTxn, amountPerTxn) {
      if (!monthlyTxnEl || !volumeStats) return;
      var txns = parseInt(monthlyTxnEl.value, 10) || 0;
      if (txns <= 0) { volumeStats.style.display = "none"; return; }
      volumeStats.style.display = "";
      var monthlyFee = txns * feePerTxn;
      var annualFee  = monthlyFee * 12;
      var monthlyVolume = txns * amountPerTxn;
      var txnsForVolumePricing = Math.ceil(80000 / amountPerTxn);
      document.getElementById("sv-monthly-fee").textContent = fmtK(monthlyFee);
      document.getElementById("sv-annual-fee").textContent  = fmtK(annualFee);
      document.getElementById("sv-threshold").textContent   = txnsForVolumePricing.toLocaleString() + " txn/mo";
      var msg = null;
      if (monthlyVolume >= 80000) {
        msg = "You're above Stripe's $80k/month threshold — contact Stripe sales for custom pricing (typically 0.2–0.5% off).";
      } else {
        var needed = 80000 - monthlyVolume;
        msg = "You're " + fmtK(needed) + " below the volume pricing threshold. At " + txnsForVolumePricing.toLocaleString() + " txn/mo you could negotiate a lower rate.";
      }
      if (volumeInsightEl) window.FTK.showInsight(volumeInsightEl, msg, "info");
    }

    function update() {
      var p = getParams();
      var result = calculate(p.amount, p.rate, p.fixed, p.passthrough);
      if (!result) return;
      outputs.charge.textContent = formatCurrency(result.chargeAmount);
      outputs.fee.textContent = formatCurrency(result.fee);
      outputs.net.textContent = formatCurrency(result.net);

      updateVolume(result.fee, result.chargeAmount);

      window.FTK.hashSet({ a: p.amount, t: cardTypeEl.value, cp: customPct.value, cf: customFixed.value, pt: passthrough.checked ? 1 : 0 });

      var feeRatio = result.fee / result.chargeAmount;
      if (p.passthrough) {
        window.FTK.showInsight(insightEl,
          "Fee pass-through adds " + (feeRatio * 100).toFixed(1) + "% to the customer’s price. " +
          "Accepted in B2B, but can hurt conversions in consumer products. " +
          "Merchant-of-record alternatives like Paddle or Lemon Squeezy bundle tax compliance into one flat rate.",
          "info"
        );
      } else if (feeRatio > 0.08) {
        window.FTK.showInsight(insightEl,
          "Stripe fees are above 8% of this charge amount — high for small transactions. " +
          "For recurring low-ticket plans, consider batching charges or switching to ACH (0.8% capped at $5).",
          "warning"
        );
      } else {
        window.FTK.showInsight(insightEl, null);
      }
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.a) return;
      amountEl.value = s.a;
      if (s.t) {
        cardTypeEl.value = s.t;
        customRow.style.display = s.t === "custom" ? "flex" : "none";
      }
      if (s.cp) customPct.value = s.cp;
      if (s.cf) customFixed.value = s.cf;
      if (s.pt) passthrough.checked = !!s.pt;
    }

    cardTypeEl.addEventListener("change", function () {
      customRow.style.display = cardTypeEl.value === "custom" ? "flex" : "none";
      update();
    });

    [amountEl, customPct, customFixed, passthrough].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    if (monthlyTxnEl) monthlyTxnEl.addEventListener("input", update);

    Object.keys(outputs).forEach(function (key) {
      outputs[key].closest(".output-box").addEventListener("click", function () {
        window.FTK.copyToClipboard(outputs[key].textContent).then(function () {
          window.FTK.flash(feedback, "Copied!");
        }).catch(function () {
          window.FTK.flash(feedback, "Copy unavailable");
        });
      });
    });

    var shareBtn = document.getElementById("stripe-share");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    }

    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate: calculate, calculateFee: calculateFee, calculatePassthrough: calculatePassthrough };
  }
})();
