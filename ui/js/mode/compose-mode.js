// Toggle between "compose" typing effect and instant preview.
// Integrates with window.liveState from generate.js (already created).

export function wireComposeModeToggles(){
  const composeToggle = document.getElementById('modeCompose');
  const previewToggle = document.getElementById('modePreview');

  function setMode(compose){
    window.liveState = window.liveState || { compose:false, preview:true, tId:null };
    window.liveState.compose = !!compose;
    window.liveState.preview = !compose;
    document.body.classList.toggle('mode-compose', !!compose);
    document.body.classList.toggle('mode-preview', !compose);
  }

  if (composeToggle) composeToggle.addEventListener('change', e => setMode(!!e.target.checked));
  if (previewToggle) previewToggle.addEventListener('change', e => setMode(!e.target.checked));

  // Initialize from existing state
  setMode(window.liveState?.compose === true);
}
// === Compose Mode (Preview / Type / Off) — idempotent ===
(function(){
  const MODE_KEY = 'sm_compose_mode';

  if (!localStorage.getItem(MODE_KEY) &&
      (localStorage.getItem('sm_live_compose') !== null || localStorage.getItem('sm_live_preview') !== null)) {
    const oldCompose = localStorage.getItem('sm_live_compose');
    const oldPreview = localStorage.getItem('sm_live_preview');
    const mode = (oldPreview === '1') ? 'preview' : (oldCompose === '1') ? 'type' : 'off';
    localStorage.setItem(MODE_KEY, mode);
    localStorage.removeItem('sm_live_compose');
    localStorage.removeItem('sm_live_preview');
  }

  if (typeof window.applyComposeMode !== 'function') {
    window.applyComposeMode = function applyComposeMode(mode){
      mode = (mode === 'preview' || mode === 'type' || mode === 'off') ? mode : 'type';
      localStorage.setItem(MODE_KEY, mode);
      window.setLivePreview?.(mode === 'preview');
      window.setLiveCompose?.(mode === 'type');
      if (window.btnGenerate) window.btnGenerate.style.display = (mode === 'preview') ? 'none' : '';

      const seg = document.getElementById('composeSeg');
      if(seg){
        seg.querySelectorAll('.opt').forEach(b=>{
          b.setAttribute('aria-selected', String(b.dataset.mode === mode));
        });
      }
    };
  }

  if (typeof window.initComposeModeUI !== 'function') {
    window.initComposeModeUI = function initComposeModeUI(){
      const seg = document.getElementById('composeSeg');
      const initial = localStorage.getItem(MODE_KEY) || 'type';
      window.applyComposeMode(initial);
      if(!seg) return;
      seg.querySelectorAll('.opt').forEach(b=>{
        b.setAttribute('aria-selected', String(b.dataset.mode === initial));
      });
      seg.addEventListener('click', (e)=>{
        const b = e.target.closest('.opt');
        if(!b) return;
        window.applyComposeMode(b.dataset.mode);
      });
    };
  }
})();
export function applyComposeMode(mode){ return window.applyComposeMode?.(mode); }
export function initComposeModeUI(){ return window.initComposeModeUI?.(); }


