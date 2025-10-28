// ui/settings.js
(function (global) {
  const Settings = global.Settings || {};

  // --- Storage key (keep name stable to preserve user prefs) ---
const STORAGE_KEYS = {
  visibleIntents: 'sm_visible_intents_v1'
};

  // Load the user's visible intents as a Set<string>
  function loadVisibleIntents(){
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.visibleIntents);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_e) {
      return new Set();
    }
  }

  // Save visible intents from Set<string> or string[]
  function saveVisibleIntents(list){
    try {
      const arr = Array.isArray(list) ? list : Array.from(list || []);
      localStorage.setItem(STORAGE_KEYS.visibleIntents, JSON.stringify(arr));
    } catch (_e) {
      /* no-op */
    }
  }

  // Keep existing placeholders for the others (we'll move them later)
  Settings.loadVisibleIntents = loadVisibleIntents;
  Settings.saveVisibleIntents = saveVisibleIntents;
  Settings.openOnly = Settings.openOnly || function(){};
  Settings.buildIntentsChecklist = Settings.buildIntentsChecklist || function(){};

  global.Settings = Settings;
})(window);








// -- Settings panel open/close (self-contained) --
(function attachOpenOnly(global){
  // local helpers
  function q(id){ return document.getElementById(id); }
  function closeAllSubs(){
    ['subTheme','subTyping','subIntents','subUserTpls','subDefaults']
      .map(q).forEach(el => el && el.classList.remove('open'));
    document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
  }

  function openOnly(which){
    const subTheme   = q('subTheme');
    const subTyping  = q('subTyping');
    const subIntents = q('subIntents');
    const subUserTpls= q('subUserTpls');
    const subDefaults= q('subDefaults');

    // toggle behavior based on a single global we control
    const current = global.currentlyOpen || null;
    if (current === which){
      closeAllSubs();
      global.currentlyOpen = null;
      return;
    }

    closeAllSubs();
    if (which==='theme'    && subTheme)    subTheme.classList.add('open');
    if (which==='typing'   && subTyping)   subTyping.classList.add('open');
    if (which==='intents'  && subIntents){ subIntents.classList.add('open'); (global.Settings?.buildIntentsChecklist||(()=>{}))(); }
    if (which==='usertpls' && subUserTpls){ subUserTpls.classList.add('open'); (global.Settings?.buildUserTemplatesUI||global.buildUserTemplatesUI||(()=>{}))(); }
    if (which==='defaults' && subDefaults) subDefaults.classList.add('open');

    const opened = (
      which==='theme'    ? subTheme   :
      which==='typing'   ? subTyping  :
      which==='intents'  ? subIntents :
      which==='usertpls' ? subUserTpls:
      which==='defaults' ? subDefaults: null
    );
    const menu = opened?.closest('.settings-menu');
    if (menu){
      const header = menu.querySelector(`.settings-item[data-item="${which}"]`);
      requestAnimationFrame(()=>{
        if (header) menu.scrollTo({ top: header.offsetTop - 6, behavior: 'smooth' });
      });
    }

    global.currentlyOpen = which;

    document.querySelectorAll('.settings-item').forEach(row=>{
      const chev = row.querySelector('.chev');
      if(!chev) return;
      chev.classList.toggle('rot90', row.getAttribute('data-item')===which);
    });
  }

  (global.Settings = global.Settings || {}).openOnly = openOnly;
})(window);















// -- Settings initialization and menu wiring (moved from app.js) --
(function initSettings(global){
  const Settings = global.Settings || (global.Settings = {});

  function init(){
    // == Grab UI elements ==
    const btn = document.getElementById('btnSettings');
    const menu = document.getElementById('settingsMenu');
    if(!btn || !menu) return;

    // == Wire toggle button ==
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
      if(menu.classList.contains('open')){
        Settings.openOnly(global.currentlyOpen || 'theme');
      } else {
        document.querySelectorAll('.settings-item .chev').forEach(c=>c.classList.remove('rot90'));
      }
    });

    // == Each sidebar item ==
    document.querySelectorAll('.settings-item').forEach(row=>{
      row.addEventListener('click', () => {
        const which = row.getAttribute('data-item');
        Settings.openOnly(which);
      });
    });

    // == Escape key closes settings ==
    document.addEventListener('keydown', (e)=>{
      if(e.key==='Escape'){
        menu.classList.remove('open');
        document.querySelectorAll('.settings-item .chev').forEach(c=>c.classList.remove('rot90'));
        global.currentlyOpen = null;
      }
    });
  }

  Settings.init = init;
})(window);





