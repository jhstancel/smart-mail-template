// ui/js/tutorial/coachmarks.js
// Polished coachmarks: no layout jump on prompts, menu-first gating, Next never closes menus,
// stays front-most (even over custom template editor), and a real tint “hole”.

const LS_STAGE = 'tutorial.stage';
const LS_SEEN  = 'tutorial.seen';

const Steps = [
  // Intro (centered, non-jargony)
  { id: 'intro', target: 'body',
    message: "Welcome! Quick tour so you can fly through Smart Mail.",
    prompt: "Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },
  { id: 'how', target: 'body',
    message: "I’ll point to each part, then ask you to try something. When you do it, we advance.",
    prompt: "Ready? Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },

  // Main screen (top-down)
  { id: 'templates-grid', target: '#intentGrid',
    message: "Templates live here. Pick one to load fields—or use the hint box to auto-detect.",
    prompt: "Click Next",
    showPromptDelayMs: 1400,
    advance: { type: 'click-next' },
    placement: 'top'
  },
  { id: 'auto-detect', target: '#hint',
    message: "Type a short hint (e.g., “confirm PO 12014, ship Friday”). We’ll help choose and prefill.",
    prompt: "Type in this box",
    showPromptDelayMs: 1600,
    advance: { type: 'input', selector: '#hint' },
    placement: 'bottom'
  },
  { id: 'fields', target: '#fields',
    message: "Only the essentials for this template show here. Fill required ones; others are optional.",
    prompt: "Change any field",
    showPromptDelayMs: 1600,
    advance: { type: 'input', selector: '#fields input, #fields select, #fields textarea' },
    placement: 'top'
  },
  { id: 'generate', target: '#btnGenerate',
    message: "Generate creates a clean Subject and Body from your fields.",
    prompt: "Click Generate",
    showPromptDelayMs: 1000,
    advance: { type: 'click', selector: '#btnGenerate' },
    placement: 'left'
  },
  { id: 'output', target: '#outBody',
    message: "Here’s your output. Copy it now—or adjust your personal template to change the default.",
    prompt: "Copy Subject or Body (or click Edit Template)",
    showPromptDelayMs: 1400,
    advance: { type: 'click', selector: '#copySubject, #copyBody, #btnEditTemplate' },
    placement: 'top'
  },

  // Settings flow — menu-first, then toggles
  { id: 'open-settings', target: '#settingsBtn',
    message: "Personalize: themes, visibility, behavior, and your local templates.",
    prompt: "Open Settings",
    showPromptDelayMs: 1000,
    advance: { type: 'class-on', selector: '#settingsMenu', className: 'open' },
    placement: 'right'
  },
  { id: 'open-theme-subpanel', target: ".settings-item[data-item='theme']",
    message: "Themes change the vibe. Let’s open the Theme panel first.",
    prompt: "Open the Theme panel",
    showPromptDelayMs: 1400,
    advance: { type: 'click', selector: ".settings-item[data-item='theme']" },
    placement: 'left'
  },
  { id: 'theme-select', target: "#themeSelect, #composeSegTheme",
    message: "Pick a theme or adjust compose/preview behavior here. We’ll remember it.",
    prompt: "Try a different theme or mode",
    showPromptDelayMs: 1400,
    advance: { type: 'change', selector: "#themeSelect, #composeSegTheme .opt[data-mode]" },
    placement: 'bottom'
  },

  { id: 'display-descriptions', target: "#displayDescriptionsToggle, [data-setting='showFieldDescriptions']",
    message: "Field descriptions: show helpful tips next to inputs.",
    prompt: "Toggle descriptions",
    showPromptDelayMs: 1200,
    advance: { type: 'change', selector: "#displayDescriptionsToggle, [data-setting='showFieldDescriptions']" },
    placement: 'left'
  },
  { id: 'show-search', target: "#toggleMainSearch, [data-setting='mainSearch']",
    message: "Main search bar: add a search on the home screen.",
    prompt: "Toggle Show Search Bar",
    showPromptDelayMs: 1200,
    advance: { type: 'change', selector: "#toggleMainSearch, [data-setting='mainSearch']" },
    placement: 'left'
  },
  { id: 'visible-intents', target: "#visibleIntents, [data-setting='visibleIntents']",
    message: "Choose which templates appear in the grid. Changes save automatically.",
    prompt: "Adjust a checkbox (or Next to continue)",
    showPromptDelayMs: 1200,
    advance: { type: 'click-next-or', selector: "#visibleIntents, [data-setting='visibleIntents']" },
    placement: 'left'
  },

  // My Templates → create → field-by-field → export → import
  { id: 'usertpls-open', target: ".settings-item[data-item='usertpls'], #userTemplatesBtn",
    message: "My Templates: your personal templates saved on this device.",
    prompt: "Open My Templates",
    showPromptDelayMs: 1100,
    advance: { type: 'click', selector: ".settings-item[data-item='usertpls'], #userTemplatesBtn" },
    placement: 'left'
  },
  { id: 'ut-new', target: "#tplNew",
    message: "Let’s make one. Click + New.",
    prompt: "Click + New",
    showPromptDelayMs: 900,
    advance: { type: 'click', selector: "#tplNew" },
    placement: 'bottom'
  },
  { id: 'ut-id', target: "#ut_id, [name='id']",
    message: "Template ID: a short unique key (e.g., “followup”). Used for import/export matching.",
    prompt: "Type an ID",
    showPromptDelayMs: 800,
    advance: { type: 'input', selector: "#ut_id, [name='id']" },
    placement: 'top'
  },
  { id: 'ut-label', target: "#ut_label, [name='label']",
    message: "Label: the human-friendly name you’ll see in the grid.",
    prompt: "Type a label",
    showPromptDelayMs: 700,
    advance: { type: 'input', selector: "#ut_label, [name='label']" },
    placement: 'top'
  },
  { id: 'ut-subject', target: "#ut_subject, [name='subject']",
    message: "Subject: your default subject line.",
    prompt: "Enter a subject",
    showPromptDelayMs: 700,
    advance: { type: 'input', selector: "#ut_subject, [name='subject']" },
    placement: 'top'
  },
  { id: 'ut-body', target: "#ut_body, [name='body']",
    message: "Body: your default message text. Placeholders are okay.",
    prompt: "Enter a body",
    showPromptDelayMs: 700,
    advance: { type: 'input', selector: "#ut_body, [name='body']" },
    placement: 'top'
  },
  { id: 'ut-save', target: "#ut_save, [data-action='saveUserTpl']",
    message: "Save your template.",
    prompt: "Click Save",
    showPromptDelayMs: 700,
    advance: { type: 'click', selector: "#ut_save, [data-action='saveUserTpl']" },
    placement: 'left'
  },
  { id: 'export', target: "#btnExportUserTemplates, [data-action='exportUserTpls']",
    message: "Export to a .zip to back up or share.",
    prompt: "Click Export",
    showPromptDelayMs: 1000,
    advance: { type: 'click', selector: "#btnExportUserTemplates, [data-action='exportUserTpls']" },
    placement: 'left'
  },
  { id: 'import', target: "#btnImportUserTemplates, [data-action='importUserTpls']",
    message: "Import your .zip. If an ID already exists, we duplicate (your original stays intact).",
    prompt: "Click Import and pick your file",
    showPromptDelayMs: 1200,
    advance: { type: 'click', selector: "#btnImportUserTemplates, [data-action='importUserTpls']" },
    placement: 'left'
  },

  { id: 'done', target: 'body',
    message: "All set. Explore templates, use the hint box, fine-tune settings, and enjoy the speed.",
    prompt: "Finish",
    advance: { type: 'click-next' },
    placement: 'center'
  }
];

const root = document.getElementById('tutorialRoot') || (() => {
  const div = document.createElement('div'); div.id='tutorialRoot';
  document.body.appendChild(div); return div;
})();

const hasSeen = localStorage.getItem(LS_SEEN) === 'true';
let state = { idx: hasSeen ? Number(localStorage.getItem(LS_STAGE) || 0) : 0, mounted: false };

function clampIdx(i){ return Math.max(0, Math.min(Steps.length - 1, i)); }
function saveIdx(){ localStorage.setItem(LS_STAGE, String(state.idx)); }

function getTargetRect(sel){
  if (sel === 'body' || !sel) {
    const w = window.innerWidth, h = window.innerHeight;
    return { x: w/2, y: h/2, width: w, height: h, centerX: w/2, centerY: h/2 };
  }
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height,
           centerX: r.left + r.width/2, centerY: r.top + r.height/2 };
}

function computeTopSafe(){
  // detect fixed headers at the top and reserve that space
  let topSafe = 0;
  const all = document.body.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++){
    const el = all[i], cs = getComputedStyle(el);
    if (cs.position === 'fixed'){
      const top = parseFloat(cs.top || 'auto');
      if (!Number.isNaN(top) && top <= 4){ const r = el.getBoundingClientRect(); topSafe = Math.max(topSafe, r.bottom); }
    }
  }
  return Math.max(72, Math.min(200, Math.round(topSafe)));
}

