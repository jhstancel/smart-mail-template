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

// UI list builder and actions
export function buildUserTemplatesUI(){
  const wrap = document.getElementById('userTplList');
  if(!wrap) return;

  const list = loadUserTemplates();
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

// AFTER
list.forEach(t=>{
  const card = document.createElement('div');
  card.className = 'tpl-card';

  // add selection checkbox before innerHTML
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'ut-select';
  cb.dataset.id = t.id;
  cb.style.marginRight = '8px';
  card.appendChild(cb);

  card.innerHTML += `
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
  // This will rebuild INTENTS + grid + checklist and emit events as needed
  upsertTemplate(copy);
});

btnDel.addEventListener('click', (e)=>{
  e.stopPropagation();
  // This will rebuild INTENTS + grid + checklist and emit usertpl:deleted
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
export function deleteTemplate(id){
  if(!id) return;
  const next = loadUserTemplates().filter(t => t.id !== id);
  saveUserTemplates(next);

  // Remove from Visible Intents (if that feature is loaded)
  const vi = window.loadVisibleIntents?.();
  if(vi && vi.has(id)){ vi.delete(id); window.saveVisibleIntents?.(vi); }

  // Rebuild INTENTS without any u:* first, then re-append current user templates
  const coreIntents = (window.INTENTS || []).filter(x => !String(x.name||'').startsWith('u:'));
  const merged = [...coreIntents, ...userTemplatesAsIntents()];

  // Respect the guard
  if (typeof window.setINTENTSFromHydrator === 'function') {
    window.setINTENTSFromHydrator(merged);
  } else {
    window.INTENTS = merged; // fallback if guard hasn’t loaded yet
  }

  // If we just deleted the currently selected intent, fall back to Auto Detect (or nothing)
  if (window.SELECTED_INTENT === id) {
    window.SELECTED_INTENT = '';
    // Prefer to show auto_detect if present
    const hasAuto = merged.some(x => x.name === 'auto_detect');
    if (typeof window.selectIntentById === 'function') {
      window.selectIntentById(hasAuto ? 'auto_detect' : '');
    } else if (typeof window.setSelectedIntent === 'function') {
      window.setSelectedIntent(hasAuto ? 'auto_detect' : '');
    }
    // Nudge preview so Output area clears
    window.scheduleLiveGenerate?.(0);
  }



// If this is a newly created template and a visible-intents Set exists, mark it visible
try {
  const wasExisting = !!prev;            // from your earlier merge logic (prev is the found old template)
  const vi = window.loadVisibleIntents?.();
  if (!wasExisting && vi && typeof vi.add === 'function') {
    vi.add(def.id);
    window.saveVisibleIntents?.(vi);
  }
} catch (_) { /* ignore */ }

window.renderIntentGridFromData?.(merged);
window.buildIntentsChecklist?.();
window.buildUserTemplatesUI?.();

// Let listeners (e.g., settings panel) react if open
window.dispatchEvent?.(new CustomEvent('usertpl:saved', { detail: { id: def.id } }));


  // Broadcast a small event for any listeners (optional, harmless)
window.dispatchEvent?.(new CustomEvent('usertpl:deleted', { detail: { id } }));

}

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
    // if set to 'copy', import every item as a new copy regardless of conflicts
    mode = undefined // 'copy' | undefined
  } = {}
) {
  // 1) Parse and normalize supported shapes
  let payload;
  try {
    payload = JSON.parse(text || '[]');
  } catch (e) {
    alert('Invalid JSON');
    return;
  }
  let incoming = [];
  if (Array.isArray(payload)) {
    incoming = payload;
  } else if (payload && Array.isArray(payload['sm_user_templates_v1'])) {
    incoming = payload['sm_user_templates_v1'];
  } else if (payload && Array.isArray(payload.templates)) {
    incoming = payload.templates;
  }

  // 2) Build map of current templates
  const current = loadUserTemplates();
  const map = new Map(current.map(t => [t.id, t]));

  // Helpers
  const isObj = v => v && typeof v === 'object';
  const makeCopyId = base => {
    const clean = base.replace(/_copy\d*$/i, '');
    let newId = `${clean}_copy`;
    let i = 2;
    const existingIds = new Set(map.keys());
    while (existingIds.has(newId)) {
      newId = `${clean}_copy${i++}`;
    }
    return newId;
  };

  // 3) Merge with counters (no updates — conflicts always duplicate)
  let added = 0, skipped = 0;
  for (const raw of (incoming || [])) {
    if (!isObj(raw) || typeof raw.id !== 'string' || !raw.id.startsWith('u:')) { skipped++; continue; }

    // Import as copies? (force new id)
    if (mode === 'copy') {
      const copyId = makeCopyId(raw.id);
      map.set(copyId, { ...raw, id: copyId, name: copyId });
      added++;
      continue;
    }

    // Default: if ID exists, create a copy; if not, add as-is
    if (map.has(raw.id)) {
      const copyId = makeCopyId(raw.id);
      map.set(copyId, { ...raw, id: copyId, name: copyId });
      added++;
    } else {
      map.set(raw.id, raw);
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
window.getSelectedUserTemplateIds = function(){
  return Array.from(document.querySelectorAll('#userTplList .ut-select:checked'))
    .map(cb => cb.dataset.id)
    .filter(Boolean);
};
