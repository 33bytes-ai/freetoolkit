/* Ad bootstrap, kept out of the HTML so the CSP needs no per-build nonce.
 *
 * Only loaded when ads_enabled is true. Covers both pieces Google's snippets
 * would otherwise put inline: the Funding Choices presence signal (required
 * before personalised ads are shown to EEA/UK visitors) and the per-slot
 * adsbygoogle push. */
(function () {
  "use strict";

  function signalGooglefcPresent() {
    if (window.frames["googlefcPresent"]) return;
    if (!document.body) {
      setTimeout(signalGooglefcPresent, 0);
      return;
    }
    var iframe = document.createElement("iframe");
    iframe.style = "width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;";
    iframe.style.display = "none";
    iframe.name = "googlefcPresent";
    document.body.appendChild(iframe);
  }
  signalGooglefcPresent();

  // One push per rendered slot; the inline version ran once per <ins>.
  function pushSlots() {
    var slots = document.querySelectorAll("ins.adsbygoogle");
    for (var i = 0; i < slots.length; i++) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) { /* ad blocker or offline */ }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pushSlots);
  } else {
    pushSlots();
  }
})();