/* ---------- overlay hole (slabs + ring) ---------- */
function ensureOverlayScaffold(){
  if (!document.querySelector('.coach-scrim')) {
    const scrim = document.createElement('div'); scrim.className='coach-scrim';
    const t = document.createElement('div'); t.className='coach-slab top';
    const l = document.createElement('div'); l.className='coach-slab left';
    const r = document.createElement('div'); r.className='coach-slab right';
    const b = document.createElement('div'); b.className='coach-slab bottom';
    scrim.appendChild(t); scrim.appendChild(l); scrim.appendChild(r); scrim.appendChild(b);
    root.appendChild(scrim);
  }
  if (!document.querySelector('.coach-ring')) {
    const ring = document.createElement('div'); ring.className='coach-ring';
    root.appendChild(ring);
  }
  if (!document.querySelector('.coach-esc-banner')) {
    const esc = document.createElement('div'); esc.className='coach-esc-banner';
    esc.textContent = 'Press Esc to exit tutorial';
    root.appendChild(esc);
  }
}

function placeSlabsAndRing(r, ringPad){
  const top = document.querySelector('.coach-slab.top');
  const left = document.querySelector('.coach-slab.left');
  const right = document.querySelector('.coach-slab.right');
  const bottom = document.querySelector('.coach-slab.bottom');
  const ring = document.querySelector('.coach-ring');

  const x = Math.max(0, r.x - ringPad);
  const y = Math.max(0, r.y - ringPad);
  const w = r.width + ringPad*2;
  const h = r.height + ringPad*2;
  const vw = window.innerWidth, vh = window.innerHeight;

  Object.assign(top.style,    { left:'0px', top:'0px', width: vw+'px', height: y+'px' });
  Object.assign(left.style,   { left:'0px', top:y+'px', width: x+'px', height: h+'px' });
  const rx = x + w;
  Object.assign(right.style,  { left: rx+'px', top:y+'px', width:(vw - rx)+'px', height:h+'px' });
  const by = y + h;
  Object.assign(bottom.style, { left:'0px', top:by+'px', width: vw+'px', height:(vh - by)+'px' });

  Object.assign(ring.style,   { left:x+'px', top:y+'px', width:w+'px', height:h+'px', display:'block' });
}

