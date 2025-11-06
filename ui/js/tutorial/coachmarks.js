// ui/js/tutorial/coachmarks.js
// Coachmarks: beautiful, frontmost, and logical (top-down).
// - Friendly copy (no jargon), timed prompts, and real action gates.
// - Auto-scroll to target, auto-flip placement, viewport clamps, and dynamic top safe area.
// - Supports advance on: click / input / change / class-on / click-next.
// - Skips steps whose conditions are already satisfied.

const LS_STAGE = 'tutorial.stage';
const LS_SEEN  = 'tutorial.seen';

const Steps = [
  // -------- Intro (centered) --------
  {
    id: 'intro',
    target: 'body',
    message: "Welcome to Smart Mail. Quick, friendly tour.",
    prompt: "Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },
  {
    id: 'how',
    target: 'body',
    message: "You’ll see a tip near each part of the UI, then a small prompt to try something. When you do it, we advance.",
    prompt: "Ready? Click Next",
    advance: { type: 'click-next' },
    placement: 'center'
  },

  // -------- Main screen (top-down) --------
  {
    id: 'templates-grid',
    target: '#intentGrid',
    message: "Templates live here. Pick one to load its fields, or use Auto Detect below.",
    prompt: "Scroll if needed, then click Next",
    showPromptDelayMs: 1200,
    advance: { type: 'click-next' },
    placement: 'top'
  },
  {
    id: 'auto-detect',
    target: '#hint',
    message: "Auto Detect: paste or type a line about your email. We’ll pick a template and fill details for you.",
    prompt: "Type a hint in this box",
    showPromptDelayMs: 1400,
    advance: { type: 'input', selector: '#hint' },
    placement: 'bottom'
  },
  {
    id: 'fields',
    target: '#fields',
    message: "Fields: only what you need for this template. Fill what’s required; you can tweak others anytime.",
    prompt: "Change any field",
    showPromptDelayMs: 1400,
    advance: { type: 'input', selector: '#fields input, #fields select, #fields textarea' },
    placement: 'top'
  },
  {
    id: 'generate',
    target: '#btnGenerate',
    message: "Generate builds a clean Subject and Body from your fields.",
    prompt: "Click Generate",
    showPromptDelayMs: 1000,
    advance: { type: 'click', selector: '#btnGenerate' },
    placement: 'left'
  },
  {
    id: 'output',
    target: '#outBody',
    message: "Output: copy, clear, or edit the local template if you want a different default.",
    prompt: "Copy Subject or Body (or click Edit Template)",
    showPromptDelayMs: 1400,
    advance: { type: 'click', selector: '#copySubject, #copyBody, #btnEditTemplate' },
    placement: 'top'
  },

  // -------- Personalize (Settings at the end) --------
  {
    id: 'open-settings',
    target: '#settingsBtn',
    message: "Personalize Smart Mail: themes, which templates show, and your local templates.",
    prompt: "Open Settings",
    showPromptDelayMs: 1200,
    advance: { type: 'class-on', selector: '#settingsMenu', className: 'open' },
    placement: 'right'
  },
  {
    id: 'theme-item',
    target: ".settings-item[data-item='theme']",
    message: "Themes change the vibe. Try Dark Minimal, Pastell, or Cosmic.",
    prompt: "Open the Theme panel",
    showPromptDelayMs: 1400,
    advance: { type: 'click', selector: ".settings-item[data-item='theme']" },
    placement: 'left'
  },
  {
    id: 'theme-select',
    target: '#themeSelect',
    message: "Pick a theme you like. We’ll remember it.",
    prompt: "Choose a different theme",
    showPromptDelayMs: 1200,
    advance: { type: 'change', selector: '#themeSelect' },
    placement: 'bottom'
  },
  {
    id: 'my-templates-item',
    target: ".settings-item[data-item='usertpls']",
    message: "My Templates: save your own templates on this device.",
    prompt: "Open My Templates",
    showPromptDelayMs: 1200,
    advance: { type: 'click', selector: ".settings-item[data-item='usertpls']" },
    placement: 'left'
  },
  {
    id: 'ut-new',
    target: '#tplNew',
    message: "Click + New to create one. You can export/import them too.",
    prompt: "Click + New (or click Next to skip)",
    showPromptDelayMs: 1500,
    // Let the user skip if they don’t want to create right now.
    advance: { type: 'click-next-or', selector: '#tplNew' },
    placement: 'bottom'
  },
  {
    id: 'done',
    target: 'body',
    message: "You’re set. Explore templates, use Auto Detect, customize themes, and save your own.",
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

function placeBox(box, ring, step){
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 12, SIDE_SAFE = 12, BOTTOM_SAFE = 20;
  const TOP_SAFE = computeTopSafe();

  const bw = box.offsetWidth || 280;
  const bh = box.offsetHeight || 120;

  const r = getTargetRect(step.target);
  if (!r) {
    ring.style.display = 'none';
    const cx = vw / 2, cy = Math.max(TOP_SAFE + bh/2 + 12, vh * 0.45);
    box.style.left = `${cx}px`;
    box.style.top  = `${cy}px`;
    return;
  }

  ring.style.display = (step.target === 'body') ? 'none' : 'block';
  if (ring.style.display !== 'none'){
    const pad = 8;
    Object.assign(ring.style, {
      left:  (r.x - pad) + 'px',
      top:   (r.y - pad) + 'px',
      width: (r.width + pad*2) + 'px',
      height:(r.height + pad*2) + 'px'
    });
  }

  const fits = (x, y) =>
    (x - bw/2 >= SIDE_SAFE) && (x + bw/2 <= vw - SIDE_SAFE) &&
    (y - bh/2 >= TOP_SAFE)   && (y + bh/2 <= vh - BOTTOM_SAFE);

  const posFor = (p) => {
    switch (p) {
      case 'top':    return { x: r.centerX, y: r.y - MARGIN - (bh/2) };
      case 'bottom': return { x: r.centerX, y: r.y + r.height + MARGIN + (bh/2) };
      case 'left':   return { x: r.x - MARGIN - (bw/2), y: r.centerY };
      case 'right':  return { x: r.x + r.width + MARGIN + (bw/2), y: r.centerY };
      case 'center':
      default:       return { x: r.centerX, y: r.centerY };
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
  const scrim = document.createElement('div'); scrim.className='coach-scrim';
  const ring  = document.createElement('div'); ring.className='coach-ring';
  const box   = document.createElement('div'); box.className='coachmark';
  box.innerHTML = `
    <div class="msg"></div>
    <div class="prompt"></div>
    <div class="actions">
      <button class="coach-btn" data-act="prev">Back</button>
      <button class="coach-btn primary" data-act="next">Next</button>
    </div>
  `;
  root.appendChild(scrim);
  root.appendChild(ring);
  root.appendChild(box);

  box.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'prev') prev();
    if (act === 'next') next();
  });

  function render(){
    const s = Steps[state.idx];
    if (!s) return;

    box.querySelector('.msg').textContent = s.message || '';
    const promptEl = box.querySelector('.prompt');
    promptEl.textContent = s.prompt || '';

    // show, but keep invisible until placed to avoid "jump"
    scrim.classList.add('show');
    box.classList.add('show');
    box.style.visibility = 'hidden';

    const tgtEl = (s.target && s.target !== 'body') ? document.querySelector(s.target) : null;
    if (tgtEl) {
      const tr = tgtEl.getBoundingClientRect();
      const outVert = (tr.bottom < 0) || (tr.top > window.innerHeight);
      const outHorz = (tr.right < 0) || (tr.left > window.innerWidth);
      if (outVert || outHorz) {
        try { tgtEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
      }
    }

    const doPlace = () => { placeBox(box, ring, s); box.style.visibility = 'visible'; };
    const settleAfterScroll = () => {
      let t = 0, lastX = window.scrollX, lastY = window.scrollY;
      const tick = () => {
        placeBox(box, ring, s);
        const same = (window.scrollX === lastX && window.scrollY === lastY);
        lastX = window.scrollX; lastY = window.scrollY;
        t += 1;
        if (t < 10 && !same) { requestAnimationFrame(tick); }
      };
      requestAnimationFrame(tick);
    };

    afterFontsReady().then(() => {
      requestAnimationFrame(() => {
        doPlace();
        let handled = false;
        const onScrollEnd = () => { handled = true; placeBox(box, ring, s); window.removeEventListener('scrollend', onScrollEnd); };
        try { window.addEventListener('scrollend', onScrollEnd, { once: true }); } catch {}
        setTimeout(() => { if (!handled) settleAfterScroll(); }, 260);
      });
    });

    // prompt delay
    const delay = (typeof s.showPromptDelayMs === 'number') ? s.showPromptDelayMs : 2000;
    promptEl.classList.remove('breathe');
    if (s.prompt) setTimeout(()=> promptEl.classList.add('breathe'), delay);

    wireAdvance(s);
  }

  // --- Gate wiring / cleanup ---
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
  function onReflow(){ placeBox(box, ring, Steps[state.idx]); }

  function onDocClick(e){
    const s = Steps[state.idx];
    if (s?.advance?.type === 'click' || s?.advance?.type === 'click-next-or'){
      if (s.advance?.type === 'click-next-or' && e.target.closest('[data-act="next"]')) {
        next(); return;
      }
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

    // If the condition is already met when entering the step, advance immediately.
    if (s.advance?.type === 'class-on') {
      const { selector, className } = s.advance;
      const el = document.querySelector(selector);
      if (el && el.classList.contains(className)) { next(); return; }
      pollId = setInterval(()=>{
        const el2 = document.querySelector(selector);
        if (el2 && el2.classList.contains(className)) { clearInterval(pollId); pollId=null; next(); }
      }, 150);
      return;
    }

    if (s.advance?.type === 'click'){
      window.addEventListener('click', onDocClick, true);
      return;
    }
    if (s.advance?.type === 'click-next'){
      // Only buttons handle it
      return;
    }
    if (s.advance?.type === 'click-next-or'){
      // Either click target OR Next button
      window.addEventListener('click', onDocClick, true);
      return;
    }
    if (s.advance?.type === 'input'){
      window.addEventListener('input', onDocInput, true);
      return;
    }
    if (s.advance?.type === 'change'){
      window.addEventListener('change', onDocChange, true);
      return;
    }
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

  window.Tutorial = {
    next, prev,
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

// Start after DOM and initial layout
window.addEventListener('DOMContentLoaded', () => setTimeout(start, 300));

