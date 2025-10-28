// ui/settings.js
// Temporary namespace wrapper. No behavior change.
// In the next step, we’ll move the actual function bodies here.

(function (global) {
  // These will be filled from app.js (we’ll wire them below).
  const Settings = {
    // placeholders that will be rebound after app.js loads
    openOnly:    function(){},
    buildIntentsChecklist: function(){},
    loadVisibleIntents:    function(){ return new Set(); },
    saveVisibleIntents:    function(){},
  };

  // expose namespace
  global.Settings = Settings;
})(window);