/* ---------- bubble placement ---------- */
function placeBox(box, step){
  const vw = window.innerWidth, vh = window.innerHeight;
  const MARGIN = 12, SIDE_SAFE = 12, BOTTOM_SAFE = 20, TOP_SAFE = computeTopSafe();

  const bw = box.offsetWidth || 320;
  const bh = box.offsetHeight || 140;

  const r = getTargetRect(step.target);

  // slabs/hole & ring
  ensureOverlayScaffold();
  const ring = document.querySelector('.coach-ring');
  const ringPad = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ring-pad')) || 8;

  if (!r || step.target === 'body') {
    ring.style.display = 'none';
    // slabs just cover full screen (no hole)
    placeSlabsAndRing({ x: -ringPad, y: -ringPad, width: 0, height: 0 }, ringPad);
  } else {
    placeSlabsAndRing(r, ringPad);
  }

  // position bubble (auto-flip with clamps)
  const fits = (x, y) =>
    (x - bw/2 >= SIDE_SAFE) && (x + bw/2 <= vw - SIDE_SAFE) &&
    (y - bh/2 >= TOP_SAFE)   && (y + bh/2 <= vh - BOTTOM_SAFE);

  const posFor = (p) => {
    if (!r) return { x: vw/2, y: Math.max(TOP_SAFE + bh/2 + 12, vh * 0.45) };
    switch (p) {
      case 'top':    return { x: r.centerX, y: r.y - MARGIN - (bh/2) };
      case 'bottom': return { x: r.centerX, y: r.y + r.height + MARGIN + (bh/2) };
      case 'left':   return { x: r.x - MARGIN - (bw/2), y: r.centerY };
      case 'right':  return { x: r.x + r.width + MARGIN + (bw/2), y: r.centerY };
      case 'center': default: return { x: (r ? r.centerX : vw/2), y: (r ? r.centerY : vh/2) };
    }
  };

  const opposite = { top:'bottom', bottom:'top', left:'right', right:'left' };
  const pref = step.placement || 'top';
  const order = [pref, opposite[pref] || 'bottom', 'right', 'left', 'top', 'bottom', 'center'];

  let chosen = posFor(order[0]);
  for (let i=0; i<order.length; i++){
    const p = posFor(order[i]);
    if (fits(p.x, p.y)) { chosen = p; break; }
    chosen = p;
  }

  const clamp = (x, y) => {
    const cx = Math.max(SIDE_SAFE + bw/2, Math.min(vw - SIDE_SAFE - bw/2, x));
    const cy = Math.max(TOP_SAFE  + bh/2, Math.min(vh - BOTTOM_SAFE - bh/2, y));
    return { x: cx, y: cy };
  };
  const final = clamp(chosen.x, chosen.y);

  box.style.left = `${final.x}px`;
  box.style.top  = `${final.y}px`;
}

