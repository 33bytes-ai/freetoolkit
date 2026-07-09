(function () {
  "use strict";

  function calcPE(stockPrice, eps) {
    if (eps <= 0) return null;
    return stockPrice / eps;
  }

  function calcImpliedStockPrice(eps, peMultiple) {
    return eps * peMultiple;
  }

  function calcEarningsYield(pe) {
    if (!pe || pe <= 0) return null;
    return (1 / pe) * 100;
  }

  function calcForwardPE(stockPrice, forwardEPS) {
    if (forwardEPS <= 0) return null;
    return stockPrice / forwardEPS;
  }

  function calcPEGRatio(pe, earningsGrowthPct) {
    if (!pe || earningsGrowthPct <= 0) return null;
    return pe / earningsGrowthPct;
  }

  function peLabel(pe) {
    if (pe === null || pe === undefined) return "";
    if (pe < 0)   return "Negative earnings";
    if (pe < 10)  return "Value territory";
    if (pe < 20)  return "Fair value range";
    if (pe < 35)  return "Growth premium";
    return "Expensive / high-growth";
  }

  function init() {
    var priceEl   = document.getElementById("pe-price");
    var epsEl     = document.getElementById("pe-eps");
    var fepsEl    = document.getElementById("pe-feps");
    var growthEl  = document.getElementById("pe-growth");
    var insEl     = document.getElementById("pe-insight");
    var copyBtn   = document.getElementById("pe-copy");
    var shareBtn  = document.getElementById("pe-share");

    function update() {
      var price  = parseFloat(priceEl.value)  || 0;
      var eps    = parseFloat(epsEl.value)    || 0;
      var feps   = parseFloat(fepsEl.value)   || 0;
      var growth = parseFloat(growthEl.value) || 0;

      var pe      = calcPE(price, eps);
      var fwdPE   = feps > 0 ? calcForwardPE(price, feps) : null;
      var ey      = calcEarningsYield(pe);
      var peg     = pe && growth > 0 ? calcPEGRatio(pe, growth) : null;

      document.getElementById("pe-result").textContent     = pe     !== null ? pe.toFixed(1) + "×"  : "--";
      document.getElementById("pe-forward").textContent    = fwdPE  !== null ? fwdPE.toFixed(1) + "×" : "--";
      document.getElementById("pe-ey").textContent         = ey     !== null ? ey.toFixed(2) + "%" : "--";
      document.getElementById("pe-peg").textContent        = peg    !== null ? peg.toFixed(2) + "×" : "--";

      window.FTK.hashSet({ p: price, e: eps, f: feps, g: growth });

      if (pe !== null) {
        var label = peLabel(pe);
        var type  = pe < 20 ? "success" : pe < 35 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — Trailing P/E: " + pe.toFixed(1) + "×. " +
          (ey !== null ? "Earnings yield: " + ey.toFixed(2) + "%. " : "") +
          (peg !== null ? "PEG ratio: " + peg.toFixed(2) + "× (PEG < 1 = undervalued relative to growth). " : "") +
          "S&P 500 historical average P/E: ~15–17×.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) priceEl.value  = h.p;
      if (h.e) epsEl.value    = h.e;
      if (h.f) fepsEl.value   = h.f;
      if (h.g) growthEl.value = h.g;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var price  = parseFloat(priceEl.value)  || 0;
        var eps    = parseFloat(epsEl.value)    || 0;
        var feps   = parseFloat(fepsEl.value)   || 0;
        var growth = parseFloat(growthEl.value) || 0;
        var pe     = calcPE(price, eps);
        var fwdPE  = feps > 0 ? calcForwardPE(price, feps) : null;
        var peg    = pe && growth > 0 ? calcPEGRatio(pe, growth) : null;
        var lines = [
          "P/E Ratio Calculator",
          "Stock Price: $" + price.toFixed(2),
          "EPS (TTM): $" + eps.toFixed(2),
          "Trailing P/E: " + (pe !== null ? pe.toFixed(1) + "×" : "--"),
          "Forward P/E: " + (fwdPE !== null ? fwdPE.toFixed(1) + "×" : "--"),
          "Earnings Yield: " + (calcEarningsYield(pe) !== null ? calcEarningsYield(pe).toFixed(2) + "%" : "--"),
          "PEG Ratio: " + (peg !== null ? peg.toFixed(2) + "×" : "--"),
          "Assessment: " + peLabel(pe)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [priceEl, epsEl, fepsEl, growthEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcPE: calcPE, calcImpliedStockPrice: calcImpliedStockPrice, calcEarningsYield: calcEarningsYield, calcForwardPE: calcForwardPE, calcPEGRatio: calcPEGRatio, peLabel: peLabel };
  }
})();
