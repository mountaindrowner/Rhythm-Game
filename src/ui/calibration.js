// =============================================================================
// calibration.js — the "tap to the beat" screen that measures your timing.
//
// Every phone + headphone combination has a small delay between "the game
// plays a sound" and "you hear it" (Bluetooth headphones can add 150+ ms).
// To measure it, we play steady clicks and you tap when you HEAR each one.
// The typical (median) gap between click and tap becomes your tap offset.
//
// The clicks are played on the same audio clock the game uses for judging,
// so the measurement and the gameplay agree exactly.
// =============================================================================

const INTERVAL = 0.6;   // seconds between clicks (100 BPM)
const LEAD_CLICKS = 4;  // listen-only clicks before you start tapping
const TAP_CLICKS = 16;  // clicks to tap along with
const MIN_TAPS = 8;

const $ = (id) => document.getElementById(id);

/**
 * @param {import('../audio/player.js').SongPlayer} player
 * @param {{ onApply:(ms:number)=>void, onClose:()=>void }} handlers
 */
export function createCalibration(player, { onApply, onClose }) {
  const overlay = $('calibration');
  const pad = $('calPad');
  const info = $('calInfo');
  const result = $('calResult');
  const startBtn = $('calStart');
  const applyBtn = $('calApply');

  let clicks = [];   // scheduled click times (audio clock)
  let taps = [];     // measured gaps in seconds (tap time − click time)
  let running = false;
  let measuredMs = 0;
  let raf = 0;

  function open() {
    overlay.hidden = false;
    reset();
  }

  function close() {
    running = false;
    cancelAnimationFrame(raf);
    overlay.hidden = true;
    onClose();
  }

  function reset() {
    running = false;
    clicks = [];
    taps = [];
    info.textContent = 'Press START, listen to 4 clicks, then tap the big button each time you HEAR a click.';
    result.textContent = '';
    startBtn.hidden = false;
    startBtn.textContent = '▶ START';
    startBtn.classList.add('primary');
    applyBtn.hidden = true;
    pad.classList.remove('on');
  }

  async function start() {
    const unlocked = player.unlock(); // inside the tap, so iPhones allow sound
    await unlocked;
    const ctx = player.ctx;
    const first = ctx.currentTime + 0.6;
    clicks = Array.from({ length: LEAD_CLICKS + TAP_CLICKS }, (_, i) => first + i * INTERVAL);
    clicks.forEach((time, i) => click(ctx, time, i < LEAD_CLICKS));
    taps = [];
    running = true;
    startBtn.hidden = true;
    applyBtn.hidden = true;
    result.textContent = '';
    loop();
  }

  function tap() {
    if (!running) return;
    const now = player.ctx.currentTime;
    // Flash on YOUR tap (not on the click) so your eyes don't do the timing.
    pad.classList.remove('flash');
    void pad.offsetWidth;
    pad.classList.add('flash');
    // Match the tap with the nearest click you're meant to tap along with.
    let best = Infinity;
    for (let i = LEAD_CLICKS; i < clicks.length; i++) {
      const d = now - clicks[i];
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    if (Math.abs(best) < INTERVAL * 0.45) taps.push(best);
  }

  function loop() {
    if (!running) return;
    const now = player.ctx.currentTime;
    const n = Math.floor((now - clicks[0]) / INTERVAL) + 1;
    if (n <= LEAD_CLICKS) {
      info.textContent = n > 0 ? `Listen… ${n} / ${LEAD_CLICKS}` : 'Get ready…';
    } else {
      info.textContent = `Tap along! ${taps.length} taps`;
    }
    if (now > clicks[clicks.length - 1] + 0.5) return finish();
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    running = false;
    startBtn.hidden = false;
    startBtn.textContent = '↻ TRY AGAIN';
    startBtn.classList.toggle('primary', taps.length < MIN_TAPS);
    if (taps.length < MIN_TAPS) {
      info.textContent = `Only ${taps.length} taps counted — try again and tap on every click.`;
      return;
    }
    const sorted = [...taps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    measuredMs = Math.round((median * 1000) / 5) * 5;
    const spread = Math.round((sorted[Math.floor(sorted.length * 0.8)] - sorted[Math.floor(sorted.length * 0.2)]) * 1000);
    info.textContent = `${taps.length} taps measured (consistency ±${Math.round(spread / 2)} ms).`;
    result.textContent = measuredMs === 0
      ? 'Your taps are right on time!'
      : `Your taps land ${Math.abs(measuredMs)} ms ${measuredMs > 0 ? 'late' : 'early'}.`;
    applyBtn.hidden = false;
  }

  startBtn.addEventListener('click', start);
  applyBtn.addEventListener('click', () => { onApply(measuredMs); close(); });
  $('calCancel').addEventListener('click', close);
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  window.addEventListener('keydown', (e) => {
    if (overlay.hidden || e.repeat) return;
    if (e.code === 'Space' || e.code.startsWith('Key') || e.code.startsWith('Digit')) {
      e.preventDefault();
      tap();
    }
  });

  return { open, get isOpen() { return !overlay.hidden; } };
}

/** A short metronome click; the first few are higher-pitched "listen" clicks. */
function click(ctx, time, lead) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = lead ? 1500 : 1000;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.25, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}
