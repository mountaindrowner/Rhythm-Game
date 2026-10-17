// =============================================================================
// takeover.js — CENTER STAGE: a band member slams onto the note highway for a
// mini-game of their own. Drawn on a see-through canvas over the 3D game.
//
// THE PLAN OF A TAKEOVER (counted in the song's beats, from a bar line):
//   beats 0–2     THE SLAM: the musician (their Riot version, drawn big)
//                 drops onto the middle of the board. Lightning, thunder.
//   beats 2–(end) THE MINI-GAME: targets pop up all over the board. Hit as
//                 many as you can. The musician watches from the far end.
//   after         THE PAYOFF: a rating and your points, then back to the notes.
//
// THE FOUR MINI-GAMES:
//   drummer    DRUM FRENZY   tap the drums (tapping on the beat = double points)
//   bassist    MAD SCIENCE   poke the beakers before their timer runs out
//   singer     CROWD HEARTS  catch the hearts floating up (a streak = more points)
//   guitarist  SHRED         swipe through the glowing strings
//
//   start({ who, start, end, beatAt })   begin (times are game times)
//   update(t, dt)                         move and draw (every frame)
//   finish()                              the payoff; returns { hits, spawned, rating }
//   clear()                               stop everything (song quit or restarted)
//   autoplay(t)                           the robot plays it (?autoplay, tests)
// =============================================================================
import { RETRO_ART } from '../world/bandArt.js';

export const GAMES = {
  drummer:   { title: 'DRUM FRENZY',  who: 'THE DRUMMER',   color: '#ff5b5b', hint: 'TAP THE DRUMS! ON THE BEAT = ×2', every: 0.5, life: 2 },
  bassist:   { title: 'MAD SCIENCE',  who: 'THE SCIENTIST', color: '#63ff79', hint: 'POKE THE BEAKERS BEFORE THEY BOIL OVER!', every: 0.5, life: 3 },
  singer:    { title: 'CROWD HEARTS', who: 'THE SINGER',    color: '#ffbe3b', hint: 'CATCH THE HEARTS!', every: 0.5, life: 3.2 },
  guitarist: { title: 'SHRED',        who: 'THE GUITARIST', color: '#4bbdff', hint: 'SWIPE THROUGH THE GLOWING STRINGS!', every: 1, life: 3.5 },
};
const SLAM_BEATS = 2;     // the slam takes 2 beats
const FONT = '"Pixelify Sans", ui-monospace, monospace';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ score:(base:number)=>number, sfx:(name:string)=>void, now:()=>number,
 *           canPlay:()=>boolean, beatLength:()=>number }} hooks
 *   score(base) adds the points (times your multiplier) and returns what was added
 */
