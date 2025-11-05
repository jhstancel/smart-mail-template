import { parseFieldLines, upsertTemplate } from './store.js';

(function DialogUT(){
  const dlg   = document.getElementById('ut_editor');
  if(!dlg) return;
  const form  = dlg.querySelector('#ut_form') || dlg.querySelector('form');
  const btnSave   = dlg.querySelector('#ute_save');
  const btnCancel = dlg.querySelector('#ute_cancel');

  if(btnSave)   btnSave.type   = 'button';
  if(btnCancel) btnCancel.type = 'button';
  if(form)      form.setAttribute('novalidate', 'novalidate');

  // ------- helper: mark editor open so Settings won't auto-close
  function setEditorOpen(on){ window.__utEditorOpen = !!on; }

  function openModalSafe(el){
    try { el.showModal(); }
    catch(_){ el.setAttribute('open', ''); }
  }
function resetForm(){
  if(!form) return;
  form.reset();
  form.querySelectorAll('input,textarea,select').forEach(el=>{
    el.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
    el.style.borderColor = '';
    el.style.boxShadow = '';
    if (el.id === 'ute_id') el.disabled = false; 
  });
}
  function seedForm(existing){
    if(!form || !existing) return;
    const map = {
      '#ute_id': existing.id?.replace(/^u:/,'') || '',
      '#ute_label': existing.label || '',
      '#ute_desc': existing.description || '',
      '#ute_fields': (existing.fields||[]).map(f=>`${f.name}:${f.type||'string'}${f.required?':required':''}`).join('\n'),
      '#ute_subject': existing.subject || '',
      '#ute_body': existing.body || ''
    };
    Object.entries(map).forEach(([sel,val])=>{
      const el = form.querySelector(sel);
      if(el) el.value = val;
    });
  }

  // --- viewport + centering helpers (unchanged) ---
  function viewportSize(){
    const vv = window.visualViewport;
    if (vv && typeof vv.width === 'number' && typeof vv.height === 'number') {
      return { w: Math.floor(vv.width), h: Math.floor(vv.height) };
    }
    const de = document.documentElement;
    return { w: de.clientWidth, h: de.clientHeight };
  }
  function centerForm(pad = 12){
    if (!dlg || !form) return;
    if (dlg.parentElement !== document.body) document.body.appendChild(dlg);
    form.style.position = 'fixed';
    form.style.left = '0';
    form.style.top = '0';
    form.style.transform = 'none';
    form.style.maxWidth = 'min(680px, 90vw)';
    form.style.maxHeight = '85vh';
    form.style.overflow = 'auto';
    const { w, h } = viewportSize();
    const r = form.getBoundingClientRect();
    const left = Math.max(pad, Math.min(w - r.width  - pad, (w - r.width) / 2));
    const top  = Math.max(pad, Math.min(h - r.height - pad, (h - r.height) / 2));
    form.style.left = left + 'px';
    form.style.top  = top  + 'px';
    dlg.classList.add('open');
  }
  function closeEditorInternal(){
    dlg.classList.remove('open');
    setEditorOpen(false);
    if (typeof dlg.close === 'function') {
      try { dlg.close(); } catch(_){ dlg.removeAttribute('open'); }
    } else {
      dlg.removeAttribute('open');
    }
  }

function openEditor(mode='new', existing=null){
  resetForm();
  if(form){ form.dataset.mode = (mode || 'new'); form.dataset.id = existing?.id || ''; }
  if(existing) seedForm(existing);

  //  Lock ID when editing/duplicating; unlock for new
  const idEl = form?.querySelector('#ute_id');
  if (idEl) {
    idEl.disabled = (mode === 'edit' || mode === 'dup');
  }

  openModalSafe(dlg);
  centerForm();
  setEditorOpen(true);
  const first = form?.querySelector('input,textarea,select,button'); first?.focus({ preventScroll:true });
}

  window.openEditor = openEditor;

  const btnNew = document.getElementById('tplNew')
    || document.getElementById('ut_new')
    || document.querySelector('[data-action="ut-new"]');
  btnNew?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openEditor('new', null); });

  // ------- validation (use CSS class .invalid)
  function clearInvalid(){
    form?.querySelectorAll('.invalid').forEach(i=>{
      i.classList.remove('invalid');
      i.removeAttribute('aria-invalid');
    });
  }
  function markInvalid(el){
    el.classList.add('invalid');
    el.setAttribute('aria-invalid','true');
  }
  function validate(){
    clearInvalid();
    const need = ['#ute_id','#ute_label','#ute_subject','#ute_body']
      .map(sel => form?.querySelector(sel)).filter(Boolean);
    const bad = need.filter(el => !String(el.value || '').trim());
    bad.forEach(markInvalid);
    if (bad.length){
      bad[0].focus();
      return false;
    }
    return true;
  }

