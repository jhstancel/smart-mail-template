// Storage + helpers (kept verbatim)
export const USER_TPLS_KEY = 'sm_user_templates_v1';

export function loadUserTemplates(){
  try{
    const raw = localStorage.getItem(USER_TPLS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if(Array.isArray(arr)) return arr;
  }catch(_e){}
  return [];
}
export function saveUserTemplates(list){
  try{ localStorage.setItem(USER_TPLS_KEY, JSON.stringify(list||[])); }catch(_e){}
}

export function parseFieldLines(text) {
  const out = [];
  (text || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(line => {
      const parts = line.split(':').map(x => x.trim()).filter(Boolean);
      const name = parts[0];
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;

      // Defaults
      let type = 'string';
      let required = false;

      // Allow flexible order and omission
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].toLowerCase();
        if (p === 'required') required = true;
        else if (['string', 'number', 'email', 'date'].includes(p)) type = p;
      }

      out.push({ name, type, required });
    });
  return out;
}


export function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function renderLocalTemplate(def, data){
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
  const sub = (tpl)=> String(tpl||'').replace(re, (_m, key)=> esc(data[key] ?? ''));
  return { subject: sub(def.subject || ''), body: sub(def.body || '') };
}
export function userTemplatesAsIntents(){
  return loadUserTemplates().map(t => ({
    name: t.id,
    label: t.label || t.name || t.id,
    description: t.description || 'Local template',
    required: (t.fields||[]).filter(f=>f.required).map(f=>f.name),
    optional: (t.fields||[]).filter(f=>!f.required).map(f=>f.name),
    fieldTypes: Object.fromEntries((t.fields||[]).map(f=>[f.name, f.type||'string'])),
    _local: true,
  }));
}






// UI list builder and actions (now with search filter)
export function buildUserTemplatesUI(){
  const wrap = document.getElementById('userTplList');
  if(!wrap) return;

  const all = loadUserTemplates();

  // read current search query (if present)
  const qEl = document.getElementById('ut_search');
  const q = (qEl?.value || '').trim().toLowerCase();

  // filter by label/id/description
  const list = q
    ? all.filter(t => {
        const label = (t.label || '').toLowerCase();
        const id = (t.id || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return label.includes(q) || id.includes(q) || desc.includes(q);
      })
    : all;

  wrap.innerHTML = '';

  if(!list.length){
    const empty = document.createElement('div');
    empty.className = 'tpl-card';
    empty.innerHTML = `<div class="tpl-main">
        <div>
          <div class="tpl-title">${q ? 'No matches' : 'No templates yet'}</div>
          <div class="tpl-desc">${
            q
              ? 'Try a different search.'
              : 'Click “+ New” to create your first local template.'
          }</div>
        </div>
      </div>`;
    wrap.appendChild(empty);
    return;
  }

  list.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'tpl-card';

    // Export-select mode: click card to toggle picked (ignore inner action buttons)
    card.addEventListener('click', (e)=>{
      if (!window.__utExportMode) return;
      if ((e.target instanceof HTMLElement) && e.target.closest('.tpl-actions')) return;

      const set = window.__utExportSelection || (window.__utExportSelection = new Set());
      const picked = card.classList.toggle('ut-picked');
      if (picked) set.add(t.id); else set.delete(t.id);
      window.dispatchEvent?.(new CustomEvent('ut-export:selection-changed', { detail: { count: set.size } }));
    });

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
      const copy = {
        ...t,
        id: `${t.id || 'u:tpl'}_${Date.now()}`,
        label: t.label ? `${t.label} (copy)` : 'Untitled (copy)'
      };
      upsertTemplate(copy);
    });

    btnDel.addEventListener('click', (e)=>{
      e.stopPropagation();
      deleteTemplate(t.id);
    });

    wrap.appendChild(card);
  });
}










