/* Extracted from templates/dashboard.html so it can be served as a static file.
 * Inline scripts required a per-build CSP nonce shared between the HTML and
 * the _headers file; on a CDN those can be served from different builds and
 * the mismatch silently blocks every inline script. External files need no
 * nonce, so that failure mode disappears. */
(function () {
  var KEY = "ftk_dash_unlocked";
  var HASH_KEY = "ftk_dash_hash";
  var DEFAULT_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c8ea29a5c4e3b834c1c9b2ab77"; // sha256("admin")
  function sha256(str) {
    // Simple FNV-based hash for the browser — not crypto-strength, just discourages casual browsing.
    // Replace DEFAULT_HASH with your own sha256 for real protection.
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  var expectedHash = localStorage.getItem(HASH_KEY) || DEFAULT_HASH;
  var lock = document.getElementById("dash-lock");
  var content = document.getElementById("dash-content");
  if (sessionStorage.getItem(KEY) === "1") {
    lock.style.display = "none";
    content.style.display = "";
    return;
  }
  lock.style.display = "flex";
  content.style.display = "none";
  window.dashUnlock = function () {
    var pw = document.getElementById("dash-pw").value;
    if (sha256(pw) === expectedHash) {
      sessionStorage.setItem(KEY, "1");
      lock.style.display = "none";
      content.style.display = "";
    } else {
      document.getElementById("dash-pw-err").textContent = "Incorrect password";
      document.getElementById("dash-pw").select();
    }
  };
  document.getElementById("dash-pw").addEventListener("keydown", function (e) {
    if (e.key === "Enter") window.dashUnlock();
  });
  document.getElementById("dash-unlock-btn").addEventListener("click", window.dashUnlock);
})();
