(function () {
  "use strict";

  function calcMagicNumber(netNewARR, priorQuarterSMSpend) {
    if (!priorQuarterSMSpend || priorQuarterSMSpend <= 0 || netNewARR == null) return null;
    return netNewARR / priorQuarterSMSpend;
  }

  function calcAnnualizedSMSpend(quarterlySpend) {
    return (quarterlySpend || 0) * 4;
  }

  function calcImpliedCAC(smSpend, newCustomers) {
    if (!newCustomers || newCustomers <= 0 || smSpend == null) return null;
    return smSpend / newCustomers;
  }

  function calcPaybackFromMagicNumber(mn, grossMarginPct) {
    if (!mn || mn <= 0 || !grossMarginPct || grossMarginPct <= 0) return null;
    return 1 / (mn * (grossMarginPct / 100));
  }

  function magicNumberLabel(mn) {
    if (mn === null) return null;
    if (mn >= 1.5) return { text: "Magic Number " + mn.toFixed(2) + " — Exceptional. You generate $1.50+ of ARR for every $1 of S&M spend. Step on the gas: investing more will accelerate growth efficiently.", type: "info" };
    if (mn >= 0.75) return { text: "Magic Number " + mn.toFixed(2) + " — Good. Solid GTM efficiency. Consider a modest increase in S&M spend — you're getting strong returns.", type: "info" };
    if (mn >= 0.5) return { text: "Magic Number " + mn.toFixed(2) + " — Marginal. You're breaking even on GTM spend. Fix retention and CAC before scaling spend.", type: "warning" };
    return { text: "Magic Number " + mn.toFixed(2) + " — Poor. Each dollar of S&M generates less than $0.50 of ARR. Diagnose CAC efficiency before increasing spend.", type: "warning" };
  }

  function fmtARR(v) {
    if (v === null || isNaN(v)) return "--";
    if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function init() {
    var arrEl    = document.getElementById("mn-net-new-arr");
    var smEl     = document.getElementById("mn-sm-spend");
    var custEl   = document.getElementById("mn-new-customers");
    var gmEl     = document.getElementById("mn-gross-margin");
    var insEl    = document.getElementById("mn-insight");
    var shareBtn = document.getElementById("mn-share");
    var copyBtn  = document.getElementById("mn-copy");

    function update() {
      var arr  = parseFloat(arrEl.value) || 0;
      var sm   = parseFloat(smEl.value) || 0;
      var cust = parseFloat(custEl.value) || 0;
      var gm   = parseFloat(gmEl.value) || 75;

      var mn       = calcMagicNumber(arr, sm);
      var annSM    = calcAnnualizedSMSpend(sm);
      var cac      = cust > 0 ? calcImpliedCAC(sm, cust) : null;
      var payback  = mn ? calcPaybackFromMagicNumber(mn, gm) : null;

      document.getElementById("mn-result").textContent      = mn !== null ? mn.toFixed(2) : "--";
      document.getElementById("mn-ann-sm").textContent      = fmtARR(annSM);
      document.getElementById("mn-cac").textContent         = fmtARR(cac);
      document.getElementById("mn-payback").textContent     = payback !== null ? payback.toFixed(1) + " qtrs" : "--";

      window.FTK.hashSet({ a: arrEl.value, s: smEl.value, c: custEl.value, g: gmEl.value });

      var ins = magicNumberLabel(mn);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a) arrEl.value  = h.a;
      if (h.s) smEl.value   = h.s;
      if (h.c) custEl.value = h.c;
      if (h.g) gmEl.value   = h.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var arr = parseFloat(arrEl.value) || 0;
        var sm  = parseFloat(smEl.value) || 0;
        var mn  = calcMagicNumber(arr, sm);
        var lines = [
          "Net new ARR: " + fmtARR(arr),
          "Prior quarter S&M spend: " + fmtARR(sm),
          "Magic Number: " + (mn !== null ? mn.toFixed(2) : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [arrEl, smEl, custEl, gmEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcMagicNumber, calcAnnualizedSMSpend, calcImpliedCAC, calcPaybackFromMagicNumber, magicNumberLabel };
  }
})();
