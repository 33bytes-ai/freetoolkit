/* Weighted Average Calculator */
function calcWeightedAverage(items) {
  if (!items || items.length === 0) return null;
  var sumWV = 0, sumW = 0;
  items.forEach(function (item) {
    sumWV += item.value * item.weight;
    sumW += item.weight;
  });
  if (sumW === 0) return null;
  return sumWV / sumW;
}

function calcContributions(items) {
  var sumW = items.reduce(function (a, i) { return a + i.weight; }, 0);
  if (sumW === 0) return items.map(function () { return 0; });
  return items.map(function (item) { return (item.weight / sumW) * 100; });
}

function weightedLabel(avg, items) {
  if (!items || items.length < 2) return { text: "Add at least 2 items to calculate a meaningful weighted average.", type: "info" };
  var min = Math.min.apply(null, items.map(function (i) { return i.value; }));
  var max = Math.max.apply(null, items.map(function (i) { return i.value; }));
  var simple = items.reduce(function (a, i) { return a + i.value; }, 0) / items.length;
  var diff = avg - simple;
  if (Math.abs(diff) < 0.01) return { text: "Weighted and simple averages are nearly equal — weights are evenly distributed.", type: "info" };
  return { text: "Weighted avg (" + avg.toFixed(2) + ") vs simple avg (" + simple.toFixed(2) + ") — " + (diff > 0 ? "higher-weight items pull the result up." : "higher-weight items pull the result down."), type: "success" };
}

if (typeof document !== "undefined") {
  function getItems() {
    var items = [];
    document.querySelectorAll(".wa-row").forEach(function (row) {
      var v = parseFloat(row.querySelector(".wa-value").value);
      var w = parseFloat(row.querySelector(".wa-weight").value);
      if (!isNaN(v) && !isNaN(w) && w > 0) items.push({ value: v, weight: w });
    });
    return items;
  }

  function run() {
    var items = getItems();
    var avg = calcWeightedAverage(items);
    var contribs = items.length ? calcContributions(items) : [];

    var e1 = document.getElementById("wa-out-avg");
    if (e1) e1.textContent = avg !== null ? avg.toFixed(4) : "—";
    var e2 = document.getElementById("wa-out-count");
    if (e2) e2.textContent = items.length;

    // Update contribution column
    document.querySelectorAll(".wa-contrib").forEach(function (el, i) {
      el.textContent = contribs[i] !== undefined ? contribs[i].toFixed(1) + "%" : "";
    });

    if (window.FTK) {
      var lbl = weightedLabel(avg, items);
      window.FTK.showInsight(document.getElementById("wa-insight"), lbl.text, lbl.type);
    }
  }

  function addRow(val, wt) {
    var container = document.getElementById("wa-rows");
    if (!container) return;
    if (container.querySelectorAll(".wa-row").length >= 8) return;
    var row = document.createElement("tr");
    row.className = "wa-row";
    row.innerHTML = '<td><input type="number" step="any" class="wa-value" value="' + (val !== undefined ? val : "") + '" placeholder="e.g. 8.5" style="width:100%"></td>'
      + '<td><input type="number" step="any" min="0" class="wa-weight" value="' + (wt !== undefined ? wt : "") + '" placeholder="e.g. 30" style="width:100%"></td>'
      + '<td class="wa-contrib" style="text-align:right;font-size:0.82rem;color:var(--text-muted)"></td>'
      + '<td><button type="button" onclick="this.closest(\'tr\').remove();window._waRun&&window._waRun()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;cursor:pointer;color:var(--text-muted)">✕</button></td>';
    row.querySelectorAll("input").forEach(function (el) { el.addEventListener("input", run); });
    container.appendChild(row);
    run();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var addBtn = document.getElementById("wa-add-row");
    if (addBtn) addBtn.addEventListener("click", function () { addRow(); });
    window._waRun = run;
    var defaults = [[85, 30], [72, 25], [91, 20], [68, 25]];
    defaults.forEach(function (d) { addRow(d[0], d[1]); });
  });
}

if (typeof module !== "undefined") module.exports = { calcWeightedAverage, calcContributions, weightedLabel };
