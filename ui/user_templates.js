// ui/user_templates.js
(function (global) {
  const UserTemplates = {};

  // ==== STORAGE KEYS (keep existing names for persistence) ====
  const STORAGE_KEYS = {
    userTemplates: 'sm_user_templates_v1'
  };

  // ---- PASTE ORIGINAL BODIES FROM app.js (unchanged) ----
  // Paste the body of function userTemplatesAsIntents() between { ... } below
  function asIntents(){
    return loadUserTemplates().map(t => ({
    name: t.id,                      // e.g., u:my_quote
    label: t.label || t.name || t.id,
    description: t.description || 'Local template',
    required: (t.fields||[]).filter(f=>f.required).map(f=>f.name),
    optional: (t.fields||[]).filter(f=>!f.required).map(f=>f.name),
    fieldTypes: Object.fromEntries((t.fields||[]).map(f=>[f.name, f.type||'string'])),
    _local: true,
  }));
  }

const USER_TPLS_KEY = 'sm_user_templates_v1';

function loadAll(){
  try{
    const raw = localStorage.getItem(USER_TPLS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(_e){ return []; }
}
function saveAll(list){
  try{ localStorage.setItem(USER_TPLS_KEY, JSON.stringify(list || [])); }catch(_e){}
}
function addOne(tpl){
  const next = loadAll(); next.unshift(tpl); saveAll(next);
}
function updateOne(id, patch){
  const next = loadAll().map(x => x.id === id ? { ...x, ...patch } : x);
  saveAll(next);
}
function removeOne(id){
  const next = loadAll().filter(x => x.id !== id);
  saveAll(next);
}

  // Paste the body of function buildUserTemplatesUI() between { ... } below
  function buildUI(){
  const wrap = document.getElementById('userTplList');
  if(!wrap) return;

  const list = loadUserTemplates();         // <-- unified
  wrap.innerHTML = '';

  if(!list.length){
    const empty = document.createElement('div');
    empty.className = 'tpl-card';
    empty.innerHTML = `<div class="tpl-main">
        <div>
          <div class="tpl-title">No templates yet</div>
          <div class="tpl-desc">Click “+ New” to create your first local template.</div>
        </div>
      </div>`;
    wrap.appendChild(empty);
    return;
  }

  list.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'tpl-card';
    card.innerHTML = `
      <div class="tpl-main">
        <span class="tpl-badge">local</span>
        <div>
          <div class="tpl-title">${t.label || t.id || 'Untitled'}</div>
          ${t.description ? `<div class="tpl-desc">${t.description}</div>` : ''}
        </div>
      </div>
      <div class="tpl-actions">
        <button class="btn ghost" type="button">Edit</button>
        <button class="btn ghost" type="button">Duplicate</button>
        <button class="btn danger" type="button">Delete</button>
      </div>
    `;
    const [btnEdit, btnDup, btnDel] = card.querySelectorAll('.tpl-actions .btn');

btnEdit.addEventListener('click', (e)=>{
  e.stopPropagation();
  document.dispatchEvent(new CustomEvent('userTpl:edit', { detail: { template:t } }));
});
btnDup.addEventListener('click', (e)=>{
  e.stopPropagation();
  const copy = { ...t, id: `${t.id || 'u:tpl'}_${Date.now()}`, label: (t.label ? t.label+' (copy)' : 'Untitled (copy)') };
  const next = loadUserTemplates(); next.unshift(copy); saveUserTemplates(next); buildUserTemplatesUI();
});
btnDel.addEventListener('click', (e)=>{
  e.stopPropagation();
  const next = loadUserTemplates().filter(x => x.id !== t.id);
  saveUserTemplates(next); buildUserTemplatesUI();
});

    wrap.appendChild(card);
  });
  }

  // If you had any event wiring just for the “My Templates” panel, put it here:
  function init(){
    // If your UI requires initial render/wiring, call it:
    try { buildUI(); } catch(_) {}
  }

  // ---- Exports ----
  UserTemplates.asIntents = asIntents;
  UserTemplates.buildUI   = buildUI;
  UserTemplates.init      = init;
  // (export your helpers if other modules call them)
  UserTemplates.loadAll   = loadAll;
  UserTemplates.saveAll   = saveAll;
  UserTemplates.addOne    = addOne;
  UserTemplates.updateOne = updateOne;
  UserTemplates.removeOne = removeOne;

  global.UserTemplates = UserTemplates;
})(window);

