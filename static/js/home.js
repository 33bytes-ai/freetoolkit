/* Home page animations — scroll reveal + counter + animated text cycle */
(function () {
  "use strict";

  // Animated text cycle in hero heading
  (function () {
    var el = document.getElementById("hero-text-cycle");
    if (!el) return;
    var words = ["founders", "freelancers", "SaaS builders", "bootstrappers", "indie hackers", "startups"];
    var idx = 0;
    function cycle() {
      el.classList.add("htc-exit");
      setTimeout(function () {
        idx = (idx + 1) % words.length;
        el.textContent = words[idx];
        el.classList.remove("htc-exit");
        el.classList.add("htc-enter");
        setTimeout(function () { el.classList.remove("htc-enter"); }, 400);
      }, 300);
    }
    setInterval(cycle, 3000);
  })();

  // Duplicate testimonial column cards for seamless infinite scroll
  document.querySelectorAll(".tst-col-inner").forEach(function (col) {
    var cards = col.querySelectorAll(".tst-card");
    cards.forEach(function (card) { col.appendChild(card.cloneNode(true)); });
  });

  // Scroll-triggered reveal for .reveal elements
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal").forEach(function (el) {
    observer.observe(el);
  });

  // Staggered children within .reveal-group
  document.querySelectorAll(".reveal-group").forEach(function (group) {
    var children = group.querySelectorAll(".reveal-child");
    children.forEach(function (child, i) {
      child.style.transitionDelay = (i * 80) + "ms";
    });

    var groupObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".reveal-child").forEach(function (c) {
            c.classList.add("visible");
          });
          groupObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

    groupObs.observe(group);
  });

  // Animated number counter for hero stats
  function animateCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    var start = 0;
    var duration = 900;
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + eased * (target - start));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var heroCounters = document.querySelectorAll(".hero-count");
  if (heroCounters.length > 0) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    heroCounters.forEach(function (el) { counterObs.observe(el); });
  }
})();
