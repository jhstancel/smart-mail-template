// ui/generate.js
(function (global) {
  const Generate = {};

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




  // If you have a small wrapper like function generate(){ ... } paste it too:
  // function generate(){ /* PASTE BODY */ }

  // Expose
  Generate.collectFields = collectFields;
  Generate.syncPartsHidden = syncPartsHidden;
  Generate.doGenerate = doGenerate;
  // Generate.generate = generate; // uncomment if you pasted it

  global.Generate = Generate;
})(window);

