// ui/js/templates/editor-ui.js
// Slick in-app modal editor for Local Template Overrides.
// Depends on window.LocalTemplates (non-module) already loaded.

(function(){
  const dlg = document.getElementById('tplEditor');
  if (!dlg) return;

  const el = {
    form: document.getElementById('tplForm'),
    title: document.getElementById('tplTitle'),
    intent: document.getElementById('tplIntent'),
    subj: document.getElementById('tplSubj'),
    body: document.getElementById('tplBody'),
    preview: document.getElementById('tplPreview'),
    reset: document.getElementById('tplReset'),
    save: document.getElementById('tplSave'),
    close: document.getElementById('tplClose'),
  };

  let currentIntent = null;
  let onSavedCb = null;

  function fillPreview(){
    const subj = el.subj.value || '';
    const body = el.body.value || '';
    el.preview.textContent = `Subject: ${subj}\n\n${body}`;
  }

  async function loadDefaults(intentId){
    try{
      return await window.LocalTemplates.fetchDefaultSource(intentId);
    }catch(e){
      console.warn('Failed to fetch defaults', e);
      return { intentId, subject: '', body: '' };
    }
  }

  // mark editor open/closed so Settings won't auto-close
  function markEditorOpen(on){ window.__tplEditorOpen = !!on; }

  function clearInvalid(){
    [el.subj, el.body].forEach(i=>{
      i.classList.remove('invalid');
      i.removeAttribute('aria-invalid');
    });
  }

  function markInvalid(input){
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
  }

  function validate(){
    clearInvalid();
    let ok = true;
    if (!(el.subj.value || '').trim()){ markInvalid(el.subj); ok = false; }
    if (!(el.body.value || '').trim()){ markInvalid(el.body); ok = false; }
    return ok;
  }

  async function open(intentId, opts={}){
    onSavedCb = opts.onSaved || null;
    currentIntent = intentId;
    el.intent.textContent = intentId;
    el.title.textContent = 'Edit Template';

    let cur = window.LocalTemplates.get(intentId);
    if (!cur) cur = await loadDefaults(intentId);

    el.subj.value = cur.subject || '';
    el.body.value = cur.body || '';
    fillPreview();

    clearInvalid();
    try{ dlg.showModal(); }catch{ dlg.show(); }
    markEditorOpen(true);
  }

  function close(){
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.open = false;
    markEditorOpen(false);
  }

  // explicit save handler (form no longer uses method="dialog")
  el.save?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!currentIntent) return;

    if (!validate()){
      alert('Cannot save: please fill in the required fields.');
      const firstBad = [el.subj, el.body].find(i => i.classList.contains('invalid'));
      firstBad?.focus();
      return; // keep both dialogs open
    }

    const subject = (el.subj.value || '').trim();
    const body = (el.body.value || '').trim();
    window.LocalTemplates.set(currentIntent, { subject, body });
    if (typeof onSavedCb === 'function') onSavedCb();
    close();
  });

  // Live cleanup: typing removes the invalid state
  [el.subj, el.body].forEach(ctrl=>{
    ctrl?.addEventListener('input', ()=>{
      if ((ctrl.value || '').trim()){
        ctrl.classList.remove('invalid');
        ctrl.removeAttribute('aria-invalid');
      }
      fillPreview();
    });
  });

  // Close button
  el.close.addEventListener('click', (e)=>{ e.preventDefault(); close(); });

  // Reset to defaults (does not auto-save)
  el.reset.addEventListener('click', async (e)=>{
    e.preventDefault();
    if (!currentIntent) return;
    const def = await loadDefaults(currentIntent);
    el.subj.value = def.subject || '';
    el.body.value = def.body || '';
    fillPreview();
    clearInvalid();
  });

  // expose
  window.TplEditor = { open, close };
})();