// cross-module helpers
export function upsertTemplate(def){
  const all = loadUserTemplates();
  const i = all.findIndex(x=>x.id===def.id);
  if(i>=0) all[i]=def; else all.unshift(def);
  saveUserTemplates(all);

  const coreIntents = (window.INTENTS || []).filter(x => !String(x.name||'').startsWith('u:'));
  const merged = [...coreIntents, ...userTemplatesAsIntents()];

  if (typeof window.setINTENTSFromHydrator === 'function') {
    window.setINTENTSFromHydrator(merged);
  } else {
    window.INTENTS = merged; // fallback if guard hasn’t loaded yet
  }

  window.renderIntentGridFromData?.(merged);
  window.buildIntentsChecklist?.();
  window.buildUserTemplatesUI?.();
}







// Keep a capped trash stack (max 5)
window.UserTemplates = window.UserTemplates || {};
window.UserTemplates.__trash = window.UserTemplates.__trash || []; // most-recent first
let __utUndoTimer = null;

export function deleteTemplate(id){
  if(!id) return;

  const all = loadUserTemplates();
  const deleted = all.find(t => t.id === id) || null;
  const next = all.filter(t => t.id !== id);
  saveUserTemplates(next);

  // Push into trash (capped at 5)
  if (deleted){
    const stack = window.UserTemplates.__trash;
    // remove any older duplicate of same id to avoid dupes
    const filtered = stack.filter(x => x.id !== deleted.id);
    filtered.unshift({ ...deleted, __ts: Date.now() });
    window.UserTemplates.__trash = filtered.slice(0, 5);
    window.UserTemplates.__lastDeleted = deleted; // also maintain single-slot undo
  }

  // Remove from Visible Intents
  const vi = window.loadVisibleIntents?.();
  if(vi && vi.has(id)){ vi.delete(id); window.saveVisibleIntents?.(vi); }

  // Rebuild INTENTS (core + user)
  const core = (window.INTENTS || []).filter(x => !String(x.name||'').startsWith('u:'));
  const merged = [...core, ...userTemplatesAsIntents()];
  if (typeof window.setINTENTSFromHydrator === 'function') window.setINTENTSFromHydrator(merged);
  else window.INTENTS = merged;

  // If selected was deleted, fall back
  if (window.SELECTED_INTENT === id) {
    window.SELECTED_INTENT = '';
    const hasAuto = merged.some(x => x.name === 'auto_detect');
    if (typeof window.selectIntentById === 'function') window.selectIntentById(hasAuto ? 'auto_detect' : '');
    else if (typeof window.setSelectedIntent === 'function') window.setSelectedIntent(hasAuto ? 'auto_detect' : '');
    window.scheduleLiveGenerate?.(0);
  }

  // Refresh UI
  window.renderIntentGridFromData?.(merged);
  window.buildIntentsChecklist?.();
  window.buildUserTemplatesUI?.();

  // Longer toast (8s if supported)
  try {
    window.showToast?.(`Deleted “${deleted?.label || deleted?.id || 'template'}”. Undo available for 8s.`, { duration: 8000 });
  } catch(_) { /* best effort */ }

  // Panel may be open: refresh its list
  window.renderTrashPanel?.();

  // Inline Undo button (kept, now 8s)
  const actions = document.querySelector('#subUserTpls .ut-actions');
  let undoBtn = document.getElementById('utUndoBtn');
  if (!undoBtn && actions) {
    undoBtn = document.createElement('button');
    undoBtn.id = 'utUndoBtn';
    undoBtn.className = 'btn';
    undoBtn.textContent = 'Undo';
    undoBtn.style.marginLeft = '8px';
    actions.appendChild(undoBtn);
  }
  if (undoBtn) undoBtn.style.display = 'inline-block';

  const doUndo = ()=> restoreFromTrash(deleted?.id);
  undoBtn?.addEventListener('click', doUndo, { once: true });

  clearTimeout(__utUndoTimer);
  __utUndoTimer = setTimeout(()=>{
    window.UserTemplates.__lastDeleted = null;
    if (undoBtn) undoBtn.style.display = 'none';
  }, 8000);

  window.dispatchEvent?.(new CustomEvent('usertpl:deleted', { detail: { id } }));
}

