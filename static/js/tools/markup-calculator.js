(function () {
  "use strict";

  function calcMarkupPct(cost, sellingPrice) {
    if (cost <= 0) return null;
    return ((sellingPrice - cost) / cost) * 100;
  }

  function calcMarginPct(cost, sellingPrice) {
    if (sellingPrice <= 0) return null;
    return ((sellingPrice - cost) / sellingPrice) * 100;
  }

  function calcSellingPriceFromMarkup(cost, markupPct) {
    if (cost <= 0 || markupPct < 0) return null;
    return cost * (1 + markupPct / 100);
  }

  function calcSellingPriceFromMargin(cost, marginPct) {
    if (cost <= 0 || marginPct >= 100 || marginPct < 0) return null;
    return cost / (1 - marginPct / 100);
  }

  function calcMarkupFromMargin(marginPct) {
    if (marginPct >= 100 || marginPct < 0) return null;
    return (marginPct / (100 - marginPct)) * 100;
  }

  function calcMarginFromMarkup(markupPct) {
    if (markupPct < 0) return null;
    return (markupPct / (100 + markupPct)) * 100;
  }

  function init() {
    var costEl    = document.getElementById("mk-cost");
    var priceEl   = document.getElementById("mk-price");
    var insEl     = document.getElementById("mk-insight");
    var copyBtn   = document.getElementById("mk-copy");
    var shareBtn  = document.getElementById("mk-share");

    function update() {
      var cost  = parseFloat(costEl.value)  || 0;
      var price = parseFloat(priceEl.value) || 0;

      var markup = calcMarkupPct(cost, price);
      var margin = calcMarginPct(cost, price);
      var profit = price - cost;

      document.getElementById("mk-markup").textContent  = markup !== null ? markup.toFixed(2) + "%" : "--";
      document.getElementById("mk-margin").textContent  = margin !== null ? margin.toFixed(2) + "%" : "--";
      document.getElementById("mk-profit").textContent  = !isNaN(profit) ? "$" + profit.toFixed(2) : "--";
      document.getElementById("mk-ratio").textContent   = cost > 0 ? (price / cost).toFixed(2) + "×" : "--";

      window.FTK.hashSet({ c: cost, p: price });

      if (markup !== null && margin !== null) {
        var type = margin >= 30 ? "success" : margin >= 15 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          "Markup of " + markup.toFixed(1) + "% = Margin of " + margin.toFixed(1) + "%. " +
          "Markup is always higher than margin on the same transaction — they measure different bases. " +
          "Gross profit: $" + profit.toFixed(2) + " per unit.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.c) costEl.value  = h.c;
      if (h.p) priceEl.value = h.p;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var c = parseFloat(costEl.value) || 0;
        var p = parseFloat(priceEl.value) || 0;
        var lines = [
          "Markup Calculator Results",
          "Cost: $" + c.toFixed(2),
          "Selling Price: $" + p.toFixed(2),
          "Markup: " + (calcMarkupPct(c, p) !== null ? calcMarkupPct(c, p).toFixed(2) + "%" : "--"),
          "Margin: " + (calcMarginPct(c, p) !== null ? calcMarginPct(c, p).toFixed(2) + "%" : "--"),
          "Gross Profit: $" + (p - c).toFixed(2)
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [costEl, priceEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcMarkupPct: calcMarkupPct, calcMarginPct: calcMarginPct, calcSellingPriceFromMarkup: calcSellingPriceFromMarkup, calcSellingPriceFromMargin: calcSellingPriceFromMargin, calcMarkupFromMargin: calcMarkupFromMargin, calcMarginFromMarkup: calcMarginFromMarkup };
  }
})();
