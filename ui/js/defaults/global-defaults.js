// ui/js/defaults/global-defaults.js

// NEW: Global defaults (session memory) + persistence key
let GLOBAL_DEFAULTS = { shipAddress: ''};
const DEFAULTS_STORAGE_KEY = 'sm_global_defaults_v1';

/* ===== Global defaults helpers ===== */
function loadGlobalDefaults(){
  try{
    const raw = localStorage.getItem(DEFAULTS_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object'){
        GLOBAL_DEFAULTS = { ...GLOBAL_DEFAULTS, ...parsed };
        // keep window ref fresh
        window.GLOBAL_DEFAULTS = GLOBAL_DEFAULTS;
      }
    }
  }catch(_e){}
  // Hydrate the settings UI
  const a=$('#g_shipAddress');
  if(a) a.value = GLOBAL_DEFAULTS.shipAddress || '';
}
function saveGlobalDefaults(){
  try{
    localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(GLOBAL_DEFAULTS));
  }catch(_e){}
}
function clearGlobalDefaults(persistToo){
  GLOBAL_DEFAULTS = { shipAddress:'', fedexAccount:'' };
  // keep window ref fresh
  window.GLOBAL_DEFAULTS = GLOBAL_DEFAULTS;
  if(persistToo){ try{ localStorage.removeItem(DEFAULTS_STORAGE_KEY);}catch(_e){} }
  const a=$('#g_shipAddress'), f=$('#g_fedexAccount');
  if(a) a.value=''; if(f) f.value='';
}

// back-compat
window.DEFAULTS_STORAGE_KEY = DEFAULTS_STORAGE_KEY;
window.GLOBAL_DEFAULTS = GLOBAL_DEFAULTS;
window.loadGlobalDefaults = loadGlobalDefaults;
window.saveGlobalDefaults = saveGlobalDefaults;
window.clearGlobalDefaults = clearGlobalDefaults;

