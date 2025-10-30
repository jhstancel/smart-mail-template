// ui/js/utils/text.js
// Text utilities extracted from app.js (exact copy)

/**
 * smartParseParts(raw)
 * Accepts free-text parts list and returns [{partNumber, quantity}, ...]
 */
function smartParseParts(raw){
  // Normalize line endings and separators
  const lines = String(raw || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const out = [];

  for (let line of lines){
    // common forms:
    // "PN-10423 x2", "PN-10423 2", "PN-10423,2", "PN-10423\t2"
    // allow "qty:2", "q=2", "(2)", "[2]"
    // default qty=1 when missing
    let pn = "";
    let qty = "";

    // Try comma/pipe/tab split first
    let hit = line.split(/[,\|\t]/).map(s => s.trim()).filter(Boolean);
    if (hit.length >= 2) {
      pn = hit[0];
      qty = hit[1];
    } else {
      // Try "something x2" or "something 2"
      const m = line.match(/^(.+?)\s*(?:x|qty[:=]|\(|\[)?\s*(\d+)[)\]]?\s*$/i);
      if (m) {
        pn = m[1].trim().replace(/\s+$/,"");
        qty = m[2].trim();
      } else {
        // No explicit qty -> default 1
        pn = line.trim();
        qty = "1";
      }
    }

    // sanitize
    pn = pn.replace(/\s{2,}/g, " ").trim();
    qty = String(qty || "1").trim();

    if (pn) out.push({ partNumber: pn, quantity: qty });
  }

  return out;
}

// back-compat global
window.smartParseParts = smartParseParts;

