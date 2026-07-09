(function () {
  "use strict";

  function addVAT(netPrice, ratePct) {
    var rate = ratePct / 100;
    var tax = netPrice * rate;
    return { net: netPrice, tax: tax, gross: netPrice + tax };
  }

  function removeVAT(grossPrice, ratePct) {
    var rate = ratePct / 100;
    var net = grossPrice / (1 + rate);
    var tax = grossPrice - net;
    return { net: net, tax: tax, gross: grossPrice };
  }

  function calculate(amount, ratePct, mode) {
    if (amount < 0 || ratePct < 0) return null;
    return mode === "remove" ? removeVAT(amount, ratePct) : addVAT(amount, ratePct);
  }

  function init() {
    var amountEl = document.getElementById("vat-amount");
    var rateEl = document.getElementById("vat-rate");
    var customRow = document.getElementById("vat-custom-row");
    var customPct = document.getElementById("vat-custom-pct");
    var addRadio = document.getElementById("vat-add");

    var netEl = document.getElementById("vat-net");
    var taxEl = document.getElementById("vat-tax-amount");
    var grossEl = document.getElementById("vat-gross");

    function getRate() {
      return rateEl.value === "custom" ? parseFloat(customPct.value) : parseFloat(rateEl.value);
    }

    function fmt(v) { return "$" + v.toFixed(2); }

    function update() {
      var result = calculate(
        parseFloat(amountEl.value) || 0,
        getRate() || 0,
        addRadio.checked ? "add" : "remove"
      );
      if (!result) return;
      netEl.textContent = fmt(result.net);
      taxEl.textContent = fmt(result.tax);
      grossEl.textContent = fmt(result.gross);
      window.FTK.hashSet({ a: amountEl.value, r: rateEl.value, cp: customPct.value, mo: addRadio.checked ? "add" : "remove" });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.a) return;
      if (s.a) amountEl.value = s.a;
      if (s.r) {
        rateEl.value = s.r;
        customRow.style.display = s.r === "custom" ? "block" : "none";
      }
      if (s.cp) customPct.value = s.cp;
      if (s.mo) {
        document.querySelectorAll('input[name="vat-mode"]').forEach(function (el) {
          el.checked = el.value === s.mo;
        });
      }
    }

    var shareBtn = document.getElementById("vat-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    rateEl.addEventListener("change", function () {
      customRow.style.display = rateEl.value === "custom" ? "block" : "none";
      update();
    });

    [amountEl, customPct].forEach(function (el) { el.addEventListener("input", update); });
    document.querySelectorAll('input[name="vat-mode"]').forEach(function (el) { el.addEventListener("change", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { addVAT: addVAT, removeVAT: removeVAT, calculate: calculate };
  }
})();
