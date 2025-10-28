

// ===== Visible Intents (persist to localStorage) =====
const VI_KEY = 'sm_visible_intents_v1';
// moved to ui/settings.js (keep aliases so old calls work)
const loadVisibleIntents = window.Settings.loadVisibleIntents;
const saveVisibleIntents = window.Settings.saveVisibleIntents;

function isIntentVisible(name, viSet){
  if(name === 'auto_detect') return true;
  if(!viSet) return true;
  return viSet.has(name);
}

/* =========================================================================================
 * Smart Mail Template — Frontend Script (clean + documented)
 * =======================================================================================*/

function smartParseParts(raw){
  // Normalize line endings and separators
  const lines = String(raw || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const out = [];

  for (let line of lines){
    // common forms:
    // "PN-10423 x2", "PN-10423 2", "PN-10423,2", "PN-10423\t2"
    // allow "qty:2", "q=2", "(2)", "[2]"
    // default qty=1 when missing
    let pn = "";
    let qty = "";

    // Try comma/pipe/tab split first
    let hit = line.split(/[,\|\t]/).map(s => s.trim()).filter(Boolean);
    if (hit.length >= 2) {
      pn = hit[0];
      qty = hit[1];
    } else {
      // Try "something x2" or "something 2"
      const m = line.match(/^(.+?)\s*(?:x|qty[:=]|\(|\[)?\s*(\d+)[)\]]?\s*$/i);
      if (m) {
        pn = m[1].trim().replace(/\s+$/,"");
        qty = m[2].trim();
      } else {
        // No explicit qty -> default 1
        pn = line.trim();
        qty = "1";
      }
    }

    // sanitize
    pn = pn.replace(/\s{2,}/g, " ").trim();
    qty = String(qty || "1").trim();

    if (pn) out.push({ partNumber: pn, quantity: qty });
  }

  return out;
}

function syncPartsHidden(){
  const hidden = document.getElementById('f_parts');
  if(!hidden) return;

  const tbody = document.querySelector('#parts_table tbody');
  if(tbody){
    const rows = [...tbody.querySelectorAll('tr')].map(tr=>{
      const pn  = tr.querySelector('input[data-k="partNumber"]')?.value?.trim();
      const qty = tr.querySelector('input[data-k="quantity"]')?.value?.trim();
      return (pn && qty) ? { partNumber: pn, quantity: qty } : null;
    }).filter(Boolean);
    hidden.value = rows.length ? JSON.stringify(rows) : '[]';
  } else {
    const raw = document.getElementById('f_parts_text')?.value || '';
    const parsed = smartParseParts(raw);
    hidden.value = parsed.length ? JSON.stringify(parsed) : '[]';
  }
}

function addPartsRow(tbody, partNumber = "", quantity = ""){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="input" data-k="partNumber" value="${partNumber}"></td>
    <td style="width:110px"><input class="input" data-k="quantity" value="${quantity}"></td>
    <td style="width:48px"><button type="button" class="btn-mini danger">✕</button></td>
  `;
tr.querySelectorAll('input').forEach(inp => {
  inp.addEventListener('input', (e)=>{
    if(e.target.dataset.k === 'quantity'){
      e.target.value = e.target.value.replace(/[^\d]/g,'');
    }
    syncPartsHidden();
  });
});
  tbody.appendChild(tr);
}



// Effects provided by ui/effects/*.js
const Starfield   = window.Starfield || { start(){}, stop(){} };
const PastellPets = window.PastellPets || { enable(){}, disable(){} };

/* ===== Tiny helpers ===== */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const on = (el,ev,fn,opts)=> el && el.addEventListener(ev,fn,opts||false);
function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ===== DOM refs ===== */
const intentGrid   = document.getElementById('intentGrid') || document.getElementById('intentButtons') || document.querySelector('.intent-grid');
const fieldsWrap   = document.getElementById('fields')     || document.getElementById('fieldsWrap')    || document.querySelector('.kvs');
const fieldsHint   = document.getElementById('fieldsHint') || document.querySelector('#fieldsTitle + .subtitle');
const autoStage    = document.getElementById('autoStage');
const btnGenerate  = document.getElementById('btnGenerate');
const outSubject   = document.getElementById('outSubject');
const outBody      = document.getElementById('outBody');

/* ===== App state ===== */
let INTENTS = [];            // from /intents
let SELECTED_INTENT = '';    // '' or 'auto_detect' means auto-mode
let SCHEMA = {};             // from /schema

// NEW: Global defaults (session memory) + persistence key
let GLOBAL_DEFAULTS = { shipAddress: ''};
const DEFAULTS_STORAGE_KEY = 'sm_global_defaults_v1';

// Title helper (keep a single definition)
function toTitle(s){
  return (s || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c=>c.toUpperCase());
}

/* ===== Networking ===== */
async function postJSON(url, data){
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function loadSchema(){
  try{
    const res = await fetch('/schema');
    if(!res.ok) throw new Error('Failed to fetch /schema');
    SCHEMA = await res.json();
  }catch(e){
    console.error('Error loading /schema:', e);
    SCHEMA = {};
  }
}
/* ===== Global defaults helpers ===== */
function loadGlobalDefaults(){
  try{
    const raw = localStorage.getItem(DEFAULTS_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object'){
        GLOBAL_DEFAULTS = { ...GLOBAL_DEFAULTS, ...parsed };
      }
    }
  }catch(_e){}
  // Hydrate the settings UI
const a=$('#g_shipAddress');
if(a) a.value = GLOBAL_DEFAULTS.shipAddress || '';
}
function saveGlobalDefaults(){
  try{
    localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(GLOBAL_DEFAULTS));
  }catch(_e){}
}
function clearGlobalDefaults(persistToo){
  GLOBAL_DEFAULTS = { shipAddress:'', fedexAccount:'' };
  if(persistToo){ try{ localStorage.removeItem(DEFAULTS_STORAGE_KEY);}catch(_e){} }
  const a=$('#g_shipAddress'), f=$('#g_fedexAccount');
  if(a) a.value=''; if(f) f.value='';
}

/* ===== Date helpers ===== */
const DATE_KEYS = new Set([
  'dueDate','deliveryDate','shipDate','estimatedArrival','newDate',
  'pickupDate','dropoffDate','scheduleDate'
]);
function isDateKey(k){ return DATE_KEYS.has((k||'').toString()); }
function formatDateForOutput(yyyy_mm_dd){
  if(!yyyy_mm_dd) return '';
  const [y,m,d] = yyyy_mm_dd.split('-').map(x=>parseInt(x,10));
  if(!y||!m||!d) return '';
  const mm = String(m).padStart(2,'0');
  const dd = String(d).padStart(2,'0');
  const nowY = new Date().getFullYear();
  return (y === nowY) ? `${mm}/${dd}` : `${mm}/${dd}/${y}`;
}


/* =========================================================================================
 * Field rendering
 * =======================================================================================*/
function renderFields(intent){
  fieldsWrap.innerHTML = '';

  if(!intent){
    if(fieldsHint) fieldsHint.textContent = '';
    return;
  }

  // --- Local templates (u:...) -> build fields from local def, not SCHEMA
  if (intent.startsWith('u:')) {
    if(fieldsHint) fieldsHint.textContent = '';
    const def = loadUserTemplates().find(t => t.id === intent);
    if(!def){ return; }

    const required = (def.fields || []).filter(f => f.required).map(f => f.name);
    const optional = (def.fields || []).filter(f => !f.required).map(f => f.name);
    const allKeys  = [...required, ...optional];
    const types    = Object.fromEntries((def.fields || []).map(f => [f.name, (f.type || 'string').toLowerCase()]));

    for(const key of allKeys){
      const wrap  = document.createElement('div');
      wrap.className = 'kv';

      const label = document.createElement('label');
      label.htmlFor = `f_${key}`;
      label.textContent = toTitle(key);
      wrap.appendChild(label);

      const t = String(types[key] || '').toLowerCase();
      if (t === 'date') {
        const input = document.createElement('input');
        input.type = 'date';
        input.id = `f_${key}`;
        input.className = 'input';
        wrap.appendChild(input);
      } else if (t === 'longtext' || t === 'text' || t === 'textarea') {
        const ta = document.createElement('textarea');
        ta.id = `f_${key}`;
        ta.rows = 4;
        ta.className = 'input';
        wrap.appendChild(ta);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `f_${key}`;
        input.className = 'input';
        wrap.appendChild(input);
      }

      fieldsWrap.appendChild(wrap);
    }

    const firstLocal = fieldsWrap.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstLocal) firstLocal.focus();
    return; // ✅ handled local template path
  }

  // --- Server templates (schema-backed) ---
  if(!SCHEMA || !SCHEMA[intent]){
    if(fieldsHint) fieldsHint.textContent = '';
    return;
  }

  const spec      = SCHEMA[intent];
  const required  = Array.isArray(spec.required) ? spec.required : [];
  const optional  = Array.isArray(spec.optional) ? spec.optional : [];
  const allKeys   = [...required, ...optional];
  const types     = spec.fieldTypes || {};
  const enums     = spec.enums || {};

  if(fieldsHint) fieldsHint.textContent = '';

  // Recognize “other” options robustly
  function looksLikeOther(opt){
    const val = String(opt?.value ?? opt ?? '').toLowerCase().trim();
    const txt = String(opt?.label ?? opt ?? '')
      .toLowerCase()
      .replace(/[–—]/g,'-')
      .replace(/\s*\(.*?\)\s*/g,'') // drop “(Specify)”
      .trim();
    return val === 'other' || txt === 'other' || /^other\b/.test(txt);
  }

  // Collect "*Other" deferrals for post-wiring
  const deferredOthers = {};  // { baseKey: { wrap, ctrl, key } }

  for (const key of allKeys) {
    // Row container + label
    const wrap  = document.createElement('div');
    wrap.className = 'kv';

    const label = document.createElement('label');
    label.htmlFor = `f_${key}`;
    label.textContent = toTitle(key);
    wrap.appendChild(label);

    // Detect "*Other" companions: e.g., carrierOther -> baseKey "carrier"
    const otherMatch = key.match(/^(.*?)(?:Other|_other)$/);
    const baseKey    = otherMatch && otherMatch[1];

    const baseHasOther = baseKey &&
      Array.isArray(enums?.[baseKey]) &&
      enums[baseKey].some(looksLikeOther);

    // If this is a "*Other" field, render hidden and defer wiring
    if (baseKey && (baseHasOther || otherMatch)) {
      const t = String(types[key] || '').toLowerCase();
      let ctrl;
      if (t === 'longtext')      { ctrl = document.createElement('textarea'); ctrl.rows = 4; }
      else if (t === 'date')     { ctrl = document.createElement('input'); ctrl.type = 'date'; }
      else                       { ctrl = document.createElement('input'); ctrl.type = 'text'; }
      ctrl.id = `f_${key}`;
      ctrl.className = 'input';

      wrap.style.display = 'none';
      wrap.appendChild(ctrl);

      // Mount now for stable DOM order
      fieldsWrap.appendChild(wrap);
      deferredOthers[baseKey] = { wrap, ctrl, key };
      continue;
    }

    // Render enums as <select>
    if (Array.isArray(enums?.[key]) && enums[key].length > 0) {
      const select = document.createElement('select');
      select.id = `f_${key}`;
      select.className = 'input';

      // Optional label map support (kept backwards-compatible)
      const labelsMap = (spec.hints && typeof spec.hints === 'object' && spec.hints[`${key}Labels`]) || {};

      for (const opt of enums[key]) {
        const o = document.createElement('option');
        if (opt && typeof opt === 'object' && 'value' in opt) {
          o.value = String(opt.value);
          o.textContent = String(opt.label || opt.value);
        } else {
          const val = String(opt);
          o.value = val;
          o.textContent = labelsMap[val] ? String(labelsMap[val]) : val;
        }
        select.appendChild(o);
      }

      wrap.appendChild(select);
      fieldsWrap.appendChild(wrap);

      // If this select has a deferred "*Other" companion, wire it now
      const obj = deferredOthers[key];
      if (obj) {
        function syncOther() {
          const sel = select.options[select.selectedIndex];
          const rawVal = String(sel?.value || '');
          const rawTxt = String(sel?.text  || '');
          const val = rawVal.toLowerCase().trim();
          const normTxt = rawTxt.toLowerCase()
            .replace(/[–—]/g,'-')
            .replace(/\s*\(.*?\)\s*/g,'')
            .trim();
          const show = (val === 'other') || (normTxt === 'other') || /^other\b/.test(normTxt);
          obj.wrap.style.display = show ? '' : 'none';
          obj.ctrl.required = show;
          if (!show) obj.ctrl.value = '';
        }
        select.addEventListener('change', syncOther);
        syncOther(); // initialize once
      }

      continue;
    }

    // Normal inputs
    const t = String(types[key] || '').toLowerCase();
    if (t === 'date') {
      const input = document.createElement('input');
      input.type = 'date';
      input.id = `f_${key}`;
      input.className = 'input';
      wrap.appendChild(input);
    } else if (t === 'longtext' || t === 'text' || t === 'textarea') {
      const ta = document.createElement('textarea');
      ta.id = `f_${key}`;
      ta.rows = 4;
      ta.className = 'input';
      wrap.appendChild(ta);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `f_${key}`;
      input.className = 'input';
      wrap.appendChild(input);
    }

    fieldsWrap.appendChild(wrap);
  }

  // Post-render: ensure all deferred "*Other" companions are wired,
  // even if base selects were rendered before their companions
  for (const [baseKey, obj] of Object.entries(deferredOthers || {})) {
    const select = document.getElementById(`f_${baseKey}`);
    if (!select || !obj?.wrap || !obj?.ctrl) continue;
    if (select.dataset.otherWired === '1') continue; // avoid double-binding

    function isOtherSelected(selEl){
      const opt = selEl.options[selEl.selectedIndex];
      const val = String(opt?.value || '').toLowerCase().trim();
      const txt = String(opt?.text  || '')
        .toLowerCase()
        .replace(/[–—]/g,'-')
        .replace(/\s*\(.*?\)\s*/g,'')
        .trim();
      return val === 'other' || txt === 'other' || /^other\b/.test(txt);
    }

    function syncOther(){
      const show = isOtherSelected(select);
      obj.wrap.style.display = show ? '' : 'none';
      obj.ctrl.required = show;
      if (!show) obj.ctrl.value = '';
    }

    select.addEventListener('change', syncOther);
    select.dataset.otherWired = '1';
    syncOther();
  }

  // Prefill shipAddress if global default exists
  const ga = (GLOBAL_DEFAULTS.shipAddress || '').trim();
  const shipAddrEl = fieldsWrap.querySelector('#f_shipAddress');
  if (shipAddrEl && !shipAddrEl.value && ga){
    shipAddrEl.value = ga;
  }

  const first = fieldsWrap.querySelector('input:not([type="hidden"]), select, textarea');
  if (first) first.focus();
}


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


/* =========================================================================================
 * Intent grid (from backend)
 * =======================================================================================*/
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
  const current = loadVisibleIntents(); // Set or null

  // group by industry (already present on INTENTS)
  const grouped = {};
  (INTENTS || []).forEach(it=>{
    if(!it || it.name === 'auto_detect') return;
    const key = it.industry || 'Other';
    (grouped[key] ||= []).push(it);
  });

  function commitFromUI(){
    const s = new Set();
    (INTENTS || []).forEach(it=>{
      const cb = document.getElementById(`vi_${it.name}`);
      if(cb && cb.checked) s.add(it.name);
    });
    saveVisibleIntents([...s]);
  }

  // render groups alphabetically, keep "Other" last
  Object.keys(grouped)
    .sort((a,b)=> (a==='Other')-(b==='Other') || a.localeCompare(b))
    .forEach(groupName=>{
      // header
      const header = document.createElement('div');
      header.className = 'vi-section-title';
      header.textContent = groupName;
      box.appendChild(header);

      // items
      grouped[groupName]
        .slice()
        .sort((a,b)=>(a.label||a.name).localeCompare(b.label||b.name))
        .forEach(it=>{
          const id = `vi_${it.name}`;
          const row = document.createElement('div');
          row.className = 'kv';
          row.innerHTML = `
            <label class="toggle">
              <input type="checkbox" id="${id}" ${current?.includes(it.name)?'checked':''}/>
              <span style="font-weight:800">${it.label || it.name}</span>
            </label>
            <div class="muted">${it.description || ''}</div>
          `;
          row.querySelector('input').addEventListener('change', commitFromUI);
          box.appendChild(row);
        });
    });

  // keep your existing buttons working
  document.getElementById('vi_save') ?.addEventListener('click', commitFromUI);
  document.getElementById('vi_all')  ?.addEventListener('click', ()=>{
    (INTENTS||[]).forEach(it=>{ const cb = document.getElementById(`vi_${it.name}`); if(cb) cb.checked = true; });
    commitFromUI();
  });
  document.getElementById('vi_none') ?.addEventListener('click', ()=>{
    (INTENTS||[]).forEach(it=>{ const cb = document.getElementById(`vi_${it.name}`); if(cb) cb.checked = false; });
    commitFromUI();
  });
  document.getElementById('vi_reset')?.addEventListener('click', ()=>{
    const restored = loadVisibleIntents();
    (INTENTS||[]).forEach(it=>{
      const cb = document.getElementById(`vi_${it.name}`);
      if(cb) cb.checked = restored ? restored.includes(it.name) : false;
    });
    commitFromUI();
  });
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
// Robust event delegation for My Templates list (works after list rebuilds)
(function wireUserTplListDelegation(){
  const list = document.getElementById('userTplList');
  if (!list) return;
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-ut-action]');
    if(!btn) return;

    e.preventDefault(); e.stopPropagation();
    const action = btn.getAttribute('data-ut-action');
    const id = btn.getAttribute('data-ut-id');
    const all = (typeof loadUserTemplates === 'function' ? loadUserTemplates() : []) || [];
    const tpl = all.find(t => t.id === id);

    if(action === 'edit' && typeof openEditor === 'function'){
      openEditor('edit', tpl);
      return;
    }
    if(action === 'dup' && typeof openEditor === 'function'){
      openEditor('dup', tpl);
      return;
    }
    if(action === 'delete' && typeof deleteTemplate === 'function'){
      deleteTemplate(id);
      return;
    }
  });
})();


// === Order Request: Parts editor (Part Number + Quantity with inline +/–) ===

function initOrderRequestPartsEditor(container) {
// Clear and use the card itself (same as other fields)
container.innerHTML = "";
const cardBody = container;

// --- Label row (headers) ---
const header = document.createElement('div');
header.className = 'parts-header';

header.innerHTML = `
  <div class="h">Part<br>Number</div>
  <div class="h">Quantity</div>
  <div></div>
`;
cardBody.appendChild(header);

  // --- Table for rows ---
  const table = document.createElement('table');
  table.className = 'parts-rows';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
cardBody.appendChild(table);

  // Hidden sink used elsewhere in your code (keep the same id if you had one)
  let hidden = container.querySelector('#partsHidden');
  if (!hidden) {
    hidden = document.createElement('textarea');
    hidden.id = 'partsHidden';
    hidden.style.display = 'none';
cardBody.appendChild(hidden);

  }

  // Local state: array of {partNumber, quantity}
  let parts = [];

  // Hydrate from any existing hidden value (supports list JSON)
  try {
    const v = JSON.parse(hidden.value || '[]');
    if (Array.isArray(v)) parts = v.map(r => ({
      partNumber: String(r.partNumber||''),
      quantity: String(r.quantity||'')
    }));
  } catch(_) { /* ignore */ }

  function syncPartsHidden(){
    // Keep only complete rows
    const rows = parts
      .map(r => ({ partNumber: (r.partNumber||'').trim(), quantity: (r.quantity||'').trim() }))
      .filter(r => r.partNumber && r.quantity);
    hidden.value = JSON.stringify(rows);
    // If your app has a global payload builder, it will read this hidden sink
  }

  function render(){
    tbody.innerHTML = '';

    // rows
parts.forEach((row, idx) => {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 3;

  const rowEl = document.createElement('div');
  rowEl.className = 'parts-row';

  // PN
  const pn = document.createElement('input');
  pn.className = 'input parts-input';
  pn.value = row.partNumber || '';
  pn.addEventListener('input', e => {
    parts[idx].partNumber = e.target.value;
    syncPartsHidden();
  });

  // Qty
  const qty = document.createElement('input');
  qty.className = 'input parts-input parts-qty';
  qty.inputMode = 'numeric';
  qty.value = row.quantity || '';
  qty.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/[^\d]/g,'');
    parts[idx].quantity = e.target.value;
    syncPartsHidden();
  });
pn.placeholder = '';
qty.placeholder = '';

  // Minus
 const minus = document.createElement('button');
minus.type = 'button';
minus.className = 'icon-btn parts-minus';
minus.setAttribute('aria-label','Remove row');
minus.textContent = '–';

  minus.addEventListener('click', () => {
    parts.splice(idx, 1);
    render();
    syncPartsHidden();
  });

  rowEl.appendChild(pn);
  rowEl.appendChild(qty);
  rowEl.appendChild(minus);
  td.appendChild(rowEl);
  tr.appendChild(td);
  tbody.appendChild(tr);
});

    // plus row (always exactly one, under the last existing row)
const trPlus = document.createElement('tr');
const tdPlus = document.createElement('td');
tdPlus.colSpan = 3;

const plusWrap = document.createElement('div');
plusWrap.className = 'parts-plus-row';
const plus = document.createElement('button');
plus.type = 'button';
plus.className = 'icon-btn parts-plus';
plus.setAttribute('aria-label','Add part');
plus.textContent = '+';

plus.addEventListener('click', () => {
  parts.push({ partNumber: '', quantity: '' });
  render();
  syncPartsHidden();
});

plusWrap.appendChild(plus);
tdPlus.appendChild(plusWrap);
trPlus.appendChild(tdPlus);
tbody.appendChild(trPlus);

  }

  // Seed with one row if none
  if (parts.length === 0) parts = [{ partNumber:'', quantity:'' }];
  render();
  syncPartsHidden();
}

// Hook into your existing page lifecycle
// Call this AFTER the intent card for "order_request" has been inserted into the DOM.
function enhanceOrderRequestCard() {
  // Find the Parts card DOM node – adjust #partsCard selector to match your markup
  const card = document.querySelector('[data-field="parts"]') || document.querySelector('#partsCard') || null;
  if (card) initOrderRequestPartsEditor(card);
}

// If you already have a function that runs when the intent changes, call enhanceOrderRequestCard() there.
// Otherwise, run once on load (no-op for other intents).
document.addEventListener('DOMContentLoaded', () => {
  try { 
    if (typeof activeIntent !== 'undefined' && activeIntent === 'order_request') {
      enhanceOrderRequestCard();
    }
  } catch(_) {}
});

function listMissing(intentName, fieldsObj){
  const found = INTENTS.find(i => i.name === intentName);
  const req = found && Array.isArray(found.required) ? found.required : [];

  return req.filter(k => {
    // If this is an "*Other" field, only require it when the base select is 'other'
    const m = k.match(/^(.*)Other$/);
    if (m) {
      const base = m[1];
      const baseVal = String(fieldsObj[base] ?? '').toLowerCase().trim();
      const baseTxt = String(fieldsObj[base + 'Label'] ?? '').toLowerCase().trim();
      const baseTxtNorm = baseTxt.replace(/\s*\(.*?\)\s*/g,'').trim();
      const baseIsOther = (baseVal === 'other') || (baseTxtNorm === 'other');
      if (!baseIsOther) return false; // not missing if base isn't Other
    }

    const v = fieldsObj[k];
    if (Array.isArray(v)) return v.length === 0;
    if (v && typeof v === 'object') return Object.keys(v).length === 0;
    return String(v ?? '').trim() === '';
  });
}

function highlightMissing(keys){
  (keys || []).forEach(k=>{
    const el = document.getElementById(`f_${k}`);
    if(el && !el.value){
      el.style.boxShadow = '0 0 0 6px rgba(255,100,100,.12)';
      el.style.borderColor = 'rgba(255,100,100,.55)';
      setTimeout(()=>{ el.style.boxShadow=''; el.style.borderColor=''; }, 1200);
    }
  });
}
function collectFields(intent){
  const fields = {};
  document.querySelectorAll('#fields [id^="f_"]').forEach(el=>{
    const key = el.id.slice(2);
    if(!key) return;
    if(el.tagName === 'SELECT') fields[key] = el.value;
    else if(el.type === 'checkbox') fields[key] = !!el.checked;
    else fields[key] = el.value ?? '';
  });

  // Prefer hidden parts JSON (new editor uses #partsHidden; old table uses #f_parts)
  const partsHidden = document.getElementById('partsHidden') || document.getElementById('f_parts');
  if(partsHidden){
    try{
      const arr = JSON.parse(partsHidden.value || '[]');
      if(Array.isArray(arr)) fields.parts = arr;
    }catch(_){}
  }
  return fields;
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

async function doGenerate(){
  const btn = btnGenerate;

  try{
    if(btn){ btn.disabled = true; btn.setAttribute('aria-busy','true'); }

    // Local template? Render on the client and return early
    if(SELECTED_INTENT && SELECTED_INTENT.startsWith('u:')){
      const defs = loadUserTemplates();
      const def  = defs.find(t=>t.id===SELECTED_INTENT);
      if(def){
        const out = renderLocalTemplate(def, collectFields(SELECTED_INTENT));
        if(liveState.compose){
          await typeInto(outSubject, out.subject || '');
          await typeInto(outBody,    out.body || '');
        }else{
          if(outSubject) outSubject.textContent = out.subject || '';
          if(outBody)    outBody.textContent    = out.body || '';
        }
        return;
      }
    }
const usingAuto = !SELECTED_INTENT || SELECTED_INTENT === 'auto_detect';

let intent = SELECTED_INTENT;
let fields = {};

if (usingAuto){
  // Suggestion mode only: do not auto-pick. Ask the user to choose.
  if (typeof showToast === 'function') {
    showToast('Pick an intent from the suggestions or grid, then press Generate.');
  } else {
    console.info('Auto-Detect: choose a suggested intent (chip) or a card, then press Generate.');
  }
  return;
}

fields = collectFields(intent);
const payload = { intent, fields };

    const missing = listMissing(intent, fields);
    if(missing.length){
      console.warn('[Missing required fields]', missing);
      highlightMissing(missing);
    }

    const res = await fetch('/generate', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(payload)
    });

    let data = null;
    try { data = await res.json(); } catch { /* ignore parse errors */ }

    if(!res.ok){
      const msg = (data && (data.detail || data.message)) ? `: ${data.detail || data.message}` : '';
      console.error('Generate failed:', res.status, data);
      if(fieldsHint) fieldsHint.textContent = ''; // keep hidden
      if(data){
        if(outSubject) outSubject.textContent = data.subject || '';
        if(outBody)    outBody.textContent    = data.body || '';
        if(Array.isArray(data.missing) && data.missing.length){
          console.warn('[Missing required fields]', data.missing);
          highlightMissing(data.missing);
        }
      }
      return;
    }

    const subject = data?.subject || '';
    const bodyRaw = data?.body || '';
    // Remove any leading "Subject:" line that came back in the body
    const body    = bodyRaw.replace(/^\s*subject\s*:\s*.*\n+/i,'');

    if(liveState.compose){
      await typeInto(outSubject, subject);
      await typeInto(outBody,    body);
    } else {
      if(outSubject) outSubject.textContent = subject;
      if(outBody)    outBody.textContent    = body;
    }

    // If backend tells us about missing fields, highlight them
    if(Array.isArray(data?.missing) && data.missing.length){
      console.warn('[Missing required fields]', data.missing);
      highlightMissing(data.missing);
    } else if(fieldsHint && intent !== 'auto_detect'){
      fieldsHint.textContent = '';
    }

  }catch(err){
    console.error('Generate crashed:', err);
    if(fieldsHint) fieldsHint.textContent = '';
  }finally{
    if(btn){ btn.disabled = false; btn.removeAttribute('aria-busy'); }
  }
}

on(btnGenerate, 'click', doGenerate);

document.getElementById('fields')?.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    doGenerate();
  }
});

// --- live toggles state + helpers ---
// Use the shared object managed by the segmented control
const liveState = (window.liveState = window.liveState || { compose:false, preview:true, tId:null });

// Back-compat setters map to modes (in case anything still calls them)
function setLiveCompose(v){
  liveState.compose = !!v;
}
function setLivePreview(v){
  liveState.preview = !!v;
}

// simple typewriter effect for Output panel
async function typeInto(el, text){
  if(!el){ return; }
  el.textContent = '';
  const CHUNK = 3;
  for (let i = 0; i < text.length; i += CHUNK){
    const end = Math.min(i + CHUNK, text.length);
    el.textContent = text.slice(0, end);
    await new Promise(r => setTimeout(r, 8));
  }
  el.textContent = text; // guarantee no truncation
}

function scheduleLiveGenerate(delayMs=200){
  if(!liveState.preview) return;        // gate on toggle
  clearTimeout(liveState.tId);
  liveState.tId = setTimeout(()=> doGenerate(), delayMs);
}

// expose for predict code path that already calls these
window.scheduleLiveGenerate = scheduleLiveGenerate;


/* ===== Compose Mode (Preview / Type / Off) ===== */
const MODE_KEY = 'sm_compose_mode'; // 'preview' | 'type' | 'off'

(function migrateLegacyComposeFlags(){
  const oldCompose = localStorage.getItem('sm_live_compose');
  const oldPreview = localStorage.getItem('sm_live_preview');
  if(oldCompose !== null || oldPreview !== null){
    const mode = (oldPreview === '1') ? 'preview' : (oldCompose === '1') ? 'type' : 'off';
    localStorage.setItem(MODE_KEY, mode);
    localStorage.removeItem('sm_live_compose');
    localStorage.removeItem('sm_live_preview');
  }
})();

function applyComposeMode(mode){
  // normalize to allowed values
  mode = (mode === 'preview' || mode === 'type' || mode === 'off') ? mode : 'type';
  localStorage.setItem(MODE_KEY, mode);

  // drive your existing liveState via the public setters you already have
  setLivePreview(mode === 'preview'); // auto-generate while typing
  setLiveCompose(mode === 'type');    // typewriter effect on Output

  // reflect on big Generate button
  if (btnGenerate) btnGenerate.style.display = (mode === 'preview') ? 'none' : '';

  // update segmented control UI if it exists
  const seg = document.getElementById('composeSeg');
  if(seg){
    seg.querySelectorAll('.opt').forEach(b=>{
      b.setAttribute('aria-selected', String(b.dataset.mode === mode));
    });
  }
}

function initComposeModeUI(){
  const seg = document.getElementById('composeSeg');
  const initial = localStorage.getItem(MODE_KEY) || 'type';
  applyComposeMode(initial);

  if(!seg) return;
  seg.querySelectorAll('.opt').forEach(b=>{
    b.setAttribute('aria-selected', String(b.dataset.mode === initial));
  });
  seg.addEventListener('click', (e)=>{
    const b = e.target.closest('.opt');
    if(!b) return;
    applyComposeMode(b.dataset.mode);
  });
}
function buildUserTemplatesUI(){
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


/* =========================================================================================
 * Settings menu + Theme + Typing toggles + Copy/Clear + Global Defaults wiring
 * =======================================================================================*/
(function wireUI(){
  // Initialize segmented control + apply current mode (Preview/Type/Off)
  initComposeModeUI();
  // Reflect current mode on the Generate button (redundant safeguard)
  if(btnGenerate){ btnGenerate.style.display = liveState.preview ? 'none' : ''; }

  // auto-generate when fields change (gated by livePreview)
  document.getElementById('fields')?.addEventListener('input', ()=>{
    scheduleLiveGenerate(250);
  });

  // also auto-generate if you’re in Auto Detect draft area and they type
  document.getElementById('subject')?.addEventListener('input', ()=> scheduleLiveGenerate(300));
  document.getElementById('hint')?.addEventListener('input',    ()=> scheduleLiveGenerate(300));

const settingsBtn   = document.querySelector('.settings-btn');
const settingsMenu  = document.querySelector('.settings-menu');

// Keep the settings menu open when interacting with its contents
if (settingsMenu && !settingsMenu._stopper){
  settingsMenu._stopper = true;
  settingsMenu.addEventListener('click', (e)=> e.stopPropagation());
}


const subIntents    = document.getElementById('subIntents'); 
const subUserTpls   = document.getElementById('subUserTpls');
const subTheme      = document.getElementById('subTheme');
const subTyping     = document.getElementById('subTyping');
const subDefaults   = document.getElementById('subDefaults');
const themeSelect   = document.getElementById('themeSelect');    // NEW

// === VISUAL FIX: make Theme "Preset" a single full-width dropdown, no label, no overflow ===
(function fixThemePresetRow(){
  if (!themeSelect) return;

  // Find the row that contains the label + select
  const row = themeSelect.closest('.settings-row') || (subTheme && subTheme.querySelector('.settings-row'));
  if (!row) return;

  // 1) Remove the "Preset" label entirely
  const labelEl = row.querySelector('label');
  if (labelEl) labelEl.remove();

  // 2) Make the select the only element and ensure it doesn't bleed out of its panel
  Object.assign(row.style, {
    display: 'block',
    padding: '0',
    overflow: 'hidden'
  });

  Object.assign(themeSelect.style, {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    marginTop: '2px',
    marginBottom: '2px'
  });
})();
// === VISUAL FIX 2: remove outer subpanel padding/border around Theme preset ===
(function flattenThemeSubpanel(){
  const subTheme = document.getElementById('subTheme');
  if (!subTheme) return;

  // remove the rounded background box look
  Object.assign(subTheme.style, {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: '0',
    marginTop: '6px'
  });

  // tighten spacing so it aligns cleanly with the rest of the menu
  const row = subTheme.querySelector('.settings-row');
  if (row) {
    row.style.margin = '0';
  }
})();

function closeAllSubs(){
  [subTheme, subTyping, subIntents, subUserTpls, subDefaults].forEach(el => el && el.classList.remove('open'));
  document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
}
let currentlyOpen = null;
function openOnly(which){
  // toggle: if clicking the same item, close all
  if(currentlyOpen === which){
    closeAllSubs(); currentlyOpen = null;
    document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
    return;
  }
  closeAllSubs();
  if(which==='theme'     && subTheme)     subTheme.classList.add('open');
  if(which==='typing'    && subTyping)    subTyping.classList.add('open');
  if(which==='intents'   && subIntents)  { subIntents.classList.add('open');  buildIntentsChecklist?.(); }
  if(which==='usertpls'  && subUserTpls) { subUserTpls.classList.add('open'); buildUserTemplatesUI?.(); }
  if(which==='defaults'  && subDefaults)  subDefaults.classList.add('open');
const opened = (
  which==='theme'    ? subTheme   :
  which==='typing'   ? subTyping  :
  which==='intents'  ? subIntents :
  which==='usertpls' ? subUserTpls:
  which==='defaults' ? subDefaults: null
);

const menu = opened?.closest('.settings-menu');
if (menu) {
  // Scroll so the *header row* sits at the very top of the menu viewport.
  const header = menu.querySelector(`.settings-item[data-item="${which}"]`);
  requestAnimationFrame(()=>{
    if (header) menu.scrollTo({ top: header.offsetTop - 6, behavior: 'smooth' });
  });
}

  currentlyOpen = which;
  document.querySelectorAll('.settings-item').forEach(row=>{
    const chev = row.querySelector('.chev');
    if(!chev) return;
    chev.classList.toggle('rot90', row.getAttribute('data-item')===which);
  });
}


function toggleMenu(){
  const willOpen = !settingsMenu.classList.contains('open');
  settingsMenu.classList.toggle('open', willOpen);
  if(!willOpen) closeAllSubs();
  // reflect state for a11y
  const btn = document.getElementById('settingsBtn');
  if(btn) btn.setAttribute('aria-expanded', String(willOpen));
}

  on(settingsBtn,'click', (e)=>{ e.stopPropagation(); toggleMenu(); });
  on(settingsMenu,'click', (e)=>{
    const row = e.target.closest('.settings-item');
    if(!row) return;
    const which = row.getAttribute('data-item');
    if(which) openOnly(which);
  });
on(document,'click', (e)=>{
  if(!settingsMenu.classList.contains('open')) return;

  // NEW: if click happens inside Settings menu OR inside the editor dialog, do nothing
  const inSettings = settingsMenu.contains(e.target);
  const onBtn      = settingsBtn.contains(e.target);
  const inDialog   = !!e.target.closest('#ut_editor');   // <dialog> and its children

  if(!inSettings && !onBtn && !inDialog){
    settingsMenu.classList.remove('open');
    closeAllSubs();
  }
});

  // Theme switching (persist in localStorage)
  const THEME_KEY = 'sm_theme';
  const saved = localStorage.getItem(THEME_KEY);
  if(saved){ document.body.dataset.theme = saved; }
  if(themeSelect){ themeSelect.value = document.body.dataset.theme || 'light-minimal'; }
  
on(themeSelect, 'change', ()=>{
    const val = themeSelect.value || 'light-minimal';
    document.body.dataset.theme = val;
    localStorage.setItem(THEME_KEY, val);
    if(val==='cosmic') Starfield.start(); else Starfield.stop();
    if(val==='pastell') PastellPets.enable(); else PastellPets.disable();   // NEW
  });

  // --- Copy + Clear buttons (message + restore) ---
  const copySubjectBtn = document.getElementById('copySubject');
  const copyBodyBtn    = document.getElementById('copyBody');
  const clearBtn       = document.getElementById('btnClear');

  async function copyText(txt){
    try{ await navigator.clipboard.writeText(txt); }catch(e){ console.warn('Clipboard error', e); }
  }
  function flashBtn(btn, msg){
    if(!btn) return;
    const old = btn.textContent;
    btn.textContent = msg;
    btn.classList.add('toast');
    setTimeout(()=>{
      btn.classList.remove('toast');
      btn.textContent = old;
    }, 900);
  }

  if(copySubjectBtn){
    copySubjectBtn.addEventListener('click', ()=>{
      const txt = (outSubject?.textContent || '').trim();
      if(!txt){ flashBtn(copySubjectBtn, 'Copied'); return; } // keeps UX consistent
      copyText(txt);
      flashBtn(copySubjectBtn, 'Copied');
    });
  }
  if(copyBodyBtn){
    copyBodyBtn.addEventListener('click', ()=>{
      const txt = (outBody?.textContent || '').trim();
      if(!txt){ flashBtn(copyBodyBtn, 'Copied'); return; }
      copyText(txt);
      flashBtn(copyBodyBtn, 'Copied');
    });
  }
if(clearBtn){
  clearBtn.addEventListener('click', ()=>{
    if(outSubject) outSubject.textContent = '';
    if(outBody)    outBody.textContent = '';
    document.querySelectorAll('#fields input, #fields select, #fields textarea')
      .forEach(i=> i.value = '');
    flashBtn(clearBtn, 'Cleared');
  });
}

  /* ===== Global Defaults wiring ===== */
  loadGlobalDefaults(); // hydrate Settings UI with saved values (if any)

  const gAddr  = document.getElementById('g_shipAddress');
  const gAcct  = document.getElementById('g_fedexAccount');
  const gSave  = document.getElementById('g_save');
  const gApply = document.getElementById('g_apply');
  const gClear = document.getElementById('g_clear');

  function captureDefaultsFromUI(){
    GLOBAL_DEFAULTS.shipAddress  = (gAddr?.value || '').trim();
  }

  if(gApply){
    gApply.addEventListener('click', ()=>{
      captureDefaultsFromUI();
      if(gSave?.checked) saveGlobalDefaults();
      // Re-render fields for current intent so defaults prefill immediately
      if(SELECTED_INTENT){ renderFields(SELECTED_INTENT); }
    });
  }

  if(gClear){
    gClear.addEventListener('click', ()=>{
      const persist = !!gSave?.checked;
      clearGlobalDefaults(persist);
      if(SELECTED_INTENT){ renderFields(SELECTED_INTENT); }
    });
  }
})();




// ===== User Templates (local-only) =====

// --- My Templates editor element refs (needed by openEditor/collectEditor) ---
const dlgUT    = document.getElementById('ut_editor');
if (dlgUT && !dlgUT._shielded){
  dlgUT._shielded = true;
  // Capture-phase listeners guarantee suppression before the document handler
// Remove the blanket shield above and use this instead:
dlgUT.addEventListener('click', (e)=>{
  // Only intercept true backdrop clicks (target is the <dialog> itself)
  if (e.target === dlgUT) {
    e.stopPropagation();
  }
}, true);


}
// Hard-disable native validation + accidental submit inside the dialog form
const formUT = document.getElementById('ut_form');
if (formUT && !formUT._noValidate) {
  formUT._noValidate = true;
  formUT.setAttribute('novalidate','');

  // Prevent any submit attempts (Enter key, implicit submit, etc.)
  formUT.addEventListener('submit', (e)=>{
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Swallow native validity popups
  formUT.addEventListener('invalid', (e)=>{
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Stop Enter (outside textareas) from triggering submit
  formUT.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

const fId      = document.getElementById('ute_id');

const fLabel   = document.getElementById('ute_label');
const fDesc    = document.getElementById('ute_desc');
const fFields  = document.getElementById('ute_fields');
const fSubj    = document.getElementById('ute_subject');
const fBody    = document.getElementById('ute_body');


const USER_TPLS_KEY = 'sm_user_templates_v1';   // array of {id:'u:xxx', name:'u:xxx', label, description, fields[], subject, body}

function loadUserTemplates(){
  try{
    const raw = localStorage.getItem(USER_TPLS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if(Array.isArray(arr)) return arr;
  }catch(_e){}
  return [];
}
function saveUserTemplates(list){
  try{ localStorage.setItem(USER_TPLS_KEY, JSON.stringify(list||[])); }catch(_e){}
}

// Convert compact field lines into [{name,type,required,hint?}]
function parseFieldLines(text){
  const out = [];
  (text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(line=>{
    const [name, type='string', req=''] = line.split(':').map(x=>x.trim());
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
    out.push({name, type: (type||'string'), required: (req.toLowerCase()==='required')});
  });
  return out;
}

// Escape HTML for safe preview
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Basic {{ field }} interpolation (no logic)
function renderLocalTemplate(def, data){
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
  const sub = (tpl)=> String(tpl||'').replace(re, (_m, key)=> esc(data[key] ?? ''));
  return { subject: sub(def.subject || ''), body: sub(def.body || '') };
}

// Build "intent-like" objects so they mix into the grid
function userTemplatesAsIntents(){
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
function openEditor(mode, existing){
  if (mode === 'new' && !existing){
    fId.value     = '';                // valid starter id
    fLabel.value  = '';
    fDesc.value   = '';
    fFields.value = '';
    fSubj.value   = '';
    fBody.value   = '';
  } else {
    fId.value     = existing ? (existing.id.replace(/^u:/,'') + (mode==='dup' ? '_copy' : '')) : '';
    fLabel.value  = existing ? (existing.label || '') : '';
    fDesc.value   = existing ? (existing.description || '') : '';
    fFields.value = (existing && existing.fields ? existing.fields.map(f=>`${f.name}:${f.type||'string'}${f.required?':required':''}`).join('\n') : '');
    fSubj.value   = existing ? (existing.subject || '') : '';
    fBody.value   = existing ? (existing.body || '') : '';
  }

  // Keep settings visible underneath
  reopenSettingsAfterEditor?.();

  // Avoid native validation/focus weirdness on open
  try { if (document.activeElement) document.activeElement.blur(); } catch(_){}

  // Robust open: use showModal if available, else fallback to open attribute
  if (dlgUT && typeof dlgUT.showModal === 'function') {
    try { dlgUT.showModal(); }
    catch(_e){
      // Safari corner cases: fallback
      dlgUT.setAttribute('open','');
    }
  } else if (dlgUT) {
    dlgUT.setAttribute('open','');
  }
}

// Make sure the +New button works once openEditor is defined
window.addEventListener('DOMContentLoaded', ()=>{
  const newBtn = document.getElementById('tplNew');
  if(!newBtn) return;
  newBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    openEditor('new', null);
  });
});

// === Wire events for new / edit / duplicate actions ===
document.addEventListener('userTpl:edit', (e) => openEditor('edit', e.detail?.template || null));
document.addEventListener('userTpl:dup',  (e) => openEditor('dup',  e.detail?.template || null));

function collectEditor(){
  function slugify(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,64);
  }

  let rawId = fId.value.trim();
  const labelIn = fLabel.value.trim();

  // If ID is empty, derive from label or timestamp
  if(!rawId){
    rawId = slugify(labelIn) || ('tpl_' + Date.now());
    fId.value = rawId; // reflect generated id in UI
  }

  if(!/^[A-Za-z0-9_]{2,64}$/.test(rawId)) return null;

  const id = `u:${rawId}`;
  const label = labelIn || rawId;
  const description = fDesc.value.trim();
  const fields = parseFieldLines(fFields.value);
  return { id, name:id, label, description, fields, subject: fSubj.value || '', body: fBody.value || '' };
}
function upsertTemplate(def){
  const all = loadUserTemplates();
  const i = all.findIndex(x=>x.id===def.id);
  if(i>=0) all[i]=def; else all.unshift(def);   // ✅ new first
  saveUserTemplates(all);

  // refresh combined intents + UI + visibility list
  const coreIntents = INTENTS.filter(x => !String(x.name||'').startsWith('u:'));
  INTENTS = [...coreIntents, ...userTemplatesAsIntents()];
  renderIntentGridFromData(INTENTS);
  buildIntentsChecklist();
  buildUserTemplatesUI();
}

// helper for deleting templates by id (shared by row & top buttons)
function deleteTemplate(id){
  if(!id) return;
  // remove from storage
  const next = loadUserTemplates().filter(t => t.id !== id);
  saveUserTemplates(next);

  // also remove from Visible Intents if present
  const vi = loadVisibleIntents();
  if(vi && vi.has(id)){ vi.delete(id); saveVisibleIntents(vi); }

  // rebuild list of intents
  const coreIntents = INTENTS.filter(x => !String(x.name||'').startsWith('u:'));
  INTENTS = [...coreIntents, ...userTemplatesAsIntents()];

  // re-render everything
  renderIntentGridFromData(INTENTS);
  buildIntentsChecklist();
  buildUserTemplatesUI();
}

// Cancel button: close dialog and reopen Settings
// helper: return to Settings → My Templates (robust: no outer-scope deps)
function reopenSettingsAfterEditor(){
  const menu = document.getElementById('settingsMenu');
  const sub  = document.getElementById('subUserTpls');
  const btn  = document.getElementById('settingsBtn');

  if (menu) menu.classList.add('open');
  if (sub)  sub.classList.add('open');

  // keep the chevron state in sync
  document.querySelectorAll('.settings-item .chev').forEach(c => c.classList.remove('rot90'));
  const row = document.querySelector('.settings-item[data-item="usertpls"] .chev');
  if (row) row.classList.add('rot90');

  // reflect ARIA expanded for the gear button
  if (btn) btn.setAttribute('aria-expanded', 'true');

  // remember currently-open for the toggle logic if it exists
  try { window.currentlyOpen = 'usertpls'; } catch(_) {}
}

dlgUT.addEventListener('cancel', (e)=>{
  e.preventDefault();   // prevent native “cancel” default
  dlgUT.close();
  reopenSettingsAfterEditor();
});

// Backdrop click: same behavior as Cancel/ESC
dlgUT.addEventListener('click', (e)=>{
  // click landed on the <dialog> backdrop (outside the inner form)
  const r = dlgUT.getBoundingClientRect();
  const onBackdrop = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if(onBackdrop){
    e.preventDefault();
    e.stopPropagation();
    dlgUT.close();
    reopenSettingsAfterEditor();
  }
}, true);




/* =========================================================================================
 * Corruption / “printer reload” easter egg (preserved)
 * =======================================================================================*/
async function runCorruption(){
  document.body.classList.add('corrupting');
  Starfield.stop();

  const bufferEl  = document.getElementById('buffer');
  const printMask = document.getElementById('printMask');
  const printLine = document.getElementById('printLine');

  if(bufferEl)  bufferEl.classList.add('show');
  await delay(900);
  if(bufferEl)  bufferEl.classList.remove('show');

  if(printMask) printMask.classList.add('show');
  if(printLine) printLine.classList.add('show');

  $$('.panel').forEach(p=> p.style.opacity = '0');
  await delay(2600);

  if(printMask) printMask.classList.remove('show');
  if(printLine) printLine.classList.remove('show');

  $$('.panel').forEach((p,i)=> setTimeout(()=> p.style.opacity = '1', 60*i));

  document.body.classList.remove('corrupting');
  if(document.body.dataset.theme === 'cosmic') Starfield.start();
}

/* =========================================================================================
 * Init (modernized for YAML schema)
 * =======================================================================================*/
(async function init(){
  document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') || 'light-minimal');
  if(document.body.dataset.theme === 'cosmic') Starfield.start();

  try {
    // Fetch generated schema
    const schemaRes = await fetch('/schema');
    if (!schemaRes.ok) throw new Error('Failed to load schema');
    SCHEMA = await schemaRes.json();

    // Fetch compact intent list for cards
    const intentsRes = await fetch('/intents');
    if (!intentsRes.ok) throw new Error('Failed to load intents');
    const data = await intentsRes.json();

    // Render cards dynamically from schema/intents
if (Array.isArray(data) && data.length) {
  // Include auto_detect
  INTENTS = data.map(x => ({
  name: x.id,
  label: x.label || x.id,
  description: "",
  required: [],
  hidden: false,
  industry: x.industry || "Other"
}));

  // Put Auto Detect first
  INTENTS.sort((a, b) => (a.name === 'auto_detect' ? -1 : b.name === 'auto_detect' ? 1 : a.label.localeCompare(b.label)));
} else {
  // No /intents endpoint or empty → build from schema directly
  INTENTS = Object.keys(SCHEMA).map(k => ({
    name: k,
    label: SCHEMA[k].label || toTitle(k),
    description: SCHEMA[k].description || '',
    required: SCHEMA[k].required || [],
    hidden: false
  }));
  INTENTS.sort((a, b) => (a.name === 'auto_detect' ? -1 : b.name === 'auto_detect' ? 1 : a.label.localeCompare(b.label)));
}

    // --- Merge local templates (My Templates) ---
    const coreIntents = INTENTS;
    const localIntents = userTemplatesAsIntents();
    INTENTS = [...coreIntents, ...localIntents];
renderIntentGridFromData(INTENTS);
buildIntentsChecklist();
buildUserTemplatesUI(); // populate the My Templates list
if (window.scheduleAutodetect) window.scheduleAutodetect();

  } catch (err) {
    console.error('Error initializing schema/intents:', err);
    intentGrid.innerHTML = '<div class="muted">Failed to load schema.</div>';
  }

  if (fieldsHint) fieldsHint.textContent = ''; // invisible by design
})();

;
window.EVIL_LARRY_SRC = 'img/evil-larry.png';
;

/* Larry Storm: spawn 1 (Shift+L) or a rain of Larrys (type "larry") */
(function(){
  const IMG_SRC = window.EVIL_LARRY_SRC || 'https://placekitten.com/256/256';
  const COOLDOWN_SINGLE_MS = 1500;
  const COOLDOWN_RAIN_MS   = 8000;

  let lastSingle = 0, lastRain = 0;

  (new Image()).src = IMG_SRC;

  const sprites = new Set();
  let rafId = null;

  function startLoop(){
    if (rafId) return;
    let W = innerWidth, H = innerHeight;
    function fit(){ W = innerWidth; H = innerHeight; }
    addEventListener('resize', fit, { passive:true });

    function frame(ts){
      if (sprites.size === 0){ rafId = null; return; }
      sprites.forEach(s => {
        s.vy += s.g;
        s.x  += s.vx;
        s.y  += s.vy;
        s.a  += s.spin;

        if (s.x <= 0){ s.x = 0; s.vx = Math.abs(s.vx); s.spin = -s.spin; }
        if (s.x >= W - s.size){ s.x = W - s.size; s.vx = -Math.abs(s.vx); s.spin = -s.spin; }
        if (s.y >= H - s.size){ s.y = H - s.size; s.vy = -Math.abs(s.vy) * s.damp; }

        s.el.style.transform = `translate(${s.x}px,${s.y}px) rotate(${s.a}deg)`;

        if (ts - s.t0 > s.life){
          s.el.style.transition = 'transform 1.1s cubic-bezier(.2,.8,.2,1), opacity .9s ease';
          s.el.style.opacity = '0';
          s.el.style.transform = `translate(${s.x}px,-${s.size + 100}px) rotate(${s.a + 720}deg)`;
          setTimeout(()=>{ s.el.remove(); sprites.delete(s); }, 1200);
        }
      });
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function spawnOne(opts = {}){
    const el = document.createElement('div');
    el.className = 'evil-larry';
    el.innerHTML = `<img alt="Evil Larry" referrerpolicy="no-referrer" src="${IMG_SRC}">`;
    document.body.appendChild(el);

    const base = el.getBoundingClientRect().width || 420;
    const scale = opts.scale ?? (0.6 + Math.random()*0.9);
    el.style.transformOrigin = 'center';
    el.style.width  = (base*scale) + 'px';
    el.style.height = (base*scale) + 'px';

    const W = innerWidth, H = innerHeight;
    const size = base * scale;

    const x0 = Math.random() * Math.max(10, W - size - 10);
    const y0 = -size - 40 - Math.random()*120;

    const vx = (Math.random()<0.5?-1:1) * (2 + Math.random()*3);
    const vy = 2 + Math.random()*2;
    const g  = 0.16 + Math.random()*0.08;
    const spin = (Math.random()<0.5?-1:1) * (2.5 + Math.random()*3.5);
    const damp = 0.84 + Math.random()*0.07;

    const s = {
      el, size,
      x:x0, y:y0, vx, vy, g, a:0, spin, damp,
      t0: performance.now(),
      life: (opts.lifeMs ?? (4800 + Math.random()*3000))
    };

    sprites.add(s);
    startLoop();
  }

  function runEvilLarry(){ const now = Date.now(); if (now - lastSingle < COOLDOWN_SINGLE_MS) return; lastSingle = now; spawnOne({ scale: 1 }); }
  function runEvilLarryRain(count = 24){
    const now = Date.now(); if (now - lastRain < COOLDOWN_RAIN_MS) return; lastRain = now;
    const n = Math.max(4, Math.min(64, count));
    for (let i=0; i<n; i++){
      setTimeout(()=> spawnOne({
        scale: 0.6 + Math.random()*1.2,
        lifeMs: 4200 + Math.random()*3500
      }), Math.random()*900);
    }
  }

  window.runEvilLarry = runEvilLarry;
  window.runEvilLarryRain = runEvilLarryRain;

  document.addEventListener('keydown', (e)=>{
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key||'').toLowerCase() === 'l' && e.shiftKey) runEvilLarry();
  });

  const WORD = 'larry'; let seq = []; let lastTs = 0; const MAX_GAP_MS = 3000;
  document.addEventListener('keydown', (e)=>{
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = (e.key||'').toLowerCase();
    if (!/^[a-z]$/.test(k)) return;
    const now = Date.now();
    if (now - lastTs > MAX_GAP_MS) seq = [];
    lastTs = now; seq.push(k); if (seq.length > WORD.length) seq.shift();
    if (seq.join('') === WORD){ runEvilLarryRain(28); seq = []; }
  });
})();

;

/* === Live Auto-Detect on Hint typing (resilient + correct payload) === */
(function(){
  const $ = (s)=>document.querySelector(s);
  const THR = (typeof window.CONF_THR === 'number' ? window.CONF_THR : 0.55);

  let currentHintEl = null;
  let debounceTimer = null;
  let inflight = null;

  const els = {
    to:         $('#to'),
    subject:    $('#subject'),
    predStatus: $('#predStatus'),
    predInfo:   $('#predInfo'),
    predIntent: $('#predIntent'),
    predBadge:  (function(){
                  let n = document.getElementById('predBadge');
                  if(!n){
                    n = document.createElement('span');
                    n.id = 'predBadge';
                    n.className = 'pill';
                    document.getElementById('predInfo')?.appendChild(n);
                  }
                  return n;
                })(),
    predMsg:    $('#predMsg'),
    topK:       $('#topK'),
    btnPredict: $('#btnPredict')
  };



    const toNice = (s)=> (s||'').replaceAll('_',' ').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    function scoreBadge(score){ return `${Math.round((score ?? 0)*100)}%`; }
    function setPredictStatus(msg){ if(els.predStatus) els.predStatus.textContent = msg || ''; }
    function hidePredictInfo(){ if(els.predInfo) els.predInfo.style.display='none'; if(els.topK) els.topK.innerHTML=''; }
function updatePredictUI(data){
  if(!data){ hidePredictInfo(); return; }

  // Normalize common server shapes
  const normIntent =
    data.intent ?? data.label ?? data.name ?? '';
  const normConf =
    (data.confidence ?? data.score ?? data.prob ?? data.probability ?? 0);
  const normTopK =
    data.top_k ?? data.topK ?? data.top ?? data.candidates ?? [];
  const message = data.message || '';

  if(els.predIntent) els.predIntent.textContent = normIntent ? toNice(normIntent) : '—';
  if(els.predBadge)  els.predBadge.textContent  = `${Math.round(normConf * 100)}%`;
  if(els.predMsg)    els.predMsg.textContent    = message;

  if(els.topK){
    els.topK.innerHTML = '';
    (normTopK || []).forEach(item=>{
      const name  = Array.isArray(item) ? (item[0] ?? '') : (item.label ?? item.intent ?? item.name ?? '');
      const score = Array.isArray(item) ? (item[1] ?? 0) : (item.score ?? item.confidence ?? 0);

        const b = document.createElement('button');
        b.className = 'btn secondary';
        b.textContent = `${toNice(name)} (${Math.round((score??0)*100)}%)`;
             b.addEventListener('click', ()=>{
        document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));
        const target = name;
        [...document.querySelectorAll('.intent-card')]
          .find(x=>x.dataset.intent === target || x.querySelector('.intent-name')?.textContent?.trim() === toNice(target))
          ?.classList.add('active');

        // Manual select only (no auto-generate)
        if (typeof window.setSelectedIntent === 'function') window.setSelectedIntent(target);

        setTimeout(()=>{
          const hintNow = (document.getElementById('hint')?.value || '').trim();
          if (hintNow) window.autoPopulateFields?.(target, hintNow);
        }, 60);
        window.scrollTo({ top: document.body.scrollHeight/3, behavior: 'smooth' });
      }); 
els.topK.appendChild(b);
      });
    }
  if(els.predInfo) els.predInfo.style.display='flex';

  // Suggestions only: do NOT auto-select here.
}

async function predictNow(hintVal){
  if(inflight){ try{ inflight.abort(); }catch{} }
  inflight = new AbortController();

  const payload = {
    to:       (els.to?.value || '').trim(),
    subject:  (els.subject?.value || '').trim(),
    body_hint: (hintVal || '').trim()
  };
  if(!payload.subject && !payload.body_hint){ setPredictStatus(''); hidePredictInfo(); return; }

  setPredictStatus('Predicting…');
  try{
    const res = await fetch('/predict', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      signal: inflight.signal
    });

    if(!res.ok){
      console.warn('/predict failed', res.status, await res.text());
      setPredictStatus('Prediction failed.');
      hidePredictInfo();
      return;
    }

    const data = await res.json();
    console.debug('predict:', data);
    updatePredictUI(data);
    setPredictStatus('');
  }catch(err){
    if(err?.name === 'AbortError') return;
    setPredictStatus('Prediction failed.');
    hidePredictInfo();
  }
}

  function onType(){
    if(!currentHintEl) return;
    const hint = (currentHintEl.value || '').trim();
    if(!hint){ setPredictStatus(''); hidePredictInfo(); return; }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>predictNow(hint), 150);
  }

  function attachToHint(el){
    if(currentHintEl === el) return;
    if(currentHintEl) currentHintEl.removeEventListener('input', onType);
    currentHintEl = el;
    if(currentHintEl) currentHintEl.addEventListener('input', onType, {passive:true});
  }

  attachToHint($('#hint'));
  const mo = new MutationObserver(()=> attachToHint($('#hint')));
  mo.observe(document.body, {childList:true, subtree:true});

  if(els.btnPredict){
    els.btnPredict.addEventListener('click', (e)=>{
      e.preventDefault();
      const el = $('#hint'); attachToHint(el);
      const hint = (el?.value || '').trim();
      if(!hint){ setPredictStatus(''); hidePredictInfo(); return; }
      predictNow(hint);
    });
  }
  // Allow init() to kick a first prediction if text exists
  window.scheduleAutodetect = function(){
    const el = document.getElementById('hint');
    const hint = (el?.value || '').trim();
    if(hint) {
      predictNow(hint);
    } else {
      setPredictStatus('');
      hidePredictInfo();
    }
  };

})();

;

/* === Nyan-on-"kitty" Easter egg ========================================= */
(function(){
  // Change if you want a local asset instead of the hosted gif:
  // window.NYAN_CAT_SRC = 'img/nyan.gif';
const SRC = window.NYAN_CAT_SRC || 'https://media.tenor.com/rI_0O_9AJ5sAAAAj/nyan-cat-poptart-cat.gif';

  let lastLaunch = 0;            // simple cooldown
  const COOLDOWN_MS = 3500;      // avoid spam if "kitty" appears many times

  function spawnNyan(){
    const now = Date.now();
    if(now - lastLaunch < COOLDOWN_MS) return;
    lastLaunch = now;

    const img = document.createElement('img');
    img.className = 'nyan-cat';
    img.alt = 'Nyan Cat';
    img.src = SRC;
    document.body.appendChild(img);

    // Size & path params
    const W = window.innerWidth;
    const H = window.innerHeight;
    const size = Math.max(72, Math.min(120, Math.round(W * 0.09)));
    img.style.width = size + 'px';

    const startY = H * (0.25 + Math.random() * 0.5);       // somewhere mid-screen
    const amp    = Math.max(50, Math.min(100, H * 0.12));  // sine amplitude
    const periodPx = Math.max(300, Math.min(900, W * 0.8));// sine wavelength
    const k = (2 * Math.PI) / periodPx;

    const pxPerSec = Math.max(280, Math.min(520, W * 0.32)); // speed
    let t0 = null;

    function rainbowDroplet(x, y){
      const d = document.createElement('div');
      d.className = 'nyan-ribbon';
      d.style.left   = (x - size*0.2) + 'px';
      d.style.top    = (y + size*0.35) + 'px';
      d.style.width  = Math.max(80, size * 1.7) + 'px';
      d.style.height = Math.max(6,  Math.round(size * 0.10)) + 'px';
      d.style.background = 'linear-gradient(90deg,#ff0018,#ffa52c,#ffff41,#008018,#0000f9,#86007d)';
      document.body.appendChild(d);
      setTimeout(()=> d.remove(), 1900);
    }

    function tick(ts){
      if(!t0) t0 = ts;
      const dt = (ts - t0) / 1000;            // seconds
      const x  = dt * pxPerSec - size;        // start off-screen left
      const y  = startY + Math.sin(x * k) * amp;

      // Leave a rainbow "breadcrumb" most frames
      if (Math.random() < 0.9) rainbowDroplet(x, y);

      img.style.transform = `translate(${x}px, ${y}px)`;
      if (x < W + size * 1.2){
        requestAnimationFrame(tick);
      } else {
        img.style.transition = 'opacity .45s ease';
        img.style.opacity = '0';
        setTimeout(()=> img.remove(), 460);
      }
    }
    requestAnimationFrame(tick);
  }

  // Fire when any input/textarea contains "kitty" (case-insensitive)
  function onAnyInput(e){
    const el = e.target;
    if(!el || !('value' in el)) return;
    const v = String(el.value || '').toLowerCase();
    if (v.includes('kitty')) spawnNyan();
  }

  document.addEventListener('input', onAnyInput, { passive: true });

  // Optional: expose a manual trigger for testing in console
  window.spawnNyan = spawnNyan;

})();


// === Final wiring for dialog buttons (ensure dlgUT exists) ===
window.addEventListener('DOMContentLoaded', ()=>{
  const dlgUT = document.getElementById('ut_editor');
  if(!dlgUT) return;

  const btnCancel = dlgUT.querySelector('#ute_cancel');
  const formUT = dlgUT.querySelector('#ut_form');

  // helper to reopen Settings → My Templates
  function reopenSettingsAfterEditor(){
    const menu = document.querySelector('.settings-menu');
    const sub  = document.getElementById('subUserTpls');
    const btn  = document.getElementById('settingsBtn');
    if (menu) menu.classList.add('open');
    if (sub)  sub.classList.add('open');
    if (btn)  btn.setAttribute('aria-expanded','true');
    window.currentlyOpen = 'usertpls';
  }

// Make Cancel behave the same as clicking outside the dialog
btnCancel?.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();

  // Dispatch a synthetic click on the backdrop to reuse that logic
  const rect = dlgUT.getBoundingClientRect();
  const fakeEvent = new MouseEvent('click', {
    clientX: rect.left - 10,   // outside bounds
    clientY: rect.top - 10,
    bubbles: true,
    cancelable: true
  });
  dlgUT.dispatchEvent(fakeEvent);
});

  // ESC key
  dlgUT.addEventListener('cancel', (e)=>{
    e.preventDefault();
    dlgUT.close();
    reopenSettingsAfterEditor();
  });

  // Backdrop click
  dlgUT.addEventListener('click', (e)=>{
    const r = dlgUT.getBoundingClientRect();
    const onBackdrop = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if(onBackdrop){
      e.preventDefault();
      e.stopPropagation();
      dlgUT.close();
      reopenSettingsAfterEditor();
    }
  }, true);
});
/* ============================================================================
 * My Templates dialog — clean rewrite (opens reliably, single-bind listeners)
 * Elements expected:
 *   <dialog id="ut_editor"> … <form id="ut_form"> … #ut_save  #ut_cancel …
 *   Inputs inside form use ids like: #fId, #fLabel, #fSubject, #fBody, …
 * Globals expected:
 *   upsertTemplate(def), buildUserTemplatesUI(), renderIntentGridFromData()
 *   INTENTS (optional), etc.
 * ==========================================================================*/

(function DialogUT(){
  // --- cache refs (live)
  const dlg   = document.getElementById('ut_editor');
  if(!dlg) return; // no-op if dialog not present
  const form  = dlg.querySelector('#ut_form') || dlg.querySelector('form');
const btnSave   = dlg.querySelector('#ute_save');
const btnCancel = dlg.querySelector('#ute_cancel');

  // Guard: ensure Cancel/Save never behave like submit buttons
  if(btnSave)   btnSave.type   = 'button';
  if(btnCancel) btnCancel.type = 'button';
  if(form)      form.setAttribute('novalidate', 'novalidate');

  // Track whether we should reopen Settings → My Templates after close
  let reopenAfterClose = false;

  function openModalSafe(el){
    try { el.showModal(); }
    catch(_){
      // Safari or non-supported: emulate open state
      el.setAttribute('open', '');
      // Ensure backdrop click still works; <dialog> polyfills vary
    }
  }

  function focusFirstField(){
    const first = form && form.querySelector('input,textarea,select,button');
    if(first) first.focus({ preventScroll:true });
  }

  // Robust field collector: picks up any input/textarea/select in the form.
  // Field key = id with leading "f" or "f_" stripped (e.g., fId -> "Id", f_label -> "label")

  function resetForm(){
    if(!form) return;
    form.reset();
    // Clear residual validation styles if any
    form.querySelectorAll('input,textarea,select').forEach(el=>{
      el.style.borderColor = ''; el.style.boxShadow = '';
    });
  }

  function seedForm(existing){
    if(!form || !existing) return;
    Object.entries(existing).forEach(([k,v])=>{
      const id = k.startsWith('f') ? k : (k.length ? `f_${k}` : '');
      const el = id ? form.querySelector('#' + id) : null;
      if(el){
        if(el.type === 'checkbox') el.checked = !!v;
        else el.value = (v ?? '');
      }else{
        // try fallback for camelCase (fId / fLabel etc.)
        const alt = form.querySelector('#f' + k.charAt(0).toUpperCase() + k.slice(1));
        if(alt) { alt.value = (v ?? ''); }
      }
    });
  }

  function highlightMissing(ids){
    (ids || []).forEach(id=>{
      const el = form?.querySelector('#' + id);
      if(!el) return;
      el.style.boxShadow = '0 0 0 6px rgba(255,100,100,.12)';
      el.style.borderColor = 'rgba(255,100,100,.55)';
      setTimeout(()=>{ el.style.boxShadow=''; el.style.borderColor=''; }, 1200);
    });
  }

  function closeEditorInternal(){
    // Close gracefully for both native and "open" fallback
    if(typeof dlg.close === 'function'){
      try { dlg.close(); } catch(_){ dlg.removeAttribute('open'); }
    } else {
      dlg.removeAttribute('open');
    }
  }

  function reopenSettingsAfterEditor(){
    // Open main settings menu
    const menu = document.getElementById('settingsMenu') || document.querySelector('.settings-menu');
    const btn  = document.getElementById('settingsBtn')  || document.querySelector('.settings-btn');
    if(menu){
      menu.classList.add('open');
      if(btn) btn.setAttribute('aria-expanded','true');
    }
    // Try to open the "My Templates" subpanel in several resilient ways.
    // 1) Prefer data-item rows
    const rows = Array.from(document.querySelectorAll('.settings-item'));
    let targetRow =
      rows.find(r => (r.getAttribute('data-item')||'').toLowerCase().includes('my')) ||
      rows.find(r => (r.getAttribute('data-item')||'').toLowerCase().includes('template')) ||
      rows.find(r => /my\s*templates/i.test(r.textContent||''));
    if(targetRow){
      targetRow.click(); // uses existing openOnly(...) wiring
      return;
    }
    // 2) Fallback: try well-known subpanel ids
    const candidates = ['subMyTemplates','subUserTpl','subTemplates','subMyTpl'];
    const sub = candidates.map(id=>document.getElementById(id)).find(Boolean);
    if(sub){ sub.classList.add('open'); }
  }

  function closeAndReopen(){
    reopenAfterClose = true;
    closeEditorInternal();
  }

  // Public open API
  function openEditor(mode='new', existing=null){
    // Reset, seed, then open
    resetForm();
    if(form){
      form.dataset.mode = (mode || 'new');
      form.dataset.id   = existing?.id || '';
    }
    if(existing) seedForm(existing);
    openModalSafe(dlg);
    focusFirstField();
  }

  // Expose for the + New button or external code
  window.openEditor = openEditor;

  // Optional: wire a "+ New" launcher if present
  const btnNew = document.getElementById('ut_new') || document.querySelector('[data-action="ut-new"]');
  if(btnNew){
    btnNew.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openEditor('new', null); }, { once:false });
  }

function collectEditor(){
  if(!form) return null;

  // Read actual editor fields (ute_*)
  const fIdEl    = form.querySelector('#ute_id');
  const fLabelEl = form.querySelector('#ute_label');
  const fDescEl  = form.querySelector('#ute_desc');
  const fFieldsEl= form.querySelector('#ute_fields');
  const fSubjEl  = form.querySelector('#ute_subject');
  const fBodyEl  = form.querySelector('#ute_body');

  const rawId   = (fIdEl?.value || '').trim();
  const labelIn = (fLabelEl?.value || '').trim();

  // helper to coerce an id when blank
  const slugify = (s)=> String(s||'')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,64);

  let idCore = rawId || slugify(labelIn);
  if(!idCore) idCore = 'tpl_' + Date.now();

  // validate id format
  if(!/^[a-z0-9_]{2,64}$/.test(idCore)){
    console.debug('[UT] invalid idCore', idCore);
    return null;
  }

  // parse fields (same helper you already have)
  const fields = parseFieldLines(fFieldsEl?.value || '');

  const def = {
    id:   `u:${idCore}`,
    name: `u:${idCore}`,
    label: labelIn || idCore,
    description: (fDescEl?.value || '').trim(),
    fields,
    subject: fSubjEl?.value || '',
    body:    fBodyEl?.value || ''
  };

  // minimal required check
  if(!def.id || !def.label){
    console.debug('[UT] missing required', { id: def.id, label: def.label });
    return null;
  }
  return def;
}

function onSave(e){
  e.preventDefault(); e.stopPropagation();
  const def = collectEditor();
  if(!def){
    alert('Please fill out required fields (ID and Label).');
    ['ute_id','ute_label'].forEach(id=>{
      const el = form.querySelector('#' + id);
      if(el){
        el.style.boxShadow = '0 0 0 6px rgba(255,100,100,.12)';
        el.style.borderColor = 'rgba(255,100,100,.55)';
        setTimeout(()=>{ el.style.boxShadow=''; el.style.borderColor=''; }, 1200);
      }
    });
    return; // keep dialog open on validation fail
  }
  try{
    if(typeof upsertTemplate === 'function') upsertTemplate(def);
    if(typeof buildUserTemplatesUI === 'function') buildUserTemplatesUI();
    if(typeof renderIntentGridFromData === 'function' && Array.isArray(window.INTENTS)){
      renderIntentGridFromData(window.INTENTS);
    }
  }catch(err){
    console.error('upsertTemplate failed:', err);
    alert('Could not save template. See console for details.');
    return; // keep editor open on failure
  }

  // === New: immediately activate the saved template ===
  try {
    selectIntentById(def.id);                            // show its fields
    // close dialog + settings so user sees the main composer
    dlg.close?.();
    const settingsMenu = document.getElementById('settingsMenu');
    settingsMenu?.classList.remove('open');
    document.getElementById('settingsBtn')?.setAttribute('aria-expanded','false');
    document.getElementById('fieldsTitle')?.scrollIntoView({behavior:'smooth', block:'start'});
  } catch(e) {
    console.debug('post-save activation failed', e);
  }
}

  // Cancel handler (no validation)
  function onCancel(e){
    e.preventDefault(); e.stopPropagation();
    closeAndReopen();
  }

  // Backdrop close: detect clicks directly on <dialog> (native backdrop)
  dlg.addEventListener('click', (e)=>{
    if(e.target === dlg){ // clicked the backdrop
      e.stopPropagation();
      closeAndReopen();
    }
  }, { capture:true });

  // ESC key: let dialog handle the close, but ensure we reopen settings uniformly
  dlg.addEventListener('cancel', (e)=>{
    // Don’t block native close; just mark intent and let 'close' do the rest
    reopenAfterClose = true;
  });

  // When the dialog is fully closed by any means, reopen the settings panel
  dlg.addEventListener('close', ()=>{
    if(reopenAfterClose){
      reopenAfterClose = false;
      // microtask → avoid layout thrash if consumers react on 'close'
      Promise.resolve().then(reopenSettingsAfterEditor);
    }
  });

  // Wire buttons (single bind)
  if(btnSave)   btnSave.addEventListener('click', onSave,   { once:false });
  if(btnCancel) btnCancel.addEventListener('click', onCancel,{ once:false });
// === register Settings functions into namespace (no behavior change) ===
(function bindSettingsNamespace(global){
  if (!global.Settings) return; // guard if file order changes

  // If these exist in app.js, bind them; otherwise keep placeholders.
  if (typeof openOnly === 'function') {
    global.Settings.openOnly = openOnly;
  }
  if (typeof buildIntentsChecklist === 'function') {
    global.Settings.buildIntentsChecklist = buildIntentsChecklist;
  }
  if (typeof loadVisibleIntents === 'function') {
    global.Settings.loadVisibleIntents = loadVisibleIntents;
  }
  if (typeof saveVisibleIntents === 'function') {
    global.Settings.saveVisibleIntents = saveVisibleIntents;
  }
})(window);

})();
