// === Corruption easter egg (idempotent) ===
if (typeof window.runCorruption !== 'function') {
  window.runCorruption = async function runCorruption(){
    document.body.classList.add('corrupting');
    Starfield.stop();

    const bufferEl  = document.getElementById('buffer');
    const printMask = document.getElementById('printMask');
    const printLine = document.getElementById('printLine');

    if(bufferEl)  bufferEl.classList.add('show');
    await new Promise(r=>setTimeout(r,900));
    if(bufferEl)  bufferEl.classList.remove('show');

    if(printMask) printMask.classList.add('show');
    if(printLine) printLine.classList.add('show');

    document.querySelectorAll('.panel').forEach(p=> p.style.opacity = '0');
    await new Promise(r=>setTimeout(r,2600));

    if(printMask) printMask.classList.remove('show');
    if(printLine) printLine.classList.remove('show');

    document.querySelectorAll('.panel').forEach((p,i)=> setTimeout(()=> p.style.opacity = '1', 60*i));

    document.body.classList.remove('corrupting');
    if(document.body.dataset.theme === 'cosmic') Starfield.start();
  };
}

