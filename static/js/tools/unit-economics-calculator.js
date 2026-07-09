(function () {
  "use strict";

  function calcPaybackMonths(cac, mrrPerCustomer, grossMarginPct) {
    if (!cac || !mrrPerCustomer || grossMarginPct == null) return null;
    if (mrrPerCustomer <= 0 || grossMarginPct <= 0 || grossMarginPct >= 100) return null;
    return cac / (mrrPerCustomer * (grossMarginPct / 100));
  }

  function calcLTV(mrrPerCustomer, grossMarginPct, lifetimeMonths) {
    if (!mrrPerCustomer || grossMarginPct == null || !lifetimeMonths) return null;
    if (mrrPerCustomer <= 0 || grossMarginPct <= 0 || lifetimeMonths <= 0) return null;
    return mrrPerCustomer * (grossMarginPct / 100) * lifetimeMonths;
  }

  function calcLTVCAC(ltv, cac) {
    if (!ltv || !cac || cac <= 0) return null;
    return ltv / cac;
  }

  function calcMagicNumber(netNewARR, prevSMSpend) {
    if (!netNewARR || !prevSMSpend || prevSMSpend <= 0) return null;
    return netNewARR / prevSMSpend;
  }

  function fmt(v, decimals) {
    if (v === null || isNaN(v)) return "—";
    return v.toFixed(decimals != null ? decimals : 2);
  }

  function fmtMoney(v) {
    if (v === null || isNaN(v)) return "—";
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
    return "$" + v.toFixed(0);
  }

  function paybackLabel(months) {
    if (months === null) return null;
    if (months < 12) return { text: "Excellent payback — well within SaaS best practice.", type: "info" };
    if (months < 18) return { text: "Good payback period. Most VCs target < 18 months.", type: "info" };
    if (months < 24) return { text: "Acceptable but watch cash flow — growth will be capital-intensive.", type: "warning" };
    return { text: "Payback > 24 months: growth will destroy cash unless gross margins improve or CAC drops.", type: "warning" };
  }

  function ltvCacLabel(ratio) {
    if (ratio === null) return null;
    if (ratio >= 3) return { text: "Healthy LTV:CAC ≥ 3× — benchmark for venture-backed SaaS.", type: "info" };
    if (ratio >= 1) return { text: "LTV:CAC between 1× and 3× — profitable but room to improve.", type: "info" };
    return { text: "LTV:CAC < 1×: you're spending more to acquire customers than they're worth.", type: "warning" };
  }

  function init() {
    var cacEl      = document.getElementById("ue-cac");
    var mrrEl      = document.getElementById("ue-mrr");
    var marginEl   = document.getElementById("ue-margin");
    var lifetimeEl = document.getElementById("ue-lifetime");
    var netArrEl   = document.getElementById("ue-net-arr");
    var smSpendEl  = document.getElementById("ue-sm-spend");
    var insightEl  = document.getElementById("ue-insight");
    var shareBtn   = document.getElementById("ue-share");
    var copyBtn    = document.getElementById("ue-copy");

    function update() {
      var cac      = parseFloat(cacEl.value);
      var mrr      = parseFloat(mrrEl.value);
      var margin   = parseFloat(marginEl.value);
      var lifetime = parseFloat(lifetimeEl.value);
      var netArr   = parseFloat(netArrEl ? netArrEl.value : 0);
      var smSpend  = parseFloat(smSpendEl ? smSpendEl.value : 0);

      var payback  = calcPaybackMonths(cac, mrr, margin);
      var ltv      = calcLTV(mrr, margin, lifetime);
      var ltvCac   = calcLTVCAC(ltv, cac);
      var magic    = calcMagicNumber(netArr, smSpend);

      document.getElementById("ue-payback").textContent    = payback !== null ? fmt(payback, 1) + " mo" : "—";
      document.getElementById("ue-ltv").textContent        = fmtMoney(ltv);
      document.getElementById("ue-ltv-cac").textContent    = ltvCac !== null ? fmt(ltvCac, 1) + "×" : "—";
      document.getElementById("ue-magic").textContent      = magic !== null ? fmt(magic, 2) : "—";

      window.FTK.hashSet({
        c: cacEl.value, m: mrrEl.value, g: marginEl.value, l: lifetimeEl.value,
        n: netArrEl ? netArrEl.value : "", s: smSpendEl ? smSpendEl.value : ""
      });

      var pbLabel = paybackLabel(payback);
      var ltvLabel = ltvCacLabel(ltvCac);
      var insight = "";
      if (pbLabel) insight = pbLabel.text;
      if (ltvLabel) insight += (insight ? " " : "") + ltvLabel.text;
      window.FTK.showInsight(insightEl, insight, pbLabel && pbLabel.type === "warning" ? "warning" : "info");
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.c) cacEl.value = s.c;
      if (s.m) mrrEl.value = s.m;
      if (s.g) marginEl.value = s.g;
      if (s.l) lifetimeEl.value = s.l;
      if (s.n && netArrEl) netArrEl.value = s.n;
      if (s.s && smSpendEl) smSpendEl.value = s.s;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var cac      = parseFloat(cacEl.value);
        var mrr      = parseFloat(mrrEl.value);
        var margin   = parseFloat(marginEl.value);
        var lifetime = parseFloat(lifetimeEl.value);
        var netArr   = parseFloat(netArrEl ? netArrEl.value : 0);
        var smSpend  = parseFloat(smSpendEl ? smSpendEl.value : 0);
        var payback  = calcPaybackMonths(cac, mrr, margin);
        var ltv      = calcLTV(mrr, margin, lifetime);
        var ltvCac   = calcLTVCAC(ltv, cac);
        var magic    = calcMagicNumber(netArr, smSpend);
        var lines = [
          "CAC: $" + (isNaN(cac) ? "—" : cac),
          "MRR per customer: $" + (isNaN(mrr) ? "—" : mrr),
          "Gross margin: " + (isNaN(margin) ? "—" : margin) + "%",
          "Customer lifetime: " + (isNaN(lifetime) ? "—" : lifetime) + " months",
          "CAC payback: " + (payback !== null ? fmt(payback, 1) + " months" : "—"),
          "LTV: " + fmtMoney(ltv),
          "LTV:CAC ratio: " + (ltvCac !== null ? fmt(ltvCac, 1) + "×" : "—"),
          "Magic number: " + (magic !== null ? fmt(magic, 2) : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [cacEl, mrrEl, marginEl, lifetimeEl, netArrEl, smSpendEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPaybackMonths, calcLTV, calcLTVCAC, calcMagicNumber };
  }
})();
