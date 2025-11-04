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
  if (!settingsMenu) return; // guard
  const willOpen = !settingsMenu.classList.contains('open');
  settingsMenu.classList.toggle('open', willOpen);
  if(!willOpen) closeAllSubs();
  const btn = document.getElementById('settingsBtn');
  if(btn) btn.setAttribute('aria-expanded', String(willOpen));
}
settingsBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMenu(); });

document.addEventListener('click', (e)=>{
  if (!settingsMenu) return; // guard
  if (!settingsMenu.classList.contains('open')) return;
  const inSettings = settingsMenu.contains(e.target);
  const onBtn      = settingsBtn?.contains(e.target);
  const inDialog   = !!e.target.closest('#ut_editor');
  if(!inSettings && !onBtn && !inDialog){
    settingsMenu.classList.remove('open');
    closeAllSubs();
  }
});


  const copySubjectBtn = document.getElementById('copySubject');
  const copyBodyBtn    = document.getElementById('copyBody');
  const clearBtn       = document.getElementById('btnClear');

async function copyText(txt){
  try {
    await navigator.clipboard.writeText(txt);
  } catch (e) {
    console.warn('Clipboard error', e);
  }
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
  if(!txt){ flashBtn(copySubjectBtn, 'Empty'); return; }
  copyText(txt); flashBtn(copySubjectBtn, 'Copied');
});
copyBodyBtn?.addEventListener('click', ()=>{
  const txt = (document.getElementById('outBody')?.textContent || '').trim();
  if(!txt){ flashBtn(copyBodyBtn, 'Empty'); return; }
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

// Local Template editor
const editBtn = document.getElementById('btnEditTemplate');
editBtn?.addEventListener('click', () => {
  const id = window.SELECTED_INTENT;
  if (!id) return alert('Select an intent first.');
  if (window.TplEditor?.open) {
    window.TplEditor.open(id, { onSaved: () => updateOverrideBadge(id) });
  } else {
    alert('Template editor not loaded.');
  }
});

  // NEW: show/hide override badge based on current selection
  function showOverrideBadge(intentId){
    const has = !!window.LocalTemplates?.get?.(intentId);
    const badge = document.getElementById('templateOverrideBadge');
    if (badge) badge.style.display = has ? '' : 'none';
  }
  // try initial paint in case SELECTED_INTENT already set
  if (window.SELECTED_INTENT) showOverrideBadge(window.SELECTED_INTENT);
  // respond to selection changes from elsewhere in the app
  window.addEventListener('intent:changed', (e) => {
    const id = e?.detail?.intentId || window.SELECTED_INTENT;
    if (id) showOverrideBadge(id);
  });
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