(function attachBuildIntentsChecklist(global){
  const Settings = global.Settings || (global.Settings = {});
  const loadVisibleIntents = Settings.loadVisibleIntents;
  const saveVisibleIntents = Settings.saveVisibleIntents;

  // Helper: safe description (prefer /intents payload; fallback to SCHEMA)
  function getDescription(it){
    const d = it?.description;
    if (d) return d;
    try {
      const meta = (global.SCHEMA && (global.SCHEMA[it.id] || global.SCHEMA[it.name])) || null;
      return (meta && meta.description) || '';
    } catch { return ''; }
  }

  // Helper: industry with fallbacks
  function getIndustry(it){
    if (it?.industry) return it.industry;
    try {
      const meta = (global.SCHEMA && (global.SCHEMA[it.id] || global.SCHEMA[it.name])) || null;
      return (meta && meta.industry) || 'Other';
    } catch { return 'Other'; }
  }

  function buildIntentsChecklist(){
    const box = document.getElementById('intentChecks');
    if (!box) return;

    const vi = loadVisibleIntents();                 // Set<string> of ids
    const list = Array.isArray(global.INTENTS) ? global.INTENTS.slice() : [];

    // Group by industry (stable order)
    const groups = new Map();
    for (const it of list){
      // Normalize shape: prefer `id` (backend) but handle older `name`
      const id = it.id || it.name;
      const label = it.label || id;
      const industry = getIndustry(it);
      const desc = getDescription(it);

      const norm = { id, label, industry, description: desc };
      if (!groups.has(industry)) groups.set(industry, []);
      groups.get(industry).push(norm);
    }

    // Render
    box.innerHTML = '';
    for (const [group, items] of groups){
      // Section header
      const h = document.createElement('div');
      h.className = 'vi-section-title';
      h.textContent = group;
      box.appendChild(h);

      // Items
      items.sort((a,b)=>a.label.localeCompare(b.label));
      for (const it of items){
        const row = document.createElement('div');
        row.className = 'kv';

        const id = `vi_${it.id}`;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;

        // Default state (first run): keep Auto Detect and Delay Notice visible
        const defaultOn = (it.id === 'auto_detect' || it.id === 'delay_notice');
        cb.checked = vi.size ? vi.has(it.id) : defaultOn;

        const label = document.createElement('label');
        label.htmlFor = id;
        label.innerHTML = `<b>${it.label}</b>${it.description ? `<div class="muted">${it.description}</div>` : ''}`;

        // LIVE UPDATE: save + re-render grid immediately on toggle
        cb.addEventListener('change', ()=>{
          if (cb.checked) vi.add(it.id); else vi.delete(it.id);
          saveVisibleIntents(vi);
          if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
            global.renderIntentGridFromData(global.INTENTS);
          }
        });

        row.appendChild(cb);
        row.appendChild(label);
        box.appendChild(row);
      }
    }

    // Footer buttons
    const btnSave  = document.getElementById('vi_save');
    const btnAll   = document.getElementById('vi_all');
    const btnNone  = document.getElementById('vi_none');
    const btnReset = document.getElementById('vi_reset');

    // “Save” is now optional (toggling already saves), but keep it
    btnSave && btnSave.addEventListener('click', ()=>{
      saveVisibleIntents(vi);
      if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
        global.renderIntentGridFromData(global.INTENTS);
      }
    });

    btnAll && btnAll.addEventListener('click', ()=>{
      (global.INTENTS || []).forEach(it => vi.add(it.id || it.name));
      saveVisibleIntents(vi);
      // reflect UI and grid
      box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
      if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
        global.renderIntentGridFromData(global.INTENTS);
      }
    });

    btnNone && btnNone.addEventListener('click', ()=>{
      vi.clear();
      saveVisibleIntents(vi);
      box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
      if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
        global.renderIntentGridFromData(global.INTENTS);
      }
    });

    btnReset && btnReset.addEventListener('click', ()=>{
      vi.clear(); vi.add('auto_detect'); vi.add('delay_notice');
      saveVisibleIntents(vi);
      box.querySelectorAll('input[type=checkbox]').forEach(cb => {
        const id = cb.id.replace(/^vi_/,'');
        cb.checked = vi.has(id);
      });
      if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
        global.renderIntentGridFromData(global.INTENTS);
      }
    });
  }

  Settings.buildIntentsChecklist = buildIntentsChecklist;
})(window);






// --- Consolidated Visible Intents + live grid refresh ---
(function (global) {
  const Settings = global.Settings || (global.Settings = {});
  const VI_KEY = 'sm_visible_intents_v1'; // must match app.js expectation

  function toSet(arr) {
    const s = new Set();
    (arr || []).forEach(x => { if (x) s.add(String(x)); });
    return s;
  }

  function loadVisibleIntents() {
    try {
      const raw = localStorage.getItem(VI_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return toSet(arr);
    } catch (_) { return new Set(); }
  }

  function saveVisibleIntents(set) {
    try {
      const arr = Array.from(set || []);
      localStorage.setItem(VI_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  // 🟢 Reassign the canonical functions (remove duplicates above)
  Settings.loadVisibleIntents = loadVisibleIntents;
  Settings.saveVisibleIntents = saveVisibleIntents;

  // 🟢 Patch buildIntentsChecklist to live-refresh grid
  const origBuild = Settings.buildIntentsChecklist;
  Settings.buildIntentsChecklist = function(){
    if (typeof origBuild !== 'function') return;
    origBuild();

    // ensure all checkboxes trigger live refresh
    const box = document.getElementById('intentChecks');
    if (!box) return;
    box.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (typeof global.renderIntentGridFromData === 'function' && Array.isArray(global.INTENTS)) {
          global.renderIntentGridFromData(global.INTENTS);
        }
      });
    });
  };

  // 🟢 Keep existing panel open/close stubs for compatibility
  Settings.openOnly = Settings.openOnly || function(which) {
    document.querySelectorAll('.settings-subpanel').forEach(p => p.classList.remove('open'));
    const id = which === 'intents' ? 'subIntents'
            : which === 'theme'   ? 'subTheme'
            : which === 'typing'  ? 'subTyping'
            : which === 'usertpls'? 'subUserTpls'
            : which === 'defaults'? 'subDefaults'
            : '';
    if (id) document.getElementById(id)?.classList.add('open');
    const row = document.querySelector(`.settings-item[data-item="${which}"] .chev`);
    document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
    row?.classList.add('rot90');
  };

  Settings.closeAllSubs = Settings.closeAllSubs || function(){
    document.querySelectorAll('.settings-subpanel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
  };

  Settings.init = Settings.init || function(){
    Settings.buildIntentsChecklist();
  };

  global.Settings = Settings;
})(window);

