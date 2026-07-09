(function () {
  "use strict";

  function calcGrossMargin(revenue, cogs) {
    if (!revenue || revenue <= 0 || cogs == null || cogs < 0) return null;
    return ((revenue - cogs) / revenue) * 100;
  }

  function calcGrossProfit(revenue, cogs) {
    if (!revenue || revenue <= 0 || cogs == null || cogs < 0) return null;
    return revenue - cogs;
  }

  function calcMarkup(cogs, grossProfit) {
    if (!cogs || cogs <= 0 || grossProfit == null) return null;
    return (grossProfit / cogs) * 100;
  }

  function calcRevenueFromMargin(cogs, targetMarginPct) {
    if (!cogs || cogs <= 0 || targetMarginPct == null || targetMarginPct <= 0 || targetMarginPct >= 100) return null;
    return cogs / (1 - targetMarginPct / 100);
  }

  function marginLabel(margin) {
    if (margin === null) return null;
    if (margin < 0) return { text: "Negative gross margin — you lose money on every unit sold. Fix pricing or reduce COGS immediately.", type: "warning" };
    if (margin < 20) return { text: "Gross margin under 20% is very thin. Product or distribution businesses often target 30–50%.", type: "warning" };
    if (margin < 50) return { text: "Moderate gross margin. E-commerce typically targets 40–60%. SaaS should be 70%+.", type: "info" };
    if (margin < 70) return { text: "Healthy gross margin above 50%. Software and services businesses should target 70–80%+.", type: "info" };
    return { text: "Excellent gross margin above 70%. Top-quartile for software, consulting, and digital products.", type: "info" };
  }

  function fmtCurrency(v) {
    if (v === null || isNaN(v)) return "—";
    return "$" + parseFloat(v.toFixed(2)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function init() {
    var revenueEl  = document.getElementById("gm-revenue");
    var cogsEl     = document.getElementById("gm-cogs");
    var targetEl   = document.getElementById("gm-target-margin");
    var insightEl  = document.getElementById("gm-insight");
    var shareBtn   = document.getElementById("gm-share");
    var copyBtn    = document.getElementById("gm-copy");

    function update() {
      var revenue    = parseFloat(revenueEl.value) || 0;
      var cogs       = parseFloat(cogsEl.value) || 0;
      var targetMargin = parseFloat(targetEl ? targetEl.value : 0) || 0;

      var grossProfit = calcGrossProfit(revenue, cogs);
      var margin      = calcGrossMargin(revenue, cogs);
      var markup      = calcMarkup(cogs, grossProfit);
      var targetRev   = targetMargin > 0 ? calcRevenueFromMargin(cogs, targetMargin) : null;

      document.getElementById("gm-margin").textContent    = margin !== null ? margin.toFixed(1) + "%" : "—";
      document.getElementById("gm-profit").textContent    = grossProfit !== null ? fmtCurrency(grossProfit) : "—";
      document.getElementById("gm-markup").textContent    = markup !== null ? markup.toFixed(1) + "%" : "—";
      document.getElementById("gm-target-rev").textContent = targetRev !== null ? fmtCurrency(targetRev) : "—";

      window.FTK.hashSet({ r: revenueEl.value, c: cogsEl.value, t: targetEl ? targetEl.value : "" });

      var ins = marginLabel(margin);
      if (ins) window.FTK.showInsight(insightEl, ins.text, ins.type);
    }

    function restoreHash() {
      var h = window.FTK.hashGet();
      if (!h) return;
      if (h.r) revenueEl.value = h.r;
      if (h.c) cogsEl.value = h.c;
      if (h.t && targetEl) targetEl.value = h.t;
    }

    if (shareBtn) shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var revenue = parseFloat(revenueEl.value) || 0;
        var cogs    = parseFloat(cogsEl.value) || 0;
        var target  = parseFloat(targetEl ? targetEl.value : 0) || 0;
        var grossProfit = calcGrossProfit(revenue, cogs);
        var margin      = calcGrossMargin(revenue, cogs);
        var markup      = calcMarkup(cogs, grossProfit);
        var targetRev   = target > 0 ? calcRevenueFromMargin(cogs, target) : null;
        var lines = [
          "Revenue: " + fmtCurrency(revenue),
          "COGS: " + fmtCurrency(cogs),
          "Gross profit: " + (grossProfit !== null ? fmtCurrency(grossProfit) : "—"),
          "Gross margin: " + (margin !== null ? margin.toFixed(1) + "%" : "—"),
          "Markup: " + (markup !== null ? markup.toFixed(1) + "%" : "—"),
          "Revenue needed for " + target + "% margin: " + (targetRev !== null ? fmtCurrency(targetRev) : "—"),
        ];
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    [revenueEl, cogsEl, targetEl].forEach(function (el) {
      if (el) el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcGrossMargin, calcGrossProfit, calcMarkup, calcRevenueFromMargin };
  }
})();