function collectEditor(){
  if(!form) return null;
  const fIdEl    = form.querySelector('#ute_id');
  const fLabelEl = form.querySelector('#ute_label');
  const fDescEl  = form.querySelector('#ute_desc');
  const fFieldsEl= form.querySelector('#ute_fields');
  const fSubjEl  = form.querySelector('#ute_subject');
  const fBodyEl  = form.querySelector('#ute_body');

  const rawId   = (fIdEl?.value || '').trim();
  const labelIn = (fLabelEl?.value || '').trim();
  const slugify = s=> String(s||'').toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
  let idCore = rawId || slugify(labelIn);
  if(!idCore) idCore = 'tpl_' + Date.now();
  if(!/^[a-z0-9_]{2,64}$/.test(idCore)) return null;

  // Preserve original ID during edit/dup modes if available
  const dsId = (form.dataset?.id || '').trim();
  const isEditLike = (form.dataset?.mode === 'edit' || form.dataset?.mode === 'dup');
  const finalId = (isEditLike && /^u:/.test(dsId)) ? dsId : `u:${idCore}`;

  const fields = parseFieldLines(fFieldsEl?.value || '');
  const def = {
    id: finalId, name: finalId,
    label: labelIn || idCore,
    description: (fDescEl?.value || '').trim(),
    fields,
    subject: fSubjEl?.value || '',
    body:    fBodyEl?.value || ''
  };
  if(!def.id || !def.label) return null;
  return def;
}

  function onSave(e){
    e.preventDefault(); e.stopPropagation();

    // run validation first (keeps dialog & settings open on failure)
    if(!validate()){
      alert('Please fill required fields.');
      return;
    }

    const def = collectEditor();
    if(!def){
      alert('Invalid ID/Label format.');
      return;
    }
try{
  upsertTemplate(def);
  window.scheduleLiveGenerate?.(0);
  window.buildUserTemplatesUI?.();
  window.renderIntentGridFromData?.(window.INTENTS || []);
}catch(err){
  console.error('upsertTemplate failed:', err);
  alert('Could not save template. See console for details.');
  return;
}

try {
  window.selectIntentById?.(def.id);
  // Immediately show the new text in Output
  window.scheduleLiveGenerate?.(0);

  // DO NOT close Settings; just close the editor
  closeEditorInternal();
  document.getElementById('fieldsTitle')?.scrollIntoView({behavior:'smooth', block:'start'});
} catch(e) {}

  }

  function onCancel(e){
    e.preventDefault();
    e.stopPropagation();
    closeEditorInternal();
  }

  // Backdrop & Esc
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) {
      e.stopPropagation();
      closeEditorInternal();
    }
  }, { capture: true });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeEditorInternal();
  });
  dlg.addEventListener('close', () => { /* no-op */ });

  // Wire buttons
  btnSave?.addEventListener('click', onSave);
  btnCancel?.addEventListener('click', onCancel);

  // Keep centered
  addEventListener('resize', () => { if (dlg?.hasAttribute('open')) centerForm(); });
  window.visualViewport?.addEventListener?.('resize', () => { if (dlg?.hasAttribute('open')) centerForm(); });

  // Expose edit/dup events
  document.addEventListener('userTpl:edit', (e) => openEditor('edit', e.detail?.template || null));
  document.addEventListener('userTpl:dup',  (e) => openEditor('dup',  e.detail?.template || null));

})();

