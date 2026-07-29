/* Extracted from templates/tools_index.html so it can be served as a static file.
 * Inline scripts required a per-build CSP nonce shared between the HTML and
 * the _headers file; on a CDN those can be served from different builds and
 * the mismatch silently blocks every inline script. External files need no
 * nonce, so that failure mode disappears. */
(function () {
  // Rendered count comes from the DOM now that this file is static.
  var countNode = document.getElementById("tools-count");
  var TOTAL = countNode ? countNode.dataset.total : "";
  var input = document.getElementById("tool-search");
  if (!input) return;
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === "Escape" && document.activeElement === input) {
      input.blur();
    }
  });
  var hint = document.getElementById("search-hint");
  input.addEventListener("focus", function () { if (hint) hint.style.display = "none"; });
  input.addEventListener("blur", function () { if (hint) hint.style.display = ""; });
  input.addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    var cards = document.querySelectorAll(".tool-card[data-title]");
    var visible = 0;
    cards.forEach(function (card) {
      var match = !q || card.dataset.title.includes(q) || card.dataset.short.includes(q);
      card.style.display = match ? "" : "none";
      if (match) visible++;
      // Highlight matching text in the h3
      var h3 = card.querySelector("h3");
      if (h3) {
        if (!h3.dataset.original) h3.dataset.original = h3.innerHTML;
        if (!q) {
          h3.innerHTML = h3.dataset.original;
        } else {
          var orig = h3.dataset.original;
          var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
          h3.innerHTML = orig.replace(re, '<mark style="background:rgba(79,126,248,0.25);border-radius:2px;padding:0 1px">$1</mark>');
        }
      }
    });
    document.querySelectorAll(".tools-index-section").forEach(function (sec) {
      var anyVisible = sec.querySelectorAll(".tool-card[style=''],.tool-card:not([style])").length > 0
        || Array.from(sec.querySelectorAll(".tool-card")).some(function (c) { return c.style.display !== "none"; });
      sec.style.display = anyVisible ? "" : "none";
    });
    document.getElementById("tools-no-match").style.display = visible === 0 ? "" : "none";
    var countEl = document.getElementById("tools-count");
    if (countEl) countEl.textContent = q ? "Showing " + visible + " of " + TOTAL + " calculators" : "Showing all " + TOTAL + " calculators";
  });

  // Accept ?q= from the homepage search box, reusing the filter above rather
  // than shipping a second search implementation. Must run *after* the input
  // listener is registered -- dispatching before it exists silently no-ops.
  var initialQ = new URLSearchParams(window.location.search).get("q");
  if (initialQ) {
    input.value = initialQ;
    input.dispatchEvent(new Event("input"));
  }

  // Newest-first sort toggle
  var sortBtn = document.getElementById("sort-new");
  var sortedActive = false;
  if (sortBtn) {
    sortBtn.addEventListener("click", function () {
      sortedActive = !sortedActive;
      sortBtn.classList.toggle("active", sortedActive);
      sortBtn.setAttribute("aria-pressed", sortedActive ? "true" : "false");
      sortBtn.textContent = sortedActive ? "⚡ Default order" : "⚡ Newest first";
      document.querySelectorAll(".tool-grid").forEach(function (grid) {
        var cards = Array.from(grid.querySelectorAll(".tool-card"));
        if (sortedActive) {
          cards.sort(function (a, b) { return parseInt(b.dataset.idx, 10) - parseInt(a.dataset.idx, 10); });
        } else {
          cards.sort(function (a, b) { return parseInt(a.dataset.idx, 10) - parseInt(b.dataset.idx, 10); });
        }
        cards.forEach(function (c) { grid.appendChild(c); });
      });
    });
  }

  // Count-up animation on category count badges
  var badges = document.querySelectorAll(".category-count");
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.textContent, 10);
        if (isNaN(target)) return;
        var start = 0;
        var step = Math.ceil(target / 12);
        el.textContent = 0;
        var iv = setInterval(function () {
          start = Math.min(start + step, target);
          el.textContent = start;
          if (start >= target) clearInterval(iv);
        }, 40);
      });
    }, { threshold: 0.5 });
    badges.forEach(function (b) { obs.observe(b); });
  }
})();
