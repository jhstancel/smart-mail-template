/* === "oddy nuff" Easter egg ============================================== */
/* When any input/textarea contains "oddy nuff", briefly show Ruby & Scrim
 * peeking from bottom corners, speakers from top corners, and play a sound. */

(function(){
  const PHRASE       = 'oddy nuff';
  const COOLDOWN_MS  = 15000;  // don’t spam if user keeps typing it
  const HOLD_MS      = 3500;   // how long they stay on-screen before exit
  const EXIT_MS      = 800;    // exit animation duration (keep in sync w/ CSS)

  let lastLaunch = 0;
  let active     = false;

  function spawnOddyNuff(){
    const now = Date.now();
    if (active) return;
    if (now - lastLaunch < COOLDOWN_MS) return;
    lastLaunch = now;
    active = true;

    // Container overlay
    const root = document.createElement('div');
    root.id = 'oddyNuffEgg';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <div class="g59-char g59-ruby g59-bottom-left"></div>
      <div class="g59-char g59-scrim g59-bottom-right"></div>
      <div class="g59-speaker g59-top-left"></div>
      <div class="g59-speaker g59-top-right"></div>
    `;

    document.body.appendChild(root);

    // Audio (user provides file at ui/sfx/oddy-nuff.mp3, or override via window.ODDY_NUFF_SRC)
    try {
      const audio = new Audio(window.ODDY_NUFF_SRC || 'sfx/oddy-nuff.mp3');
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (_) {
      // no-op if Audio not available
    }

    // Hold, then exit + cleanup
    setTimeout(() => {
      root.classList.add('oddy-out');
      setTimeout(() => {
        root.remove();
        active = false;
      }, EXIT_MS);
    }, HOLD_MS);
  }

  function onAnyInput(e){
    const el = e.target;
    if (!el || !('value' in el)) return;
    const v = String(el.value || '').toLowerCase();
    if (v.includes(PHRASE)) spawnOddyNuff();
  }

  document.addEventListener('input', onAnyInput, { passive: true });

  // optional manual trigger from console
  window.spawnOddyNuff = spawnOddyNuff;
})();

