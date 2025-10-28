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

// --- Higher-level hydration (normalized INTENTS) ---
(function (global) {
  const Data = global.Data || (global.Data = {});

  // Normalize one /intents row with SCHEMA fallbacks:
  // id (canonical), name (alias), label, description, industry
  function mapIntentRow(x, schemaById) {
    const id   = x.id || x.name;
    const meta = (schemaById && schemaById[id]) || {};
    return {
      id,                     // canonical
      name: id,               // alias for older code paths
      label: x.label || meta.label || id,
      description: x.description || meta.description || '',
      industry: x.industry || meta.industry || 'Other',
      // keep shape-compatible fields if callers expect them
      required: Array.isArray(meta.required) ? meta.required.slice() : [],
      hidden: false
    };
  }

  function mergeUserTemplates(coreIntents) {
    // Prefer the new namespace; fall back if older alias is present
    const asIntents =
      (global.UserTemplates && typeof global.UserTemplates.asIntents === 'function')
        ? global.UserTemplates.asIntents
        : (global.userTemplatesAsIntents && typeof global.userTemplatesAsIntents === 'function')
            ? global.userTemplatesAsIntents
            : null;
    const extra = asIntents ? asIntents() : [];
    return [...coreIntents, ...extra];
  }

  /**
   * Fetch schema + intents and return normalized structures.
   * opts.mergeUserTemplates: boolean (default true)
   */
  async function hydrateAll(opts = {}) {
    const { schema, intents } = await Data.fetchAll();
    const schemaById = (schema && typeof schema === 'object') ? schema : {};
    const core = Array.isArray(intents) ? intents.map(row => mapIntentRow(row, schemaById)) : [];
    const merged = (opts.mergeUserTemplates ?? true) ? mergeUserTemplates(core) : core;
    return { schema, intents: merged };
  }

  Data.hydrateAll = hydrateAll;
})(window);

