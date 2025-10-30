window.EVIL_LARRY_SRC = window.EVIL_LARRY_SRC || 'img/evil-larry.png';

/* Larry Storm: spawn 1 (Shift+L) or a rain of Larrys (type "larry") */
(function(){
  const IMG_SRC = window.EVIL_LARRY_SRC || 'https://placekitten.com/256/256';
  const COOLDOWN_SINGLE_MS = 1500;
  const COOLDOWN_RAIN_MS   = 8000;

  let lastSingle = 0, lastRain = 0;

  (new Image()).src = IMG_SRC;

  const sprites = new Set();
  let rafId = null;

  function startLoop(){
    if (rafId) return;
    let W = innerWidth, H = innerHeight;
    function fit(){ W = innerWidth; H = innerHeight; }
    addEventListener('resize', fit, { passive:true });

    function frame(ts){
      if (sprites.size === 0){ rafId = null; return; }
      sprites.forEach(s => {
        s.vy += s.g;
        s.x  += s.vx;
        s.y  += s.vy;
        s.a  += s.spin;

        if (s.x <= 0){ s.x = 0; s.vx = Math.abs(s.vx); s.spin = -s.spin; }
        if (s.x >= W - s.size){ s.x = W - s.size; s.vx = -Math.abs(s.vx); s.spin = -s.spin; }
        if (s.y >= H - s.size){ s.y = H - s.size; s.vy = -Math.abs(s.vy) * s.damp; }

        s.el.style.transform = `translate(${s.x}px,${s.y}px) rotate(${s.a}deg)`;

        if (ts - s.t0 > s.life){
          s.el.style.transition = 'transform 1.1s cubic-bezier(.2,.8,.2,1), opacity .9s ease';
          s.el.style.opacity = '0';
          s.el.style.transform = `translate(${s.x}px,-${s.size + 100}px) rotate(${s.a + 720}deg)`;
          setTimeout(()=>{ s.el.remove(); sprites.delete(s); }, 1200);
        }
      });
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function spawnOne(opts = {}){
    const el = document.createElement('div');
    el.className = 'evil-larry';
    el.innerHTML = `<img alt="Evil Larry" referrerpolicy="no-referrer" src="${IMG_SRC}">`;
    document.body.appendChild(el);

    const base = el.getBoundingClientRect().width || 420;
    const scale = opts.scale ?? (0.6 + Math.random()*0.9);
    el.style.transformOrigin = 'center';
    el.style.width  = (base*scale) + 'px';
    el.style.height = (base*scale) + 'px';

    const W = innerWidth, H = innerHeight;
    const size = base * scale;

    const x0 = Math.random() * Math.max(10, W - size - 10);
    const y0 = -size - 40 - Math.random()*120;

    const vx = (Math.random()<0.5?-1:1) * (2 + Math.random()*3);
    const vy = 2 + Math.random()*2;
    const g  = 0.16 + Math.random()*0.08;
    const spin = (Math.random()<0.5?-1:1) * (2.5 + Math.random()*3.5);
    const damp = 0.84 + Math.random()*0.07;

    const s = {
      el, size,
      x:x0, y:y0, vx, vy, g, a:0, spin, damp,
      t0: performance.now(),
      life: (opts.lifeMs ?? (4800 + Math.random()*3000))
    };

    sprites.add(s);
    startLoop();
  }

  function runEvilLarry(){ const now = Date.now(); if (now - lastSingle < COOLDOWN_SINGLE_MS) return; lastSingle = now; spawnOne({ scale: 1 }); }
  function runEvilLarryRain(count = 24){
    const now = Date.now(); if (now - lastRain < COOLDOWN_RAIN_MS) return; lastRain = now;
    const n = Math.max(4, Math.min(64, count));
    for (let i=0; i<n; i++){
      setTimeout(()=> spawnOne({
        scale: 0.6 + Math.random()*1.2,
        lifeMs: 4200 + Math.random()*3500
      }), Math.random()*900);
    }
  }

  window.runEvilLarry = runEvilLarry;
  window.runEvilLarryRain = runEvilLarryRain;

  document.addEventListener('keydown', (e)=>{
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key||'').toLowerCase() === 'l' && e.shiftKey) runEvilLarry();
  });

  const WORD = 'larry'; let seq = []; let lastTs = 0; const MAX_GAP_MS = 3000;
  document.addEventListener('keydown', (e)=>{
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = (e.key||'').toLowerCase();
    if (!/^[a-z]$/.test(k)) return;
    const now = Date.now();
    if (now - lastTs > MAX_GAP_MS) seq = [];
    lastTs = now; seq.push(k); if (seq.length > WORD.length) seq.shift();
    if (seq.join('') === WORD){ runEvilLarryRain(28); seq = []; }
  });
})();

