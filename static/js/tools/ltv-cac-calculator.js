(function () {
  "use strict";

  function calculateLTV(arpu, grossMarginPct, monthlyChurnPct) {
    if (monthlyChurnPct <= 0) return Infinity;
    return (arpu * (grossMarginPct / 100)) / (monthlyChurnPct / 100);
  }

  function calculateCAC(spend, newCustomers) {
    if (newCustomers <= 0) return null;
    return spend / newCustomers;
  }

  function calculatePayback(cac, arpu, grossMarginPct) {
    var grossProfit = arpu * (grossMarginPct / 100);
    if (grossProfit <= 0) return null;
    return cac / grossProfit;
  }

  function healthLabel(ratio) {
    if (ratio === null || !isFinite(ratio)) return "";
    if (ratio < 1) return "Warning: You are losing money on every customer acquired.";
    if (ratio < 3) return "Caution: LTV:CAC below 3:1 — growth may not be sustainable.";
    if (ratio < 5) return "Healthy: 3:1–5:1 is the target range for most SaaS businesses.";
    return "Strong: Above 5:1 — consider whether you are underinvesting in growth.";
  }

  function init() {
    var arpuEl = document.getElementById("ltv-arpu");
    var marginEl = document.getElementById("ltv-margin");
    var churnEl = document.getElementById("ltv-churn");
    var spendEl = document.getElementById("ltv-spend");
    var custEl = document.getElementById("ltv-new-customers");
    var ltvEl = document.getElementById("ltv-out-ltv");
    var cacEl = document.getElementById("ltv-out-cac");
    var ratioEl = document.getElementById("ltv-out-ratio");
    var paybackEl = document.getElementById("ltv-out-payback");
    var healthEl = document.getElementById("ltv-health");
    var insightEl = document.getElementById("ltv-insight");
    var gaugeMarkerEl = document.getElementById("ltv-gauge-marker");
    var gaugeLabelEl  = document.getElementById("ltv-gauge-marker-label");

    function fmt(value) {
      if (!isFinite(value)) return "∞";
      return "$" + Math.round(value).toLocaleString();
    }

    function update() {
      var arpu = parseFloat(arpuEl.value) || 0;
      var margin = parseFloat(marginEl.value) || 0;
      var churn = parseFloat(churnEl.value) || 0;
      var spend = parseFloat(spendEl.value) || 0;
      var customers = parseFloat(custEl.value) || 0;

      var ltv = calculateLTV(arpu, margin, churn);
      var cac = calculateCAC(spend, customers);
      var ratio = cac ? ltv / cac : null;
      var payback = cac ? calculatePayback(cac, arpu, margin) : null;

      ltvEl.textContent = fmt(ltv);
      cacEl.textContent = cac !== null ? fmt(cac) : "—";
      ratioEl.textContent = ratio !== null && isFinite(ratio) ? ratio.toFixed(1) + ":1" : "—";
      paybackEl.textContent = payback !== null ? Math.ceil(payback) + " mo" : "—";
      healthEl.textContent = healthLabel(ratio);

      if (gaugeMarkerEl && gaugeLabelEl) {
        var gaugeMax = 6;
        var displayRatio = ratio !== null && isFinite(ratio) ? ratio : 0;
        var pct = Math.max(0, Math.min(100, (displayRatio / gaugeMax) * 100));
        gaugeMarkerEl.style.left = pct + "%";
        gaugeLabelEl.textContent = ratio !== null && isFinite(ratio) ? ratio.toFixed(1) + "×" : "—";
        window.FTK.pulseGauge(gaugeMarkerEl);
      }

      if (ratio !== null && isFinite(ratio)) {
        if (ratio < 1) {
          window.FTK.showInsight(insightEl,
            "Every customer costs more to acquire than they generate. Focus on reducing churn " +
            "or cutting CAC before scaling ad spend — growth at this ratio destroys value.",
            "danger"
          );
        } else if (ratio < 3) {
          window.FTK.showInsight(insightEl,
            "LTV:CAC below 3:1 leaves little margin for growth. The fastest lever is usually " +
            "reducing churn — a 1% churn reduction often improves LTV by 20–40%.",
            "warning"
          );
        } else {
          window.FTK.showInsight(insightEl, null);
        }
      } else {
        window.FTK.showInsight(insightEl, null);
      }
      window.FTK.hashSet({ ar: arpuEl.value, m: marginEl.value, ch: churnEl.value, sp: spendEl.value, cu: custEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.ar) return;
      if (s.ar) arpuEl.value = s.ar;
      if (s.m) marginEl.value = s.m;
      if (s.ch) churnEl.value = s.ch;
      if (s.sp) spendEl.value = s.sp;
      if (s.cu) custEl.value = s.cu;
    }

    var copyBtn = document.getElementById("ltv-copy");
    var copyFb = document.getElementById("ltv-copy-feedback");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = [
          "LTV: " + ltvEl.textContent,
          "CAC: " + cacEl.textContent,
          "LTV:CAC: " + ratioEl.textContent,
          "Payback: " + paybackEl.textContent,
        ].join(" | ");
        window.FTK.copyToClipboard(text).then(function () {
          window.FTK.flash(copyBtn, "Copied!", 1500);
        });
      });
    }

    var shareBtn = document.getElementById("ltv-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [arpuEl, marginEl, churnEl, spendEl, custEl].forEach(function (el) {
      el.addEventListener("input", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateLTV: calculateLTV, calculateCAC: calculateCAC, calculatePayback: calculatePayback, healthLabel: healthLabel };
  }
})();
