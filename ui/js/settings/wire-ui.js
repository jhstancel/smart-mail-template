import { initComposeModeUI } from '../mode/compose-mode.js';
import { Starfield } from '../bg/starfield.js';
// Provided globally by grid.js
const buildIntentsChecklist = window.buildIntentsChecklist;
import { buildUserTemplatesUI } from '../usertpl/store.js';

// don’t capture; read from window when needed
const scheduleLiveGenerate = (...args) => window.scheduleLiveGenerate?.(...args);

const PastellPets = window.PastellPets;
const {
  loadGlobalDefaults,
  saveGlobalDefaults,
  clearGlobalDefaults,
  GLOBAL_DEFAULTS
} = window;

function wireSettingsUI() {
  const btnGenerate  = document.getElementById('btnGenerate');

  initComposeModeUI();
  if(btnGenerate){ btnGenerate.style.display = (window.liveState?.preview ? 'none' : ''); }

  document.getElementById('fields')?.addEventListener('input', ()=> scheduleLiveGenerate(250));
  document.getElementById('subject')?.addEventListener('input', ()=> scheduleLiveGenerate(300));
  document.getElementById('hint')?.addEventListener('input',    ()=> scheduleLiveGenerate(300));

  const settingsBtn   = document.querySelector('.settings-btn');
  const settingsMenu  = document.querySelector('.settings-menu');

  // CLICK DELEGATION: open the corresponding subpanel when a row is clicked
  if (settingsMenu && !settingsMenu._wired){
    settingsMenu._wired = true;
    settingsMenu.addEventListener('click', (e)=>{
      const row = e.target.closest('.settings-item');
      if (row && row.dataset.item){
        e.preventDefault();
        e.stopPropagation();
        openOnly(row.dataset.item);
        return;
      }
      // Otherwise, keep clicks inside from closing the menu
      e.stopPropagation();
    });
  }

  const subIntents    = document.getElementById('subIntents'); 
  const subUserTpls   = document.getElementById('subUserTpls');
  const subTheme      = document.getElementById('subTheme');
  const subTyping     = document.getElementById('subTyping');
  const subDefaults   = document.getElementById('subDefaults');
  const themeSelect   = document.getElementById('themeSelect');

  (function fixThemePresetRow(){
    if (!themeSelect) return;
    const row = themeSelect.closest('.settings-row') || (subTheme && subTheme.querySelector('.settings-row'));
    if (!row) return;
    const labelEl = row.querySelector('label'); if (labelEl) labelEl.remove();
    Object.assign(row.style, { display:'block', padding:'0', overflow:'hidden' });
    Object.assign(themeSelect.style, { display:'block', width:'100%', maxWidth:'100%', boxSizing:'border-box', marginTop:'2px', marginBottom:'2px' });
  })();
  (function flattenThemeSubpanel(){
    const subTheme = document.getElementById('subTheme');
    if (!subTheme) return;
    Object.assign(subTheme.style, { background:'transparent', border:'none', boxShadow:'none', padding:'0', marginTop:'6px' });
    const row = subTheme.querySelector('.settings-row'); if (row) row.style.margin = '0';
  })();

  function closeAllSubs(){
    [subTheme, subTyping, subIntents, subUserTpls, subDefaults].forEach(el => el && el.classList.remove('open'));
    document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
  }

  let currentlyOpen = null;

  function openOnly(which){
    if(currentlyOpen === which){
      closeAllSubs(); 
      currentlyOpen = null;
      return;
    }
    closeAllSubs();

    if(which==='theme'     && subTheme)     subTheme.classList.add('open');
    if(which==='typing'    && subTyping)    subTyping.classList.add('open');
    if(which==='intents'   && subIntents) { 
      subIntents.classList.add('open');  
      buildIntentsChecklist?.(); 
    }
    if(which==='usertpls'  && subUserTpls){ 
      subUserTpls.classList.add('open'); 
      buildUserTemplatesUI?.(); 
    }
    if(which==='defaults'  && subDefaults)  subDefaults.classList.add('open');

    const menu = (document.querySelector('.settings-menu') || null);
    if (menu){
      const header = menu.querySelector(`.settings-item[data-item="${which}"]`);
      if (header) requestAnimationFrame(()=> menu.scrollTo({ top: header.offsetTop - 6, behavior: 'smooth' }));
    }

    currentlyOpen = which;

    document.querySelectorAll('.settings-item').forEach(row=>{
      const chev = row.querySelector('.chev');
      if(!chev) return;
      chev.classList.toggle('rot90', row.getAttribute('data-item')===which);
    });
  }
  window.openOnly = openOnly;

  function toggleMenu(){
    const willOpen = !settingsMenu.classList.contains('open');
    settingsMenu.classList.toggle('open', willOpen);
    if(!willOpen) closeAllSubs();
    const btn = document.getElementById('settingsBtn');
    if(btn) btn.setAttribute('aria-expanded', String(willOpen));
  }
  settingsBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMenu(); });

