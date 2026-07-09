(function () {
  "use strict";

  function compareTiers(tiers, visitors) {
    return tiers
      .filter(function (t) { return t.price > 0 && t.convRate >= 0; })
      .map(function (t) {
        var customers = visitors * (t.convRate / 100);
        var mrr = customers * t.price;
        return { name: t.name, price: t.price, convRate: t.convRate, customers: customers, mrr: mrr };
      })
      .sort(function (a, b) { return b.mrr - a.mrr; });
  }

  function serializeTiers(tiers) {
    return tiers.map(function (t) {
      return [t.name.replace(/[~|]/g, "-"), t.price, t.convRate].join("~");
    }).join("|");
  }

  function deserializeTiers(str) {
    if (!str) return null;
    return str.split("|").map(function (part) {
      var s = part.split("~");
      return { name: s[0] || "", price: s[1] || "", convRate: s[2] || "" };
    });
  }

  function init() {
    var tbody     = document.querySelector("#pt-tiers tbody");
    var visitorsEl = document.getElementById("pt-visitors");
    var resultEl  = document.getElementById("pt-results");
    var insightEl = document.getElementById("pt-insight");

    function getTiers() {
      var rows = tbody.querySelectorAll("tr");
      var tiers = [];
      rows.forEach(function (row) {
        tiers.push({
          name:     row.querySelector(".tier-name").value || ("Tier " + (tiers.length + 1)),
          price:    parseFloat(row.querySelector(".tier-price").value) || 0,
          convRate: parseFloat(row.querySelector(".tier-conv").value) || 0,
        });
      });
      return tiers;
    }

    function fmt(v) {
      if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + Math.round(v).toLocaleString();
    }

    function update() {
      var visitors = parseFloat(visitorsEl.value) || 1000;
      var ranked = compareTiers(getTiers(), visitors);
      if (!ranked.length) { resultEl.innerHTML = ""; return; }

      var html = "<table class='dash-table' style='margin-top:1rem;'>" +
        "<thead><tr><th>Tier</th><th>Price</th><th>Conv %</th><th>Customers / " + visitors.toLocaleString() + " visitors</th><th>MRR</th></tr></thead><tbody>";
      ranked.forEach(function (t, i) {
        html += "<tr" + (i === 0 ? " style='background:#f0fdf4'" : "") + ">" +
          "<td>" + t.name + (i === 0 ? " 🏆" : "") + "</td>" +
          "<td>$" + t.price + "</td>" +
          "<td>" + t.convRate + "%</td>" +
          "<td>" + t.customers.toFixed(1) + "</td>" +
          "<td><strong>" + fmt(t.mrr) + "</strong></td>" +
          "</tr>";
      });
      html += "</tbody></table>";
      resultEl.innerHTML = html;

      if (ranked.length >= 2) {
        var best = ranked[0], second = ranked[1];
        var diff = best.mrr - second.mrr;
        window.FTK.showInsight(insightEl,
          best.name + " generates " + fmt(diff) + " more MRR per " + visitors.toLocaleString() + " visitors than " + second.name + ". " +
          "Higher price tiers dominate unless conversion drops disproportionately. " +
          "Try reducing " + best.name + "'s conversion rate to find the break-even point.",
          "info");
      } else {
        window.FTK.showInsight(insightEl, null);
      }

      window.FTK.hashSet({ v: visitorsEl.value, t: serializeTiers(getTiers()) });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s) return;
      if (s.v) visitorsEl.value = s.v;
      if (s.t) {
        var tiers = deserializeTiers(s.t);
        if (tiers) {
          var rows = tbody.querySelectorAll("tr");
          tiers.forEach(function (tier, i) {
            if (i < rows.length) {
              rows[i].querySelector(".tier-name").value  = tier.name;
              rows[i].querySelector(".tier-price").value = tier.price;
              rows[i].querySelector(".tier-conv").value  = tier.convRate;
            }
          });
        }
      }
    }

    var shareBtn = document.getElementById("pt-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    tbody.addEventListener("input", update);
    visitorsEl.addEventListener("input", update);
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { compareTiers: compareTiers, serializeTiers: serializeTiers, deserializeTiers: deserializeTiers };
  }
})();
