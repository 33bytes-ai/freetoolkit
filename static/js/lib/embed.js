// Embed page (/embed/<slug>/): a Pro key in ?key= hides the credit link and
// unlocks ?accent=<hex>. Keys are checked against SHA-256 hashes published in
// the page, so the page never carries a key itself.
// ponytail: static key list issued by hand; move to a Stripe webhook + KV
// lookup once issuing keys by hand costs more than an hour a week.
(function () {
  "use strict";

  function sha256Hex(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }

  function isProKey(key, hashes) {
    if (!key || !hashes.length) return Promise.resolve(false);
    return sha256Hex(key).then(function (hex) { return hashes.indexOf(hex) !== -1; });
  }

  function accentColor(value) {
    return /^[0-9a-f]{6}$/i.test(value || "") ? "#" + value : null;
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var hashes = [];
    try { hashes = JSON.parse(document.getElementById("pro-key-hashes").textContent); } catch (e) {}
    isProKey(params.get("key"), hashes).then(function (pro) {
      if (!pro) return;
      var credit = document.getElementById("embed-credit");
      if (credit) credit.remove();
      var accent = accentColor(params.get("accent"));
      if (accent) document.documentElement.style.setProperty("--accent", accent);
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { sha256Hex: sha256Hex, isProKey: isProKey, accentColor: accentColor };
  }
})();
