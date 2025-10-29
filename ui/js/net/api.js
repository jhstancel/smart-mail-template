// ui/js/net/api.js

/* ===== Networking ===== */
async function postJSON(url, data){
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function loadSchema(){
  try{
    const res = await fetch('/schema');
    if(!res.ok) throw new Error('Failed to fetch /schema');
    SCHEMA = await res.json();
  }catch(e){
    console.error('Error loading /schema:', e);
    SCHEMA = {};
  }
}

// back-compat
window.postJSON = postJSON;
window.loadSchema = loadSchema;

