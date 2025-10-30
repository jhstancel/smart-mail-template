/* === Nyan-on-"kitty" Easter egg ========================================= */
(function(){
  // Change if you want a local asset instead of the hosted gif:
  // window.NYAN_CAT_SRC = 'img/nyan.gif';
  const SRC = window.NYAN_CAT_SRC || 'https://media.tenor.com/rI_0O_9AJ5sAAAAj/nyan-cat-poptart-cat.gif';

  let lastLaunch = 0;            // simple cooldown
  const COOLDOWN_MS = 3500;      // avoid spam if "kitty" appears many times

  function spawnNyan(){
    const now = Date.now();
    if(now - lastLaunch < COOLDOWN_MS) return;
    lastLaunch = now;

    const img = document.createElement('img');
    img.className = 'nyan-cat';
    img.alt = 'Nyan Cat';
    img.src = SRC;
    document.body.appendChild(img);

    // Size & path params
    const W = window.innerWidth;
    const H = window.innerHeight;
    const size = Math.max(72, Math.min(120, Math.round(W * 0.09)));
    img.style.width = size + 'px';

    const startY = H * (0.25 + Math.random() * 0.5);       // mid-screen
    const amp    = Math.max(50, Math.min(100, H * 0.12));  // sine amplitude
    const periodPx = Math.max(300, Math.min(900, W * 0.8));// sine wavelength
    const k = (2 * Math.PI) / periodPx;

    const pxPerSec = Math.max(280, Math.min(520, W * 0.32)); // speed
    let t0 = null;

    function rainbowDroplet(x, y){
      const d = document.createElement('div');
      d.className = 'nyan-ribbon';
      d.style.left   = (x - size*0.2) + 'px';
      d.style.top    = (y + size*0.35) + 'px';
      d.style.width  = Math.max(80, size * 1.7) + 'px';
      d.style.height = Math.max(6,  Math.round(size * 0.10)) + 'px';
      d.style.background = 'linear-gradient(90deg,#ff0018,#ffa52c,#ffff41,#008018,#0000f9,#86007d)';
      document.body.appendChild(d);
      setTimeout(()=> d.remove(), 1900);
    }

    function tick(ts){
      if(!t0) t0 = ts;
      const dt = (ts - t0) / 1000;            // seconds
      const x  = dt * pxPerSec - size;        // start off-screen left
      const y  = startY + Math.sin(x * k) * amp;

      if (Math.random() < 0.9) rainbowDroplet(x, y);

      img.style.transform = `translate(${x}px, ${y}px)`;
      if (x < W + size * 1.2){
        requestAnimationFrame(tick);
      } else {
        img.style.transition = 'opacity .45s ease';
        img.style.opacity = '0';
        setTimeout(()=> img.remove(), 460);
      }
    }
    requestAnimationFrame(tick);
  }

  function onAnyInput(e){
    const el = e.target;
    if(!el || !('value' in el)) return;
    const v = String(el.value || '').toLowerCase();
    if (v.includes('kitty')) spawnNyan();
  }

  document.addEventListener('input', onAnyInput, { passive: true });

  // Optional: expose a manual trigger for testing in console
  window.spawnNyan = spawnNyan;
})();

