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

// Optional hygiene: prune stale IDs from the visible set when intents change
function pruneVisibleIntentsAgainst(intents) {
  try {
    const set = loadVisibleIntents();
    if (!set) return; // null ⇒ "all visible" by default; nothing to prune
    const names = new Set((intents || []).map(x => x?.name).filter(Boolean));
    let changed = false;
    for (const id of Array.from(set)) {
      if (!names.has(id)) {
        set.delete(id);
        changed = true;
      }
    }
    if (changed) saveVisibleIntents(set);
  } catch (_e) {}
}

window.pruneVisibleIntentsAgainst = pruneVisibleIntentsAgainst;

// Auto-prune after user template delete (no refresh)
window.addEventListener?.('usertpl:deleted', () => {
  const intents = (window.INTENTS || []);
  pruneVisibleIntentsAgainst(intents);
});


