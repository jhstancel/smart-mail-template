// ui/settings.js
(function (global) {
  const Settings = global.Settings || {};

  // --- Storage key (keep name stable to preserve user prefs) ---
  const STORAGE_KEYS = {
    visibleIntents: 'visibleIntents'
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









// -- Settings: Visible Intents checklist (moved from app.js; no behavior change) --
(function attachBuildIntentsChecklist(global){
  const Settings = global.Settings || (global.Settings = {});
  // use the same helpers we already moved
  const loadVisibleIntents = Settings.loadVisibleIntents;
  const saveVisibleIntents = Settings.saveVisibleIntents;

  function buildIntentsChecklist(){
    /* PASTE ORIGINAL FUNCTION BODY HERE (unchanged) */
  }

  Settings.buildIntentsChecklist = buildIntentsChecklist;
})(window);

