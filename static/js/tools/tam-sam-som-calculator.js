(function () {
  "use strict";

  function calcTAM(targetPopulation, avgAnnualSpend) {
    if (!targetPopulation || targetPopulation <= 0 || !avgAnnualSpend || avgAnnualSpend <= 0) return null;
    return targetPopulation * avgAnnualSpend;
  }

  function calcSAM(tam, serviceablePercent) {
    if (tam === null || !serviceablePercent || serviceablePercent <= 0 || serviceablePercent > 100) return null;
    return tam * (serviceablePercent / 100);
  }

  function calcSOM(sam, targetMarketSharePercent) {
    if (sam === null || !targetMarketSharePercent || targetMarketSharePercent <= 0 || targetMarketSharePercent > 100) return null;
    return sam * (targetMarketSharePercent / 100);
  }

  function calcRevenueAtMarketShare(tam, marketSharePct) {
    if (tam === null || tam <= 0 || !marketSharePct || marketSharePct <= 0) return null;
    return tam * (marketSharePct / 100);
  }

  function tamLabel(tam, som) {
    if (tam === null) return null;
    var target = som !== null ? som : tam;
    if (tam >= 10000000000) return { text: "Large market: TAM $" + (tam / 1000000000).toFixed(1) + "B. Even 0.1% market share = $" + (tam / 1000 / 1000000).toFixed(0) + "M revenue. Validate with bottom-up analysis.", type: "info" };
    if (tam >= 1000000000) return { text: "Substantial market: TAM $" + (tam / 1000000000).toFixed(1) + "B. Enough headroom for a $100M+ company at 5–10% share.", type: "info" };
    if (tam >= 100000000) return { text: "Medium market: TAM $" + (tam / 1000000).toFixed(0) + "M. Fundable if SOM is $10M+. Validate whether this expands as the market matures.", type: "info" };
    return { text: "Small market: TAM $" + (tam / 1000000).toFixed(1) + "M. Consider adjacent markets or a broader definition. VCs typically want to see $500M+ TAM.", type: "warning" };
  }

  function init() {
    var popEl      = document.getElementById("tsm-population");
    var spendEl    = document.getElementById("tsm-spend");
    var servEl     = document.getElementById("tsm-serviceable");
    var shareEl    = document.getElementById("tsm-share");
    var insEl      = document.getElementById("tsm-insight");
    var shareBtn   = document.getElementById("tsm-share-btn");
    var copyBtn    = document.getElementById("tsm-copy");

    function update() {
      var pop   = parseFloat(popEl.value)   || 0;
      var spend = parseFloat(spendEl.value) || 0;
      var serv  = parseFloat(servEl.value)  || 0;
      var share = parseFloat(shareEl.value) || 0;

      var tam = calcTAM(pop, spend);
      var sam = tam ? calcSAM(tam, serv) : null;
      var som = sam ? calcSOM(sam, share) : null;

      function fmt(v) {
        if (v === null) return "--";
        if (v >= 1000000000) return "$" + (v / 1000000000).toFixed(2) + "B";
        if (v >= 1000000)    return "$" + (v / 1000000).toFixed(1) + "M";
        return "$" + (v / 1000).toFixed(0) + "k";
      }

      document.getElementById("tsm-tam").textContent = fmt(tam);
      document.getElementById("tsm-sam").textContent = fmt(sam);
      document.getElementById("tsm-som").textContent = fmt(som);
      document.getElementById("tsm-share-pct").textContent = (tam && som) ? (som / tam * 100).toFixed(3) + "%" : "--";

      window.FTK.hashSet({ p: popEl.value, s: spendEl.value, v: servEl.value, x: shareEl.value });

      var ins = tamLabel(tam, som);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.p) popEl.value   = h.p;
      if (h.s) spendEl.value = h.s;
      if (h.v) servEl.value  = h.v;
      if (h.x) shareEl.value = h.x;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var pop   = parseFloat(popEl.value)   || 0;
        var spend = parseFloat(spendEl.value) || 0;
        var serv  = parseFloat(servEl.value)  || 0;
        var share = parseFloat(shareEl.value) || 0;
        var tam   = calcTAM(pop, spend);
        var sam   = tam ? calcSAM(tam, serv) : null;
        var som   = sam ? calcSOM(sam, share) : null;
        function fmt(v) {
          if (v === null) return "--";
          if (v >= 1000000000) return "$" + (v / 1000000000).toFixed(2) + "B";
          if (v >= 1000000)    return "$" + (v / 1000000).toFixed(1) + "M";
          return "$" + (v / 1000).toFixed(0) + "k";
        }
        var lines = ["TAM: " + fmt(tam), "SAM: " + fmt(sam), "SOM: " + fmt(som)];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [popEl, spendEl, servEl, shareEl].forEach(function (el) { if (el) el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcTAM, calcSAM, calcSOM, calcRevenueAtMarketShare, tamLabel };
  }
})();
