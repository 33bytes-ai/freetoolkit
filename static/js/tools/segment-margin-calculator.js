(function () {
  "use strict";

  function calcGrossMargin(revenue, cogs) {
    if (!revenue || revenue <= 0) return null;
    return ((revenue - cogs) / revenue) * 100;
  }

  function calcGrossProfit(revenue, cogs) {
    if (!revenue || revenue <= 0) return null;
    return revenue - cogs;
  }

  function calcBlendedMargin(segments) {
    if (!segments || segments.length === 0) return null;
    var totalRevenue = 0;
    var totalGrossProfit = 0;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (!s.revenue || s.revenue <= 0) continue;
      totalRevenue += s.revenue;
      totalGrossProfit += s.revenue - s.cogs;
    }
    if (totalRevenue <= 0) return null;
    return (totalGrossProfit / totalRevenue) * 100;
  }

  function calcRevenueShare(segmentRevenue, totalRevenue) {
    if (!totalRevenue || totalRevenue <= 0) return null;
    return (segmentRevenue / totalRevenue) * 100;
  }

  function segmentLabel(blendedMargin) {
    if (blendedMargin === null) return null;
    if (blendedMargin >= 70) return { text: "Excellent blended gross margin (" + blendedMargin.toFixed(1) + "%). Your product mix is optimized toward high-margin offerings. Focus on protecting these margins at scale.", type: "info" };
    if (blendedMargin >= 50) return { text: "Good blended margin (" + blendedMargin.toFixed(1) + "%). Look at which segments drag the blended rate and whether their strategic value justifies the lower margin.", type: "info" };
    if (blendedMargin >= 30) return { text: "Moderate blended margin (" + blendedMargin.toFixed(1) + "%). Consider whether shifting revenue mix toward higher-margin segments is achievable through pricing or product investment.", type: "info" };
    return { text: "Low blended margin (" + blendedMargin.toFixed(1) + "%). Gross margin at this level constrains your ability to invest in sales, marketing, and R&D. Review cost structure in each segment.", type: "warning" };
  }

  function init() {
    var segments = [
      { name: "seg-a", rev: "sma-rev", cogs: "sma-cogs", margin: "sma-margin", profit: "sma-profit", share: "sma-share" },
      { name: "seg-b", rev: "smb-rev", cogs: "smb-cogs", margin: "smb-margin", profit: "smb-profit", share: "smb-share" },
      { name: "seg-c", rev: "smc-rev", cogs: "smc-cogs", margin: "smc-margin", profit: "smc-profit", share: "smc-share" },
      { name: "seg-d", rev: "smd-rev", cogs: "smd-cogs", margin: "smd-margin", profit: "smd-profit", share: "smd-share" },
    ];
    var insEl    = document.getElementById("sm-insight");
    var shareBtn = document.getElementById("sm-share-btn");
    var copyBtn  = document.getElementById("sm-copy");

    function getEl(id) { return document.getElementById(id); }
    function getVal(id) { var el = getEl(id); return el ? (parseFloat(el.value) || 0) : 0; }

    function update() {
      var segData = segments.map(function (s) {
        return { revenue: getVal(s.rev), cogs: getVal(s.cogs) };
      });

      var totalRevenue = segData.reduce(function (a, b) { return a + b.revenue; }, 0);
      var blended = calcBlendedMargin(segData);

      segments.forEach(function (s, i) {
        var d = segData[i];
        var margin = d.revenue > 0 ? calcGrossMargin(d.revenue, d.cogs) : null;
        var profit = d.revenue > 0 ? calcGrossProfit(d.revenue, d.cogs) : null;
        var share  = d.revenue > 0 && totalRevenue > 0 ? calcRevenueShare(d.revenue, totalRevenue) : null;

        var mEl = getEl(s.margin); if (mEl) mEl.textContent = margin !== null ? margin.toFixed(1) + "%" : "--";
        var pEl = getEl(s.profit); if (pEl) pEl.textContent = profit !== null ? "$" + Math.round(profit).toLocaleString() : "--";
        var xEl = getEl(s.share);  if (xEl) xEl.textContent = share  !== null ? share.toFixed(1) + "%" : "--";
      });

      var blEl = getEl("sm-blended"); if (blEl) blEl.textContent = blended !== null ? blended.toFixed(1) + "%" : "--";

      window.FTK.hashSet({
        ar: getEl("sma-rev") ? getEl("sma-rev").value : "", ac: getEl("sma-cogs") ? getEl("sma-cogs").value : "",
        br: getEl("smb-rev") ? getEl("smb-rev").value : "", bc: getEl("smb-cogs") ? getEl("smb-cogs").value : "",
        cr: getEl("smc-rev") ? getEl("smc-rev").value : "", cc: getEl("smc-cogs") ? getEl("smc-cogs").value : "",
        dr: getEl("smd-rev") ? getEl("smd-rev").value : "", dc: getEl("smd-cogs") ? getEl("smd-cogs").value : "",
      });

      var ins = segmentLabel(blended);
      if (ins) window.FTK.showInsight(insEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      function s(id, v) { var el = getEl(id); if (el && v) el.value = v; }
      s("sma-rev", h.ar); s("sma-cogs", h.ac);
      s("smb-rev", h.br); s("smb-cogs", h.bc);
      s("smc-rev", h.cr); s("smc-cogs", h.cc);
      s("smd-rev", h.dr); s("smd-cogs", h.dc);
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var segData = segments.map(function (s) { return { revenue: getVal(s.rev), cogs: getVal(s.cogs) }; });
        var blended = calcBlendedMargin(segData);
        window.FTK.copyToClipboard("Blended gross margin: " + (blended !== null ? blended.toFixed(1) + "%" : "--"))
          .then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    var inputIds = ["sma-rev", "sma-cogs", "smb-rev", "smb-cogs", "smc-rev", "smc-cogs", "smd-rev", "smd-cogs"];
    inputIds.forEach(function (id) {
      var el = getEl(id);
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGrossMargin, calcGrossProfit, calcBlendedMargin, calcRevenueShare, segmentLabel };
  }
})();
