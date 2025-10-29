// Entry point for the modular UI. Loaded by ui/app.js (legacy shim) or directly via index.html (type=module).

import './guards/intents-guard.js';

// Utils
import { $, on } from './utils/dom.js';

// State
import { loadVisibleIntents } from './state/visible-intents.js';

// Defaults
import { loadGlobalDefaults } from './defaults/global-defaults.js';

// Intent grid + settings checklist
import { renderIntentGridFromData, buildIntentsChecklist } from './intents/grid.js';

// Fields + Generate
import { renderFields } from './fields/render-fields.js';
import { scheduleLiveGenerate } from './generate/generate.js';

// Mode
import { wireComposeModeToggles } from './mode/compose-mode.js';

// Settings panel
import { wireSettingsUI } from './settings/wire-ui.js';

// Parts editor
import { initOrderPartsEditor } from './parts/order-parts-editor.js';

// User templates
import './usertpl/store.js';
import './usertpl/editor-dialog.js';

// Background effects (safe to import; they no-op if not used)
import '../../js/bg/starfield.js';
import '../../js/bg/pastell-pets.js';

// Autodetect chips (no-op if stage not present)
import './autodetect/suggest.js';

// --- Boot ---
on(document, 'DOMContentLoaded', () => {
  // Load persisted defaults into inputs
  loadGlobalDefaults();

  // Ensure visible intents set exists (read-only if not present)
  loadVisibleIntents();

  // Render grid (uses window.INTENTS if already present; safe to call early)
  if (Array.isArray(window.INTENTS)) {
    renderIntentGridFromData(window.INTENTS);
    buildIntentsChecklist();
  }

  // First render: no intent selected
  renderFields(null);

  // Wire UI
  wireComposeModeToggles();
  wireSettingsUI();
  initOrderPartsEditor();

  // Gentle initial live preview attempt (debounced)
  scheduleLiveGenerate(300);
});
// === Live state + typewriter + debounced generate (idempotent) ===
(function(){
  if (!window.liveState) window.liveState = { compose:false, preview:true, tId:null };

  if (typeof window.setLiveCompose !== 'function') {
    window.setLiveCompose = v => { window.liveState.compose = !!v; };
  }
  if (typeof window.setLivePreview !== 'function') {
    window.setLivePreview = v => { window.liveState.preview = !!v; };
  }
  if (typeof window.typeInto !== 'function') {
    window.typeInto = async function typeInto(el, text){
      if(!el){ return; }
      el.textContent = '';
      const CHUNK = 3;
      for (let i = 0; i < text.length; i += CHUNK){
        const end = Math.min(i + CHUNK, text.length);
        el.textContent = text.slice(0, end);
        await new Promise(r => setTimeout(r, 8));
      }
      el.textContent = text;
    };
  }
  if (typeof window.scheduleLiveGenerate !== 'function') {
    window.scheduleLiveGenerate = function scheduleLiveGenerate(delayMs=200){
      if(!window.liveState.preview) return;
      clearTimeout(window.liveState.tId);
      window.liveState.tId = setTimeout(()=> window.doGenerate && window.doGenerate(), delayMs);
    };
  }
})();
/* =========================================================================================
 * Init (modernized for YAML schema)
 * =======================================================================================*/
(function(){
  if (window.__appInit__) return; // guard against double init
  window.__appInit__ = true;

  (async function init(){
    document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') || 'light-minimal');
    if(document.body.dataset.theme === 'cosmic') Starfield.start();

    try {
      // Fetch generated schema
      const schemaRes = await fetch('/schema');
      if (!schemaRes.ok) throw new Error('Failed to load schema');
      window.SCHEMA = await schemaRes.json();

      // Fetch compact intent list for cards
      const intentsRes = await fetch('/intents');
      if (!intentsRes.ok) throw new Error('Failed to load intents');
      const data = await intentsRes.json();

      // Render cards dynamically from schema/intents
      let nextIntents = [];
      if (Array.isArray(data) && data.length) {
        nextIntents = data.map(x => ({
          name: x.id || x.name,
          label: x.label || (x.id ? toTitle(x.id) : ''),
          description: SCHEMA[x.id || x.name]?.description || '',
          required: SCHEMA[x.id || x.name]?.required || [],
          hidden: false
        }));
        // Put Auto Detect first
        nextIntents.sort((a, b) =>
          (a.name === 'auto_detect' ? -1 : b.name === 'auto_detect' ? 1 : (a.label||'').localeCompare(b.label||'')));
      } else {
        // No /intents endpoint or empty → build from schema directly
        nextIntents = Object.keys(SCHEMA).map(k => ({
          name: k,
          label: SCHEMA[k].label || toTitle(k),
          description: SCHEMA[k].description || '',
          required: SCHEMA[k].required || [],
          hidden: false
        }));
        nextIntents.sort((a, b) =>
          (a.name === 'auto_detect' ? -1 : b.name === 'auto_detect' ? 1 : (a.label||'').localeCompare(b.label||'')));
      }

      // --- Merge local templates (My Templates) ---
      const coreIntents  = nextIntents;
      const localIntents = (typeof userTemplatesAsIntents === 'function') ? userTemplatesAsIntents() : [];
      const merged = [...coreIntents, ...localIntents];

      // Respect the INTENTS write-guard
      if (typeof window.setINTENTSFromHydrator === 'function') {
        window.setINTENTSFromHydrator(merged);
      } else {
        // fallback if guard not present
        window.INTENTS = merged;
      }

      renderIntentGridFromData(window.INTENTS);
      buildIntentsChecklist?.();
      buildUserTemplatesUI?.(); // populate the My Templates list
      window.scheduleAutodetect?.();

    } catch (err) {
      console.error('Error initializing schema/intents:', err);
      if (intentGrid) intentGrid.innerHTML = '<div class="muted">Failed to load schema.</div>';
    }

    if (fieldsHint) fieldsHint.textContent = ''; // invisible by design
  })();
})();

