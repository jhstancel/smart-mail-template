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
    const db = read();
    return db[intentId] || null; // { subject?, body?, updatedAt, version }
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

  // Optionally pull defaults from backend for bootstrap (subject + raw Jinja body)
  async function fetchDefaultSource(intentId) {
    const res = await fetch(`/template_source/${encodeURIComponent(intentId)}`);
    if (!res.ok) throw new Error(`Failed to load template source: ${res.status}`);
    return res.json(); // { intentId, subject, body }
  }

  async function quickEdit(intentId) {
    const current = get(intentId) || (await fetchDefaultSource(intentId));
    const subj = prompt(`Edit SUBJECT template for ${intentId}`, current?.subject || '');
    if (subj === null) return;
    const body = prompt(`Edit BODY (Jinja) for ${intentId}`, current?.body || '');
    if (body === null) return;
    set(intentId, { subject: subj, body });
    alert('Saved to local templates. Generate again to preview.');
  }

  window.LocalTemplates = { get, set, remove, list, fetchDefaultSource, quickEdit };
})();

