// ui/js/parts/order-parts-editor.js
// Exact extraction; exposed for reuse.

function initOrderRequestPartsEditor(container) {
  // Clear and use the card itself (same as other fields)
  container.innerHTML = "";
  const cardBody = container;

  // --- Label row (headers) ---
  const header = document.createElement('div');
  header.className = 'parts-header';

  header.innerHTML = `
    <div class="h">Part<br>Number</div>
    <div class="h">Quantity</div>
    <div></div>
  `;
  cardBody.appendChild(header);

  // --- Table for rows ---
  const table = document.createElement('table');
  table.className = 'parts-rows';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  cardBody.appendChild(table);

  // Hidden sink used elsewhere in your code (keep the same id if you had one)
  let hidden = container.querySelector('#partsHidden');
  if (!hidden) {
    hidden = document.createElement('textarea');
    hidden.id = 'partsHidden';
    hidden.style.display = 'none';
    cardBody.appendChild(hidden);
  }

  // Local state: array of {partNumber, quantity}
  let parts = [];

  // Hydrate from any existing hidden value (supports list JSON)
  try {
    const v = JSON.parse(hidden.value || '[]');
    if (Array.isArray(v)) parts = v.map(r => ({
      partNumber: String(r.partNumber||''),
      quantity: String(r.quantity||'')
    }));
  } catch(_) { /* ignore */ }

  function syncPartsHidden(){
    // Keep only complete rows
    const rows = parts
      .map(r => ({ partNumber: (r.partNumber||'').trim(), quantity: (r.quantity||'').trim() }))
      .filter(r => r.partNumber && r.quantity);
    hidden.value = JSON.stringify(rows);
    // If your app has a global payload builder, it will read this hidden sink
  }

  function render(){
    tbody.innerHTML = '';

    // rows
    parts.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;

      const rowEl = document.createElement('div');
      rowEl.className = 'parts-row';

      // PN
      const pn = document.createElement('input');
      pn.className = 'input parts-input';
      pn.value = row.partNumber || '';
      pn.addEventListener('input', e => {
        parts[idx].partNumber = e.target.value;
        syncPartsHidden();
      });

      // Qty
      const qty = document.createElement('input');
      qty.className = 'input parts-input parts-qty';
      qty.inputMode = 'numeric';
      qty.value = row.quantity || '';
      qty.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/[^\d]/g,'');
        parts[idx].quantity = e.target.value;
        syncPartsHidden();
      });
      pn.placeholder = '';
      qty.placeholder = '';

      // Minus
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'icon-btn parts-minus';
      minus.setAttribute('aria-label','Remove row');
      minus.textContent = '–';

      minus.addEventListener('click', () => {
        parts.splice(idx, 1);
        render();
        syncPartsHidden();
      });

      rowEl.appendChild(pn);
      rowEl.appendChild(qty);
      rowEl.appendChild(minus);
      td.appendChild(rowEl);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });

    // plus row (always exactly one, under the last existing row)
    const trPlus = document.createElement('tr');
    const tdPlus = document.createElement('td');
    tdPlus.colSpan = 3;

    const plusWrap = document.createElement('div');
    plusWrap.className = 'parts-plus-row';
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'icon-btn parts-plus';
    plus.setAttribute('aria-label','Add part');
    plus.textContent = '+';

    plus.addEventListener('click', () => {
      parts.push({ partNumber: '', quantity: '' });
      render();
      syncPartsHidden();
    });

    plusWrap.appendChild(plus);
    tdPlus.appendChild(plusWrap);
    trPlus.appendChild(tdPlus);
    tbody.appendChild(trPlus);

  }

  // Seed with one row if none
  if (parts.length === 0) parts = [{ partNumber:'', quantity:'' }];
  render();
  syncPartsHidden();
}

function enhanceOrderRequestCard() {
  // Find the Parts card DOM node – adjust #partsCard selector to match your markup
  const card = document.querySelector('[data-field="parts"]') || document.querySelector('#partsCard') || null;
  if (card) initOrderRequestPartsEditor(card);
}

// Optional auto-run on the old page flow (safe no-op if parts aren’t present)
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof activeIntent !== 'undefined' && activeIntent === 'order_request') {
      enhanceOrderRequestCard();
    }
  } catch(_) {}
});

// back-compat + API for main.js
window.initOrderRequestPartsEditor = initOrderRequestPartsEditor;
window.enhanceOrderRequestCard    = enhanceOrderRequestCard;

// Alias expected by main.js
// (Calls the enhancer that finds the card and wires the editor.)
window.initOrderPartsEditor = window.initOrderPartsEditor || function initOrderPartsEditor(){
  enhanceOrderRequestCard();
};

