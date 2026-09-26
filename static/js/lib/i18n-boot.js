/* Runs in <head>, before first paint: a visitor who chose FR/ES/DE should not
   see the English page flash before i18n.js swaps the text. CSS hides the body
   while html.i18n-pending is set, with a 1.5 s failsafe. */
try {
  var ftkLang = localStorage.getItem("ftk-lang");
  if (ftkLang && ftkLang !== "en") document.documentElement.classList.add("i18n-pending");
} catch (e) { /* storage blocked: stay English */ }
