/* Gross Profit Margin Calculator */
function calcGrossProfit(revenue, cogs) {
  return revenue - cogs;
}

function calcGrossMargin(revenue, cogs) {
  if (revenue === 0) return null;
  return ((revenue - cogs) / revenue) * 100;
}

function calcMarkup(revenue, cogs) {
  if (cogs === 0) return null;
  return ((revenue - cogs) / cogs) * 100;
}

function grossMarginLabel(margin) {
  if (margin === null) return { text: "Enter revenue and COGS to calculate gross margin.", type: "info" };
  if (margin < 0) return { text: "Negative gross margin — COGS exceeds revenue. Pricing or cost structure needs immediate review.", type: "danger" };
  if (margin < 20) return { text: "Gross margin of " + margin.toFixed(1) + "% is low. Most profitable businesses target 40%+.", type: "warning" };
  if (margin < 50) return { text: "Gross margin of " + margin.toFixed(1) + "% is moderate. Review COGS reduction opportunities.", type: "info" };
  if (margin < 70) return { text: "Gross margin of " + margin.toFixed(1) + "% is healthy. Good foundation for operating leverage.", type: "success" };
  return { text: "Gross margin of " + margin.toFixed(1) + "% is excellent — typical of high-quality SaaS or services businesses.", type: "success" };
}

if (typeof document !== "undefined") {
  function run() {
    var rev = parseFloat(document.getElementById("gpm-revenue").value) || 0;
    var cogs = parseFloat(document.getElementById("gpm-cogs").value) || 0;
    var gp = calcGrossProfit(rev, cogs);
    var gm = calcGrossMargin(rev, cogs);
    var mu = calcMarkup(rev, cogs);

    var e1 = document.getElementById("gpm-out-gp");
    if (e1) e1.textContent = rev > 0 ? "$" + gp.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—";
    var e2 = document.getElementById("gpm-out-gm");
    if (e2) e2.textContent = gm !== null ? gm.toFixed(1) + "%" : "—";
    var e3 = document.getElementById("gpm-out-mu");
    if (e3) e3.textContent = mu !== null ? mu.toFixed(1) + "%" : "—";

    if (window.FTK) {
      var lbl = grossMarginLabel(gm);
      window.FTK.showInsight(document.getElementById("gpm-insight"), lbl.text, lbl.type);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["gpm-revenue", "gpm-cogs"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", run);
    });
    run();
  });
}

if (typeof module !== "undefined") module.exports = { calcGrossProfit, calcGrossMargin, calcMarkup, grossMarginLabel };
