// ui/js/fields/render-fields.js
// Exact extraction from app.js; exposes functions on window for back-compat.

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

// back-compat exports
window.renderFields = renderFields;
window.highlightMissing = highlightMissing;
window.collectFields = collectFields;

