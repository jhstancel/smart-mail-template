// ui/js/guards/intents-guard.js

// --- [INTENTS Write Guard] ---------------------------------------------------
// Only allow INTENTS to be written when __allowSetINTENTS__ is true.
// Everyone else gets a warning and the write is ignored.
(() => {
  const desc = Object.getOwnPropertyDescriptor(window, 'INTENTS');
  if (!desc || desc.configurable) {
    let __INTENTS__ = Array.isArray(window.INTENTS) ? window.INTENTS : [];
    Object.defineProperty(window, 'INTENTS', {
      configurable: false,
      enumerable: true,
      get() { return __INTENTS__; },
      set(next) {
        if (window.__allowSetINTENTS__ === true) {
          __INTENTS__ = Array.isArray(next) ? next : [];
        } else {
          console.warn('[INTENTS guard] Blocked write. Only Data.hydrateAll() may set INTENTS.');
        }
      }
    });
  }
  // small helper so the sanctioned setter is obvious and consistent
  window.setINTENTSFromHydrator = (arr) => {
    window.__allowSetINTENTS__ = true;
    try { window.INTENTS = arr; } finally { window.__allowSetINTENTS__ = false; }
  };
})();

