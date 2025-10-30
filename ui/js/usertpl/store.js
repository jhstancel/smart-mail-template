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
export function parseFieldLines(text){
  const out = [];
  (text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(line=>{
    const [name, type='string', req=''] = line.split(':').map(x=>x.trim());
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
    out.push({name, type: (type||'string'), required: (req.toLowerCase()==='required')});
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

  const vi = window.loadVisibleIntents?.();
  if(vi && vi.has(id)){ vi.delete(id); window.saveVisibleIntents?.(vi); }

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
window.buildUserTemplatesUI = window.buildUserTemplatesUI || buildUserTemplatesUI;

