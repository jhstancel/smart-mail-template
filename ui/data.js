// ui/data.js
(function (global) {
  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  }

  async function fetchSchema() {
    return fetchJSON('/schema');
  }

  async function fetchIntents() {
    return fetchJSON('/intents');
  }

  // Optional: convenience for parallel load
  async function fetchAll() {
    const [schema, intents] = await Promise.all([fetchSchema(), fetchIntents()]);
    return { schema, intents };
  }

  global.Data = { fetchSchema, fetchIntents, fetchAll };
})(window);

