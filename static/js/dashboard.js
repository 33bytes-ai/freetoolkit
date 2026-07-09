/* FounderCalc Analytics Dashboard — reads from localStorage */
(function () {
  "use strict";

  var KEY = "ftk_analytics";
  var RPM = 12; // estimated RPM for business audience ($12 per 1000 page views)

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch (e) { return null; }
  }

  function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(1) + "k";
    return String(n);
  }

  function fmtUSD(n) {
    return "$" + n.toFixed(2);
  }

  function sortDesc(obj) {
    return Object.entries(obj).sort(function (a, b) { return b[1] - a[1]; });
  }

  function renderTable(id, rows, headers) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!rows.length) { el.innerHTML = "<p class='dash-empty'>No data yet — visit some tool pages first.</p>"; return; }

    var html = "<table class='dash-table'><thead><tr>";
    headers.forEach(function (h) { html += "<th>" + h + "</th>"; });
    html += "</tr></thead><tbody>";
    rows.forEach(function (row) {
      html += "<tr>";
      row.forEach(function (cell) { html += "<td>" + cell + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  function render(data) {
    if (!data) {
      document.getElementById("dash-empty").style.display = "block";
      document.getElementById("dash-content").style.display = "none";
      return;
    }
    document.getElementById("dash-empty").style.display = "none";
    document.getElementById("dash-content").style.display = "block";

    var pageviews  = data.pageviews  || {};
    var calcUses   = data.calc_uses  || {};
    var affClicks  = data.affiliate_clicks || {};

    var totalViews = Object.values(pageviews).reduce(function (a, b) { return a + b; }, 0);
    var totalCalc  = Object.values(calcUses).reduce(function (a, b) { return a + b; }, 0);
    var totalAff   = Object.values(affClicks).reduce(function (a, b) { return a + b; }, 0);
    var estRevenue = (totalViews / 1000) * RPM;

    document.getElementById("dash-total-views").textContent = fmt(totalViews);
    document.getElementById("dash-total-calc").textContent  = fmt(totalCalc);
    document.getElementById("dash-total-aff").textContent   = fmt(totalAff);
    document.getElementById("dash-est-revenue").textContent = fmtUSD(estRevenue);

    var pvRows = sortDesc(pageviews).slice(0, 20).map(function (entry) {
      var path = entry[0];
      var views = entry[1];
      var rev = fmtUSD((views / 1000) * RPM);
      return [
        "<a href='" + path + "'>" + path + "</a>",
        fmt(views),
        rev
      ];
    });
    renderTable("dash-pageviews-table", pvRows, ["Page", "Views", "Est. revenue"]);

    var cuRows = sortDesc(calcUses).slice(0, 20).map(function (entry) {
      return [entry[0], fmt(entry[1])];
    });
    renderTable("dash-calc-table", cuRows, ["Calculator", "Uses"]);

    var affRows = sortDesc(affClicks).map(function (entry) {
      var parts = entry[0].split("|");
      return [parts[0] || "—", parts[1] || "—", fmt(entry[1])];
    });
    renderTable("dash-aff-table", affRows, ["Tool", "Partner", "Clicks"]);

    if (data.first_seen) {
      var days = Math.max(1, Math.round((Date.now() - data.first_seen) / 86400000));
      document.getElementById("dash-since").textContent = "Data collected over ~" + days + " day" + (days === 1 ? "" : "s") + " (this browser only).";
    }
  }

  function downloadCSV() {
    var data = load();
    if (!data) return;
    var rows = ["FounderCalc Analytics Export," + new Date().toISOString(), ""];
    rows.push("Pageviews");
    rows.push("Page,Views,Estimated Revenue ($)");
    sortDesc(data.pageviews || {}).forEach(function (e) {
      rows.push([e[0], e[1], ((e[1] / 1000) * RPM).toFixed(2)].join(","));
    });
    rows.push("", "Calculator Uses");
    rows.push("Calculator,Uses");
    sortDesc(data.calc_uses || {}).forEach(function (e) {
      rows.push([e[0], e[1]].join(","));
    });
    rows.push("", "Affiliate Clicks");
    rows.push("Tool,Partner,Clicks");
    sortDesc(data.affiliate_clicks || {}).forEach(function (e) {
      var parts = e[0].split("|");
      rows.push([parts[0] || "", parts[1] || "", e[1]].join(","));
    });
    var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "foundercalc-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById("dash-export").addEventListener("click", downloadCSV);

  document.getElementById("dash-reset").addEventListener("click", function () {
    if (confirm("Reset all analytics data? This cannot be undone.")) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      render(null);
    }
  });

  document.getElementById("dash-rpm").addEventListener("input", function () {
    RPM = parseFloat(this.value) || 12;
    render(load());
  });

  render(load());
})();
