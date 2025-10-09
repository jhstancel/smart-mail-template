/* ===== Utilities ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const toTitle = (key) =>
  key.replace(/[\-_]+/g,' ')
     .replace(/([a-z])([A-Z])/g,'$1 $2')
     .replace(/\s+/g,' ')
     .trim()
     .split(' ')
     .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
     .join(' ');

/* ===== Starfield (subtle) with controller ===== */
const Starfield = (() => {
  const c = document.getElementById('stars');
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let stars=[], rafId=null, running=false;
  function resize(){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  function init(){
    stars = [];
    const count = Math.floor((innerWidth*innerHeight)/9000);
    for(let i=0;i<count;i++){
      stars.push({x:Math.random()*innerWidth, y:Math.random()*innerHeight, r:Math.random()*1.2+0.2, a:Math.random()*0.4+0.4, v:Math.random()*0.04+0.01});
    }
  }
  function draw(){
    if(!running) return;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    stars.forEach(s=>{
      s.y+=s.v; if(s.y>innerHeight) s.y=-5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle=`rgba(200,230,255,${s.a})`; ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  function start(){ if(running) return; running=true; resize(); init(); draw(); }
  function stop(){ running=false; if(rafId) cancelAnimationFrame(rafId); }
  window.addEventListener('resize', ()=>{ if(running){ resize(); init(); }});
  return { start, stop };
})();

/* ===== Elements & state ===== */
const intentGrid = $('#intentGrid');
const autoStage = $('#autoStage');
const fieldsWrap = $('#fields');
const fieldsHint = $('#fieldsHint');
const predInfo = $('#predInfo');
const predIntent = $('#predIntent');
const predMsg = $('#predMsg');
const predStatus = $('#predStatus');
const topK = $('#topK');
const outSubject = $('#outSubject');
const outBody = $('#outBody');
const health = $('#health');
const themeSelect = $('#themeSelect');

const splashTip = $('#splashTip');
const settingsBtn = $('#settingsBtn');
const settingsMenu = $('#settingsMenu');
const itemTheme  = document.querySelector('.settings-item[data-item="theme"]');
const itemTyping = document.querySelector('.settings-item[data-item="typing"]');
const subTheme = $('#subTheme');
const subTyping = $('#subTyping');

const corruptOverlay = $('#corruptOverlay');
const flashEl = $('#flash');
const bufferEl = $('#buffer');
const barFill = $('#barFill');
const barPct = $('#barPct');
const printMask = $('#printMask');
const printLine = $('#printLine');

let SCHEMA = {};
let SELECTED_INTENT = null;
let CONF_THR = 0.55;
let prevSubject = '';
let prevBody = '';

/* ===== Intent descriptions ===== */
const INTENT_DESCS = {
  quote_request: "Ask For Pricing Or Lead Time.",
  shipment_update: "Send Tracking, Carrier, Ship Date.",
  order_confirmation: "Acknowledge Or Confirm A PO.",
  invoice_payment: "Payment Or Invoice Notice.",
  delay_notice: "Notify A Date Change Or Backorder.",
  packing_slip_docs: "Send Documents: Packing Slip, COO, SDS.",
  followup: "Polite Nudge Or Status Check.",
  auto_detect: "Let The System Read Your Draft And Suggest An Intent."
};

/* ===== Minecraft splashes (curated set) ===== */
const SPLASHES = [
  "Punching trees!","Now with 100% more blocks!","Yaaay clouds!","So fresh, so clean!",
  "The cake is a lie!","Much wow, very block!","Mind the Creepers!","Don’t dig straight down!",
  "Redstone-ready!","Hardcore, baby!","Plenty of sheep!","Spelunk responsibly!",
  "Watch your step!","Embrace the grind!","Chickens gonna cluck!","Piglin approved!",
  "Blocks on blocks!","Boats go brrr!","Suspicious stew?!","Keep calm and craft on!",
  "Enchanting vibes!","Bee yourself!","Mine all day!","Build all night!",
  "Nether? I hardly know her!","Cave update feelings!","RTX? Very shiny!","Punch wood → Profit!",
  "Mending your ways!","Eat your golden carrots!","Warden says hi…","Fortune favors you!",
  "Adventure awaits!","Stay blocky!","Better than diamonds?","Creeper? …Aww man.",
  "Remember your bed!","Set your spawn!","Hiss-terical!","Powered rails zoom!"
];

/* ===== API ===== */
async function getJSON(u){ const r = await fetch(u); return r.json(); }
async function postJSON(u,d){ const r = await fetch(u, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d)}); return r.json(); }

/* ===== Intent grid ===== */
function intentCard(name){
  const div = document.createElement('div');
  div.className = 'intent-card';
  const label = (name==='auto_detect') ? 'Auto Detect' : toTitle(name.replaceAll('_',' '));
  div.innerHTML = `
    <div class="intent-name">${label}</div>
    <div class="intent-desc">${INTENT_DESCS[name]||''}</div>
  `;
  div.addEventListener('click', ()=>{
    const isActive = div.classList.contains('active');
    document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));
    if(isActive){ SELECTED_INTENT = null; renderFields(null); autoStage.classList.add('hidden'); return; }
    div.classList.add('active');
    if(name==='auto_detect'){ autoStage.classList.remove('hidden'); setSelectedIntent(null); }
    else { autoStage.classList.add('hidden'); setSelectedIntent(name); }
  });
  return div;
}
function renderIntentGrid(){
  intentGrid.innerHTML = '';
  const order = ["quote_request","shipment_update","order_confirmation","invoice_payment","delay_notice","packing_slip_docs","followup"];
  order.forEach(i => intentGrid.appendChild(intentCard(i)));
  const auto = intentCard('auto_detect');
  auto.style.background = 'linear-gradient(180deg, var(--card-bg1), var(--card-bg2))';
  intentGrid.appendChild(auto);
}

