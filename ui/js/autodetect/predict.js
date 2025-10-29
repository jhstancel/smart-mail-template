/* === Live Auto-Detect on Hint typing (resilient + correct payload) === */
(function(){
  const $ = (s)=>document.querySelector(s);
  const THR = (typeof window.CONF_THR === 'number' ? window.CONF_THR : 0.55);

  let currentHintEl = null;
  let debounceTimer = null;
  let inflight = null;

  const els = {
    to:         $('#to'),
    subject:    $('#subject'),
    predStatus: $('#predStatus'),
    predInfo:   $('#predInfo'),
    predIntent: $('#predIntent'),
    predBadge:  (function(){
                  let n = document.getElementById('predBadge');
                  if(!n){
                    n = document.createElement('span');
                    n.id = 'predBadge';
                    n.className = 'pill';
                    document.getElementById('predInfo')?.appendChild(n);
                  }
                  return n;
                })(),
    predMsg:    $('#predMsg'),
    topK:       $('#topK'),
    btnPredict: $('#btnPredict')
  };

  const toNice = (s)=> (s||'').replaceAll('_',' ').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  function scoreBadge(score){ return `${Math.round((score ?? 0)*100)}%`; }
  function setPredictStatus(msg){ if(els.predStatus) els.predStatus.textContent = msg || ''; }
  function hidePredictInfo(){ if(els.predInfo) els.predInfo.style.display='none'; if(els.topK) els.topK.innerHTML=''; }

  function updatePredictUI(data){
    if(!data){ hidePredictInfo(); return; }

    // Normalize common server shapes
    const normIntent =
      data.intent ?? data.label ?? data.name ?? '';
    const normConf =
      (data.confidence ?? data.score ?? data.prob ?? data.probability ?? 0);
    const normTopK =
      data.top_k ?? data.topK ?? data.top ?? data.candidates ?? [];
    const message = data.message || '';

    if(els.predIntent) els.predIntent.textContent = normIntent ? toNice(normIntent) : '—';
    if(els.predBadge)  els.predBadge.textContent  = `${Math.round(normConf * 100)}%`;
    if(els.predMsg)    els.predMsg.textContent    = message;

    if(els.topK){
      els.topK.innerHTML = '';
      (normTopK || []).forEach(item=>{
        const name  = Array.isArray(item) ? (item[0] ?? '') : (item.label ?? item.intent ?? item.name ?? '');
        const score = Array.isArray(item) ? (item[1] ?? 0) : (item.score ?? item.confidence ?? 0);

        const b = document.createElement('button');
        b.className = 'btn secondary';
        b.textContent = `${toNice(name)} (${Math.round((score??0)*100)}%)`;
        b.addEventListener('click', ()=>{
          document.querySelectorAll('.intent-card').forEach(x=>x.classList.remove('active'));
          const target = name;
          [...document.querySelectorAll('.intent-card')]
            .find(x=>x.dataset.intent === target || x.querySelector('.intent-name')?.textContent?.trim() === toNice(target))
            ?.classList.add('active');

          // Manual select only (no auto-generate)
          if (typeof window.setSelectedIntent === 'function') window.setSelectedIntent(target);

          setTimeout(()=>{
            const hintNow = (document.getElementById('hint')?.value || '').trim();
            if (hintNow) window.autoPopulateFields?.(target, hintNow);
          }, 60);
          window.scrollTo({ top: document.body.scrollHeight/3, behavior: 'smooth' });
        });
        els.topK.appendChild(b);
      });
    }
    if(els.predInfo) els.predInfo.style.display='flex';
  }

  async function predictNow(hintVal){
    if(inflight){ try{ inflight.abort(); }catch{} }
    inflight = new AbortController();

    const payload = {
      to:       (els.to?.value || '').trim(),
      subject:  (els.subject?.value || '').trim(),
      body_hint: (hintVal || '').trim()
    };
    if(!payload.subject && !payload.body_hint){ setPredictStatus(''); hidePredictInfo(); return; }

    setPredictStatus('Predicting…');
    try{
      const res = await fetch('/predict', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload),
        signal: inflight.signal
      });

      if(!res.ok){
        console.warn('/predict failed', res.status, await res.text());
        setPredictStatus('Prediction failed.');
        hidePredictInfo();
        return;
      }

      const data = await res.json();
      updatePredictUI(data);
      setPredictStatus('');
    }catch(err){
      if(err?.name === 'AbortError') return;
      setPredictStatus('Prediction failed.');
      hidePredictInfo();
    }
  }

  function onType(){
    if(!currentHintEl) return;
    const hint = (currentHintEl.value || '').trim();
    if(!hint){ setPredictStatus(''); hidePredictInfo(); return; }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>predictNow(hint), 150);
  }

  function attachToHint(el){
    if(currentHintEl === el) return;
    if(currentHintEl) currentHintEl.removeEventListener('input', onType);
    currentHintEl = el;
    if(currentHintEl) currentHintEl.addEventListener('input', onType, {passive:true});
  }

  attachToHint($('#hint'));
  const mo = new MutationObserver(()=> attachToHint($('#hint')));
  mo.observe(document.body, {childList:true, subtree:true});

  if(els.btnPredict){
    els.btnPredict.addEventListener('click', (e)=>{
      e.preventDefault();
      const el = $('#hint'); attachToHint(el);
      const hint = (el?.value || '').trim();
      if(!hint){ setPredictStatus(''); hidePredictInfo(); return; }
      predictNow(hint);
    });
  }

  // Allow init() to kick a first prediction if text exists
  window.scheduleAutodetect = function(){
    const el = document.getElementById('hint');
    const hint = (el?.value || '').trim();
    if(hint) {
      predictNow(hint);
    } else {
      setPredictStatus('');
      hidePredictInfo();
    }
  };
})();

