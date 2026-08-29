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

  /* Let a visitor reopen the consent choice after the banner is dismissed --
     required to be able to withdraw consent as easily as it was given, and
     promised by /privacy/. Funding Choices only exposes a revocation message
     where it actually showed one, so the button stays hidden until the CMP
     confirms it has one. */
  function wireConsentRevoke() {
    var btn = document.getElementById("consent-revoke");
    if (!btn) return;
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_DATA_READY: function () {
        if (typeof window.googlefc.showRevocationMessage !== "function") return;
        btn.hidden = false;
        btn.addEventListener("click", function () {
          window.googlefc.showRevocationMessage();
        });
      },
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireConsentRevoke);
  } else {
    wireConsentRevoke();
  }
})();
