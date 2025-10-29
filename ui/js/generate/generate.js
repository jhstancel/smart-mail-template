import { renderFields } from '../fields/render-fields.js';

const autoStage    = document.getElementById('autoStage');
const btnGenerate  = document.getElementById('btnGenerate');
const outSubject   = document.getElementById('outSubject');
const outBody      = document.getElementById('outBody');
const fieldsHint   = document.getElementById('fieldsHint') || document.querySelector('#fieldsTitle + .subtitle');

window.SELECTED_INTENT = window.SELECTED_INTENT || '';
window.setSelectedIntent = function selectIntent(name){
  window.SELECTED_INTENT = name || '';
  if (!name || name === 'auto_detect'){
    autoStage?.classList.remove('hidden');
    renderFields(null);
  } else {
    autoStage?.classList.add('hidden');
    renderFields(name);
  }
  document.querySelectorAll('.intent-card')
    .forEach(card => card.classList.toggle('active', card.dataset.intent === name));
};

function listMissing(intentName, fieldsObj){
  const found = (window.INTENTS || []).find(i => i.name === intentName);
  const req = found && Array.isArray(found.required) ? found.required : [];
  return req.filter(k => {
    const m = k.match(/^(.*)Other$/);
    if (m) {
      const base = m[1];
      const baseVal = String(fieldsObj[base] ?? '').toLowerCase().trim();
      const baseTxt = String(fieldsObj[base + 'Label'] ?? '').toLowerCase().trim();
      const baseTxtNorm = baseTxt.replace(/\s*\(.*?\)\s*/g,'').trim();
      const baseIsOther = (baseVal === 'other') || (baseTxtNorm === 'other');
      if (!baseIsOther) return false;
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
function collectFields(){
  const fields = {};
  document.querySelectorAll('#fields [id^="f_"]').forEach(el=>{
    const key = el.id.slice(2);
    if(!key) return;
    if(el.tagName === 'SELECT') fields[key] = el.value;
    else if(el.type === 'checkbox') fields[key] = !!el.checked;
    else fields[key] = el.value ?? '';
  });
  const partsHidden = document.getElementById('partsHidden') || document.getElementById('f_parts');
  if(partsHidden){
    try{
      const arr = JSON.parse(partsHidden.value || '[]');
      if(Array.isArray(arr)) fields.parts = arr;
    }catch(_){}
  }
  return fields;
}
async function typeInto(el, text){
  if(!el){ return; }
  el.textContent = '';
  const CHUNK = 3;
  for (let i = 0; i < text.length; i += CHUNK){
    const end = Math.min(i + CHUNK, text.length);
    el.textContent = text.slice(0, end);
    await new Promise(r => setTimeout(r, 8));
  }
  el.textContent = text;
}
const liveState = (window.liveState = window.liveState || { compose:false, preview:true, tId:null });
export function scheduleLiveGenerate(delayMs=200){
  if(!liveState.preview) return;
  clearTimeout(liveState.tId);
  liveState.tId = setTimeout(()=> doGenerate(), delayMs);
}
window.scheduleLiveGenerate = scheduleLiveGenerate;

export async function doGenerate(){
  const btn = btnGenerate;

  try{
    if(btn){ btn.disabled = true; btn.setAttribute('aria-busy','true'); }

    if(window.SELECTED_INTENT && String(window.SELECTED_INTENT).startsWith('u:')){
      const defs = window.loadUserTemplates?.() || [];
      const def  = defs.find(t=>t.id===window.SELECTED_INTENT);
      if(def){
        const out = window.renderLocalTemplate?.(def, collectFields(window.SELECTED_INTENT));
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

    const usingAuto = !window.SELECTED_INTENT || window.SELECTED_INTENT === 'auto_detect';
    if (usingAuto){
      if (typeof window.showToast === 'function') {
        window.showToast('Pick an intent from the suggestions or grid, then press Generate.');
      } else {
        console.info('Auto-Detect: choose a suggested intent (chip) or a card, then press Generate.');
      }
      return;
    }

    const intent = window.SELECTED_INTENT;
    const fields = collectFields();
    const payload = { intent, fields };
    const missing = listMissing(intent, fields);
    if(missing.length){ console.warn('[Missing required fields]', missing); highlightMissing(missing); }

    const res = await fetch('/generate', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(payload)
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if(!res.ok){
      const msg = (data && (data.detail || data.message)) ? `: ${data.detail || data.message}` : '';
      console.error('Generate failed:', res.status, data, msg);
      if(fieldsHint) fieldsHint.textContent = '';
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
    const body    = bodyRaw.replace(/^\s*subject\s*:\s*.*\n+/i,'');

    if(liveState.compose){
      await typeInto(outSubject, subject);
      await typeInto(outBody,    body);
    } else {
      if(outSubject) outSubject.textContent = subject;
      if(outBody)    outBody.textContent    = body;
    }

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
document.getElementById('fields')?.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    doGenerate();
  }
});
document.getElementById('btnGenerate')?.addEventListener('click', doGenerate);

