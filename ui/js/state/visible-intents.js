// ui/js/state/visible-intents.js

// ===== Visible Intents (persist to localStorage) =====
const VI_KEY = 'sm_visible_intents_v1';

function loadVisibleIntents(){
  try{
    const raw = localStorage.getItem(VI_KEY);
    if(!raw) return null;
    const arr = JSON.parse(raw);
    if(Array.isArray(arr)) return new Set(arr);
  }catch(_e){}
  return null;
}
function saveVisibleIntents(set){
  try{
    const arr = Array.from(set || []);
    localStorage.setItem(VI_KEY, JSON.stringify(arr));
  }catch(_e){}
}
function isIntentVisible(name, viSet){
  if(name === 'auto_detect') return true;
  if(!viSet) return true;
  return viSet.has(name);
}

// back-compat
window.VI_KEY = VI_KEY;
window.loadVisibleIntents = loadVisibleIntents;
window.saveVisibleIntents = saveVisibleIntents;
window.isIntentVisible = isIntentVisible;

