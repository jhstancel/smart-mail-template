// ui/js/templates/local-templates.js
// Local per-intent template overrides in localStorage
(function () {
  const NS = 'SMT_LOCAL_TEMPLATES_V1'; // versioned namespace

  function read() {
    try { return JSON.parse(localStorage.getItem(NS) || '{}'); }
    catch { return {}; }
  }
  function write(db) {
    localStorage.setItem(NS, JSON.stringify(db));
  }

function get(intentId) {
  const id = String(intentId || '');
  if (id.startsWith('u:')) {
    const ut = (window.UserTemplates?.getById?.(id)) || null;
    if (ut) return { subject: ut.subject || '', body: ut.body || '' };
    return null;
  }
  const db = read();
  return db[id] || null; // { subject?, body?, updatedAt, version }
}

  function set(intentId, data) {
    const db = read();
    db[intentId] = {
      ...(db[intentId] || {}),
      ...(data || {}),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    write(db);
    return db[intentId];
  }

  function remove(intentId) {
    const db = read();
    delete db[intentId];
    write(db);
  }

  function list() {
    const db = read();
    return Object.keys(db).map(k => ({ intentId: k, ...db[k] }));
  }

async function fetchDefaultSource(intentId) {
  const id = String(intentId || '');
  if (id.startsWith('u:')) {
    return { intentId: id, subject: '', body: '' }; // no backend defaults for user templates
  }
  const res = await fetch(`/template_source/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load template source: ' + res.status);
  return await res.json();
}

async function quickEdit(intentId) {
  const id = String(intentId || '');
  if (id.startsWith('u:')) {
    window.openEditor?.('edit', window.UserTemplates?.getById?.(id) || null);
    return;
  }
  const current = get(id) || (await fetchDefaultSource(id));
  const subj = prompt(`Edit SUBJECT template for ${id}`, current?.subject || '');
  if (subj === null) return;
  const body = prompt(`Edit BODY (Jinja) for ${id}`, current?.body || '');
  if (body === null) return;
  set(id, { subject: subj, body });
  alert('Saved to local templates. Generate again to preview.');
}

  window.LocalTemplates = { get, set, remove, list, fetchDefaultSource, quickEdit };
})();

