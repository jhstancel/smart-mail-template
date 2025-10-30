// ui/js/dates/dates.js

/* ===== Date helpers ===== */
const DATE_KEYS = new Set([
  'dueDate','deliveryDate','shipDate','estimatedArrival','newDate',
  'pickupDate','dropoffDate','scheduleDate'
]);
function isDateKey(k){ return DATE_KEYS.has((k||'').toString()); }

function formatDateForOutput(yyyy_mm_dd){
  if(!yyyy_mm_dd) return '';
  const [y,m,d] = yyyy_mm_dd.split('-').map(x=>parseInt(x,10));
  if(!y||!m||!d) return '';
  const mm = String(m).padStart(2,'0');
  const dd = String(d).padStart(2,'0');
  const nowY = new Date().getFullYear();
  return (y === nowY) ? `${mm}/${dd}` : `${mm}/${dd}/${y}`;
}

// back-compat
window.DATE_KEYS = DATE_KEYS;
window.isDateKey = isDateKey;
window.formatDateForOutput = formatDateForOutput;

