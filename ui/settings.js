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







// -- Settings: Visible Intents checklist (moved from app.js; no behavior change) --
(function attachBuildIntentsChecklist(global){
  const Settings = global.Settings || (global.Settings = {});
  // use the same helpers we already moved
  const loadVisibleIntents = Settings.loadVisibleIntents;
  const saveVisibleIntents = Settings.saveVisibleIntents;

function buildIntentsChecklist(){
  const box = document.getElementById('intentChecks');
  if(!box) return;

  box.innerHTML = '';
  const current = loadVisibleIntents(); // Set or null

  // prefer it.industry; else SCHEMA fallback; else "Other"
  const getIndustry = (it) => {
    const byIntents = it && it.industry;
    const bySchema  = (typeof SCHEMA === 'object' && SCHEMA && SCHEMA[it.name] && SCHEMA[it.name].industry) || null;
    return byIntents || bySchema || 'Other';
  };

  // bucket items by industry
  const grouped = {};
  (INTENTS || []).forEach(it=>{
    if (!it || it.name === 'auto_detect') return;
    const key = getIndustry(it);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(it);
  });

  // persist selections on change
  function commitFromUI(){
    const s = new Set();
    (INTENTS || []).forEach(it=>{
      const cb = document.getElementById(`vi_${it.name}`);
      if(cb && cb.checked) s.add(it.name);
    });
    saveVisibleIntents([...s]);
  }

  // render groups alphabetically; items sorted by label
  Object.keys(grouped).sort((a,b)=>a.localeCompare(b)).forEach(groupName=>{
    // header
    const header = document.createElement('div');
    header.className = 'vi-section-title';
    header.textContent = groupName;
    box.appendChild(header);

    // items
    grouped[groupName]
      .slice()
      .sort((a,b)=>(a.label||a.name).localeCompare(b.label||b.name))
      .forEach(it=>{
        const id = `vi_${it.name}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.checked = current?.has(it.name);
        cb.onchange = ()=>commitFromUI();

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = it.label || it.name;

        box.appendChild(cb);
        box.appendChild(label);
        box.appendChild(document.createElement('br'));
      });
  });
}
  Settings.buildIntentsChecklist = buildIntentsChecklist;
})(window);













(function(){
  const VI_KEY = 'sm_visible_intents_v1'; // must match app.js expectation

  function toSet(arr){
    const s = new Set();
    (arr || []).forEach(x => { if (x) s.add(String(x)); });
    return s;
  }

  function loadVisibleIntents(){
    try {
      const raw = localStorage.getItem(VI_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return toSet(arr);
    } catch(_) { return new Set(); }
  }

  function saveVisibleIntents(set){
    try {
      const arr = Array.from(set || []);
      localStorage.setItem(VI_KEY, JSON.stringify(arr));
    } catch(_) {}
  }

  // Build the checklist, grouped by industry headers if present
  function buildIntentsChecklist(){
    const box = document.getElementById('intentChecks');
    if (!box) return;

    const vi = loadVisibleIntents();
    const list = Array.isArray(window.INTENTS) ? window.INTENTS.slice() : [];

    // group by industry
    const groups = new Map();
    for (const it of list){
      const key = it.industry || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }

    // render
    box.innerHTML = '';
    for (const [group, items] of groups){
      const h = document.createElement('div');
      h.className = 'vi-section-title';
      h.textContent = group;
      box.appendChild(h);

      for (const it of items){
        const id = `vi_${it.id}`;
        const row = document.createElement('div');
        row.className = 'kv';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.innerHTML = `<b>${it.label || it.id}</b><div class="muted">${it.description || ''}</div>`;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.checked = vi.size ? vi.has(it.id) : (it.id === 'auto_detect' || it.id === 'delay_notice'); // keep your preferred defaults
        cb.addEventListener('change', ()=>{
          if (cb.checked) vi.add(it.id); else vi.delete(it.id);
        });

        row.appendChild(cb);
        row.appendChild(label);
        box.appendChild(row);
      }
    }

    // Buttons
    const btnSave  = document.getElementById('vi_save');
    const btnAll   = document.getElementById('vi_all');
    const btnNone  = document.getElementById('vi_none');
    const btnReset = document.getElementById('vi_reset');

    btnSave && btnSave.addEventListener('click', ()=>{
      saveVisibleIntents(vi);
      // immediate refresh of the grid using current global INTENTS
      if (window.renderIntentGridFromData && Array.isArray(window.INTENTS)) {
        window.renderIntentGridFromData(window.INTENTS);
      }
    });

    btnAll && btnAll.addEventListener('click', ()=>{
      (window.INTENTS || []).forEach(it => vi.add(it.id));
      // reflect in UI
      box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    });

    btnNone && btnNone.addEventListener('click', ()=>{
      vi.clear();
      box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    });

    btnReset && btnReset.addEventListener('click', ()=>{
      vi.clear();
      // your defaults: keep auto_detect
      vi.add('auto_detect');
      box.querySelectorAll('input[type=checkbox]').forEach(cb => {
        const id = cb.id.replace(/^vi_/, '');
        cb.checked = vi.has(id);
      });
    });
  }

  // expose to app.js
  window.Settings = Object.assign(window.Settings || {}, {
    loadVisibleIntents,
    saveVisibleIntents,
    buildIntentsChecklist,
    openOnly(which){
      // keep your existing openOnly code if you had one; this is a safe stub
      document.querySelectorAll('.settings-subpanel').forEach(p=>p.classList.remove('open'));
      const id = which === 'intents' ? 'subIntents'
              : which === 'theme'   ? 'subTheme'
              : which === 'typing'  ? 'subTyping'
              : which === 'usertpls'? 'subUserTpls'
              : which === 'defaults'? 'subDefaults'
              : '';
      if (id) document.getElementById(id)?.classList.add('open');
      const row = document.querySelector(`.settings-item[data-item="${which}"] .chev`);
      document.querySelectorAll('.settings-item .chev').forEach(c=>c.classList.remove('rot90'));
      row?.classList.add('rot90');
    },
    closeAllSubs(){
      document.querySelectorAll('.settings-subpanel').forEach(p=>p.classList.remove('open'));
      document.querySelectorAll('.settings-item .chev').forEach(c=>c.classList.remove('rot90'));
    },
    init(){
      // build on load so the panel is ready
      buildIntentsChecklist();
    }
  });
})();

