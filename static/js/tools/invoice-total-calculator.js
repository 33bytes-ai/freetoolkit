(function () {
  "use strict";

  function calculateInvoice(lineItems, discountPct, taxPct) {
    var subtotal = lineItems.reduce(function (sum, item) {
      return sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
    }, 0);
    var discount     = subtotal * (discountPct / 100);
    var afterDiscount = subtotal - discount;
    var tax          = afterDiscount * (taxPct / 100);
    var total        = afterDiscount + tax;
    return { subtotal: subtotal, discount: discount, afterDiscount: afterDiscount, tax: tax, total: total };
  }

  function init() {
    var tbody      = document.querySelector("#inv-items tbody");
    var discountEl = document.getElementById("inv-discount");
    var taxEl      = document.getElementById("inv-tax");
    var subtotalEl = document.getElementById("inv-out-subtotal");
    var discOutEl  = document.getElementById("inv-out-discount");
    var taxOutEl   = document.getElementById("inv-out-tax");
    var totalEl    = document.getElementById("inv-out-total");
    var copyBtn    = document.getElementById("inv-copy");

    function getItems() {
      var rows = tbody.querySelectorAll("tr");
      var items = [];
      rows.forEach(function (row) {
        items.push({
          desc:  row.querySelector(".inv-desc").value,
          qty:   row.querySelector(".inv-qty").value,
          price: row.querySelector(".inv-price").value,
        });
      });
      return items;
    }

    function fmt(v) { return "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

    function update() {
      var items   = getItems();
      var discount = parseFloat(discountEl.value) || 0;
      var tax      = parseFloat(taxEl.value) || 0;
      var result   = calculateInvoice(items, discount, tax);

      // update row totals
      var rows = tbody.querySelectorAll("tr");
      rows.forEach(function (row, i) {
        var qty   = parseFloat(items[i].qty)   || 0;
        var price = parseFloat(items[i].price) || 0;
        var lineTotal = row.querySelector(".inv-line-total");
        if (lineTotal) lineTotal.textContent = (qty && price) ? fmt(qty * price) : "";
      });

      subtotalEl.textContent = fmt(result.subtotal);
      discOutEl.textContent  = discount > 0 ? "−" + fmt(result.discount) : "—";
      taxOutEl.textContent   = tax > 0 ? fmt(result.tax) : "—";
      totalEl.textContent    = fmt(result.total);
    }

    var shareBtn = document.getElementById("inv-share");
    if (shareBtn) { shareBtn.addEventListener("click", function () { window.FTK.shareURL(shareBtn); }); }

    tbody.addEventListener("input", update);
    [discountEl, taxEl].forEach(function (el) { el.addEventListener("input", update); });

    copyBtn.addEventListener("click", function () {
      var items = getItems().filter(function (it) { return it.desc || it.qty || it.price; });
      var lines = items.map(function (it) {
        var qty = parseFloat(it.qty) || 0;
        var price = parseFloat(it.price) || 0;
        return (it.desc || "Item") + " — " + qty + " × $" + price.toFixed(2) + " = $" + (qty * price).toFixed(2);
      });
      var discount = parseFloat(discountEl.value) || 0;
      var tax = parseFloat(taxEl.value) || 0;
      var result = calculateInvoice(items, discount, tax);
      var summary = lines.join("\n");
      if (discount > 0) summary += "\nDiscount (" + discount + "%): −$" + result.discount.toFixed(2);
      if (tax > 0)      summary += "\nTax (" + tax + "%): $" + result.tax.toFixed(2);
      summary += "\nTotal: $" + result.total.toFixed(2);

      window.FTK.copyToClipboard(summary).then(function () {
        window.FTK.flash(copyBtn, "Copied!");
      }).catch(function () {
        window.FTK.flash(copyBtn, "Copy unavailable");
      });
    });

    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateInvoice: calculateInvoice };
  }
})();