// ---- Toggleable main-screen search bar (Theme/UI) ----
(function(){
  const PREF_KEY = 'ui.showFrontSearch';

  function ensureToggleRow(){
    const menu = document.getElementById('settingsMenu');
    if (!menu || document.getElementById('toggleFrontSearch')) return;

    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <label style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="toggleFrontSearch" />
        <span>Show search bar on main screen</span>
      </label>
    `;
    // insert near top of menu
    menu.insertBefore(row, menu.firstChild);
    const cb = row.querySelector('#toggleFrontSearch');
    cb.checked = localStorage.getItem(PREF_KEY) === '1';
    cb.addEventListener('change', ()=>{
      localStorage.setItem(PREF_KEY, cb.checked ? '1' : '0');
      applyFrontSearch(cb.checked);
    });
  }

  function applyFrontSearch(on){
    const host = document.getElementById('intents'); // container above the grid
    if (!host) return;
    let wrap = document.getElementById('gridSearchWrap');

    if (on){
      if (!wrap){
        wrap = document.createElement('div');
        wrap.id = 'gridSearchWrap';
        wrap.innerHTML = `<input id="gridSearchInput" type="search" placeholder="Search intents…" autocomplete="off" />`;
        host.parentNode.insertBefore(wrap, host); // place above grid
        const input = wrap.querySelector('#gridSearchInput');
        let t = null;
        input.addEventListener('input', ()=>{
          clearTimeout(t);
          t = setTimeout(()=> window.filterIntentGrid?.(input.value), 120);
        });
        // ESC clears
        input.addEventListener('keydown', (e)=>{
          if (e.key === 'Escape'){ input.value=''; window.filterIntentGrid?.(''); }
        });
      }
    } else {
      if (wrap){ wrap.remove(); window.filterIntentGrid?.(''); }
    }
  }

  // Run once settings open (or immediately if menu exists)
  const tryInit = ()=>{
    ensureToggleRow();
    applyFrontSearch(localStorage.getItem(PREF_KEY) === '1');
  };
  // If your settings opens via a button, you might emit an event; else just run now:
  document.addEventListener('DOMContentLoaded', tryInit);
  // Also try again when the gear is clicked (in case menu mounts late)
  document.getElementById('settingsBtn')?.addEventListener('click', tryInit);
})();

document.addEventListener('click', (e)=>{
  if(!settingsMenu.classList.contains('open')) return;
  const inSettings = settingsMenu.contains(e.target);
  const onBtn      = settingsBtn?.contains(e.target);
const inDialog   = !!(e.target.closest('#ut_editor') || e.target.closest('#tplEditor'));
const anyEditorOpen = !!(window.__tplEditorOpen || window.__utEditorOpen);
if(!inSettings && !onBtn && !inDialog && !anyEditorOpen){
  settingsMenu.classList.remove('open');
  closeAllSubs();
}

});

  const THEME_KEY = 'sm_theme';
  const saved = localStorage.getItem(THEME_KEY);
  if(saved){ document.body.dataset.theme = saved; }
  if(themeSelect){ themeSelect.value = document.body.dataset.theme || 'light-minimal'; }

themeSelect?.addEventListener('change', ()=>{
  const val = themeSelect.value || 'light-minimal';
  document.body.dataset.theme = val;
  localStorage.setItem(THEME_KEY, val);
  if(val==='cosmic') Starfield.start(); else Starfield.stop();
  if(val==='pastell') PastellPets.enable(); else PastellPets.disable();
});

/* ---- Local Template Editor + Override badge (non-invasive) ---- */
const editBtn = document.getElementById('btnEditTemplate');
function updateOverrideBadge(intentId){
  // Hide badge for user templates; show only when a server intent has a local override
  const has = !/^u:/.test(intentId) && !!window.LocalTemplates?.get?.(intentId);
  const badge = document.getElementById('templateOverrideBadge');
  if (badge) badge.style.display = has ? '' : 'none';
}
editBtn?.addEventListener('click', ()=>{
  const id = window.SELECTED_INTENT;
  if (!id) return alert('Select an intent first.');

  // For custom user templates, open the dedicated User Template editor
  if (id.startsWith('u:')) {
    const def = window.UserTemplates?.getById?.(id);
    if (!def) {
      alert('This user template was not found.');
      return;
    }
    window.openEditor?.('edit', def); // provided by editor-dialog.js
    return;
  }

  // For normal/server intents, open the local-override editor
  if (window.TplEditor?.open) {
    window.TplEditor.open(id, { onSaved: () => updateOverrideBadge(id) });
  } else if (window.LocalTemplates?.quickEdit) {
    // fallback to prompt()-based editor if modal isn’t loaded
    window.LocalTemplates.quickEdit(id);
    updateOverrideBadge(id);
  } else {
    alert('Template editor not available.');
  }
});
if (window.SELECTED_INTENT) updateOverrideBadge(window.SELECTED_INTENT);
window.addEventListener('intent:changed', (e)=>{
  const id = e?.detail?.intentId || window.SELECTED_INTENT;
  if (id) updateOverrideBadge(id);
});
/* ---- end local templates block ---- */
// Keep "Visible Intents" panel in sync when user templates change
window.addEventListener('usertpl:saved', () => {
  // Only rebuild if the panel is actually open (cheap no-op otherwise)
  const panel = document.getElementById('subIntents');
  if (panel?.classList.contains('open')) {
    buildIntentsChecklist?.(); // re-render list + checkboxes
  }
});
window.addEventListener('usertpl:deleted', () => {
  const panel = document.getElementById('subIntents');
  if (panel?.classList.contains('open')) {
    buildIntentsChecklist?.();
  }
});
  const copySubjectBtn = document.getElementById('copySubject');
  const copyBodyBtn    = document.getElementById('copyBody');
  const clearBtn       = document.getElementById('btnClear');

  async function copyText(txt){
    try{ await navigator.clipboard.writeText(txt); }catch(e){ console.warn('Clipboard error', e); }
  }
  function flashBtn(btn, msg){
    if(!btn) return;
    const old = btn.textContent;
    btn.textContent = msg;
    btn.classList.add('toast');
    setTimeout(()=>{ btn.classList.remove('toast'); btn.textContent = old; }, 900);
  }

  copySubjectBtn?.addEventListener('click', ()=>{
    const txt = (document.getElementById('outSubject')?.textContent || '').trim();
    if(!txt){ flashBtn(copySubjectBtn, 'Copied'); return; }
    copyText(txt); flashBtn(copySubjectBtn, 'Copied');
  });
  copyBodyBtn?.addEventListener('click', ()=>{
    const txt = (document.getElementById('outBody')?.textContent || '').trim();
    if(!txt){ flashBtn(copyBodyBtn, 'Copied'); return; }
    copyText(txt); flashBtn(copyBodyBtn, 'Copied');
  });
  clearBtn?.addEventListener('click', ()=>{
    const outSubject = document.getElementById('outSubject');
    const outBody = document.getElementById('outBody');
    if(outSubject) outSubject.textContent = '';
    if(outBody)    outBody.textContent = '';
    document.querySelectorAll('#fields input, #fields select, #fields textarea').forEach(i=> i.value = '');
    flashBtn(clearBtn, 'Cleared');
  });

  loadGlobalDefaults();
  const gAddr  = document.getElementById('g_shipAddress');
  const gSave  = document.getElementById('g_save');
  const gApply = document.getElementById('g_apply');
  const gClear = document.getElementById('g_clear');

  function captureDefaultsFromUI(){ GLOBAL_DEFAULTS.shipAddress  = (gAddr?.value || '').trim(); }

  gApply?.addEventListener('click', ()=>{
    captureDefaultsFromUI();
    if(gSave?.checked) saveGlobalDefaults();
    if(window.SELECTED_INTENT){ window.renderFields?.(window.SELECTED_INTENT); }
  });
  gClear?.addEventListener('click', ()=>{
    const persist = !!gSave?.checked;
    clearGlobalDefaults(persist);
    if(window.SELECTED_INTENT){ window.renderFields?.(window.SELECTED_INTENT); }
  });
} // ← close function wireSettingsUI

// ensure public API for settings panel
if (!window.scheduleLiveGenerate) window.scheduleLiveGenerate = scheduleLiveGenerate;
window.wireSettingsUI = wireSettingsUI;

// Ensure settings lives at <body> level so fixed positioning is truly viewport-relative
addEventListener('DOMContentLoaded', () => {
  const gear = document.querySelector('.settings');
  if (gear && gear.parentElement !== document.body) {
    document.body.appendChild(gear);
  }
});
// ---- descriptions setting ----
const DESC_KEY = 'ui.descriptions'; // 'on' | 'off'
function applyDescriptions(on) {
  document.documentElement.classList.toggle('no-desc', !on);
  localStorage.setItem(DESC_KEY, on ? 'on' : 'off');
  const cb = document.getElementById('opt_desc');
  if (cb) cb.checked = on;
}
(function initDescriptions(){
  const saved = localStorage.getItem(DESC_KEY);
  const on = (saved == null) ? true : (saved === 'on');
  applyDescriptions(on);
  document.getElementById('opt_desc')?.addEventListener('change', e => {
    applyDescriptions(!!e.target.checked);
  });
})();
// Simple toast
window.showToast = window.showToast || function (msg, ms = 1400) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position: fixed; right: 16px; bottom: 16px; z-index: 9999;
    background: rgba(0,0,0,.8); color: #fff; padding: 8px 12px;
    border-radius: 10px; font-size: 13px; opacity: 0; transform: translateY(6px);
    transition: opacity .18s ease, transform .18s ease; pointer-events: none;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateY(6px)';
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, ms);
};

// Show toast when user templates change
window.addEventListener('usertpl:saved',   () => window.showToast?.('Saved!'));
window.addEventListener('usertpl:deleted', () => window.showToast?.('Deleted'));
// ---- NEW: Select-All + multi Export / Import ----






// ---- My Templates Export Mode (inside Settings) ----
(function(){
  const btn = document.getElementById('btnExportUserTemplates');
  const btnCancel = document.getElementById('btnCancelUserTplExport');
  const panel = document.getElementById('subUserTpls');
  const settingsRoot = document.getElementById('settings'); // outer settings container (gear)
  if (!btn || !panel) return;

  function clearPicks(){
    window.__utExportSelection?.clear?.();
    document.querySelectorAll('#subUserTpls .tpl-card.ut-picked').forEach(el=> el.classList.remove('ut-picked'));
  }

  function setMode(on){
    window.__utExportMode = !!on;
    if (on && !window.__utExportSelection) window.__utExportSelection = new Set();
    panel.classList.toggle('ut-export-mode', !!on);
    btn.classList.toggle('accent', !!on);
    if (btnCancel) btnCancel.style.display = on ? 'inline-block' : 'none';
    updateLabel();
  }

  function updateLabel(count){
    const n = (typeof count === 'number') ? count : (window.__utExportSelection?.size || 0);
    if (window.__utExportMode) {
      btn.textContent = n > 0 ? `Confirm Export (${n})` : 'Confirm Export';
      btn.title = n > 0 ? 'Export selected local templates' : 'Select one or more local templates below';
    } else {
      btn.textContent = 'Export (.zip)';
      btn.title = 'Click to select templates below for export';
    }
  }

  // selection count from store.js
  window.addEventListener('ut-export:selection-changed', (e)=> updateLabel(e?.detail?.count));

  // ESC cancels
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && window.__utExportMode) {
      setMode(false);
      clearPicks();
      window.showToast?.('Export canceled');
    }
  });

  // Cancel button
  btnCancel?.addEventListener('click', ()=>{
    if (!window.__utExportMode) return;
    setMode(false);
    clearPicks();
    window.showToast?.('Export canceled');
  });

  // Auto-exit if Settings closes or if My Templates panel is not visible
  document.addEventListener('click', ()=>{
    if (!window.__utExportMode) return;
    // settingsRoot present and not expanded OR panel hidden → exit
    const settingsOpen = !!document.getElementById('settingsMenu')?.offsetParent || !!settingsRoot?.classList?.contains?.('open') || !!settingsRoot?.getAttribute?.('data-open');
    const panelVisible = !!panel?.offsetParent;
    if (!settingsOpen || !panelVisible) {
      setMode(false);
      clearPicks();
    }
  }, true);

  // Export / Confirm
  btn.addEventListener('click', async ()=>{
    if (!window.__utExportMode) {
      setMode(true);
      window.showToast?.('Export mode: click local templates to select (ESC or Cancel to exit)');
      return;
    }

    const ids = Array.from(window.__utExportSelection || []);
    if (!ids.length) { window.showToast?.('Pick at least 1 template'); return; }

    try{
      const all = window.loadUserTemplates?.() || [];
      const items = all.filter(t => ids.includes(t.id));
      if (!items.length) { window.showToast?.('Nothing to export'); return; }

      if(typeof JSZip==='undefined'){ alert('JSZip missing'); return; }
      const zip = new JSZip();
      for(const t of items){
        const safe = (t.id||'template').replace(/[^\w.-]+/g,'_');
        zip.file(`${safe}.json`, JSON.stringify(t, null, 2));
      }
      const blob = await zip.generateAsync({ type:'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `user-templates-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);

      window.showToast?.(`Exported ${items.length} template(s)`);
      setMode(false);
      clearPicks();
    }catch(e){
      alert('Export failed: '+e.message);
    }
  });

  updateLabel();
})();










// ---- Import (unchanged: supports .zip or multiple .json) ----
document.getElementById('btnImportUserTemplates')?.addEventListener('click', async () => {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,.zip,application/zip';
    input.multiple = true;
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      let importedCount = 0;

      for (const f of files) {
        const name = (f.name || '').toLowerCase();

        if (name.endsWith('.zip')) {
          if (typeof JSZip === 'undefined') {
            alert('JSZip not loaded; cannot import .zip');
            continue;
          }
          const zip = await JSZip.loadAsync(f);
          const entries = Object.values(zip.files).filter(zf => !zf.dir && zf.name.toLowerCase().endsWith('.json'));
          for (const zf of entries) {
            const txt = await zf.async('string');
            await window.importUserTemplatesFromJSON?.(txt, { filenameHint: zf.name });
            importedCount++;
          }
          continue;
        }

        if (name.endsWith('.json')) {
          const txt = await f.text();
          await window.importUserTemplatesFromJSON?.(txt, { filenameHint: f.name });
          importedCount++;
        }
      }

      window.showToast?.(`Imported ${importedCount} file(s)`);
    }, { once: true });
    input.click();
  } catch (e) {
    alert('Import failed: ' + e.message);
  }
});