/* ===== Fields ===== */
function renderFields(intent){
  fieldsWrap.innerHTML = '';
  if(!intent || !SCHEMA[intent]){ fieldsHint.textContent = '(Select An Option Or Use Auto Detect)'; return; }
  const req = SCHEMA[intent].required || [];
  const niceList = req.map(toTitle).join(', ');
  fieldsHint.textContent = req.length ? `Required Fields: ${niceList}` : 'No Required Fields';

  for(const key of req){
    const wrap = document.createElement('div'); wrap.className = 'kv';
    const label = document.createElement('label'); label.textContent = toTitle(key);
    const input = document.createElement('input'); input.type = 'text'; input.id = `f_${key}`; input.placeholder = toTitle(key);
    wrap.appendChild(label); wrap.appendChild(input); fieldsWrap.appendChild(wrap);
  }
}
function collectFields(intent){ const req = SCHEMA[intent]?.required || []; const fields = {}; for(const key of req){ const el = document.getElementById(`f_${key}`); fields[key] = el ? (el.value || '') : ''; } return fields; }
function setSelectedIntent(name){ SELECTED_INTENT = name || null; renderFields(SELECTED_INTENT); }

/* ===== Live typing animation ===== */
function setTextInstant(el, text){ el.textContent = text || ''; el.classList.add('glow-in'); setTimeout(()=>el.classList.remove('glow-in'), 700); }
async function typeLine(el, text, maxMs=500){
  const live = document.getElementById('liveCompose')?.checked !== false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!live || reduced || document.body.dataset.theme.endsWith('minimal')) return setTextInstant(el, text);
  el.textContent = '';
  const t0 = performance.now(); const total = text.length; let i = 0; const step = Math.max(1, Math.ceil(total / Math.max(1, maxMs/16)));
  return new Promise(resolve=>{
    function tick(ts){
      i = Math.min(total, i + step);
      el.textContent = text.slice(0, i);
      if (i >= total || (ts - t0) >= maxMs) {
        el.textContent = text; el.classList.add('glow-in'); setTimeout(()=>el.classList.remove('glow-in'), 700);
        resolve();
      } else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
async function typeSubjectAndBody(newSubject, newBody){
  const live = document.getElementById('liveCompose')?.checked !== false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimal = document.body.dataset.theme.endsWith('minimal');
  if (!live || reduced || minimal) setTextInstant(outSubject, newSubject); else await typeLine(outSubject, newSubject, 350);
  const lines = (newBody || '').split('\n'); outBody.innerHTML = lines.map(()=>'<div class="line"></div>').join('');
  const nodes = [...outBody.querySelectorAll('.line')];
  for (let i=0; i<lines.length; i++){ if (!live || reduced || minimal) setTextInstant(nodes[i], lines[i]); else await typeLine(nodes[i], lines[i], 450); }
  prevSubject = newSubject; prevBody = newBody;
}

/* ===== Toast helper ===== */
function flashToast(btn, text='Copied!'){
  if(!btn) return;
  const original = btn.textContent;
  btn.classList.add('toast');
  btn.textContent = text;
  setTimeout(()=>{ btn.classList.remove('toast'); btn.textContent = original; }, 1100);
}

/* ===== Clear ===== */
function clearAll(){
  document.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(el => el.value = '');
  outSubject.textContent = '';
  outBody.textContent = '';
  predStatus.textContent = '';
  predInfo.style.display = 'none';
  topK.innerHTML = '';
  document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));
  SELECTED_INTENT = null;
  renderFields(null);
}

/* ===== Generate/Copy/Predict ===== */
$('#btnGenerate').addEventListener('click', async ()=>{
  if(!SELECTED_INTENT){ $('#missing').textContent = 'Select An Option (Or Auto Detect) First.'; return; }
  const fields = collectFields(SELECTED_INTENT);
  const res = await postJSON('/generate', { intent: SELECTED_INTENT, fields });
  const missing = (res.missing && res.missing.length) ? res.missing.map(toTitle).join(', ') : '';
  $('#missing').textContent = missing ? `Missing: ${missing}` : '';
  await typeSubjectAndBody(res.subject||'', res.body||'');
});

async function copyText(t){ try{ await navigator.clipboard.writeText(t); }catch(_e){} }
$('#copySubject').addEventListener('click', (e)=>{ copyText(outSubject.textContent); flashToast(e.currentTarget); });
$('#copyBody').addEventListener('click',   (e)=>{ copyText(outBody.textContent);   flashToast(e.currentTarget); });
$('#btnClear').addEventListener('click',   (e)=>{ clearAll(); flashToast(e.currentTarget); });

$('#btnPredict').addEventListener('click', async ()=>{
  predStatus.textContent = 'Detecting…'; predInfo.style.display = 'none'; topK.innerHTML='';
  const to = $('#to').value, subject = $('#subject').value, hint = $('#hint').value;
  const res = await postJSON('/predict', {to, subject, body_hint: hint});
  predStatus.textContent = ''; predInfo.style.display = 'flex';
  $('#predIntent').textContent = res.intent ? toTitle(res.intent.replaceAll('_',' ')) : '—';
  const holder = document.createElement('span'); holder.innerHTML = badge(res.confidence, CONF_THR);
  const old = document.getElementById('predBadge'); if(old) old.replaceWith(holder); holder.id='predBadge';
  $('#predMsg').textContent = res.message || '';
  topK.innerHTML = '';
  (res.top_k||[]).forEach(([name,score])=>{
    const b = document.createElement('button'); b.className = 'btn secondary'; b.textContent = `${toTitle(name.replaceAll('_',' '))} (${Math.round(score*100)}%)`;
    b.addEventListener('click', ()=> {
      document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));
      [...document.querySelectorAll('.intent-card')]
        .find(x=>x.querySelector('.intent-name')?.textContent===toTitle(name.replaceAll('_',' ')))?.classList.add('active');
      setSelectedIntent(name);
      window.scrollTo({ top: document.body.scrollHeight/3, behavior: 'smooth' });
    });
    topK.appendChild(b);
  });
});
function badge(score, thr=0.55){ const pct = Math.round(score*100); let cls='pill'; if(score>=thr) cls+=' ok'; else if(score>=0.45) cls+=' warn'; else cls+=' bad'; return `<span class="${cls}">${pct}%</span>`; }

