/* Extracted from templates/changelog.html so it can be served as a static file.
 * Inline scripts required a per-build CSP nonce shared between the HTML and
 * the _headers file; on a CDN those can be served from different builds and
 * the mismatch silently blocks every inline script. External files need no
 * nonce, so that failure mode disappears. */
(function () {
  var btns = document.querySelectorAll(".cat-filter-btn");
  var sections = document.querySelectorAll(".cl-section");
  btns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.cat;
      btns.forEach(function (b) { b.classList.toggle("active", b === btn); b.setAttribute("aria-selected", b === btn ? "true" : "false"); });
      sections.forEach(function (sec) { sec.style.display = (cat === "all" || sec.dataset.category === cat) ? "" : "none"; });
    });
  });
})();
