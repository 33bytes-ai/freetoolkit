(function () {
  "use strict";

  function calculateMargins(revenue, cogs, operatingExpenses, taxesAndInterest) {
    if (revenue <= 0) return null;
    var grossProfit = revenue - cogs;
    var grossMargin = (grossProfit / revenue) * 100;
    var operatingProfit = grossProfit - operatingExpenses;
    var operatingMargin = (operatingProfit / revenue) * 100;
    var netProfit = operatingProfit - (taxesAndInterest || 0);
    var netMargin = (netProfit / revenue) * 100;
    return { grossProfit, grossMargin, operatingProfit, operatingMargin, netProfit, netMargin };
  }

  function init() {
    var revenueEl = document.getElementById("pm-revenue");
    var cogsEl = document.getElementById("pm-cogs");
    var opexEl = document.getElementById("pm-opex");
    var taxesEl = document.getElementById("pm-taxes");

    var outputs = {
      "pm-gross-profit": function (r) { return fmtD(r.grossProfit); },
      "pm-gross-margin": function (r) { return r.grossMargin.toFixed(1) + "%"; },
      "pm-op-profit": function (r) { return fmtD(r.operatingProfit); },
      "pm-op-margin": function (r) { return r.operatingMargin.toFixed(1) + "%"; },
      "pm-net-profit": function (r) { return fmtD(r.netProfit); },
      "pm-net-margin": function (r) { return r.netMargin.toFixed(1) + "%"; },
    };

    function fmtD(v) {
      return (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString();
    }

    function update() {
      var result = calculateMargins(
        parseFloat(revenueEl.value) || 0,
        parseFloat(cogsEl.value) || 0,
        parseFloat(opexEl.value) || 0,
        parseFloat(taxesEl.value) || 0
      );
      if (!result) return;
      Object.keys(outputs).forEach(function (id) {
        document.getElementById(id).textContent = outputs[id](result);
      });
      window.FTK.hashSet({ r: revenueEl.value, c: cogsEl.value, o: opexEl.value, t: taxesEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.r) return;
      if (s.r) revenueEl.value = s.r;
      if (s.c) cogsEl.value = s.c;
      if (s.o) opexEl.value = s.o;
      if (s.t) taxesEl.value = s.t;
    }

    var copyBtn = document.getElementById("pm-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = [
          "Gross profit: " + document.getElementById("pm-gross-profit").textContent,
          "Gross margin: " + document.getElementById("pm-gross-margin").textContent,
          "Op profit: " + document.getElementById("pm-op-profit").textContent,
          "Op margin: " + document.getElementById("pm-op-margin").textContent,
          "Net profit: " + document.getElementById("pm-net-profit").textContent,
          "Net margin: " + document.getElementById("pm-net-margin").textContent,
        ].join(" | ");
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("pm-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [revenueEl, cogsEl, opexEl, taxesEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateMargins: calculateMargins };
  }
})();
