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

  async function open(intentId, opts={}){
    onSavedCb = opts.onSaved || null;
    currentIntent = intentId;
    el.intent.textContent = intentId;
    el.title.textContent = 'Edit Template';

    // Load current override or defaults
    let cur = window.LocalTemplates.get(intentId);
    if (!cur) cur = await loadDefaults(intentId);

    el.subj.value = cur.subject || '';
    el.body.value = cur.body || '';
    fillPreview();

    try{ dlg.showModal(); } catch{ dlg.show(); }
  }

  function close(){
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.open = false;
  }

  // Save handler
  el.form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if (!currentIntent) return;
    const subject = (el.subj.value || '').trim();
    const body = (el.body.value || '').trim();
    window.LocalTemplates.set(currentIntent, { subject, body });
    if (typeof onSavedCb === 'function') onSavedCb();
    close();
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
  });

  // Live preview update (lightweight)
  el.subj.addEventListener('input', fillPreview);
  el.body.addEventListener('input', fillPreview);

  // expose
  window.TplEditor = { open, close };
})();

