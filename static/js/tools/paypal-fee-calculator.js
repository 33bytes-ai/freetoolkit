(function () {
  "use strict";

  var PRESETS = {
    standard:      { rate: 0.0349, fixed: 0.49 },
    international: { rate: 0.0499, fixed: 0.49 },
    micropayment:  { rate: 0.0500, fixed: 0.05 },
  };

  function calculateFee(amount, rate, fixed) {
    var fee = amount * rate + fixed;
    return { chargeAmount: amount, fee: fee, net: amount - fee };
  }

  function calculatePassthrough(targetNet, rate, fixed) {
    var chargeAmount = (targetNet + fixed) / (1 - rate);
    return { chargeAmount: chargeAmount, fee: chargeAmount - targetNet, net: targetNet };
  }

  function calculate(amount, rate, fixed, passthrough) {
    if (typeof amount !== "number" || amount <= 0) return null;
    if (typeof rate !== "number" || rate < 0 || rate >= 1) return null;
    if (typeof fixed !== "number" || fixed < 0) return null;
    return passthrough ? calculatePassthrough(amount, rate, fixed) : calculateFee(amount, rate, fixed);
  }

  function init() {
    var amountEl    = document.getElementById("pp-amount");
    var typeEl      = document.getElementById("pp-type");
    var customRow   = document.getElementById("pp-custom-row");
    var customPct   = document.getElementById("pp-custom-pct");
    var customFixed = document.getElementById("pp-custom-fixed");
    var passEl      = document.getElementById("pp-passthrough");
    var feedback    = document.getElementById("pp-feedback");
    var insightEl   = document.getElementById("pp-insight");
    var outputs = {
      charge: document.getElementById("pp-out-charge"),
      fee:    document.getElementById("pp-out-fee"),
      net:    document.getElementById("pp-out-net"),
    };

    function fmt(v) { return "$" + v.toFixed(2); }

    function getParams() {
      var type = typeEl.value;
      var rate, fixed;
      if (type === "custom") {
        rate = parseFloat(customPct.value) / 100;
        fixed = parseFloat(customFixed.value);
      } else {
        rate = PRESETS[type].rate;
        fixed = PRESETS[type].fixed;
      }
      return { amount: parseFloat(amountEl.value), rate: rate, fixed: fixed, passthrough: passEl.checked };
    }

    function update() {
      var p = getParams();
      var result = calculate(p.amount, p.rate, p.fixed, p.passthrough);
      if (!result) return;
      outputs.charge.textContent = fmt(result.chargeAmount);
      outputs.fee.textContent    = fmt(result.fee);
      outputs.net.textContent    = fmt(result.net);

      window.FTK.hashSet({ a: p.amount, t: typeEl.value, cp: customPct.value, cf: customFixed.value, pt: passEl.checked ? 1 : 0 });

      var feeRatio = result.fee / result.chargeAmount;
      if (feeRatio > 0.08) {
        window.FTK.showInsight(insightEl,
          "PayPal fees exceed 8% of this charge — common on small or international transactions. " +
          "For invoices over $100 consider using PayPal Invoicing (same rate) or Stripe (lower fixed fee).",
          "warning");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.a) return;
      amountEl.value = s.a;
      if (s.t) { typeEl.value = s.t; customRow.style.display = s.t === "custom" ? "flex" : "none"; }
      if (s.cp) customPct.value = s.cp;
      if (s.cf) customFixed.value = s.cf;
      if (s.pt) passEl.checked = !!s.pt;
    }

    typeEl.addEventListener("change", function () {
      customRow.style.display = typeEl.value === "custom" ? "flex" : "none";
      update();
    });
    [amountEl, customPct, customFixed, passEl].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    Object.keys(outputs).forEach(function (key) {
      outputs[key].closest(".output-box").addEventListener("click", function () {
        window.FTK.copyToClipboard(outputs[key].textContent).then(function () {
          window.FTK.flash(feedback, "Copied!");
        }).catch(function () {
          window.FTK.flash(feedback, "Copy unavailable");
        });
      });
    });

    var shareBtn = document.getElementById("pp-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

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
