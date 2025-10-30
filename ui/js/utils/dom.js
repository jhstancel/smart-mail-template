// ui/js/utils/dom.js

/* ===== Tiny helpers ===== */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const on = (el,ev,fn,opts)=> el && el.addEventListener(ev,fn,opts||false);
function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

// Title helper (keep a single definition)
function toTitle(s){
  return (s || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c=>c.toUpperCase());
}

// back-compat
window.$ = $;
window.$$ = $$;
window.on = on;
window.delay = delay;
window.toTitle = toTitle;

