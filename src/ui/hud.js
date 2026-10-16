// =============================================================================
// hud.js — updates the on-screen text: score, combo, energy bar, song section,
// judgement pop-ups, count-in, and the four pads' pressed look.
//
// This is plain HTML/CSS (see index.html + styles.css) drawn on top of the 3D
// canvas. Text is much crisper as HTML than inside a 3D scene.
// =============================================================================
import { LANES, BEAT, LEAD } from '../config.js';
import { SONG, onSongChange } from '../song/chart.js';

const $ = (id) => document.getElementById(id);

const GRADE_TEXT = {
  perfect: ['PERFECT!', '#fff2d1'],
  great: ['GREAT!', '#ffc86b'],
  good: ['GOOD', '#b9b2d6'],
  miss: ['MISS', '#ff6b6b'],
  wrong: ['WRONG NOTE', '#ff6b6b'],
  holdLost: ['HOLD LOST', '#ff6b6b'],
  holdComplete: ['HOLD!', '#63ff79'],
};

export function createHud() {
  // Build the four pads from the LANES list in config.js.
  const pads = LANES.map((l) => {
    const el = document.createElement('div');
    el.className = 'pad';
    el.style.setProperty('--c', l.color);
    el.innerHTML = `<span class="icon">${l.icon}</span><span class="label">${l.label}</span>`;
    $('pads').append(el);
    return el;
  });

  onSongChange((song) => { $('hudTitle').textContent = song.title.toUpperCase(); });
  const el = {
    score: $('score'), combo: $('combo'), life: $('lifeFill'), section: $('sectionName'),
    clock: $('clock'), progress: $('progressFill'), judgement: $('judgement'),
    countIn: $('countIn'), banner: $('banner'), mult: $('mult'),
    riotFill: $('riotFill'), riotRow: $('riotFill').closest('.riot-row'), riotHint: $('riotHint'),
  };
  let shown = {}; // cache so we only touch the page when something changes

  const set = (key, node, value, apply) => {
    if (shown[key] === value) return;
    shown[key] = value;
    apply(node, value);
  };
  const text = (node, v) => { node.textContent = v; };

  function popup(node, message, color) {
    node.textContent = message;
    node.style.color = color;
    node.classList.remove('pop');
    void node.offsetWidth; // restart the CSS animation
    node.classList.add('pop');
  }

  return {
    /** Show feedback for a rules.js event. */
    /** timing = 'early' / 'late' / '' (shown small under GREAT and GOOD). */
    judgement(key, timing = '') {
      const [message, color] = GRADE_TEXT[key];
      popup(el.judgement, message, color);
      if (timing) {
        const small = document.createElement('small');
        small.textContent = timing.toUpperCase();
        el.judgement.append(small);
      }
    },
    banner(message) { popup(el.banner, message, '#ffbe3b'); },

    /** Called every frame while playing. */
    update(perf, t, section) {
      const songTime = Math.max(0, t - LEAD);
      set('score', el.score, perf.score.toLocaleString('en-US'), text);
      set('combo', el.combo, perf.combo, text);
      set('mult', el.mult, perf.multiplier, (n, v) => {
        const rising = v > (Number(n.dataset.level) || 1);
        n.textContent = `×${v}`;
        n.dataset.level = Math.min(4, v);
        if (rising) { n.classList.remove('up'); void n.offsetWidth; n.classList.add('up'); }
      });
      // Riot meter, and the "swipe up" hint when it's ready (or can save the show).
      set('riotFill', el.riotFill, Math.round(perf.riotMeter * 100), (n, v) => { n.style.width = `${v}%`; });
      set('riotState', el.riotRow, perf.riotActive ? 'active' : perf.riotReady ? 'ready' : '', (n, v) => {
        n.classList.toggle('active', v === 'active');
        n.classList.toggle('ready', v === 'ready');
        el.mult.classList.toggle('riot', v === 'active');
        document.getElementById('phone').classList.toggle('riot', v === 'active');
      });
      const save = perf.riotReady && perf.energy <= 25;
      const hint = perf.riotReady ? (save ? '⬆ SWIPE UP TO SAVE THE SHOW!' : '⬆ SWIPE UP FOR RIOT MODE!') : '';
      set('riotHint', el.riotHint, hint, (n, v) => {
        n.hidden = !v;
        n.textContent = v;
        n.classList.toggle('save', v.includes('SAVE'));
      });
      set('life', el.life, Math.round(perf.energy), (n, v) => { n.style.width = `${v}%`; });
      set('section', el.section, section, text);
      const secs = Math.floor(songTime);
      set('clock', el.clock, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, text);
      set('progress', el.progress, Math.round((songTime / SONG.duration) * 200), (n, v) => { n.style.width = `${v / 2}%`; });
      // Count-in: 3, 2, 1, GO! over the four beats before the song.
      const beatIdx = Math.floor(t / BEAT);
      set('countIn', el.countIn, t < LEAD && t >= 0 ? ['3', '2', '1', 'GO!'][beatIdx] ?? '' : '', text);
    },

    setPadDown(lane, down) {
      set(`pad${lane}`, pads[lane], down, (n, v) => n.classList.toggle('down', v));
    },

    reset() {
      shown = {};
      el.countIn.textContent = '';
      el.judgement.classList.remove('pop');
      el.banner.classList.remove('pop');
      el.riotHint.hidden = true;
      document.getElementById('phone').classList.remove('riot');
    },
  };
}
