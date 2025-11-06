// ui/js/tutorial/coachmarks.js
// Lightweight coachmarks/text-box tutorial. No orb, no intro scene.
// Behavior: show description; after 2s reveal a small "breathing" prompt.
// Advances when the requested user action occurs.

const LS_STAGE = 'tutorial.stage';
const LS_SEEN  = 'tutorial.seen'; // not used yet, but reserved

const Steps = [
  {
    id: 'welcome',
    target: 'body',
    message: "Quick tour: I’ll point to things, then you’ll try them. Short and sweet.",
    prompt: "Click Next to begin",
    advance: { type: 'click-next' },
    placement: 'center'
  },
  {
    id: 'open-settings',
    target: '#settingsBtn',
    message: "Settings: themes, visible intents, and local templates live here.",
    prompt: "Open the Settings menu",
    showPromptDelayMs: 1800,
    advance: {
      type: 'class-on',
      selector: '#settingsMenu',
      className: 'open'
    },
    placement: 'right'
  },
  {
    id: 'new-user-template',
    // Note: this button exists inside My Templates subpanel
    target: '#tplNew',
    message: "Create a local-only template you can edit and export.",
    prompt: "Open Settings → My Templates, then click “+ New”",
    showPromptDelayMs: 2200,
    advance: { type: 'click', selector: '#tplNew' },
    placement: 'bottom',
  },
  {
    id: 'choose-intent',
    target: '.intent-card',
    message: "Intents are schema-backed templates. Picking one reveals its Fields.",
    prompt: "Click any intent card",
    showPromptDelayMs: 1600,
    advance: { type: 'click', selector: '.intent-card' },
    placement: 'top'
  },
  {
    id: 'generate',
    target: '#btnGenerate',
    message: "Use your filled Fields to render a draft subject and body.",
    prompt: "Click Generate",
    showPromptDelayMs: 1400,
    advance: { type: 'click', selector: '#btnGenerate' },
    placement: 'left'
  },
  {
    id: 'export-templates',
    target: '#btnExportUserTemplates',
    message: "Export your local templates as a .zip to back up or share.",
    prompt: "Open Settings → My Templates, then click Export",
    showPromptDelayMs: 2200,
    advance: { type: 'click', selector: '#btnExportUserTemplates' },
    placement: 'left'
  },
  {
    id: 'done',
    target: 'body',
    message: "All set. You can restart this tutorial anytime.",
    prompt: "Click Finish",
    advance: { type: 'click-next' },
    placement: 'center'
  }
];

const root = document.getElementById('tutorialRoot') || (()=> {
  const div = document.createElement('div'); div.id='tutorialRoot'; document.body.appendChild(div); return div;
})();

let state = {
  idx: Number(localStorage.getItem(LS_STAGE) || 0),
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
  return {
    x: r.left, y: r.top, width: r.width, height: r.height,
    centerX: r.left + r.width/2, centerY: r.top + r.height/2
  };
}

function placeBox(box, ring, step){
  const r = getTargetRect(step.target);
  if (!r) {
    // center on screen if target missing
    box.style.left = `${window.innerWidth / 2}px`;
    box.style.top  = `${Math.max(80, window.innerHeight * 0.35)}px`;
    ring.style.display = 'none';
    return;
  }
  // basic ring
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

  // placement: top/right/left/bottom/center
  let x = r.centerX, y = r.y;
  switch(step.placement){
    case 'top':    y = r.y - 10; break;
    case 'bottom': y = r.y + r.height + 16; break;
    case 'left':   x = r.x - 12; y = r.centerY; box.style.transform = 'translate(-100%, -50%)'; break;
    case 'right':  x = r.x + r.width + 12; y = r.centerY; box.style.transform = 'translate(0, -50%)'; break;
    case 'center':
    default:
      x = r.centerX; y = Math.max(80, r.centerY - r.height/2);
      box.style.transform = 'translate(-50%, -50%)';
      break;
  }
  if (!['left','right','center'].includes(step.placement)) {
    box.style.transform = 'translate(-50%, -100%)';
  }

  box.style.left = `${x}px`;
  box.style.top  = `${y}px`;
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

  // close prompt on scrim click moves to next (only when click-next step)
  scrim.addEventListener('click', () => {
    const s = Steps[state.idx];
    if (s?.advance?.type === 'click-next') next();
  });

  // actions
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

    // content
    box.querySelector('.msg').textContent = s.message || '';
    const promptEl = box.querySelector('.prompt');
    promptEl.textContent = s.prompt || '';

    // on-screen
    placeBox(box, ring, s);
    requestAnimationFrame(()=>{
      scrim.classList.add('show');
      box.classList.add('show');
    });

    // prompt delay
    const delay = (typeof s.showPromptDelayMs === 'number') ? s.showPromptDelayMs : 2000;
    promptEl.classList.remove('breathe');
    if (s.prompt) {
      setTimeout(()=> promptEl.classList.add('breathe'), delay);
    } else {
      promptEl.classList.remove('breathe');
    }

    // advance conditions
    wireAdvance(s);
  }

  function cleanupAdvance(){
    window.removeEventListener('click', onDocClick, true);
    window.removeEventListener('resize', onReflow);
    window.removeEventListener('scroll', onReflow, true);
    clearInterval(pollId); pollId = null;
  }

  let pollId = null;
  function onReflow(){ placeBox(box, ring, Steps[state.idx]); }
  function onDocClick(e){
    const s = Steps[state.idx];
    if (s?.advance?.type === 'click'){
      if (e.target.closest(s.advance.selector)) {
        next();
      }
    }
  }

  function wireAdvance(s){
    cleanupAdvance();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);

    if (s.advance?.type === 'click'){
      window.addEventListener('click', onDocClick, true);
      return;
    }
    if (s.advance?.type === 'click-next'){
      // nothing; buttons handle it
      return;
    }
    if (s.advance?.type === 'class-on'){
      // poll for class presence (e.g., Settings menu open)
      const { selector, className } = s.advance;
      pollId = setInterval(()=>{
        const el = document.querySelector(selector);
        if (el && el.classList.contains(className)) {
          next();
        }
      }, 150);
    }
  }

  function next(){
    cleanupAdvance();
    state.idx = clampIdx(state.idx + 1);
    saveIdx();
    render();
  }

  function prev(){
    cleanupAdvance();
    state.idx = clampIdx(state.idx - 1);
    saveIdx();
    render();
  }

  // public API
  window.Tutorial = {
    next, prev,
    reset(){
      cleanupAdvance();
      state.idx = 0;
      saveIdx();
      render();
    },
    jumpTo(id){
      const i = Steps.findIndex(s => s.id === id);
      if (i >= 0) { state.idx = i; saveIdx(); render(); }
    }
  };

  render();
}

function start(){
  if (state.mounted) return;
  state.mounted = true;
  makeUI();
}

// Autostart once DOM is ready (but give grid.js time to render cards)
window.addEventListener('DOMContentLoaded', () => {
  // Defer a bit so settings/grid build is ready for target measures
  setTimeout(start, 300);
});

