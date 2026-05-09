// Replit badge deduplication — removes extra badge instances injected by
// the Replit dev proxy during HMR reloads. No-ops silently in production
// (Hostinger) where the Replit proxy never injects the badge.
(function () {
  var SELECTORS = [
    "#replit-badge",
    "[data-replit-badge]",
    "replit-badge",
    ".replit-badge",
  ];
  function dedup() {
    SELECTORS.forEach(function (sel) {
      var els = document.querySelectorAll(sel);
      if (els.length > 1) {
        Array.prototype.slice
          .call(els, 0, els.length - 1)
          .forEach(function (el) {
            el.remove();
          });
      }
    });
  }
  var mo = new MutationObserver(dedup);
  mo.observe(document.body, { childList: true, subtree: false });
  dedup();
})();
