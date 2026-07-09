(function () {
  "use strict";

  function calculateMRR(plans) {
    return plans.reduce(function (sum, plan) {
      var price = parseFloat(plan.price) || 0;
      var subs = parseFloat(plan.subscribers) || 0;
      return sum + price * subs;
    }, 0);
  }

  function projectMRR(mrr, monthlyGrowthRatePct, months) {
    var rate = (monthlyGrowthRatePct || 0) / 100;
    return mrr * Math.pow(1 + rate, months);
  }

  function formatMRR(value) {
    if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "k";
    return "$" + Math.round(value).toLocaleString();
  }

  function init() {
    var tbody = document.querySelector("#mrr-plans tbody");
    var growthEl = document.getElementById("mrr-growth");
    var totalEl = document.getElementById("mrr-total");
    var arrEl = document.getElementById("mrr-arr");
    var mo3El = document.getElementById("mrr-3mo");
    var mo12El = document.getElementById("mrr-12mo");

    function update() {
      var rows = tbody.querySelectorAll("tr");
      var plans = [];
      rows.forEach(function (row) {
        plans.push({
          price: row.querySelector(".plan-price").value,
          subscribers: row.querySelector(".plan-subs").value,
        });
      });

      rows.forEach(function (row) {
        var price = parseFloat(row.querySelector(".plan-price").value) || 0;
        var subs = parseFloat(row.querySelector(".plan-subs").value) || 0;
        var cell = row.querySelector(".plan-mrr");
        cell.textContent = (price && subs) ? "$" + (price * subs).toLocaleString() : "";
      });

      var mrr = calculateMRR(plans);
      var growth = parseFloat(growthEl.value) || 0;

      totalEl.textContent = formatMRR(mrr);
      arrEl.textContent = formatMRR(mrr * 12);
      mo3El.textContent = formatMRR(projectMRR(mrr, growth, 3));
      mo12El.textContent = formatMRR(projectMRR(mrr, growth, 12));

      window.FTK.hashSet({ g: growth, p: plans.map(function (p) { return [p.price, p.subscribers]; }) });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.p) return;
      if (s.g !== undefined) growthEl.value = s.g;
      var rows = tbody.querySelectorAll("tr");
      s.p.forEach(function (pair, i) {
        if (rows[i]) {
          rows[i].querySelector(".plan-price").value = pair[0] || "";
          rows[i].querySelector(".plan-subs").value = pair[1] || "";
        }
      });
    }

    tbody.addEventListener("input", update);
    growthEl.addEventListener("input", update);
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateMRR: calculateMRR, projectMRR: projectMRR };
  }
})();
