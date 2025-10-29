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

  let reopenAfterClose = false;

  function openModalSafe(el){
    try { el.showModal(); }
    catch(_){ el.setAttribute('open', ''); }
  }
  function resetForm(){ if(form){ form.reset(); form.querySelectorAll('input,textarea,select').forEach(el=>{ el.style.borderColor = ''; el.style.boxShadow = ''; }); } }
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
    Object.entries(map).forEach(([sel,val])=>{ const el = form.querySelector(sel); if(el) el.value = val; });
  }
  function closeEditorInternal(){
    if(typeof dlg.close === 'function'){ try { dlg.close(); } catch(_){ dlg.removeAttribute('open'); } }
    else dlg.removeAttribute('open');
  }
  function reopenSettingsAfterEditor(){
    const menu = document.getElementById('settingsMenu') || document.querySelector('.settings-menu');
    const btn  = document.getElementById('settingsBtn')  || document.querySelector('.settings-btn');
    if(menu){ menu.classList.add('open'); if(btn) btn.setAttribute('aria-expanded','true'); }
    const row = Array.from(document.querySelectorAll('.settings-item')).find(r=>(r.getAttribute('data-item')||'')==='usertpls');
    row?.click();
  }
  function closeAndReopen(){ reopenAfterClose = true; closeEditorInternal(); }

  function openEditor(mode='new', existing=null){
    resetForm();
    if(form){ form.dataset.mode = (mode || 'new'); form.dataset.id = existing?.id || ''; }
    if(existing) seedForm(existing);
    openModalSafe(dlg);
    const first = form?.querySelector('input,textarea,select,button'); first?.focus({ preventScroll:true });
  }
  window.openEditor = openEditor;

  const btnNew = document.getElementById('ut_new') || document.querySelector('[data-action="ut-new"]');
  btnNew?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openEditor('new', null); });

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

    const fields = parseFieldLines(fFieldsEl?.value || '');
    const def = {
      id: `u:${idCore}`, name:`u:${idCore}`,
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
    const def = collectEditor();
    if(!def){
      alert('Please fill out required fields (ID and Label).');
      ['ute_id','ute_label'].forEach(id=>{
        const el = form.querySelector('#' + id);
        if(el){ el.style.boxShadow = '0 0 0 6px rgba(255,100,100,.12)'; el.style.borderColor = 'rgba(255,100,100,.55)'; setTimeout(()=>{ el.style.boxShadow=''; el.style.borderColor=''; }, 1200); }
      });
      return;
    }
    try{
      upsertTemplate(def);
      window.buildUserTemplatesUI?.();
      window.renderIntentGridFromData?.(window.INTENTS || []);
    }catch(err){
      console.error('upsertTemplate failed:', err);
      alert('Could not save template. See console for details.');
      return;
    }
    try {
      window.selectIntentById?.(def.id);
      dlg.close?.();
      const settingsMenu = document.getElementById('settingsMenu');
      settingsMenu?.classList.remove('open');
      document.getElementById('settingsBtn')?.setAttribute('aria-expanded','false');
      document.getElementById('fieldsTitle')?.scrollIntoView({behavior:'smooth', block:'start'});
    } catch(e) {}
  }

  function onCancel(e){ e.preventDefault(); e.stopPropagation(); closeAndReopen(); }

  dlg.addEventListener('click', (e)=>{ if(e.target === dlg){ e.stopPropagation(); closeAndReopen(); } }, { capture:true });
  dlg.addEventListener('cancel', ()=>{ reopenAfterClose = true; });
  dlg.addEventListener('close', ()=>{ if(reopenAfterClose){ reopenAfterClose = false; Promise.resolve().then(reopenSettingsAfterEditor); } });

  btnSave?.addEventListener('click', onSave);
  btnCancel?.addEventListener('click', onCancel);

  document.addEventListener('userTpl:edit', (e) => openEditor('edit', e.detail?.template || null));
  document.addEventListener('userTpl:dup',  (e) => openEditor('dup',  e.detail?.template || null));
})();