/* ===== Theme switching ===== */
function applyTheme(val){
  document.body.setAttribute('data-theme', val);
  if(val === 'cosmic') Starfield.start(); else Starfield.stop();
}
if(themeSelect){ themeSelect.addEventListener('change', (e)=> applyTheme(e.target.value)); }

/* ===== Settings interactions ===== */
function closeAllSubs(){ [subTheme, subTyping].forEach(s=> s.classList.remove('open')); document.querySelectorAll('.settings-item .chev').forEach(c=> c.classList.remove('rot90')); }
function openOnly(panel, chev){ closeAllSubs(); panel.classList.add('open'); chev.classList.add('rot90'); }
settingsBtn.addEventListener('click', ()=>{ const isOpen = settingsMenu.classList.toggle('open'); settingsBtn.setAttribute('aria-expanded', String(isOpen)); if(!isOpen) closeAllSubs(); });
itemTheme.addEventListener('click', ()=> openOnly(subTheme, itemTheme.querySelector('.chev')));
itemTyping.addEventListener('click', ()=> openOnly(subTyping, itemTyping.querySelector('.chev')));
window.addEventListener('click', (e)=>{ if(!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)){ settingsMenu.classList.remove('open'); settingsBtn.setAttribute('aria-expanded','false'); closeAllSubs(); }});

