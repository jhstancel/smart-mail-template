// ui/js/bg/pastell-pets.js (global IIFE, no exports)
(function () {
  const LAYER_ID = 'petFlakes';
  const IMG_LIST = [
    'img/pets/cat.png','img/pets/cat1.png','img/pets/cat2.png','img/pets/cat3.png',
    'img/pets/cat4.png','img/pets/cat5.png','img/pets/cat6.png','img/pets/cat7.png',
    'img/pets/dog.png','img/pets/dog1.png','img/pets/dog3.png','img/pets/dog4.png',
    'img/pets/dog6.png','img/pets/dog7.png','img/pets/dog8.png','img/pets/dog9.png'
  ];

  let enabled = false, layer = null, flakes = [], spawned = false;

  function ensureLayer(){
    layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      document.body.appendChild(layer);
    }
    const s = layer.style;
    s.position = 'fixed';
    s.inset = '0';
    s.pointerEvents = 'none';
    s.overflow = 'hidden';
    s.zIndex = '0'; // normalize away from -1
    return layer;
  }

  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

  function offscreenY(img){
    const h = img.naturalHeight || img.getBoundingClientRect().height || 40;
    const pad = 10 + Math.floor(Math.random()*6);
    return -(h + pad);
  }

  function recycle(img){
    img.classList.remove('pop');

    const dur = 55 + Math.random() * 10;
    img.style.setProperty('--fall-dur', dur.toFixed(1) + 's');
    img.style.setProperty('--delay', (-Math.random() * dur).toFixed(2) + 's');

    if (Math.random() < 0.30) {
      const drift = ((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8)).toFixed(1) + 'px';
      img.style.setProperty('--drift', drift);
    }
    if (Math.random() < 0.20) {
      img.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
    }

    // Do NOT touch style.animation/style.transform/style.top here.
  }

  function placeInitial(img, x){
    img.style.left = x + 'px';
    img.style.visibility = 'hidden';
    const setOnce = ()=>{
      if (img.dataset._placed) return;
      img.dataset._placed = '1';
      img.style.top = offscreenY(img) + 'px';
      img.style.visibility = 'visible';
    };
    if (img.complete && (img.naturalHeight || img.getBoundingClientRect().height)) setOnce();
    else img.addEventListener('load', setOnce, { once:true });
  }

  function spawnOnce(){
    if (spawned) return;
    spawned = true;

    const count = Math.max(80, Math.min(200, Math.round(innerWidth / 40)));
    const xs = Array.from({ length: count }, (_, i) => {
      const slotW = innerWidth / count;
      const base = (i + 0.5) * slotW;
      const jitter = (Math.random() - 0.5) * slotW * 0.6; // ±30%
      const x = Math.round(base + jitter);
      return Math.max(0, Math.min(innerWidth - 20, x));
    });

    xs.forEach(x => {
      const img = document.createElement('img');
      img.className = 'pet-flake';
      img.src = pick(IMG_LIST);
      const w = (18 + Math.random() * (26 - 18)) | 0;
      img.style.width = w + 'px';

      const dur = 55 + Math.random() * 10;
      img.style.setProperty('--fall-dur', dur.toFixed(1) + 's');
      img.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
      img.style.setProperty('--drift', ((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8)).toFixed(1) + 'px');
      img.style.setProperty('--delay', (-Math.random() * dur).toFixed(2) + 's');

      placeInitial(img, x);
      img.addEventListener('animationiteration', () => recycle(img));

      ensureLayer().appendChild(img);
      flakes.push(img);
    });
  }

  function clampColumnsOnResize(){
    if(!enabled || !flakes.length) return;
    const W = innerWidth;
    const N = flakes.length;

    flakes.forEach((img, idx)=>{
      const rectW = img.getBoundingClientRect().width || 0;
      let x = parseFloat(img.style.left) || 0;
      const maxX = Math.max(0, W - rectW);

      if (x > maxX) x = maxX;

      if (Math.random() < 0.15) {
        const slotW = W / N;
        const base = (idx + 0.5) * slotW;
        const jitter = (Math.random() - 0.5) * slotW * 0.4;
        x = Math.max(0, Math.min(maxX, base + jitter));

        const dur = parseFloat(getComputedStyle(img).getPropertyValue('--fall-dur')) || 60;
        img.style.setProperty('--delay', (-Math.random() * dur).toFixed(2) + 's');
      }

      img.style.left = x + 'px';
    });
  }
  addEventListener('resize', clampColumnsOnResize, { passive: true });

  function enable(){
    if (enabled) return;
    enabled = true;
    ensureLayer().style.display = 'block';
    if (!flakes.length) spawnOnce();
  }

  function disable(){
    enabled = false;
    spawned = false;
    if (layer) layer.style.display = 'none';
  }

  window.PastellPets = { enable, disable, isEnabled(){ return enabled; } };
})();

