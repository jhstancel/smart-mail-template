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
// --- Higher-level hydration (no behavior change) ---
(function (global) {
  const Data = global.Data || (global.Data = {});

  // map /intents rows to your INTENTS item shape
  function mapIntentRow(x) {
    return {
      name: x.id,
      label: x.label || x.id,
      description: "",     // unchanged: UI fills/overrides elsewhere
      required: [],        // unchanged
      hidden: false,       // unchanged
      industry: x.industry || "Other"
    };
  }

  // Merge optional user templates (if your app defines userTemplatesAsIntents)
  function mergeUserTemplates(coreIntents) {
    const extra = (global.userTemplatesAsIntents && typeof global.userTemplatesAsIntents === 'function')
      ? global.userTemplatesAsIntents()
      : [];
    // keep order: core first, then user-defined
    return [...coreIntents, ...extra];
  }

  /**
   * Fetch schema + intents and return normalized structures.
   * opts.mergeUserTemplates: boolean (default true)
   */
  async function hydrateAll(opts = {}) {
    const { schema, intents } = await Data.fetchAll();
    const core = Array.isArray(intents) ? intents.map(mapIntentRow) : [];
    const merged = (opts.mergeUserTemplates ?? true) ? mergeUserTemplates(core) : core;
    return { schema, intents: merged };
  }

  Data.hydrateAll = hydrateAll;
})(window);

