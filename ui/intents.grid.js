// ui/intents.grid.js
(function (global) {
  const IntentsGrid = {};

  // === Paste your original function BODY here (unchanged) ===
  // Everything BETWEEN the { and } of function renderIntentGridFromData(...)
function renderIntentGridFromData(list){
  intentGrid.innerHTML = '';
    
  const viSet = loadVisibleIntents(); // Set or null
  const visible = Array.isArray(list)
    ? list.filter(x => !x.hidden && isIntentVisible(x.name, viSet))
    : [];
  const normals = visible
    .filter(x => x.name !== 'auto_detect')
    .sort((a,b)=>{
      const ao = typeof a.order === 'number' ? a.order : 1_000_000;
      const bo = typeof b.order === 'number' ? b.order : 1_000_000;
      if (ao !== bo) return ao - bo;
      const al = (a.label || a.name).toLowerCase();
      const bl = (b.label || b.name).toLowerCase();
      return al.localeCompare(bl);
    });
      
  normals.forEach(x => intentGrid.appendChild(makeIntentCard(x)));
    
  const auto = visible.find(x => x.name === 'auto_detect');
  if (auto){
    const node = makeIntentCard(auto);
    node.style.background = 'linear-gradient(180deg, var(--card-bg1), var(--card-bg2))';
    intentGrid.appendChild(node);
  }
}

  IntentsGrid.render = renderIntentGridFromData;

  // If you have a separate on-card-click handler function, expose it too:
  // IntentsGrid.onCardClick = onIntentCardClick;  // (optional)

  global.IntentsGrid = IntentsGrid;
})(window);

