(function () {
  "use strict";

  function calculateEmailROI(listSize, openRatePct, clickRatePct, convRatePct, aov, cost) {
    if (listSize <= 0) return null;
    var opens       = listSize * (openRatePct / 100);
    var clicks      = opens   * (clickRatePct / 100);
    var conversions = clicks  * (convRatePct / 100);
    var revenue     = conversions * aov;
    var profit      = revenue - cost;
    return {
      opens:             Math.round(opens),
      clicks:            Math.round(clicks),
      conversions:       Math.round(conversions),
      revenue:           revenue,
      profit:            profit,
      roi:               cost > 0 ? (profit / cost) * 100 : null,
      costPerConversion: conversions > 0 ? cost / conversions : null,
      revenuePerEmail:   listSize > 0 ? revenue / listSize : null,
    };
  }

  function init() {
    var listEl   = document.getElementById("er-list");
    var openEl   = document.getElementById("er-open-rate");
    var clickEl  = document.getElementById("er-click-rate");
    var convEl   = document.getElementById("er-conv-rate");
    var aovEl    = document.getElementById("er-aov");
    var costEl   = document.getElementById("er-cost");
    var opensEl  = document.getElementById("er-out-opens");
    var clicksEl = document.getElementById("er-out-clicks");
    var convsEl  = document.getElementById("er-out-conversions");
    var revEl    = document.getElementById("er-out-revenue");
    var roiEl    = document.getElementById("er-out-roi");
    var insightEl = document.getElementById("er-insight");

    function fmt(v) { return "$" + Math.round(v).toLocaleString(); }

    function update() {
      var result = calculateEmailROI(
        parseFloat(listEl.value)  || 0,
        parseFloat(openEl.value)  || 0,
        parseFloat(clickEl.value) || 0,
        parseFloat(convEl.value)  || 0,
        parseFloat(aovEl.value)   || 0,
        parseFloat(costEl.value)  || 0
      );
      if (!result) return;

      opensEl.textContent  = result.opens.toLocaleString();
      clicksEl.textContent = result.clicks.toLocaleString();
      convsEl.textContent  = result.conversions.toLocaleString();
      revEl.textContent    = fmt(result.revenue);
      roiEl.textContent    = result.roi !== null ? result.roi.toFixed(0) + "%" : "—";

      if (result.roi !== null && result.roi < 0) {
        window.FTK.showInsight(insightEl,
          "Negative ROI — this campaign costs more than it generates. " +
          "Increase AOV, improve open/click rates with better subject lines and segmentation, " +
          "or reduce campaign cost.",
          "danger");
      } else if (result.opens < 100 && parseFloat(listEl.value) > 500) {
        window.FTK.showInsight(insightEl,
          "Open rate below 20% suggests deliverability or subject line issues. " +
          "Industry average is 20–25% for B2B. Clean your list, improve sender reputation, " +
          "and A/B test subject lines.",
          "warning");
      } else if (result.roi !== null && result.roi > 400) {
        window.FTK.showInsight(insightEl,
          "ROI above 400% — strong campaign. Email typically delivers $36–42 for every $1 spent " +
          "at scale (DMA benchmark). Consider increasing send frequency or list size.",
          "success");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ l: listEl.value, o: openEl.value, cl: clickEl.value, cv: convEl.value, a: aovEl.value, c: costEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.l) return;
      listEl.value  = s.l;
      openEl.value  = s.o;
      clickEl.value = s.cl;
      convEl.value  = s.cv;
      aovEl.value   = s.a;
      costEl.value  = s.c;
    }

    var copyBtn = document.getElementById("er-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "Opens: " + opensEl.textContent + " | Clicks: " + clicksEl.textContent + " | Conversions: " + convsEl.textContent + " | Revenue: " + revEl.textContent + " | ROI: " + roiEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("er-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [listEl, openEl, clickEl, convEl, aovEl, costEl].forEach(function (el) { el.addEventListener("input", update); });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateEmailROI: calculateEmailROI };
  }
})();