/* ---------- main UI ---------- */
function makeUI(){
  // bubble (front-most)
  const box = document.createElement('div'); box.className='coachmark';
  box.innerHTML = `
    <div class="msg"></div>
    <div class="prompt"></div>
    <div class="actions">
      <span class="coach-esc">Esc to exit</span>
      <div>
        <button class="coach-btn" data-act="prev">Back</button>
        <button class="coach-btn primary" data-act="next">Next</button>
      </div>
    </div>
  `;
  root.appendChild(box);

  // prevent Next/Back clicks from closing menus (don’t bubble)
  box.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-act]');
    if (btn) { e.stopPropagation(); e.stopImmediatePropagation(); }
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'prev') prev();
    if (act === 'next') next();
  }, true);

  // ESC ends tutorial (persistent hint is created in ensureOverlayScaffold)
  window.addEventListener('keydown', (e)=> { if (e.key === 'Escape') end(); });

  function render(){
    const s = Steps[state.idx]; if (!s) return;

    // message + prompt (reserve space; prompt becomes .ready later)
    box.querySelector('.msg').textContent = s.message || '';
    const promptEl = box.querySelector('.prompt');
    promptEl.textContent = s.prompt || '';
    promptEl.classList.remove('ready'); // not visible yet

    // show bubble then place it; keep invisible until accurate
    box.classList.add('show');
    box.style.visibility = 'hidden';

    // ensure overlay pieces exist
    ensureOverlayScaffold();

    // scroll target if way off-screen
    const tgtEl = (s.target && s.target !== 'body') ? document.querySelector(s.target) : null;
    if (tgtEl) {
      const tr = tgtEl.getBoundingClientRect();
      const outVert = (tr.bottom < 0) || (tr.top > window.innerHeight);
      const outHorz = (tr.right < 0) || (tr.left > window.innerWidth);
      if (outVert || outHorz) { try { tgtEl.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' }); } catch {} }
    }

    requestAnimationFrame(() => {
      placeBox(box, s);
      box.style.visibility = 'visible';
    });

    // prompt delay (default ~4.5s to avoid “pop in”)
    const delay = (typeof s.showPromptDelayMs === 'number') ? s.showPromptDelayMs : 4500;
    setTimeout(()=> promptEl.classList.add('ready'), delay);

    wireAdvance(s);
  }

  /* ---- per-step wiring ---- */
  function cleanupAdvance(){
    window.removeEventListener('click', onDocClick, true);
    window.removeEventListener('input', onDocInput, true);
    window.removeEventListener('change', onDocChange, true);
    window.removeEventListener('resize', onReflow);
    window.removeEventListener('scroll', onReflow, true);
    try { ro.disconnect(); } catch {}
    try { mo.disconnect(); } catch {}
    clearInterval(pollId); pollId = null;
  }

  let pollId = null;
  function onReflow(){ placeBox(box, Steps[state.idx]); }

  function onDocClick(e){
    const s = Steps[state.idx];
    if (s?.advance?.type === 'click' || s?.advance?.type === 'click-next-or'){
      if (s.advance?.type === 'click-next-or' && e.target.closest('[data-act="next"]')) { next(); return; }
      if (e.target.closest(s.advance.selector)) next();
    }
  }
  function onDocInput(e){
    const s = Steps[state.idx];
    if (s?.advance?.type === 'input'){
      const el = e.target;
      if (el.matches?.(s.advance.selector) || el.closest?.(s.advance.selector)) next();
    }
  }
  function onDocChange(e){
    const s = Steps[state.idx];
    if (s?.advance?.type === 'change'){
      const el = e.target;
      if (el.matches?.(s.advance.selector) || el.closest?.(s.advance.selector)) next();
    }
  }

  const ro = new ResizeObserver(() => onReflow());
  ro.observe(document.body);
  const mo = new MutationObserver(() => onReflow());
  mo.observe(document.body, { childList:true, subtree:true, attributes:true });

  function wireAdvance(s){
    cleanupAdvance();
    window.addEventListener('resize', onReflow, { passive: true });
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });

    // If already satisfied on enter, advance right away
    if (s.advance?.type === 'class-on') {
      const { selector, className } = s.advance;
      const el = document.querySelector(selector);
      if (el && el.classList.contains(className)) { next(); return; }
      pollId = setInterval(()=>{
        const el2 = document.querySelector(selector);
        if (el2 && el2.classList.contains(className)) { clearInterval(pollId); pollId=null; next(); }
      }, 140);
      return;
    }
    if (s.advance?.type === 'click'){ window.addEventListener('click', onDocClick, true); return; }
    if (s.advance?.type === 'click-next'){ return; }
    if (s.advance?.type === 'click-next-or'){ window.addEventListener('click', onDocClick, true); return; }
    if (s.advance?.type === 'input'){ window.addEventListener('input', onDocInput, true); return; }
    if (s.advance?.type === 'change'){ window.addEventListener('change', onDocChange, true); return; }
  }

  function next(){ cleanupAdvance(); state.idx = clampIdx(state.idx + 1); saveIdx(); if (state.idx === Steps.length - 1) localStorage.setItem(LS_SEEN, 'true'); render(); }
  function prev(){ cleanupAdvance(); state.idx = clampIdx(state.idx - 1); saveIdx(); render(); }

  function end(){
    cleanupAdvance();
    // remove overlay pieces and bubble
    try { document.querySelector('.coach-scrim')?.remove(); } catch {}
    try { document.querySelector('.coach-ring')?.remove(); } catch {}
    try { document.querySelector('.coach-esc-banner')?.remove(); } catch {}
    try { root.querySelector('.coachmark')?.remove(); } catch {}
    localStorage.removeItem(LS_STAGE); // next run starts from intro
  }

  // public controls
  window.Tutorial = {
    next, prev, end,
    reset(){ cleanupAdvance(); state.idx = 0; saveIdx(); render(); },
    jumpTo(id){ const i = Steps.findIndex(s => s.id === id); if (i >= 0) { state.idx = i; saveIdx(); render(); } }
  };

  render();
}

function start(){ if (state.mounted) return; state.mounted = true; makeUI(); }
window.addEventListener('DOMContentLoaded', () => setTimeout(start, 250));

