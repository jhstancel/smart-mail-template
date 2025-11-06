// ui/js/tutorial/coachmarks.js
// Beautiful, logical, and stable coachmarks with real action gates.
// - Centered intro (no jargon), top-down flow.
// - Non-blocking tint, with a real "hole" over the highlighted area.
// - Persistent ESC hint; Esc exits tutorial.
// - Guides through creating a User Template, field-by-field.
// - Covers Settings controls: typing effect, preview, descriptions, search bar, visible intents,
//   global defaults, export/import, and explains duplicate-on-import behavior.

const LS_STAGE = 'tutorial.stage';
const LS_SEEN  = 'tutorial.seen';

const Steps = [
  // ——— Intro ———
  { id: 'intro',
    target: 'body',
    message: "Welcome! Quick tour so you can fly through Smart Mail.",
    prompt: "Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },
  { id: 'how',
    target: 'body',
    message: "I’ll point to each part, then ask you to try something. When you do it, we advance.",
    prompt: "Ready? Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },

  // ——— Main screen, top-down ———
  { id: 'templates-grid',
    target: '#intentGrid',
    message: "Templates live here. Pick one to load its fields; or use the hint box below to Auto-Detect.",
    prompt: "Click Next",
    showPromptDelayMs: 1000,
    advance: { type: 'click-next' },
    placement: 'top'
  },
  { id: 'auto-detect',
    target: '#hint',
    message: "Type a short hint (e.g., “confirm PO 12014, ship Friday”). We’ll help choose and prefill.",
    prompt: "Type in this box",
    showPromptDelayMs: 1200,
    advance: { type: 'input', selector: '#hint' },
    placement: 'bottom'
  },
  { id: 'fields',
    target: '#fields',
    message: "Fields show only what this template needs. Required ones highlight; the rest are optional.",
    prompt: "Change any field",
    showPromptDelayMs: 1200,
    advance: { type: 'input', selector: '#fields input, #fields select, #fields textarea' },
    placement: 'top'
  },
  { id: 'generate',
    target: '#btnGenerate',
    message: "Generate creates a clean Subject and Body from the fields you filled.",
    prompt: "Click Generate",
    showPromptDelayMs: 800,
    advance: { type: 'click', selector: '#btnGenerate' },
    placement: 'left'
  },
  { id: 'output',
    target: '#outBody',
    message: "Here’s your output. You can copy it, or adjust your personal template for next time.",
    prompt: "Copy Subject or Body (or click Edit Template)",
    showPromptDelayMs: 1100,
    advance: { type: 'click', selector: '#copySubject, #copyBody, #btnEditTemplate' },
    placement: 'top'
  },

  // ——— Personalize (Settings) ———
  { id: 'open-settings',
    target: '#settingsBtn',
    message: "Personalize: themes, which templates show up, behavior, and your local templates.",
    prompt: "Open Settings",
    showPromptDelayMs: 900,
    advance: { type: 'class-on', selector: '#settingsMenu', className: 'open' },
    placement: 'right'
  },

  // Compose/Preview controls (under Settings → Behavior/Display sections)
  { id: 'typing-effect',
    target: "#composeTypingToggle, [data-setting='composeTyping']",
    message: "Typing effect: animated text appearance while composing. Toggle on/off here.",
    prompt: "Toggle the typing effect",
    showPromptDelayMs: 1000,
    advance: { type: 'change', selector: "#composeTypingToggle, [data-setting='composeTyping']" },
    placement: 'left'
  },
  { id: 'preview-setting',
    target: "#composePreviewToggle, [data-setting='composePreview']",
    message: "Preview: show a live preview while you fill fields. Toggle as you prefer.",
    prompt: "Toggle the preview",
    showPromptDelayMs: 800,
    advance: { type: 'change', selector: "#composePreviewToggle, [data-setting='composePreview']" },
    placement: 'left'
  },
  { id: 'display-descriptions',
    target: "#displayDescriptionsToggle, [data-setting='showFieldDescriptions']",
    message: "Field descriptions: show helpful tips next to inputs. You can turn them off here.",
    prompt: "Toggle descriptions",
    showPromptDelayMs: 800,
    advance: { type: 'change', selector: "#displayDescriptionsToggle, [data-setting='showFieldDescriptions']" },
    placement: 'left'
  },
  { id: 'show-search',
    target: "#toggleMainSearch, [data-setting='mainSearch']",
    message: "Main search bar: add a search on the home screen if you like it visible.",
    prompt: "Toggle Show Search Bar",
    showPromptDelayMs: 800,
    advance: { type: 'change', selector: "#toggleMainSearch, [data-setting='mainSearch']" },
    placement: 'left'
  },

  // Visible intents + Global defaults
  { id: 'visible-intents',
    target: "#visibleIntents, [data-setting='visibleIntents']",
    message: "Choose which templates appear in the grid. Changes save automatically.",
    prompt: "Adjust visibility (or click Next)",
    showPromptDelayMs: 900,
    advance: { type: 'click-next-or', selector: "#visibleIntents, [data-setting='visibleIntents']" },
    placement: 'left'
  },
  { id: 'global-defaults',
    target: "#globalDefaultsBtn, [data-item='global-defaults']",
    message: "Global defaults: set values used across templates (like your company, contact, etc.).",
    prompt: "Open Global Defaults (or click Next)",
    showPromptDelayMs: 900,
    advance: { type: 'click-next-or', selector: "#globalDefaultsBtn, [data-item='global-defaults']" },
    placement: 'left'
  },

  // My Templates (create → export → import)
  { id: 'usertpls-open',
    target: ".settings-item[data-item='usertpls'], #userTemplatesBtn",
    message: "My Templates: your personal templates saved on this device.",
    prompt: "Open My Templates",
    showPromptDelayMs: 900,
    advance: { type: 'click', selector: ".settings-item[data-item='usertpls'], #userTemplatesBtn" },
    placement: 'left'
  },
  { id: 'ut-new',
    target: "#tplNew",
    message: "Let’s make one now. Click + New.",
    prompt: "Click + New",
    showPromptDelayMs: 900,
    advance: { type: 'click', selector: "#tplNew" },
    placement: 'bottom'
  },

  // ——— Field-by-field guidance inside the New Template editor ———
  { id: 'ut-id',
    target: "#ut_id, [name='id']",
    message: "Template ID: a short unique key (like “followup”). Used for import/export matching.",
    prompt: "Type an ID",
    showPromptDelayMs: 700,
    advance: { type: 'input', selector: "#ut_id, [name='id']" },
    placement: 'top'
  },
  { id: 'ut-label',
    target: "#ut_label, [name='label']",
    message: "Label: the human-friendly name you’ll see in the grid.",
    prompt: "Type a label",
    showPromptDelayMs: 600,
    advance: { type: 'input', selector: "#ut_label, [name='label']" },
    placement: 'top'
  },
  { id: 'ut-subject',
    target: "#ut_subject, [name='subject']",
    message: "Subject: default subject line. You can always tweak it per email.",
    prompt: "Enter a subject",
    showPromptDelayMs: 600,
    advance: { type: 'input', selector: "#ut_subject, [name='subject']" },
    placement: 'top'
  },
  { id: 'ut-body',
    target: "#ut_body, [name='body']",
    message: "Body: your default message text. Use placeholders if you like.",
    prompt: "Enter a body",
    showPromptDelayMs: 600,
    advance: { type: 'input', selector: "#ut_body, [name='body']" },
    placement: 'top'
  },
  { id: 'ut-save',
    target: "#ut_save, [data-action='saveUserTpl']",
    message: "Save your personal template.",
    prompt: "Click Save",
    showPromptDelayMs: 600,
    advance: { type: 'click', selector: "#ut_save, [data-action='saveUserTpl']" },
    placement: 'left'
  },

  // Export → Import flow (intuitive round trip)
  { id: 'export',
    target: "#btnExportUserTemplates, [data-action='exportUserTpls']",
    message: "Export your templates to a .zip — perfect for backup or sharing.",
    prompt: "Click Export",
    showPromptDelayMs: 900,
    advance: { type: 'click', selector: "#btnExportUserTemplates, [data-action='exportUserTpls']" },
    placement: 'left'
  },
  { id: 'import',
    target: "#btnImportUserTemplates, [data-action='importUserTpls']",
    message: "Import a .zip to add templates here. If an ID already exists, we keep both (your original stays).",
    prompt: "Click Import and choose the file you exported",
    showPromptDelayMs: 1200,
    advance: { type: 'click', selector: "#btnImportUserTemplates, [data-action='importUserTpls']" },
    placement: 'left'
  },

  // Done
  { id: 'done',
    target: 'body',
    message: "All set. Explore templates, use the hint box, fine-tune settings, and enjoy the speed.",
    prompt: "Finish",
    advance: { type: 'click-next' },
    placement: 'center'
  }
];

const root = document.getElementById('tutorialRoot') || (()=> {
  const div = document.createElement('div'); div.id='tutorialRoot'; document.body.appendChild(div); return div;
})();

const hasSeen = localStorage.getItem(LS_SEEN) === 'true';
let state = {
  idx: hasSeen ? Number(localStorage.getItem(LS_STAGE) || 0) : 0,
  mounted: false
};

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
  return { x: r.left, y: r.top, width: r.width, height: r.height, centerX: r.left + r.width/2, centerY: r.top + r.height/2 };
}

function computeTopSafe(){
  let topSafe = 0;
  const all = document.body.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++){
    const el = all[i];
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed'){
      const top = parseFloat(cs.top || 'auto');
      if (!Number.isNaN(top) && top <= 4){
        const r = el.getBoundingClientRect();
        topSafe = Math.max(topSafe, r.bottom);
      }
    }
  }
  return Math.max(72, Math.min(200, Math.round(topSafe)));
}

