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

