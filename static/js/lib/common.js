/* Shared browser helpers used by every tool page. */
window.FTK = (function () {
  function copyToClipboard(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return Promise.reject(new Error("Clipboard API unavailable (HTTPS required)"));
    }
    return navigator.clipboard.writeText(text);
  }

  function flash(el, message, duration) {
    if (!el) return;
    if (el._ftkFlashTimer) {
      window.clearTimeout(el._ftkFlashTimer);
    } else {
      el.dataset.originalText = el.textContent;
    }
    el.textContent = message || "Copied!";
    el._ftkFlashTimer = window.setTimeout(function () {
      el.textContent = el.dataset.originalText;
      el._ftkFlashTimer = null;
    }, duration || 1500);
  }

  function showError(el, message) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.add("visible");
    } else {
      el.textContent = "";
      el.classList.remove("visible");
    }
  }

  function showInsight(el, message, type) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.className = "calc-insight calc-insight--" + (type || "info");
      el.style.display = "";
      var live = document.getElementById("ftk-a11y-results");
      if (live) live.textContent = message;
    } else {
      el.style.display = "none";
      el.textContent = "";
    }
  }

  function hashGet() {
    try {
      var h = window.location.hash.slice(1);
      if (!h) return {};
      return JSON.parse(decodeURIComponent(h));
    } catch (e) {
      return {};
    }
  }

  function hashSet(obj) {
    try {
      var h = encodeURIComponent(JSON.stringify(obj));
      window.history.replaceState(null, "", "#" + h);
    } catch (e) {}
  }

  function hashClear() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function shareURL(btn) {
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({ url: url }).catch(function () {});
    } else {
      copyToClipboard(url).then(function () {
        flash(btn, "Link copied!", 2000);
      }).catch(function () {
        flash(btn, url, 3000);
      });
    }
  }

  function buildHelpOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "ftk-help-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Keyboard shortcuts");
    overlay.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center";
    var box = document.createElement("div");
    box.style.cssText = "background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1.5rem 2rem;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.25)";
    box.innerHTML = '<h2 style="margin:0 0 1rem;font-size:1.1rem">Keyboard shortcuts</h2>'
      + '<table style="width:100%;border-collapse:collapse;font-size:0.9rem">'
      + '<tr><td style="padding:0.35rem 0"><kbd style="border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;font-size:0.8rem;background:var(--surface)">Ctrl+Enter</kbd></td><td style="padding:0.35rem 0 0.35rem 1rem;color:var(--text-muted)">Recalculate</td></tr>'
      + '<tr><td><kbd style="border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;font-size:0.8rem;background:var(--surface)">/</kbd></td><td style="padding:0.35rem 0 0.35rem 1rem;color:var(--text-muted)">Focus search (tools page)</td></tr>'
      + '<tr><td><kbd style="border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;font-size:0.8rem;background:var(--surface)">d</kbd></td><td style="padding:0.35rem 0 0.35rem 1rem;color:var(--text-muted)">Toggle dark/light mode</td></tr>'
      + '<tr><td><kbd style="border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;font-size:0.8rem;background:var(--surface)">?</kbd></td><td style="padding:0.35rem 0 0.35rem 1rem;color:var(--text-muted)">Open/close this help</td></tr>'
      + '<tr><td><kbd style="border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;font-size:0.8rem;background:var(--surface)">Esc</kbd></td><td style="padding:0.35rem 0 0.35rem 1rem;color:var(--text-muted)">Close this help</td></tr>'
      + '</table>'
      + '<button id="ftk-help-close" style="margin-top:1.2rem;padding:0.4rem 1rem;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);cursor:pointer;font-size:0.88rem">Close</button>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return overlay;
  }

  if (typeof document !== "undefined") {
    // Theme toggle — apply saved preference immediately on load
    (function () {
      var saved = localStorage.getItem("ftk-theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    })();

    // Reading progress bar
    (function () {
      var bar = document.getElementById("reading-progress");
      if (!bar) return;
      function updateProgress() {
        var doc = document.documentElement;
        var scrollTop = doc.scrollTop || document.body.scrollTop;
        var scrollHeight = doc.scrollHeight - doc.clientHeight;
        if (scrollHeight <= 0) { bar.style.width = "0%"; return; }
        bar.style.width = Math.min(100, (scrollTop / scrollHeight) * 100) + "%";
      }
      window.addEventListener("scroll", updateProgress, { passive: true });
    })();

    // Scroll-to-top button
    (function () {
      var btn = document.getElementById("scroll-top");
      if (!btn) return;
      window.addEventListener("scroll", function () {
        var show = window.scrollY > 400;
        btn.style.display = show ? "flex" : "none";
      }, { passive: true });
      btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    })();

    // Print button on tool pages
    (function () {
      var btn = document.getElementById("tool-print-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        window.print();
      });
    })();

    document.addEventListener("DOMContentLoaded", function () {
      // Mobile nav
      var navToggle  = document.getElementById("mobile-nav-toggle");
      var navClose   = document.getElementById("mobile-nav-close");
      var siteNav    = document.getElementById("site-nav");
      var overlay    = document.getElementById("mobile-nav-overlay");

      function openNav() {
        if (!siteNav) return;
        siteNav.classList.add("nav-open");
        if (overlay) overlay.classList.add("active");
        if (navToggle) navToggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      }
      function closeNav() {
        if (!siteNav) return;
        siteNav.classList.remove("nav-open");
        if (overlay) overlay.classList.remove("active");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
      if (navToggle) navToggle.addEventListener("click", openNav);
      if (navClose)  navClose.addEventListener("click", closeNav);
      if (overlay)   overlay.addEventListener("click", closeNav);

      // Mobile nav groups: first tap expands the tool list in place (the
      // label is also a real link to the category page -- a second tap
      // follows it, since at that point the user has seen what's there).
      document.querySelectorAll(".nav-group-label").forEach(function (label) {
        label.addEventListener("click", function (e) {
          if (window.innerWidth > 640) return;
          var group = label.closest(".nav-group");
          if (!group) return;
          if (!group.classList.contains("open")) {
            e.preventDefault();
            group.classList.add("open");
          }
        });
      });

      var btn = document.getElementById("theme-toggle");
      if (!btn) return;
      function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("ftk-theme", theme);
        btn.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
        btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      }
      var current = localStorage.getItem("ftk-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      applyTheme(current);
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); btn.click(); }
      });
    });

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        var widget = document.querySelector(".tool-widget");
        if (!widget) return;
        e.preventDefault();
        widget.querySelectorAll("input, select").forEach(function (el) {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }
      if (e.key === "d" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var active2 = document.activeElement;
        if (active2 && (active2.tagName === "INPUT" || active2.tagName === "TEXTAREA" || active2.tagName === "SELECT")) return;
        var btn2 = document.getElementById("theme-toggle");
        if (btn2) btn2.click();
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        e.preventDefault();
        var overlay = document.getElementById("ftk-help-overlay") || buildHelpOverlay();
        var isOpen = overlay.style.display !== "none";
        overlay.style.display = isOpen ? "none" : "flex";
        if (!isOpen) {
          var closeBtn = document.getElementById("ftk-help-close");
          if (closeBtn) closeBtn.focus();
        }
      }
      if (e.key === "Escape") {
        var overlay = document.getElementById("ftk-help-overlay");
        if (overlay && overlay.style.display !== "none") {
          overlay.style.display = "none";
        }
      }
    });
    document.addEventListener("click", function (e) {
      var overlay = document.getElementById("ftk-help-overlay");
      if (!overlay || overlay.style.display === "none") return;
      if (e.target === overlay || e.target.id === "ftk-help-close") {
        overlay.style.display = "none";
      }
    });
  }

  function setFieldError(inputEl, message) {
    if (!inputEl) return;
    var field = inputEl.closest(".field");
    if (!field) return;
    var msg = field.querySelector(".field__error-msg");
    if (message) {
      field.classList.add("field--error");
      if (msg) msg.textContent = message;
    } else {
      field.classList.remove("field--error");
      if (msg) msg.textContent = "";
    }
  }

  function clearFieldError(inputEl) {
    setFieldError(inputEl, null);
  }

  return {
    copyToClipboard: copyToClipboard,
    flash: flash,
    showError: showError,
    showInsight: showInsight,
    hashGet: hashGet,
    hashSet: hashSet,
    hashClear: hashClear,
    shareURL: shareURL,
    setFieldError: setFieldError,
    clearFieldError: clearFieldError,
  };
})();
