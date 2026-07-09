(function () {
  "use strict";

  function mrrToArr(mrr) { return mrr * 12; }
  function arrToMrr(arr) { return arr / 12; }
  function dailyRevenue(mrr) { return mrr / 30.4375; }
  function weeklyRevenue(mrr) { return (mrr * 12) / 52; }

  function convert(value, mode) {
    if (typeof value !== "number" || value < 0) return null;
    var mrr = mode === "arr" ? arrToMrr(value) : value;
    return {
      mrr:    mrr,
      arr:    mrrToArr(mrr),
      daily:  dailyRevenue(mrr),
      weekly: weeklyRevenue(mrr),
    };
  }

  function init() {
    var inputEl  = document.getElementById("amrr-input");
    var modeEl   = document.getElementById("amrr-mode");
    var mrrEl    = document.getElementById("amrr-out-mrr");
    var arrEl    = document.getElementById("amrr-out-arr");
    var dailyEl  = document.getElementById("amrr-out-daily");
    var weeklyEl = document.getElementById("amrr-out-weekly");

    function fmt(v) {
      if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
      if (v >= 1000)    return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + Math.round(v).toLocaleString();
    }

    function update() {
      var result = convert(parseFloat(inputEl.value) || 0, modeEl.value);
      if (!result) return;
      mrrEl.textContent    = fmt(result.mrr);
      arrEl.textContent    = fmt(result.arr);
      dailyEl.textContent  = "$" + result.daily.toFixed(2);
      weeklyEl.textContent = "$" + result.weekly.toFixed(0);
      window.FTK.hashSet({ v: inputEl.value, m: modeEl.value });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.v) return;
      inputEl.value = s.v;
      if (s.m) modeEl.value = s.m;
    }

    var copyBtn = document.getElementById("amrr-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = "MRR: " + mrrEl.textContent + " | ARR: " + arrEl.textContent + " | Daily: " + dailyEl.textContent + " | Weekly: " + weeklyEl.textContent;
        window.FTK.copyToClipboard(text).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }
    var shareBtn = document.getElementById("amrr-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    [inputEl, modeEl].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { convert: convert, mrrToArr: mrrToArr, arrToMrr: arrToMrr, dailyRevenue: dailyRevenue, weeklyRevenue: weeklyRevenue };
  }
})();
