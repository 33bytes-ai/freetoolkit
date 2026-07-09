(function () {
  "use strict";

  function calcEnterpriseValue(marketCap, totalDebt, cash) {
    return marketCap + totalDebt - cash;
  }

  function calcMarketCap(sharesOutstanding, stockPrice) {
    return sharesOutstanding * stockPrice;
  }

  function calcEVToEBITDA(ev, ebitda) {
    if (ebitda <= 0) return null;
    return ev / ebitda;
  }

  function calcEVToRevenue(ev, revenue) {
    if (revenue <= 0) return null;
    return ev / revenue;
  }

  function calcEquityValueFromEV(ev, totalDebt, cash) {
    return ev - totalDebt + cash;
  }

  function evLabel(evEbitda) {
    if (evEbitda === null || evEbitda === undefined) return "";
    if (evEbitda < 5)   return "Very low — value or distressed";
    if (evEbitda < 10)  return "Below market";
    if (evEbitda < 15)  return "Market range";
    if (evEbitda < 25)  return "Above market — growth premium";
    return "High premium — high-growth expectations";
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    if (Math.abs(n) >= 1000000000) return "$" + (n / 1000000000).toFixed(2) + "B";
    if (Math.abs(n) >= 1000000)    return "$" + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)       return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }

  function init() {
    var mcEl     = document.getElementById("ev-mktcap");
    var debtEl   = document.getElementById("ev-debt");
    var cashEl   = document.getElementById("ev-cash");
    var ebitdaEl = document.getElementById("ev-ebitda");
    var revEl    = document.getElementById("ev-revenue");
    var insEl    = document.getElementById("ev-insight");
    var copyBtn  = document.getElementById("ev-copy");
    var shareBtn = document.getElementById("ev-share");

    function update() {
      var mc     = parseFloat(mcEl.value)     || 0;
      var debt   = parseFloat(debtEl.value)   || 0;
      var cash   = parseFloat(cashEl.value)   || 0;
      var ebitda = parseFloat(ebitdaEl.value) || 0;
      var rev    = parseFloat(revEl.value)    || 0;

      var ev         = calcEnterpriseValue(mc, debt, cash);
      var evEbitda   = ebitda > 0 ? calcEVToEBITDA(ev, ebitda) : null;
      var evRevenue  = rev > 0    ? calcEVToRevenue(ev, rev) : null;
      var equityVal  = calcEquityValueFromEV(ev, debt, cash);

      document.getElementById("ev-result").textContent       = fmt(ev);
      document.getElementById("ev-ev-ebitda").textContent    = evEbitda  !== null ? evEbitda.toFixed(1) + "x" : "--";
      document.getElementById("ev-ev-revenue").textContent   = evRevenue !== null ? evRevenue.toFixed(1) + "x" : "--";
      document.getElementById("ev-equity-val").textContent   = fmt(equityVal);

      window.FTK.hashSet({ mc: mc, d: debt, c: cash, eb: ebitda, r: rev });

      if (evEbitda !== null) {
        var label = evLabel(evEbitda);
        var type  = evEbitda < 20 ? "success" : "info";
        window.FTK.showInsight(insEl,
          label + " — Enterprise Value: " + fmt(ev) + ". " +
          "EV/EBITDA: " + evEbitda.toFixed(1) + "x" +
          (evRevenue !== null ? "; EV/Revenue: " + evRevenue.toFixed(1) + "x" : "") + ". " +
          "EV includes debt obligations — use it instead of market cap when comparing businesses with different capital structures.", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.mc) mcEl.value     = h.mc;
      if (h.d)  debtEl.value   = h.d;
      if (h.c)  cashEl.value   = h.c;
      if (h.eb) ebitdaEl.value = h.eb;
      if (h.r)  revEl.value    = h.r;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var mc    = parseFloat(mcEl.value)     || 0;
        var debt  = parseFloat(debtEl.value)   || 0;
        var cash  = parseFloat(cashEl.value)   || 0;
        var eb    = parseFloat(ebitdaEl.value) || 0;
        var rev   = parseFloat(revEl.value)    || 0;
        var ev    = calcEnterpriseValue(mc, debt, cash);
        var lines = [
          "Enterprise Value Calculator",
          "Market Cap: " + fmt(mc),
          "Total Debt: " + fmt(debt),
          "Cash: " + fmt(cash),
          "Enterprise Value: " + fmt(ev),
          "EV/EBITDA: " + (eb > 0 ? calcEVToEBITDA(ev, eb).toFixed(1) + "x" : "--"),
          "EV/Revenue: " + (rev > 0 ? calcEVToRevenue(ev, rev).toFixed(1) + "x" : "--")
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [mcEl, debtEl, cashEl, ebitdaEl, revEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcEnterpriseValue: calcEnterpriseValue, calcMarketCap: calcMarketCap, calcEVToEBITDA: calcEVToEBITDA, calcEVToRevenue: calcEVToRevenue, calcEquityValueFromEV: calcEquityValueFromEV, evLabel: evLabel };
  }
})();
