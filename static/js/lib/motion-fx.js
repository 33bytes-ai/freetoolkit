/* Entrance, scroll and feedback motion, built on the vendored Motion subset
 * (static/js/vendor/motion.min.js).
 *
 * Content is never hidden by CSS: every start state is applied here, and only
 * to elements the visitor has not seen yet. Without JS, or with
 * prefers-reduced-motion, the page renders complete and still.
 */
(function () {
  "use strict";

  var M = window.Motion;
  if (!M || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var EASE = [0.22, 1, 0.36, 1];

  function belowFold(el) {
    return el.getBoundingClientRect().top > window.innerHeight;
  }

  // 1. Home hero: the four hero elements rise in on first paint.
  var heroItems = document.querySelectorAll(".home-hero h1, .home-hero .hero-sub, .home-hero .hero-search, .home-hero .hero-popular");
  if (heroItems.length) {
    M.animate(heroItems, { opacity: [0, 1], transform: ["translateY(14px)", "none"] },
      { duration: 0.55, delay: M.stagger(0.07), ease: EASE });
  }

  // 2. Cards and sections fade up the first time they scroll into view.
  // Groups stagger their children; things already on screen are left alone.
  var GROUPS = ".category-card-grid, .tool-grid, .related-tools ul, .affiliate-grid";
  var SINGLES = ".tool-body.deep-dive, .intro-text, .newsletter-card, .guide-toc";
  var groups = Array.prototype.filter.call(document.querySelectorAll(GROUPS), belowFold);
  var singles = Array.prototype.filter.call(document.querySelectorAll(SINGLES), belowFold);

  groups.forEach(function (g) {
    var kids = Array.prototype.slice.call(g.children);
    kids.forEach(function (k) { k.style.opacity = "0"; });
    M.inView(g, function () {
      kids.forEach(function (k) { k.style.opacity = ""; });
      M.animate(kids, { opacity: [0, 1], transform: ["translateY(18px)", "none"] },
        { duration: 0.5, delay: M.stagger(0.05), ease: EASE });
    }, { amount: 0.15 });
  });
  singles.forEach(function (el) {
    el.style.opacity = "0";
    M.inView(el, function () {
      el.style.opacity = "";
      M.animate(el, { opacity: [0, 1], transform: ["translateY(18px)", "none"] }, { duration: 0.55, ease: EASE });
    }, { amount: 0.1 });
  });

  // 3. Hero glow drifts as the hero scrolls away (scroll-linked, compositor-run).
  var hero = document.querySelector(".home-hero");
  var glow = document.querySelector(".hero-glow");
  if (hero && glow) {
    M.scroll(M.animate(glow, { transform: ["translateY(0)", "translateY(90px)"], opacity: [1, 0.4] }, { ease: "linear" }),
      { target: hero, offset: ["start start", "end start"] });
  }

  // 4. Header gains a shadow once the page has scrolled.
  var header = document.querySelector(".site-header");
  if (header) {
    M.scroll(function (progress, info) {
      header.classList.toggle("is-scrolled", info.y.current > 8);
    });
  }

  // 5. Tool pages: reading progress bar.
  var bar = document.querySelector(".read-progress");
  if (bar) {
    bar.hidden = false;
    M.scroll(M.animate(bar, { transform: ["scaleX(0)", "scaleX(1)"] }, { ease: "linear" }));
  }

  // 6. The main result pulses once the visitor stops typing.
  var widget = document.querySelector(".tool-widget");
  if (widget) {
    var timer = null;
    widget.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var hero = widget.querySelector(".result-hero");
        if (hero) M.animate(hero, { transform: ["scale(1)", "scale(1.025)", "scale(1)"] }, { duration: 0.35, ease: EASE });
      }, 450);
    });
  }
})();
