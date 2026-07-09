(function () {
  "use strict";

  function calcLTV(arpu, grossMarginPct, lifetimeMonths) {
    if (!arpu || arpu <= 0 || grossMarginPct == null || !lifetimeMonths || lifetimeMonths <= 0) return null;
    return arpu * (grossMarginPct / 100) * lifetimeMonths;
  }

  function calcLifetimeFromChurn(monthlyChurnPct) {
    if (!monthlyChurnPct || monthlyChurnPct <= 0 || monthlyChurnPct >= 100) return null;
    return 1 / (monthlyChurnPct / 100);
  }

  function calcLTVCAC(ltv, cac) {
    if (!ltv || ltv <= 0 || !cac || cac <= 0) return null;
    return ltv / cac;
  }

  function calcPaybackMonths(cac, arpu, grossMarginPct) {
    if (!cac || cac <= 0 || !arpu || arpu <= 0 || !grossMarginPct || grossMarginPct <= 0) return null;
    var grossProfit = arpu * (grossMarginPct / 100);
    if (grossProfit <= 0) return null;
    return cac / grossProfit;
  }

  function ltvLabel(ltvCac) {
    if (ltvCac === null) return null;
    if (ltvCac < 1) return { text: "LTV:CAC below 1× — each customer destroys value. Fix pricing, margin, or retention first.", type: "warning" };
    if (ltvCac < 3) return { text: "LTV:CAC below 3×. Benchmark is 3× or higher for healthy unit economics.", type: "warning" };
    if (ltvCac < 5) return { text: "LTV:CAC above 3× — healthy unit economics. You're creating value with each customer.", type: "info" };
    return { text: "LTV:CAC above 5× — excellent. Consider investing more in growth at this efficiency.", type: "info" };
  }

  function fmt(v, prefix, suffix, decimals) {
    if (v === null || isNaN(v)) return "—";
    var n = typeof decimals === "number" ? v.toFixed(decimals) : Math.round(v).toString();
    var formatted = parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: typeof decimals === "number" ? decimals : 0 });
    return (prefix || "") + formatted + (suffix || "");
  }

  function init() {
    var arpuEl    = document.getElementById("ltv-arpu");
    var marginEl  = document.getElementById("ltv-margin");
    var churnEl   = document.getElementById("ltv-churn");
    var cacEl     = document.getElementById("ltv-cac");
    var insightEl = document.getElementById("ltv-insight");
    var shareBtn  = document.getElementById("ltv-share");
    var copyBtn   = document.getElementById("ltv-copy");

    function update() {
      var arpu    = parseFloat(arpuEl.value) || 0;
      var margin  = parseFloat(marginEl.value) || 0;
      var churn   = parseFloat(churnEl.value) || 0;
      var cac     = parseFloat(cacEl.value) || 0;

      var lifetime = calcLifetimeFromChurn(churn);
      var ltv      = calcLTV(arpu, margin, lifetime);
      var ltvCac   = cac > 0 ? calcLTVCAC(ltv, cac) : null;
      var payback  = calcPaybackMonths(cac, arpu, margin);

      document.getElementById("ltv-result").textContent   = fmt(ltv, "$", "", 0);
      document.getElementById("ltv-lifetime").textContent = lifetime !== null ? lifetime.toFixed(1) + " mo" : "—";
      document.getElementById("ltv-ltvCac").textContent   = ltvCac !== null ? ltvCac.toFixed(2) + "×" : "—";
      document.getElementById("ltv-payback").textContent  = payback !== null ? payback.toFixed(1) + " mo" : "—";

      window.FTK.hashSet({ a: arpuEl.value, m: marginEl.value, c: churnEl.value, k: cacEl.value });

      var ins = ltvLabel(ltvCac);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.a) arpuEl.value = h.a;
      if (h.m) marginEl.value = h.m;
      if (h.c) churnEl.value = h.c;
      if (h.k && cacEl) cacEl.value = h.k;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var arpu    = parseFloat(arpuEl.value) || 0;
        var margin  = parseFloat(marginEl.value) || 0;
        var churn   = parseFloat(churnEl.value) || 0;
        var cac     = parseFloat(cacEl.value) || 0;
        var lifetime = calcLifetimeFromChurn(churn);
        var ltv      = calcLTV(arpu, margin, lifetime);
        var ltvCac   = cac > 0 ? calcLTVCAC(ltv, cac) : null;
        var payback  = calcPaybackMonths(cac, arpu, margin);
        var lines = [
          "ARPU: $" + arpu.toLocaleString(),
          "Gross margin: " + margin + "%",
          "Monthly churn: " + churn + "%",
          "Customer lifetime: " + (lifetime !== null ? lifetime.toFixed(1) + " months" : "—"),
          "LTV: " + fmt(ltv, "$", "", 0),
          "CAC: $" + cac.toLocaleString(),
          "LTV:CAC ratio: " + (ltvCac !== null ? ltvCac.toFixed(2) + "×" : "—"),
          "CAC payback: " + (payback !== null ? payback.toFixed(1) + " months" : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [arpuEl, marginEl, churnEl, cacEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcLTV, calcLifetimeFromChurn, calcLTVCAC, calcPaybackMonths };
  }
})();