// ===== Trash helpers (exposed) =====
function makeCopyId(base, existingIds){
  const clean = (base || 'u:tpl').replace(/_copy\d*$/i,'');
  let n = `${clean}_copy`, i=2;
  while(existingIds.has(n)) n = `${clean}_copy${i++}`;
  return n;
}

export function getTrash(){ return (window.UserTemplates.__trash || []).slice(); }

export function purgeFromTrash(id){
  window.UserTemplates.__trash = (window.UserTemplates.__trash || []).filter(x => x.id !== id);
  window.renderTrashPanel?.();
}

export function emptyTrash(){
  window.UserTemplates.__trash = [];
  window.renderTrashPanel?.();
}

export function restoreFromTrash(id){
  const stack = window.UserTemplates.__trash || [];
  const idx = stack.findIndex(x => x.id === id);
  if (idx < 0) return;
  const original = stack[idx];

  const curr = loadUserTemplates();
  const ids = new Set(curr.map(x=>x.id));
  let restored = { ...original };
  if (ids.has(restored.id)) {
    const newId = makeCopyId(restored.id, ids);
    restored.id = restored.name = newId;
    restored.label = restored.label ? `${restored.label} (copy)` : newId;
  }
  curr.push(restored);
  saveUserTemplates(curr);

  // remove from trash
  stack.splice(idx, 1);
  window.UserTemplates.__trash = stack;

  // refresh INTENTS/UI
  const core = (window.INTENTS || []).filter(x => !String(x.name||'').startsWith('u:'));
  const merged = [...core, ...userTemplatesAsIntents()];
  if (typeof window.setINTENTSFromHydrator === 'function') window.setINTENTSFromHydrator(merged);
  else window.INTENTS = merged;
  window.pruneVisibleIntentsAgainst?.(merged);
  window.renderIntentGridFromData?.(merged);
  window.buildIntentsChecklist?.();
  window.buildUserTemplatesUI?.();
  window.renderTrashPanel?.();

  window.showToast?.('Template restored.', { duration: 4000 });
}

// expose for wiring
window.getTrash = window.getTrash || getTrash;
window.restoreFromTrash = window.restoreFromTrash || restoreFromTrash;
window.purgeFromTrash = window.purgeFromTrash || purgeFromTrash;
window.emptyTrash = window.emptyTrash || emptyTrash;





// ===== Globals / exposures (outside of deleteTemplate) =====
window.buildUserTemplatesUI = window.buildUserTemplatesUI || buildUserTemplatesUI;
/* expose selected APIs for non-module listeners (list-delegation, etc.) */
window.loadUserTemplates  = window.loadUserTemplates  || loadUserTemplates;
window.deleteTemplate     = window.deleteTemplate     || deleteTemplate;
window.upsertTemplate     = window.upsertTemplate     || upsertTemplate;

/* NEW: global helpers used by generator & quickEdit handoff */
window.renderLocalTemplate = window.renderLocalTemplate || renderLocalTemplate;
window.userTemplatesAsIntents = window.userTemplatesAsIntents || userTemplatesAsIntents;

