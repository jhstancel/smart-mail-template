export const Starfield = (function(){
  const c = document.getElementById('stars');
  if(!c) return { start(){}, stop(){} };
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
  addEventListener('resize', ()=>{ if(running){ resize(); init(); }});
  return { start, stop };
})();
window.Starfield = Starfield;

