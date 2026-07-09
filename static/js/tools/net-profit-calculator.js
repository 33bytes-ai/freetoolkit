(function () {
  "use strict";

  function calcGrossProfit(revenue, cogs) {
    return revenue - cogs;
  }

  function calcOperatingIncome(grossProfit, operatingExpenses) {
    return grossProfit - operatingExpenses;
  }

  function calcNetProfit(operatingIncome, interestExpense, taxes) {
    return operatingIncome - interestExpense - taxes;
  }

  function calcNetProfitMargin(netProfit, revenue) {
    if (revenue <= 0) return null;
    return (netProfit / revenue) * 100;
  }

  function calcOperatingMargin(operatingIncome, revenue) {
    if (revenue <= 0) return null;
    return (operatingIncome / revenue) * 100;
  }

  function calcGrossMargin(grossProfit, revenue) {
    if (revenue <= 0) return null;
    return (grossProfit / revenue) * 100;
  }

  function profitLabel(netMargin) {
    if (netMargin === null || netMargin === undefined) return "";
    if (netMargin >= 20) return "Highly profitable";
    if (netMargin >= 10) return "Profitable";
    if (netMargin >= 0)  return "Breakeven zone";
    return "Net loss";
  }

  function fmt(n, prefix) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    var p = prefix || "";
    if (Math.abs(n) >= 1000000) return p + (n / 1000000).toFixed(2) + "M";
    if (Math.abs(n) >= 1000)    return p + (n / 1000).toFixed(1) + "k";
    return p + n.toFixed(0);
  }

  function init() {
    var revEl    = document.getElementById("np-revenue");
    var cogsEl   = document.getElementById("np-cogs");
    var opexEl   = document.getElementById("np-opex");
    var intEl    = document.getElementById("np-interest");
    var taxEl    = document.getElementById("np-taxes");
    var insEl    = document.getElementById("np-insight");
    var copyBtn  = document.getElementById("np-copy");
    var shareBtn = document.getElementById("np-share");

    function update() {
      var rev  = parseFloat(revEl.value)  || 0;
      var cogs = parseFloat(cogsEl.value) || 0;
      var opex = parseFloat(opexEl.value) || 0;
      var inte = parseFloat(intEl.value)  || 0;
      var tax  = parseFloat(taxEl.value)  || 0;

      var gp   = calcGrossProfit(rev, cogs);
      var oi   = calcOperatingIncome(gp, opex);
      var np   = calcNetProfit(oi, inte, tax);
      var gm   = calcGrossMargin(gp, rev);
      var om   = calcOperatingMargin(oi, rev);
      var nm   = calcNetProfitMargin(np, rev);

      document.getElementById("np-gross-profit").textContent  = fmt(gp, "$");
      document.getElementById("np-operating").textContent     = fmt(oi, "$");
      document.getElementById("np-result").textContent        = fmt(np, "$");
      document.getElementById("np-net-margin").textContent    = nm !== null ? nm.toFixed(1) + "%" : "--";

      window.FTK.hashSet({ r: rev, c: cogs, o: opex, i: inte, t: tax });

      if (nm !== null) {
        var label = profitLabel(nm);
        var type  = nm >= 10 ? "success" : nm >= 0 ? "info" : "warning";
        window.FTK.showInsight(insEl,
          label + " — " + nm.toFixed(1) + "% net margin. " +
          "Gross margin: " + (gm !== null ? gm.toFixed(1) + "%" : "--") + ". " +
          "Operating margin: " + (om !== null ? om.toFixed(1) + "%" : "--") + ". " +
          "Net profit: " + fmt(np, "$") + ".", type);
      }
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revEl.value  = h.r;
      if (h.c) cogsEl.value = h.c;
      if (h.o) opexEl.value = h.o;
      if (h.i) intEl.value  = h.i;
      if (h.t) taxEl.value  = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var r = parseFloat(revEl.value) || 0;
        var c = parseFloat(cogsEl.value) || 0;
        var o = parseFloat(opexEl.value) || 0;
        var i = parseFloat(intEl.value) || 0;
        var t = parseFloat(taxEl.value) || 0;
        var gp = calcGrossProfit(r, c);
        var oi = calcOperatingIncome(gp, o);
        var np = calcNetProfit(oi, i, t);
        var lines = [
          "Net Profit Calculator Results",
          "Revenue: " + fmt(r, "$"),
          "Gross Profit: " + fmt(gp, "$") + " (" + (calcGrossMargin(gp, r) !== null ? calcGrossMargin(gp, r).toFixed(1) + "%" : "--") + ")",
          "Operating Income: " + fmt(oi, "$") + " (" + (calcOperatingMargin(oi, r) !== null ? calcOperatingMargin(oi, r).toFixed(1) + "%" : "--") + ")",
          "Net Profit: " + fmt(np, "$") + " (" + (calcNetProfitMargin(np, r) !== null ? calcNetProfitMargin(np, r).toFixed(1) + "%" : "--") + ")"
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revEl, cogsEl, opexEl, intEl, taxEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGrossProfit: calcGrossProfit, calcOperatingIncome: calcOperatingIncome, calcNetProfit: calcNetProfit, calcNetProfitMargin: calcNetProfitMargin, calcOperatingMargin: calcOperatingMargin, calcGrossMargin: calcGrossMargin, profitLabel: profitLabel };
  }
})();