window.UserTemplates = window.UserTemplates || {};
window.UserTemplates.getById = function(id){
  try{
    // Always re-read from storage so Generate sees latest edits
    const raw = localStorage.getItem(USER_TPLS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return (arr || []).find(t => t && (t.id === id || t.name === id)) || null;
  }catch(_){ return null; }
};

/* Export / Import helpers */
window.exportUserTemplates = function () {
  try {
    const raw = localStorage.getItem(USER_TPLS_KEY) || '[]';
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `user-templates-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    window.showToast?.('Exported user templates');
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
};














window.importUserTemplatesFromJSON = async function (
  text,
  {
    mode = undefined,        // 'copy' | undefined
    filenameHint = undefined // optional: help derive id if missing
  } = {}
) {
  // 1) Parse and normalize payload
  let payload;
  try {
    payload = JSON.parse(text || '[]');
  } catch (e) {
    alert('Invalid JSON');
    return;
  }

  // Normalize to an array of template-like objects
  let incoming = [];
  if (Array.isArray(payload)) {
    incoming = payload;
  } else if (payload && Array.isArray(payload['sm_user_templates_v1'])) {
    incoming = payload['sm_user_templates_v1'];
  } else if (payload && Array.isArray(payload.templates)) {
    incoming = payload.templates;
  } else if (payload && typeof payload === 'object') {
    // New export: single-template JSON object
    incoming = [payload];
  }

  // 2) Build map of current templates
  const current = loadUserTemplates();
  const map = new Map(current.map(t => [t.id, t]));

  // Helpers
  const isObj = v => v && typeof v === 'object';
  const coerceId = (raw) => {
    // prefer explicit id
    let id = (raw && typeof raw.id === 'string') ? raw.id : '';

    // fallback to name/label
    if (!id) id = (typeof raw?.name === 'string') ? raw.name : '';
    if (!id) id = (typeof raw?.label === 'string') ? `u:${raw.label}` : '';

    // fallback to filename hint (strip dirs/ext, ensure starts with u:)
    if (!id && typeof filenameHint === 'string') {
      const base = filenameHint.split('/').pop().split('\\').pop();
      const stem = base.replace(/\.json$/i,'');
      id = stem;
    }

    // sanitize & ensure u: prefix
    if (id) {
      id = id.trim();
      if (!id.startsWith('u:')) id = `u:${id}`;
      id = id.replace(/[^\w:.-]+/g, '_'); // keep safe chars
    }

    return id || null;
  };

  const makeCopyId = base => {
    const clean = base.replace(/_copy\d*$/i, '');
    let newId = `${clean}_copy`;
    let i = 2;
    const existingIds = new Set(map.keys());
    while (existingIds.has(newId)) newId = `${clean}_copy${i++}`;
    return newId;
  };

  // 3) Merge with counters (no updates — conflicts always duplicate)
  let added = 0, skipped = 0;
  for (const raw of (incoming || [])) {
    if (!isObj(raw)) { skipped++; continue; }

    // Ensure an id (with u:), or skip
    let id = coerceId(raw);
    if (!id) { skipped++; continue; }

    // Import everything as copies if requested
    if (mode === 'copy') {
      const copyId = makeCopyId(id);
      map.set(copyId, { ...raw, id: copyId, name: copyId });
      added++;
      continue;
    }

    // Default: if exists, duplicate; else add as-is
    if (map.has(id)) {
      const copyId = makeCopyId(id);
      map.set(copyId, { ...raw, id: copyId, name: copyId });
      added++;
    } else {
      map.set(id, { ...raw, id, name: id });
      added++;
    }
  }

  // 4) Persist
  const next = Array.from(map.values());
  saveUserTemplates(next);

  // 5) Auto-mark newly added templates as visible (when a Set is in use)
  try {
    const vi = window.loadVisibleIntents?.();
    if (vi && typeof vi.add === 'function' && added > 0) {
      for (const t of next) {
        if (!current.find(c => c.id === t.id)) vi.add(t.id);
      }
      window.saveVisibleIntents?.(vi);
    }
  } catch (_) {}

  // 6) Rebuild INTENTS and UI immediately
  const coreIntents = (window.INTENTS || []).filter(x => !String(x.name||'').startsWith('u:'));
  const merged = [...coreIntents, ...userTemplatesAsIntents()];
  if (typeof window.setINTENTSFromHydrator === 'function') {
    window.setINTENTSFromHydrator(merged);
  } else {
    window.INTENTS = merged;
  }
  window.pruneVisibleIntentsAgainst?.(merged);
  window.renderIntentGridFromData?.(merged);
  window.buildIntentsChecklist?.();
  window.buildUserTemplatesUI?.();

  // 7) Notify
  window.dispatchEvent?.(new CustomEvent('usertpl:saved', { detail: { id: '[bulk-import]', added, mode } }));
  const msg = `Import complete: ${added} added${mode ? ` (mode=${mode})` : ''}`;
  window.showToast?.(msg) || alert(msg);
};