export function createTakeover(canvas, hooks) {
  const g = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let area = { x0: 0, x1: 0, y0: 0, y1: 0 }; // where targets can appear (the board)
  let game = null;        // the takeover in progress
  let result = null;      // the payoff card { title, points, line, until }
  const pops = [];        // floating "+200" texts and bursts
  const swipe = [];       // the guitarist's swipe trail: recent pointer points

  // The musicians' Riot sprite sheets (already embedded for the band).
  const sheets = {};
  for (const name of Object.keys(GAMES)) {
    const img = new Image();
    img.src = RETRO_ART.riot.urls[name];
    sheets[name] = img;
  }

  function fit() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const pads = document.getElementById('pads').getBoundingClientRect();
    area = { x0: W * 0.07, x1: W * 0.93, y0: H * 0.45, y1: pads.top - r.top - 18 };
  }

  // ---- Targets -----------------------------------------------------------------
  /** Find a free spot on the board (not on top of another target). */
  function freeSpot(r) {
    let best = null;
    for (let k = 0; k < 10; k++) {
      const x = area.x0 + r + Math.random() * (area.x1 - area.x0 - 2 * r);
      const y = area.y0 + r + Math.random() * (area.y1 - area.y0 - 2 * r);
      const clash = game.targets.some((o) => !o.done && Math.hypot(o.x - x, o.y - y) < o.r + r + 6);
      best = { x, y };
      if (!clash) break;
    }
    return best;
  }

  function spawn(t) {
    const kind = game.who;
    const life = GAMES[kind].life * hooks.beatLength();
    const o = { kind, born: t, life, done: false, hit: false };
    if (kind === 'guitarist') {
      // A string across the board, slightly tilted (both ends stay on the board).
      const tiltMax = (area.y1 - area.y0) * 0.25;
      const y = area.y0 + 30 + tiltMax / 2 + Math.random() * (area.y1 - area.y0 - 60 - tiltMax);
      const tilt = (Math.random() - 0.5) * tiltMax;
      Object.assign(o, { x: W / 2, y, r: 0, ax: area.x0 - 10, ay: y + tilt / 2, bx: area.x1 + 10, by: y - tilt / 2 });
    } else if (kind === 'singer') {
      // A heart rising from the bottom of the board.
      const r = 20 + Math.random() * 10;
      Object.assign(o, { r, x: area.x0 + r + Math.random() * (area.x1 - area.x0 - 2 * r), y: area.y1 - r, sway: Math.random() * 6 });
    } else {
      const r = kind === 'drummer' ? 24 + Math.random() * 10 : 30 + Math.random() * 6; // beakers a bit bigger
      Object.assign(o, { r }, freeSpot(r));
    }
    game.targets.push(o);
    game.spawned++;
  }

  /** Where a target is drawn right now (hearts float up). */
  function place(o, t) {
    if (o.kind !== 'singer') return o;
    const k = (t - o.born) / o.life;
    o.cx = o.x + Math.sin((t - o.born) * 3 + o.sway) * 14;
    o.cy = o.y - k * (area.y1 - area.y0 - o.r);
    return { x: o.cx, y: o.cy };
  }

  function hitTarget(o, t, x, y) {
    o.done = true;
    o.hit = true;
    game.hits++;
    let base = 100;
    let label = '';
    if (o.kind === 'drummer') {
      // Tapping on the beat (within 0.1 s) doubles it.
      const beat = game.beatAt(t);
      const off = Math.abs(beat - Math.round(beat)) * hooks.beatLength();
      if (off < 0.1) { base *= 2; label = 'ON BEAT ×2'; }
      hooks.sfx('thwack');
    } else if (o.kind === 'bassist') {
      hooks.sfx('pop');
    } else if (o.kind === 'singer') {
      game.streak++;
      base += 10 * Math.min(20, game.streak);
      if (game.streak % 5 === 0) label = `STREAK ${game.streak}!`;
      hooks.sfx('chime');
    } else {
      hooks.sfx('slash');
    }
    const pts = hooks.score(base);
    game.points += pts;
    pops.push({ x, y, t, text: `+${pts}`, color: GAMES[o.kind].color, burst: true });
    if (label) pops.push({ x, y: y - 26, t, text: label, color: '#ffc83a' });
  }

  // ---- Input -------------------------------------------------------------------
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function tapAt(x, y) {
    if (!game || !hooks.canPlay()) return;
    const t = hooks.now();
    if (game.who === 'guitarist') {
      // A tap right on a string cuts it too (forgiving for tiny swipes).
      for (const o of game.targets) {
        if (!o.done && lit(o, t) && distToSegment(x, y, o.ax, o.ay, o.bx, o.by) < 18) hitTarget(o, t, x, y);
      }
      return;
    }
    // The newest target under the finger.
    for (let i = game.targets.length - 1; i >= 0; i--) {
      const o = game.targets[i];
      if (o.done) continue;
      const p = place(o, t);
      if (Math.hypot(p.x - x, p.y - y) < o.r * 1.25) { hitTarget(o, t, x, y); return; }
    }
  }
  function swipeTo(x, y) {
    if (!game || game.who !== 'guitarist' || !hooks.canPlay()) return;
    const t = hooks.now();
    const last = swipe[swipe.length - 1];
    swipe.push({ x, y, t });
    if (!last) return;
    let cut = 0;
    for (const o of game.targets) {
      if (!o.done && lit(o, t) && segmentsCross(last.x, last.y, x, y, o.ax, o.ay, o.bx, o.by)) {
        hitTarget(o, t, x, y);
        cut++;
      }
    }
    if (cut > 1) pops.push({ x, y: y - 30, t, text: `SLASH! ×${cut}`, color: '#e8f6ff' });
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = pos(e);
    swipe.length = 0;
    swipe.push({ ...p, t: hooks.now() });
    canvas.setPointerCapture?.(e.pointerId);
    tapAt(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const p = pos(e);
    swipeTo(p.x, p.y);
  });
  canvas.addEventListener('pointerup', () => { swipe.length = 0; });

  const lit = (o, t) => t - o.born > 0.1 && t - o.born < o.life;

  // ---- Drawing -------------------------------------------------------------------
  function drawMusician(t, u) {
    const img = sheets[game.who];
    if (!img.complete || !img.naturalWidth) return;
    const info = RETRO_ART.riot.manifest.members[game.who];
    const a = info.anims.riot;
    const [cw, ch] = info.cell;
    const beat = game.beatAt(t);
    const frame = Math.floor((((beat / 2) % 1) + 1) % 1 * a.frames);
    // Size and position: big in the middle for the slam, then up at the far end.
    const bigH = H * 0.36;
    const smallH = H * 0.2;
    const landY = area.y0 + (area.y1 - area.y0) * 0.78; // feet, during the slam
    const topY = area.y0 + 8;                           // feet, during the game
    let h = bigH;
    let feet = landY;
    if (u < 0.45) {
      const k = u / 0.45;                               // falling, faster and faster
      feet = -bigH * 0.2 + (landY + bigH * 0.2) * k * k;
    } else if (u > SLAM_BEATS && u < SLAM_BEATS + 0.6) {
      const k = (u - SLAM_BEATS) / 0.6;
      const e = k * k * (3 - 2 * k);
      h = bigH + (smallH - bigH) * e;
      feet = landY + (topY - landY) * e;
    } else if (u >= SLAM_BEATS + 0.6) {
      h = smallH;
      feet = topY;
    }
    const scale = h / info.footY;
    const w = cw * scale;
    g.imageSmoothingEnabled = false;
    g.save();
    g.shadowColor = GAMES[game.who].color;
    g.shadowBlur = 24;
    g.drawImage(img, frame * cw, a.row * ch, cw, ch, W / 2 - w / 2, feet - info.footY * scale, w, ch * scale);
    g.restore();
    // The landing: a shockwave ring at his feet.
    if (u >= 0.45 && u < 1.6) {
      const k = (u - 0.45) / 1.15;
      g.strokeStyle = `rgba(255,220,140,${(1 - k).toFixed(3)})`;
      g.lineWidth = 6 * (1 - k) + 1;
      g.beginPath();
      g.ellipse(W / 2, landY, 40 + k * W * 0.5, 10 + k * 40, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }

  function drawTarget(o, t) {
    const age = t - o.born;
    const pop = Math.min(1, age / 0.12);            // grows in quickly
    const ending = o.life - age < 0.3;
    if (ending && Math.floor(age * 20) % 2) return; // blinks just before it goes
    const { x, y } = place(o, t);
    const r = o.r * pop;
    if (o.kind === 'drummer') {
      const grd = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
      grd.addColorStop(0, '#ffd8d8');
      grd.addColorStop(0.5, '#ff5b5b');
      grd.addColorStop(1, '#7a1020');
      g.fillStyle = '#4a0810';
      circle(x, y + 5, r);
      g.fillStyle = grd;
      circle(x, y, r);
      g.lineWidth = 4;
      g.strokeStyle = '#ffe6e6';
      g.stroke();
      g.strokeStyle = '#fff';
      g.lineWidth = 4;
      const k = r * 0.32;
      g.beginPath();
      g.moveTo(x - k, y - k); g.lineTo(x + k, y + k);
      g.moveTo(x + k, y - k); g.lineTo(x - k, y + k);
      g.stroke();
    } else if (o.kind === 'bassist') {
      drawBeaker(x, y, r, age);
      // The fuse: how long until it boils over.
      const left = Math.max(0, 1 - age / o.life);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x - r, y + r + 6, r * 2, 5);
      g.fillStyle = left > 0.5 ? '#63ff79' : left > 0.25 ? '#ffbe3b' : '#ff5b5b';
      g.fillRect(x - r, y + r + 6, r * 2 * left, 5);
    } else if (o.kind === 'singer') {
      drawHeart(x, y, r);
    } else {
      // A string: a glowing line that brightens, then fades.
      const k = Math.min(1, age / 0.25) * Math.min(1, (o.life - age) / 0.4);
      g.lineCap = 'round';
      g.strokeStyle = `rgba(75,189,255,${(0.45 * k).toFixed(3)})`;
      g.lineWidth = 12;
      line(o.ax, o.ay, o.bx, o.by);
      g.strokeStyle = `rgba(232,246,255,${k.toFixed(3)})`;
      g.lineWidth = 3;
      line(o.ax, o.ay, o.bx, o.by);
    }
  }

  function drawBeaker(x, y, r, age) {
    const s = r / 20;
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.translate(-20, -26);
    g.shadowColor = '#63ff79';
    g.shadowBlur = 14;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.strokeStyle = '#d8fff0';
    g.lineWidth = 2.5;
    flask();
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    // Green liquid in the bottom, with bubbles rising.
    g.save();
    flask();
    g.clip();
    g.fillStyle = '#63ff79';
    g.fillRect(0, 30 + Math.sin(age * 8) * 1.5, 40, 30);
    g.fillStyle = '#d8ffe0';
    for (let i = 0; i < 3; i++) {
      const by = 50 - ((age * 30 + i * 9) % 22);
      g.beginPath();
      g.arc(12 + i * 8, by, 2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.restore();
  }
  const flask = () => {
    g.beginPath();
    g.moveTo(15, 2); g.lineTo(25, 2); g.lineTo(25, 16); g.lineTo(37, 46);
    g.quadraticCurveTo(38, 51, 33, 51); g.lineTo(7, 51);
    g.quadraticCurveTo(2, 51, 3, 46); g.lineTo(15, 16); g.closePath();
  };

  function drawHeart(x, y, r) {
    g.save();
    g.translate(x, y);
    const s = r / 15;
    g.scale(s, s);
    g.shadowColor = '#ffbe3b';
    g.shadowBlur = 14;
    g.beginPath();
    g.moveTo(0, 13);
    g.bezierCurveTo(-18, 0, -12, -16, 0, -6);
    g.bezierCurveTo(12, -16, 18, 0, 0, 13);
    g.fillStyle = '#ffc83a';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#fff6c8';
    g.stroke();
    g.restore();
  }

  function drawPanel(t, u, total) {
    const info = GAMES[game.who];
    const x = 18;
    const y = H * 0.11;
    const w = W - 36;
    g.fillStyle = 'rgba(11,11,24,0.85)';
    roundRect(x, y, w, 46, 12);
    g.fill();
    g.strokeStyle = info.color;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#fff2d1';
    g.font = `700 17px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(info.title, x + 12, y + 15);
    g.textAlign = 'right';
    g.fillStyle = '#ffc83a';
    g.fillText(`${game.hits} HIT${game.hits === 1 ? '' : 'S'}`, x + w - 12, y + 15);
    // Time left: one dot per beat of the mini-game.
    const play = total - SLAM_BEATS;
    const done = Math.max(0, u - SLAM_BEATS);
    const dw = (w - 24) / play;
    for (let i = 0; i < play; i++) {
      g.fillStyle = i < done ? 'rgba(255,255,255,0.15)' : i % 4 === 0 ? info.color : '#ffc83a';
      g.fillRect(x + 12 + i * dw, y + 31, dw - 2, 7);
    }
  }

  function drawPops(t) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      const k = (t - p.t) / 0.7;
      if (k >= 1 || k < 0) { pops.splice(i, 1); continue; }
      if (p.burst) {
        g.strokeStyle = p.color;
        g.globalAlpha = 1 - k;
        g.lineWidth = 3;
        circleStroke(p.x, p.y, 10 + k * 40);
      }
      g.globalAlpha = 1 - k * k;
      g.font = `700 20px ${FONT}`;
      g.lineWidth = 4;
      g.strokeStyle = '#1d0b14';
      g.strokeText(p.text, p.x, p.y - k * 40);
      g.fillStyle = p.color;
      g.fillText(p.text, p.x, p.y - k * 40);
      g.globalAlpha = 1;
    }
  }

  function bigText(lines, y) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let yy = y;
    for (const [text, size, color] of lines) {
      g.font = `700 ${size}px ${FONT}`;
      g.lineWidth = Math.max(4, size / 5);
      g.strokeStyle = '#1d0b14';
      g.strokeText(text, W / 2, yy);
      g.fillStyle = color;
      g.fillText(text, W / 2, yy);
      yy += size * 1.15;
    }
  }

  function drawResult(t) {
    const k = (t - result.at) / 0.35;
    const s = k < 1 ? 1 + 0.6 * (1 - k) * (1 - k) : 1;
    const alpha = Math.min(1, (result.until - t) / 0.4);
    g.save();
    g.globalAlpha = Math.max(0, alpha);
    g.translate(W / 2, H * 0.3);
    g.scale(s, s);
    g.translate(-W / 2, -H * 0.3);
    g.fillStyle = 'rgba(11,11,24,0.9)';
    roundRect(30, H * 0.3 - 74, W - 60, 148, 16);
    g.fill();
    g.strokeStyle = '#ffc86b';
    g.lineWidth = 3;
    g.stroke();
    bigText([
      [result.stars, 22, '#ffd700'],
      [result.title, 30, '#fff2d1'],
      [`+${result.points.toLocaleString('en-US')}`, 34, '#ffc83a'],
      [result.line, 13, '#d9d3f0'],
    ], H * 0.3 - 46);
    g.restore();
  }

  // ---- Small drawing helpers ----------------------------------------------------
  function circle(x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.fill(); }
  function circleStroke(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  function line(ax, ay, bx, by) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
  function roundRect(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---- Public ----------------------------------------------------------------------
  return {
    start({ who, start, end, beatAt }) {
      fit();
      const b0 = beatAt(start);
      game = {
        who, start, end, beatAt, b0,
        total: Math.round(beatAt(end) - b0),
        nextSpawn: SLAM_BEATS + 0.25,
        targets: [], hits: 0, spawned: 0, streak: 0, points: 0,
      };
      result = null;
      pops.length = 0;
      canvas.classList.add('live');
    },

    update(t, dt) {
      if (!game && !result) {
        if (canvas.width) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); canvas.width = 0; }
        return;
      }
      if (!canvas.width) fit();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (game) {
        const u = game.beatAt(t) - game.b0; // beats since the takeover began
        // Darken the board so the targets stand out.
        const grd = g.createRadialGradient(W / 2, (area.y0 + area.y1) / 2, 20, W / 2, (area.y0 + area.y1) / 2, W * 0.75);
        grd.addColorStop(0, 'rgba(5,3,12,0.7)');
        grd.addColorStop(1, 'rgba(5,3,12,0.25)');
        g.fillStyle = grd;
        g.fillRect(0, H * 0.36, W, area.y1 - H * 0.36 + 30);
        // New targets on schedule, until a beat before the end.
        const info = GAMES[game.who];
        while (u >= game.nextSpawn && game.nextSpawn < game.total - 1) {
          spawn(t);
          // Drum Frenzy: now and then two at once.
          if (game.who === 'drummer' && Math.random() < 0.3) spawn(t);
          game.nextSpawn += info.every;
        }
        // Targets that ran out of time.
        for (const o of game.targets) {
          if (!o.done && t - o.born > o.life) {
            o.done = true;
            if (o.kind === 'singer') game.streak = 0; // a heart got away: streak over
            if (o.kind === 'bassist') pops.push({ x: o.x, y: o.y, t, text: 'FIZZ', color: '#9a9aa8' });
          }
        }
        game.targets = game.targets.filter((o) => !o.done || t - o.born < o.life + 0.1);
        for (const o of game.targets) if (!o.done) drawTarget(o, t);
        drawMusician(t, u);
        // The swipe trail (guitarist).
        while (swipe.length && t - swipe[0].t > 0.18) swipe.shift();
        if (game.who === 'guitarist' && swipe.length > 1) {
          g.strokeStyle = 'rgba(255,255,255,0.85)';
          g.lineWidth = 5;
          g.lineCap = 'round';
          g.beginPath();
          swipe.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
          g.stroke();
        }
        if (u < SLAM_BEATS + 0.4) {
          bigText([[info.who, 34, '#fff2d1'], ['TAKES CENTER STAGE!', 18, '#ffc86b']], H * 0.33);
          bigText([[info.title, 22, info.color], [info.hint, 14, '#fff2d1']], area.y1 - 70);
        } else {
          drawPanel(t, u, game.total);
        }
      }
      drawPops(t);
      if (result) {
        if (t > result.until) result = null;
        else drawResult(t);
      }
    },

    /** The takeover is over: show the payoff and return how it went. */
    finish() {
      if (!game) return null;
      const t = hooks.now();
      const share = game.spawned ? game.hits / game.spawned : 0;
      const rating = share >= 0.8 ? 'LEGENDARY' : share >= 0.55 ? 'GREAT' : game.hits ? 'GOOD' : 'NONE';
      result = {
        at: t, until: t + 2.4, points: game.points,
        stars: rating === 'LEGENDARY' ? '★ ★ ★' : rating === 'GREAT' ? '★ ★' : '★',
        title: rating === 'NONE' ? 'THE CROWD STILL LOVES YOU' : `${rating} TAKEOVER!`,
        line: `${game.hits} OF ${game.spawned} · ${GAMES[game.who].title}`,
      };
      const out = { hits: game.hits, spawned: game.spawned, rating, points: game.points };
      game = null;
      swipe.length = 0;
      canvas.classList.remove('live');
      return out;
    },

    clear() {
      game = null;
      result = null;
      pops.length = 0;
      swipe.length = 0;
      canvas.classList.remove('live');
    },

    /** The robot: hits most targets a moment after they appear. */
    autoplay(t) {
      if (!game) return;
      for (const o of game.targets) {
        if (o.done || t - o.born < 0.3 || Math.random() < 0.9) continue;
        if (o.kind === 'guitarist') hitTarget(o, t, (o.ax + o.bx) / 2, (o.ay + o.by) / 2);
        else { const p = place(o, t); hitTarget(o, t, p.x, p.y); }
      }
    },

    get active() { return !!game; },
    /** For the tests: where the live targets are (CSS pixels on the screen). */
    get targets() {
      if (!game) return [];
      const t = hooks.now();
      const r = canvas.getBoundingClientRect();
      return game.targets.filter((o) => !o.done && lit(o, t)).map((o) => {
        const p = o.kind === 'guitarist' ? { x: (o.ax + o.bx) / 2, y: (o.ay + o.by) / 2 } : place(o, t);
        return { kind: o.kind, x: r.left + p.x, y: r.top + p.y };
      });
    },
    get stats() { return game ? { who: game.who, hits: game.hits, spawned: game.spawned, points: game.points } : null; },
  };
}

/** Shortest distance from point (px,py) to the segment a-b. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}

/** Do segments p1-p2 and p3-p4 cross? */
function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const u = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const v = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}