function afterFontsReady(){
  if (document.fonts && document.fonts.ready) return document.fonts.ready.catch(()=>{});
  return Promise.resolve();
}

function placeSlabsAndRing(r, ringPad){
  // position four slabs to leave a hole where the ring is
  const top = document.querySelector('.coach-slab.top');
  const left = document.querySelector('.coach-slab.left');
  const right = document.querySelector('.coach-slab.right');
  const bottom = document.querySelector('.coach-slab.bottom');

  const x = Math.max(0, r.x - ringPad);
  const y = Math.max(0, r.y - ringPad);
  const w = r.width + ringPad*2;
  const h = r.height + ringPad*2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // top slab
  Object.assign(top.style, { left: '0px', top: '0px', width: vw + 'px', height: y + 'px' });
  // left slab
  Object.assign(left.style, { left: '0px', top: y + 'px', width: x + 'px', height: h + 'px' });
  // right slab
  const rx = x + w;
  Object.assign(right.style, { left: rx + 'px', top: y + 'px', width: (vw - rx) + 'px', height: h + 'px' });
  // bottom slab
  const by = y + h;
  Object.assign(bottom.style, { left: '0px', top: by + 'px', width: vw + 'px', height: (vh - by) + 'px' });

  // ring
  const ring = document.querySelector('.coach-ring');
  Object.assign(ring.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
}

function placeBox(box, step){
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 12, SIDE_SAFE = 12, BOTTOM_SAFE = 20;
  const TOP_SAFE = computeTopSafe();

  const bw = box.offsetWidth || 320;
  const bh = box.offsetHeight || 140;

  const r = getTargetRect(step.target);

  // slabs/hole & ring
  const ring = document.querySelector('.coach-ring');
  const slabs = document.querySelector('.coach-scrim');
  if (!r) {
    slabs.style.display = 'block';
    ring.style.display = 'none';
  } else {
    slabs.style.display = 'block';
    ring.style.display = (step.target === 'body') ? 'none' : 'block';
    if (ring.style.display !== 'none') placeSlabsAndRing(r, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ring-pad')) || 8);
  }

  // pick bubble position (auto-flip)
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

function makeUI(){
  // overlay parts
  const scrim = document.createElement('div'); scrim.className='coach-scrim';
  const slabTop = document.createElement('div'); slabTop.className='coach-slab top';
  const slabLeft = document.createElement('div'); slabLeft.className='coach-slab left';
  const slabRight = document.createElement('div'); slabRight.className='coach-slab right';
  const slabBottom = document.createElement('div'); slabBottom.className='coach-slab bottom';
  scrim.appendChild(slabTop); scrim.appendChild(slabLeft); scrim.appendChild(slabRight); scrim.appendChild(slabBottom);

  const ring  = document.createElement('div'); ring.className='coach-ring';

  const escBanner = document.createElement('div');
  escBanner.className = 'coach-esc-banner';
  escBanner.textContent = 'Press Esc to exit tutorial';

  // bubble
  const box   = document.createElement('div'); box.className='coachmark';
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

  root.appendChild(scrim);
  root.appendChild(ring);
  root.appendChild(escBanner);
  root.appendChild(box);

  // buttons
  box.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'prev') prev();
    if (act === 'next') next();
  });

  // Esc exits
  window.addEventListener('keydown', (e)=> {
    if (e.key === 'Escape') { end(); }
  });

  function render(){
    const s = Steps[state.idx];
    if (!s) return;

    box.querySelector('.msg').textContent = s.message || '';
    const promptEl = box.querySelector('.prompt');
    promptEl.textContent = s.prompt || '';

    // show, but keep invisible until placed to avoid jump
    box.classList.add('show');
    box.style.visibility = 'hidden';

    // scroll target into view if needed
    const tgtEl = (s.target && s.target !== 'body') ? document.querySelector(s.target) : null;
    if (tgtEl) {
      const tr = tgtEl.getBoundingClientRect();
      const outVert = (tr.bottom < 0) || (tr.top > window.innerHeight);
      const outHorz = (tr.right < 0) || (tr.left > window.innerWidth);
      if (outVert || outHorz) {
        try { tgtEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
      }
    }

    // position; reflow watchers keep it stable
    const doPlace = () => { placeBox(box, s); box.style.visibility = 'visible'; };
    requestAnimationFrame(doPlace);

    // prompt delay
    const delay = (typeof s.showPromptDelayMs === 'number') ? s.showPromptDelayMs : 1800;
    promptEl.classList.remove('breathe');
    if (s.prompt) setTimeout(()=> promptEl.classList.add('breathe'), delay);

    wireAdvance(s);
  }

  // clean listeners for step
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
  mo.observe(document.body, { childList: true, subtree: true, attributes: true });

  function wireAdvance(s){
    cleanupAdvance();
    window.addEventListener('resize', onReflow, { passive: true });
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });

    // If the condition is already met, skip immediately.
    if (s.advance?.type === 'class-on') {
      const { selector, className } = s.advance;
      const el = document.querySelector(selector);
      if (el && el.classList.contains(className)) { next(); return; }
      pollId = setInterval(()=>{
        const el2 = document.querySelector(selector);
        if (el2 && el2.classList.contains(className)) { clearInterval(pollId); pollId=null; next(); }
      }, 120);
      return;
    }
    if (s.advance?.type === 'click'){ window.addEventListener('click', onDocClick, true); return; }
    if (s.advance?.type === 'click-next'){ return; }
    if (s.advance?.type === 'click-next-or'){ window.addEventListener('click', onDocClick, true); return; }
    if (s.advance?.type === 'input'){ window.addEventListener('input', onDocInput, true); return; }
    if (s.advance?.type === 'change'){ window.addEventListener('change', onDocChange, true); return; }
  }

  function next(){
    cleanupAdvance();
    state.idx = clampIdx(state.idx + 1);
    saveIdx();
    if (state.idx === Steps.length - 1) localStorage.setItem(LS_SEEN, 'true');
    render();
  }
  function prev(){
    cleanupAdvance();
    state.idx = clampIdx(state.idx - 1);
    saveIdx();
    render();
  }
  function end(){
    cleanupAdvance();
    // remove UI
    try { root.removeChild(scrim); } catch {}
    try { root.removeChild(ring); } catch {}
    try { root.removeChild(box); } catch {}
    const esc = document.querySelector('.coach-esc-banner');
    if (esc) esc.remove();
    // reset stage to intro next time
    localStorage.removeItem(LS_STAGE);
  }

  // public controls
  window.Tutorial = {
    next, prev, end,
    reset(){ cleanupAdvance(); state.idx = 0; saveIdx(); render(); },
    jumpTo(id){ const i = Steps.findIndex(s => s.id === id); if (i >= 0) { state.idx = i; saveIdx(); render(); } }
  };

  render();
}

function start(){
  if (state.mounted) return;
  state.mounted = true;
  makeUI();
}

window.addEventListener('DOMContentLoaded', () => setTimeout(start, 250));

