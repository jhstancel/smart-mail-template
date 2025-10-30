// ui/js/bg/pastell-pets.js (global IIFE, no exports)
(function(){
  const LAYER_ID = 'petFlakes';
  // Use only files that actually exist in /ui/img/pets (from your tree)
  const IMG_LIST = [
  'img/pets/cat.png',  'img/pets/cat1.png',  'img/pets/cat2.png',  'img/pets/cat3.png',
  'img/pets/cat4.png', 'img/pets/cat5.png',  'img/pets/cat6.png',  'img/pets/cat7.png',
  'img/pets/dog.png',  'img/pets/dog1.png',  'img/pets/dog3.png',  'img/pets/dog4.png',
  'img/pets/dog6.png', 'img/pets/dog7.png',  'img/pets/dog8.png',  'img/pets/dog9.png'
  ];

  let enabled = false, layer = null, flakes = [], spawned = false;

  function ensureLayer(){
    if (layer && document.body.contains(layer)) return layer;
    layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.style.position = 'fixed';
      layer.style.inset = '0';
      layer.style.pointerEvents = 'none';
      layer.style.overflow = 'hidden';
      layer.style.zIndex = '0'; // safer than -1 so it isn't hidden by stacking contexts
      document.body.appendChild(layer);
    }
    return layer;
  }

  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

  function offscreenY(img){
    const h = img.naturalHeight || img.getBoundingClientRect().height || 40;
    const pad = 10 + Math.floor(Math.random()*6);
    return -(h + pad);
  }

  function clampColumnsOnResize(){
    if(!enabled || !flakes.length) return;
    const W = innerWidth;
    flakes.forEach(img=>{
      const w = img.getBoundingClientRect().width || 0;
      const x = parseFloat(img.style.left) || 0;
      const maxX = Math.max(0, W - w);
      if (x > maxX) img.style.left = maxX + 'px';
    });
  }
  addEventListener('resize', clampColumnsOnResize, { passive:true });

  function restartAnimation(img){
    img.style.animation = 'none';
    void img.offsetWidth;         // reflow to reset animation
    img.style.animation = '';
  }

  function recycle(img){
    img.classList.remove('pop');
    img.style.top = offscreenY(img) + 'px';
    restartAnimation(img);
  }

  function placeInitial(img, x){
    img.style.left = x + 'px';
    img.style.visibility = 'hidden';
    const setY = ()=>{
      img.style.top = offscreenY(img) + 'px';
      img.style.visibility = 'visible';
      restartAnimation(img);
    };
    if (img.complete && (img.naturalHeight || img.getBoundingClientRect().height)) {
      setY();
    } else {
      img.addEventListener('load', setY, { once:true });
      queueMicrotask(()=>{ if (img.style.visibility === 'hidden') setY(); });
    }
  }

  function spawnOnce(){
    if (spawned) return;
    spawned = true;
    const count = Math.max(80, Math.min(200, Math.round(innerWidth / 40)));
    const xs = Array.from({length:count}, (_,i)=> Math.round((i+0.5)*(innerWidth/count)));
    xs.forEach(x=>{
      const img = document.createElement('img');
      img.className = 'pet-flake';
      img.src = pick(IMG_LIST);               // resolved relative to /ui/ (good)
      const w = (18 + Math.random()*(26-18))|0;
      img.style.width = w + 'px';
      const dur = 55 + Math.random()*10;
      img.style.setProperty('--fall-dur', dur.toFixed(1) + 's');
      img.style.setProperty('--rot', (Math.random()*24-12).toFixed(1) + 'deg');
      img.style.setProperty('--drift', ((Math.random()<0.5?-1:1)*(6+Math.random()*8)).toFixed(1) + 'px');
      img.style.setProperty('--delay', (-Math.random()*dur).toFixed(2) + 's');

      placeInitial(img, x);
      img.addEventListener('animationend', ()=> recycle(img));
      ensureLayer().appendChild(img);
      flakes.push(img);
    });
  }

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

  // expose globally for existing callers (wire-ui.js uses PastellPets.enable/disable)
  window.PastellPets = { enable, disable, isEnabled(){ return enabled; } };
})();

