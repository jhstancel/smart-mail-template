// ui/js/usertpl/list-delegation.js
// Robust event delegation for My Templates list (works after list rebuilds)
// (Extracted exactly; kept as a tiny module so we don't entangle settings/editor code yet.)
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

