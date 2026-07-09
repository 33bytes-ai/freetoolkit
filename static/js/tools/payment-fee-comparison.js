(function () {
  "use strict";

  var PROCESSORS = [
    { name: "Stripe",                  rate: 0.029, fixed: 0.30, plan: "" },
    { name: "PayPal Standard",         rate: 0.0299, fixed: 0.49, plan: "" },
    { name: "PayPal Checkout",         rate: 0.0349, fixed: 0.49, plan: "" },
    { name: "Shopify Basic ($39/mo)",  rate: 0.020,  fixed: 0.25, plan: "basic" },
    { name: "Shopify ($105/mo)",       rate: 0.017,  fixed: 0.25, plan: "shopify" },
    { name: "Shopify Advanced ($399/mo)", rate: 0.015, fixed: 0.25, plan: "advanced" },
  ];

  function calcNet(amount, rate, fixed) {
    var fee = amount * rate + fixed;
    return { fee: fee, net: amount - fee, effectiveRate: (fee / amount) * 100 };
  }

  function parseCustomRate(str) {
    if (!str || !str.trim()) return null;
    var m = str.trim().match(/^(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return { rate: parseFloat(m[1]) / 100, fixed: parseFloat(m[2]) };
  }

  function init() {
    var amountEl     = document.getElementById("pfc-amount");
    var customRateEl = document.getElementById("pfc-custom-rate");
    var tableEl      = document.getElementById("pfc-table");
    var insightEl    = document.getElementById("pfc-insight");

    function update() {
      var amount = parseFloat(amountEl.value) || 0;
      if (amount <= 0) return;

      var custom = customRateEl ? parseCustomRate(customRateEl.value) : null;
      var processors = PROCESSORS.slice();
      if (custom) {
        processors = processors.concat([{ name: "Custom rate", rate: custom.rate, fixed: custom.fixed, plan: "custom" }]);
      }

      var results = processors.map(function (p) {
        var r = calcNet(amount, p.rate, p.fixed);
        return { name: p.name, fee: r.fee, net: r.net, effectiveRate: r.effectiveRate };
      }).sort(function (a, b) { return b.net - a.net; });

      var best = results[0];
      var worst = results[results.length - 1];

      var html = "<table class='dash-table'><thead><tr><th>Processor</th><th>Fee</th><th>You receive</th><th>Effective rate</th></tr></thead><tbody>";
      results.forEach(function (r, i) {
        var highlight = i === 0 ? " style='background:#f0fdf4'" : "";
        html += "<tr" + highlight + ">" +
          "<td>" + r.name + (i === 0 ? " ✓" : "") + "</td>" +
          "<td>$" + r.fee.toFixed(2) + "</td>" +
          "<td><strong>$" + r.net.toFixed(2) + "</strong></td>" +
          "<td>" + r.effectiveRate.toFixed(2) + "%</td>" +
          "</tr>";
      });
      html += "</tbody></table>";
      tableEl.innerHTML = html;

      var saving = (best.net - worst.net).toFixed(2);
      window.FTK.showInsight(insightEl,
        best.name + " gives you the most: $" + best.net.toFixed(2) + " — $" + saving + " more than " + worst.name + " ($" + worst.net.toFixed(2) + ") on this transaction.",
        "info"
      );

      window.FTK.hashSet({ a: amountEl.value, cr: customRateEl ? customRateEl.value : "" });
    }

    function restoreHash() {
      var s = window.FTK.hashGet();
      if (!s || !s.a) return;
      amountEl.value = s.a;
      if (customRateEl && s.cr) customRateEl.value = s.cr;
    }

    var shareBtn = document.getElementById("pfc-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    var copyBtn = document.getElementById("pfc-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var rows = tableEl.querySelectorAll("tbody tr");
        var lines = [];
        rows.forEach(function (row) {
          var cells = row.querySelectorAll("td");
          lines.push(cells[0].textContent.trim() + ": " + cells[2].textContent.trim() + " (fee " + cells[1].textContent.trim() + ")");
        });
        window.FTK.copyToClipboard(lines.join("\n")).then(function () { window.FTK.flash(copyBtn, "Copied!", 1500); });
      });
    }

    amountEl.addEventListener("input", update);
    if (customRateEl) customRateEl.addEventListener("input", update);
    restoreHash();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calcNet: calcNet, PROCESSORS: PROCESSORS };
  }
})();