/* ===== Gear splash tooltip (Minecraft messages) ===== */
let splashTimer=null;
settingsBtn.addEventListener('mouseenter', ()=>{
  splashTimer = setTimeout(()=>{
    splashTip.textContent = SPLASHES[Math.floor(Math.random()*SPLASHES.length)];
    splashTip.classList.add('show');
  }, 1200);
});
settingsBtn.addEventListener('mouseleave', ()=>{
  clearTimeout(splashTimer); splashTip.classList.remove('show');
});

/* ===== Rabbit Hole (type “follow the white rabbit”) ===== */
const SECRET_RABBIT = "follow the white rabbit";
(function listenForPhrase(){
  let buf = "";
  document.addEventListener('keydown', (e)=>{
    const t = (e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA')) ? String(e.key||"") : "";
    if(!t || t.length>1) return;
    buf = (buf + t).slice(-SECRET_RABBIT.length);
    if(buf.toLowerCase() === SECRET_RABBIT){ triggerRabbit(); buf=""; }
  });
})();
function triggerRabbit(){
  const r = document.createElement('div'); r.className='rabbit'; document.body.appendChild(r);
  const portal = document.createElement('div'); portal.className='portal';
  const msg = document.createElement('div'); msg.className='portal-msg';
  msg.textContent = SPLASHES[Math.floor(Math.random()*SPLASHES.length)];
  document.body.appendChild(portal);
  setTimeout(()=> document.body.appendChild(msg), 450);
  setTimeout(()=>{ portal.remove(); msg.remove(); }, 3200);
  setTimeout(()=> r.remove(), 1700);
}

/* ===== Corruption Easter Egg =====
   Trigger by typing “corruption” in any input/textarea OR Ctrl/⌘+Alt+C
*/
const SECRET_CORR = "corruption";
let corrBuf = "";
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.altKey && (e.key==='c' || e.key==='C')){ triggerCorruption(); return; }
  const isField = (e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA'));
  if(!isField) return;
  const k = e.key || "";
  if(k.length===1){ corrBuf = (corrBuf + k).slice(-SECRET_CORR.length); if(corrBuf.toLowerCase()===SECRET_CORR){ triggerCorruption(); corrBuf=""; } }
});
async function triggerCorruption(){
  document.body.classList.add('corrupting');
  if(document.body.dataset.theme !== 'cosmic') Starfield.stop();
  await delay(1600);
  flashEl.classList.add('show'); await delay(700); flashEl.classList.remove('show');
  bufferEl.classList.add('show');
  let pct = 0;
  while(pct < 100){
    pct += Math.max(1, Math.round(Math.random()*14));
    pct = Math.min(pct, 100);
    barFill.style.width = pct + '%';
    barPct.textContent = pct + '%';
    await delay(120 + Math.random()*200);
  }
  await delay(250);
  bufferEl.classList.remove('show');
  printMask.classList.add('show');
  printLine.classList.add('show');
  $$('.panel').forEach(p=> p.style.opacity = '0');
  await delay(2600);
  printMask.classList.remove('show');
  printLine.classList.remove('show');
  $$('.panel').forEach((p,i)=> setTimeout(()=> p.style.opacity = '1', 60*i));
  document.body.classList.remove('corrupting');
  if(document.body.dataset.theme === 'cosmic') Starfield.start();
}

/* ===== Init ===== */
function applyTheme(val){
  document.body.setAttribute('data-theme', val);
  if(val === 'cosmic') Starfield.start(); else Starfield.stop();
}
(async function init(){
  // Default theme
  applyTheme('light-minimal');
  if(themeSelect) themeSelect.value = 'light-minimal';

  // Intent grid
  renderIntentGrid();

  // Health + schema
  try{
    const h = await getJSON('/health');
    CONF_THR = h.confidence_threshold || 0.55;
    health.textContent = `Model: ${(h.model_classes||[]).length} intents • Threshold ${Math.round(CONF_THR*100)}%`;
    SCHEMA = await getJSON('/schema');
  }catch(e){ health.textContent = 'Server Not Reachable'; }
})();

