(function () {
  "use strict";

  function calculateNPS(promoters, passives, detractors) {
    var total = promoters + passives + detractors;
    if (total === 0) return null;
    var promoterPct   = (promoters   / total) * 100;
    var passivePct    = (passives    / total) * 100;
    var detractorPct  = (detractors  / total) * 100;
    return {
      nps:          Math.round(promoterPct - detractorPct),
      promoterPct:  promoterPct,
      passivePct:   passivePct,
      detractorPct: detractorPct,
      total:        total,
    };
  }

  function npsLabel(score) {
    if (score === null) return "";
    if (score < 0)  return "Needs Improvement — more detractors than promoters";
    if (score < 30) return "Good — positive but room to grow";
    if (score < 70) return "Great — industry-leading NPS";
    return "Excellent — world-class (Apple/Tesla tier)";
  }

  function init() {
    var promotersEl   = document.getElementById("nps-promoters");
    var passivesEl    = document.getElementById("nps-passives");
    var detractorsEl  = document.getElementById("nps-detractors");
    var scoreEl       = document.getElementById("nps-out-score");
    var labelEl       = document.getElementById("nps-out-label");
    var promPctEl     = document.getElementById("nps-out-prom-pct");
    var passPctEl     = document.getElementById("nps-out-pass-pct");
    var detrPctEl     = document.getElementById("nps-out-detr-pct");
    var insightEl     = document.getElementById("nps-insight");

    function update() {
      var p = parseInt(promotersEl.value)  || 0;
      var a = parseInt(passivesEl.value)   || 0;
      var d = parseInt(detractorsEl.value) || 0;
      var result = calculateNPS(p, a, d);
      if (!result) { scoreEl.textContent = "—"; return; }

      scoreEl.textContent   = (result.nps > 0 ? "+" : "") + result.nps;
      labelEl.textContent   = npsLabel(result.nps);
      promPctEl.textContent = result.promoterPct.toFixed(1) + "%";
      passPctEl.textContent = result.passivePct.toFixed(1) + "%";
      detrPctEl.textContent = result.detractorPct.toFixed(1) + "%";

      if (result.nps < 0) {
        window.FTK.showInsight(insightEl,
          "Negative NPS means active word-of-mouth is hurting you. Close the loop with detractors individually before scaling acquisition.", "danger");
      } else if (result.nps < 30) {
        window.FTK.showInsight(insightEl,
          "NPS below 30 is positive but not strong. Interview detractors — one recurring theme fixed often moves NPS 10–20 points.", "warning");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ p: promotersEl.value, a: passivesEl.value, d: detractorsEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.p) return;
      promotersEl.value  = s.p;
      passivesEl.value   = s.a;
      detractorsEl.value = s.d;
    }

    var copyBtn = document.getElementById("nps-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "NPS: " + scoreEl.textContent + " | " + labelEl.textContent + " | Promoters: " + promPctEl.textContent + " | Passives: " + passPctEl.textContent + " | Detractors: " + detrPctEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("nps-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [promotersEl, passivesEl, detractorsEl].forEach(function (el) {
      el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateNPS: calculateNPS, npsLabel: npsLabel };
  }
})();
