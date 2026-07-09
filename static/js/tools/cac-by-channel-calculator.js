(function () {
  "use strict";

  function analyzeChannels(channels) {
    var valid = channels.filter(function (c) {
      return (parseFloat(c.spend) || 0) >= 0 && (parseFloat(c.customers) || 0) > 0;
    });
    return valid.map(function (c) {
      var spend = parseFloat(c.spend) || 0;
      var customers = parseFloat(c.customers) || 0;
      return { name: c.name || "—", spend: spend, customers: customers, cac: spend / customers };
    }).sort(function (a, b) { return a.cac - b.cac; });
  }

  function totalStats(channels) {
    var results = analyzeChannels(channels);
    var totalSpend = results.reduce(function (s, c) { return s + c.spend; }, 0);
    var totalCustomers = results.reduce(function (s, c) { return s + c.customers; }, 0);
    return {
      results: results,
      totalSpend: totalSpend,
      totalCustomers: totalCustomers,
      blendedCAC: totalCustomers > 0 ? totalSpend / totalCustomers : null,
    };
  }

  function init() {
    var tbody    = document.querySelector("#cac-channels tbody");
    var resultEl = document.getElementById("cac-results");
    var totalEl  = document.getElementById("cac-out-total-spend");
    var custEl   = document.getElementById("cac-out-customers");
    var blendEl  = document.getElementById("cac-out-blended");
    var insightEl = document.getElementById("cac-insight");

    function getChannels() {
      var rows = tbody.querySelectorAll("tr");
      var channels = [];
      rows.forEach(function (row) {
        channels.push({
          name:      row.querySelector(".ch-name").value,
          spend:     row.querySelector(".ch-spend").value,
          customers: row.querySelector(".ch-customers").value,
        });
      });
      return channels;
    }

    function fmt(v) { return "$" + Math.round(v).toLocaleString(); }

    function update() {
      var stats = totalStats(getChannels());
      totalEl.textContent = fmt(stats.totalSpend);
      custEl.textContent  = stats.totalCustomers;
      blendEl.textContent = stats.blendedCAC !== null ? fmt(stats.blendedCAC) : "—";

      if (!stats.results.length) { resultEl.innerHTML = ""; window.FTK.showInsight(insightEl, null); return; }

      var best  = stats.results[0];
      var worst = stats.results[stats.results.length - 1];
      var html = "<table class='dash-table' style='margin-top:1rem;'>" +
        "<thead><tr><th>Channel</th><th>Spend</th><th>Customers</th><th>CAC</th><th>vs blended</th></tr></thead><tbody>";
      stats.results.forEach(function (c) {
        var delta = stats.blendedCAC ? ((c.cac - stats.blendedCAC) / stats.blendedCAC * 100) : 0;
        var badge = delta < -10 ? "✅" : (delta > 20 ? "⚠️" : "");
        html += "<tr>" +
          "<td>" + c.name + "</td>" +
          "<td>" + fmt(c.spend) + "</td>" +
          "<td>" + c.customers + "</td>" +
          "<td><strong>" + fmt(c.cac) + "</strong></td>" +
          "<td>" + (delta >= 0 ? "+" : "") + delta.toFixed(0) + "% " + badge + "</td>" +
          "</tr>";
      });
      html += "</tbody></table>";
      resultEl.innerHTML = html;

      if (stats.results.length > 1) {
        var gap = ((worst.cac - best.cac) / best.cac * 100).toFixed(0);
        window.FTK.showInsight(insightEl,
          best.name + " has the lowest CAC at " + fmt(best.cac) + " — " + gap + "% cheaper than " +
          worst.name + " (" + fmt(worst.cac) + "). " +
          "Shifting budget from " + worst.name + " to " + best.name + " compounds growth efficiency.",
          "info");
      } else {
        window.FTK.showInsight(insightEl, null);
      }
    }

    var shareBtn = document.getElementById("cac-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    tbody.addEventListener("input", update);
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { analyzeChannels: analyzeChannels, totalStats: totalStats };
  }
})();
