// ui/js/intents/grid.js
// Exact extraction of grid + selection + checklist + loader.

function selectIntent(name){
  SELECTED_INTENT = name || '';
  if (!name || name === 'auto_detect'){
    autoStage?.classList.remove('hidden');
    renderFields(null);
  } else {
    autoStage?.classList.add('hidden');
    renderFields(name);
  }
  document.querySelectorAll('.intent-card')
    .forEach(card => card.classList.toggle('active', card.dataset.intent === name));
}
window.setSelectedIntent = selectIntent;

function makeIntentCard(item){
  const div = document.createElement('div');
  div.className = 'intent-card';
  div.dataset.intent = item.name;

  const label = item.label || toTitle(item.name.replaceAll('_',' '));
  const desc  = item.description || '';

  div.innerHTML = `
    <div class="intent-name">${label}</div>
    <div class="intent-desc">${desc}</div>
  `;

  if (item._local) {
    const badge = document.createElement('span');
    badge.className = 'tpl-badge';
    badge.textContent = 'local';
    div.querySelector('.intent-name')?.appendChild(badge);
  }

  div.addEventListener('click', ()=>{
    // Export Mode: toggle selection on user templates only
    if (window.__exportMode) {
      const id = item.name;
      const isUser = /^u:/.test(id);
      if (!isUser) return; // ignore non-user intents while exporting

      const set = window.__exportSelection || (window.__exportSelection = new Set());
      const picked = div.classList.toggle('picked');
      if (picked) set.add(id); else set.delete(id);

      // update confirm button label
      window.dispatchEvent?.(new CustomEvent('export:selection-changed', { detail: { count: set.size } }));
      return; // don’t run normal select logic in export mode
    }

    const isActive = div.classList.contains('active');
    document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));

    if(isActive){
      SELECTED_INTENT = '';
      renderFields(null);
      if (autoStage) autoStage.classList.add('hidden');
      return;
    }

    div.classList.add('active');

    if(item.name === 'auto_detect'){
      if (autoStage) autoStage.classList.remove('hidden');
      renderFields(null); // clear manual fields
      if (typeof window.setSelectedIntent === 'function') window.setSelectedIntent(null);
    } else {
      if (autoStage) autoStage.classList.add('hidden');
      selectIntent(item.name);
      if (typeof window.setSelectedIntent === 'function') window.setSelectedIntent(item.name);
    }
  });

  return div;
}

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

function buildIntentsChecklist(){
  const box = document.getElementById('intentChecks');
  if(!box) return;

  box.innerHTML = '';

  // wire the search input once
  const search = document.getElementById('intentSearch');
  if (search && !search._wired) {
    search._wired = true;
    search.addEventListener('input', () => buildIntentsChecklist());
  }
  const q = (search?.value || '').toLowerCase().trim();

  const current = loadVisibleIntents(); // Set or null
  const base = (INTENTS || []).filter(x => x && x.name !== 'auto_detect');
  const filtered = q ? base.filter(it => ((it.label || it.name || '').toLowerCase().includes(q))) : base;
  const items = filtered
    .slice()
    .sort((a,b) => (a.label||a.name).localeCompare(b.label||b.name));

  // helper to rebuild & render after any change
  function commitFromUI(){
    const s = new Set();
    items.forEach(it=>{
      const cb = document.getElementById(`vi_${it.name}`);
      if(cb && cb.checked) s.add(it.name);
    });
    saveVisibleIntents(s);
    renderIntentGridFromData(INTENTS);
    buildIntentsChecklist();
  }

  items.forEach(it=>{
    const id = `vi_${it.name}`;
    const wrap = document.createElement('div');
    wrap.className = 'kv';
    wrap.innerHTML = `
      <label class="toggle" for="${id}">
        <input id="${id}" type="checkbox" ${isIntentVisible(it.name, current) ? 'checked':''} />
        ${it.label || it.name}
      </label>
      <div class="muted">${it.description || ''}</div>
    `;
    box.appendChild(wrap);

    // live update on toggle
    const cb = wrap.querySelector('input[type="checkbox"]');
    if(cb){
      cb.addEventListener('change', commitFromUI);
    }
  });

  // Buttons
  const btnSave  = document.getElementById('vi_save');
  const btnAll   = document.getElementById('vi_all');
  const btnNone  = document.getElementById('vi_none');
  const btnReset = document.getElementById('vi_reset');

  if(btnSave)  btnSave.onclick  = commitFromUI;
  if(btnAll)   btnAll.onclick   = ()=>{ items.forEach(it=>{ const cb=document.getElementById(`vi_${it.name}`); if(cb) cb.checked=true; }); commitFromUI(); };
  if(btnNone)  btnNone.onclick  = ()=>{ items.forEach(it=>{ const cb=document.getElementById(`vi_${it.name}`); if(cb) cb.checked=false;}); commitFromUI(); };
  if(btnReset) btnReset.onclick = ()=>{ localStorage.removeItem(VI_KEY); buildIntentsChecklist(); renderIntentGridFromData(INTENTS); };
}

async function loadIntents(){
  try{
    const res = await fetch('/intents');
    if(!res.ok) throw new Error('Failed to fetch /intents');
    const data = await res.json();
    INTENTS = Array.isArray(data) ? data : [];
    renderIntentGridFromData(INTENTS);

  }catch(err){
    console.error('Error loading intents:', err);
    INTENTS = [];
    intentGrid.innerHTML = '';
  }
}

function selectIntentById(intentId){
  try{
    // Allow schema-backed AND local (u:...) intents
    const inSchema = !!(window.SCHEMA && window.SCHEMA[intentId]);
    const isLocal  = String(intentId || '').startsWith('u:');
    const existsInIntents = (Array.isArray(window.INTENTS) && window.INTENTS.some(x => x.name === intentId));
    if(!(inSchema || isLocal || existsInIntents)) return;

    // mark active card if present
    document.querySelectorAll('[data-intent]').forEach(el=>{
      el.classList.toggle('active', el.getAttribute('data-intent') === intentId);
    });

    // set current and render fields (renderFields already handles u:*)
    window.CURRENT_INTENT = intentId;
    if (typeof renderFields === 'function') renderFields(intentId);

    // update header (use schema label when present; fall back to INTENTS)
    const spec = (window.SCHEMA && window.SCHEMA[intentId]) || {};
    const meta = (Array.isArray(window.INTENTS) && window.INTENTS.find(x => x.name === intentId)) || {};
    const title = document.getElementById('fieldsTitle');
    const hint  = document.getElementById('fieldsHint');
    if (title) title.textContent = (spec.label || meta.label) ? `${(spec.label || meta.label)} — Fields` : 'Fields';
    if (hint)  hint.textContent  = spec.description || meta.description || '';
  }catch(e){
    console.debug('selectIntentById error', e);
  }
}

// back-compat exports
window.makeIntentCard = makeIntentCard;
window.renderIntentGridFromData = renderIntentGridFromData;
window.buildIntentsChecklist = buildIntentsChecklist;
window.loadIntents = loadIntents;
window.selectIntentById = selectIntentById;

