// =============================================================================
// menuScene.js — the ROCK SHOW behind the menus (title, difficulty, songs,
// settings). It's its own little world, separate from the 3D game: a 2D
// canvas drawn in chunky pixel art, then stretched to fill the screen.
//
// What's on it (back to front):
//   * a dark arena with haze, and an LED wall behind the band showing a
//     bouncing equalizer
//   * truss SCAFFOLDING: two towers and a bar across the top, with stage
//     lights that throw sweeping colored beams
//   * speaker stacks, the stage, and the band (the same Retro pixel art as in
//     the game) jamming on the beat, drummer up on his riser
//   * sparkler fountains, falling sparks, and a crowd with their hands up
//   * the RHYTHM RIOT logo (title screen only), crackling with ELECTRICITY.
//     Every few seconds lightning strikes the band and they flash into their
//     Riot Mode versions for two bars.
//
// The canvas is only W pixels wide (the browser scales it up with sharp
// pixels), which keeps it cheap to draw and gives the 16-bit look.
//
//   setMode('title' | 'menu')   logo or no logo (sub-menus dim the scene)
//   update(dt, musicTime)       draw one frame (only called while visible).
//                               musicTime = seconds into the title song, or
//                               null when it isn't playing.
//
// THE MUSIC: while the title song plays, everything moves on ITS beats (from
// its beat map), and the big lightning strikes come exactly where the song
// says (TITLE_SONG.strikes: the first one at 16.05 s, where the song kicks
// in). Without music (before you tap) the scene keeps its own 120 BPM beat
// and the lightning strikes now and then by itself.
// =============================================================================
import { drawPixelText, textWidth } from './pixelFont.js';
import { RETRO_ART } from '../world/bandArt.js';
import { TITLE_SONG, titleBeat } from '../audio/titleMusic.js';

const W = 240; // canvas width in pixels (the height follows the screen shape)
const LIGHT_COLORS = ['#ff3d6e', '#ffbe3b', '#4bbdff', '#63ff79', '#b65bff', '#ff7a1a'];
/** The light color for number i (works for negative numbers too). */
const lightColor = (i) => LIGHT_COLORS[((i % LIGHT_COLORS.length) + LIGHT_COLORS.length) % LIGHT_COLORS.length];
// Fans' shirt and hair colors (dimmed further for the rows nearest you).
const SHIRTS = [[74, 52, 96], [52, 66, 92], [92, 48, 70], [58, 74, 58], [80, 64, 50], [40, 40, 52]];
const HAIR = [[30, 22, 20], [62, 40, 26], [110, 86, 50], [20, 18, 26], [90, 40, 30]];

export function createMenuScene(canvas) {
  const g = canvas.getContext('2d');
  let H = 480;
  let mode = 'title';
  const bpm = 120;        // the scene's own beat when no music is playing
  let time = 0;
  let beat = 0;
  let L = {};             // layout: where things go for this screen shape
  let bg = null;          // pre-drawn static layers (redrawn on resize)
  let fg = null;
  let crowd = [];
  const sparks = [];      // pyro particles
  const bolts = [];       // electricity
  let flash = 0;          // white flash from a lightning strike (0..1)
  let riotUntil = -1;     // beat until which the band shows its Riot versions
  let nextStrike = 3;     // time of the next big lightning strike (no music)
  let lastMusic = null;   // music time on the previous frame (to spot strikes)
  let logoX = 0;          // where the logo was drawn (strikes go through it)
  let logoY = 0;

  // ---- Band art: load the sprite sheets (they're embedded in the page) -----
  const load = (url) => { const img = new Image(); img.src = url; return img; };
  const sheets = {};
  const riotSheets = {};
  for (const name of ['bassist', 'singer', 'guitarist', 'drummer']) {
    sheets[name] = load(RETRO_ART.urls[name]);
    riotSheets[name] = load(RETRO_ART.riot.urls[name]);
  }
  const kit = load(RETRO_ART.urls.drumkit);
  const ready = (img) => img.complete && img.naturalWidth > 0;

  // ---- The logo (built once into its own small canvas) ----------------------
  const logo = buildLogo();

  // ---- Screen shape ----------------------------------------------------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const h = Math.max(380, Math.min(620, Math.round((W * r.height) / r.width)));
    if (h === H && bg) return;
    H = h;
    canvas.width = W;
    canvas.height = H;
    layout();
  }

  function layout() {
    const stageY = Math.round(H * 0.6);
    L = {
      stageY,
      trussY: 6,
      towerL: 4,
      towerR: W - 16,
      logoY: Math.round(H * 0.075),
      wall: { x: 34, y: stageY - 112, w: W - 68, h: 100 },
      speakerL: 18,
      speakerR: W - 18 - 26,
      crowdTop: stageY + 22,
      spots: {
        bassist: { x: 64, y: stageY },
        guitarist: { x: 176, y: stageY },
        singer: { x: 120, y: stageY + 6 },
        drummer: { x: 120, y: stageY - 34 },
      },
    };
    bg = drawBackground();
    fg = drawForeground();
    crowd = makeCrowd();
  }

  // ===========================================================================
  // STATIC LAYERS (drawn once per screen size)
  // ===========================================================================
  function newCanvas(w = W, h = H) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /** Sky, back wall frame, truss, speakers and stage: everything that doesn't move. */
  function drawBackground() {
    const c = newCanvas();
    const b = c.getContext('2d');
    const sky = b.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#05030c');
    sky.addColorStop(0.45, '#160a29');
    sky.addColorStop(0.62, '#2b0f33');
    sky.addColorStop(1, '#07040d');
    b.fillStyle = sky;
    b.fillRect(0, 0, W, H);

    // LED wall frame (the lights inside are drawn every frame).
    const wl = L.wall;
    b.fillStyle = '#0a0714';
    b.fillRect(wl.x - 3, wl.y - 3, wl.w + 6, wl.h + 6);
    b.fillStyle = '#2a2140';
    b.fillRect(wl.x - 3, wl.y - 3, wl.w + 6, 1);

    // Truss towers and the top bar.
    drawTowerTruss(b, L.towerL, L.trussY, L.stageY + 14);
    drawTowerTruss(b, L.towerR, L.trussY, L.stageY + 14);
    drawBarTruss(b, L.towerL, L.trussY, L.towerR + 12 - L.towerL);

    // Speaker stacks (two cabinets each) on both sides of the stage.
    for (const x of [L.speakerL, L.speakerR]) {
      for (let k = 0; k < 2; k++) {
        const y = L.stageY - 26 * (k + 1);
        b.fillStyle = '#121019';
        b.fillRect(x, y, 26, 25);
        b.fillStyle = '#272335';
        b.fillRect(x, y, 26, 1);
        b.fillRect(x, y, 1, 25);
        b.fillStyle = '#07060b';
        b.fillRect(x + 25, y, 1, 25);
      }
    }

    // Stage deck: a lit top edge and a dark front.
    b.fillStyle = '#3a2a52';
    b.fillRect(14, L.stageY, W - 28, 2);
    b.fillStyle = '#16101f';
    b.fillRect(14, L.stageY + 2, W - 28, 14);
    b.fillStyle = '#0b0812';
    b.fillRect(14, L.stageY + 14, W - 28, 2);
    // Drum riser.
    const d = L.spots.drummer;
    b.fillStyle = '#241a33';
    b.fillRect(d.x - 34, d.y, 68, 6);
    b.fillStyle = '#120d1a';
    b.fillRect(d.x - 34, d.y + 6, 68, L.stageY - d.y - 6);
    b.fillStyle = '#3a2a52';
    b.fillRect(d.x - 34, d.y, 68, 1);
    return c;
  }

  /** A vertical truss tower: two silver rails with zig-zag bracing. */
  function drawTowerTruss(b, x, y0, y1) {
    b.fillStyle = '#5d6178';
    b.fillRect(x, y0, 2, y1 - y0);
    b.fillRect(x + 10, y0, 2, y1 - y0);
    b.fillStyle = '#a9aec6';
    b.fillRect(x, y0, 1, y1 - y0);
    b.fillRect(x + 10, y0, 1, y1 - y0);
    b.fillStyle = '#464a5e';
    for (let y = y0; y < y1; y += 10) {
      b.fillRect(x + 2, y, 8, 1);
      for (let k = 0; k < 10; k++) b.fillRect(x + 2 + Math.floor(k * 0.8), y + k, 1, 1); // diagonal brace
    }
  }

  /** A horizontal truss bar across the top. */
  function drawBarTruss(b, x0, y, w) {
    b.fillStyle = '#5d6178';
    b.fillRect(x0, y, w, 2);
    b.fillRect(x0, y + 8, w, 2);
    b.fillStyle = '#a9aec6';
    b.fillRect(x0, y, w, 1);
    b.fillRect(x0, y + 8, w, 1);
    b.fillStyle = '#464a5e';
    for (let x = x0; x < x0 + w; x += 8) {
      b.fillRect(x, y + 2, 1, 6);
      for (let k = 0; k < 6; k++) b.fillRect(x + k, y + 2 + k, 1, 1);
    }
  }

  /** The dark vignette around the edges (on top of everything). */
  function drawForeground() {
    const c = newCanvas();
    const f = c.getContext('2d');
    const v = f.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    f.fillStyle = v;
    f.fillRect(0, 0, W, H);
    return c;
  }

  /** Rows of fans in front of the stage: small at the back, big at the front. */
  function makeCrowd() {
    const people = [];
    const rows = 10;
    for (let r = 0; r < rows; r++) {
      const k = r / (rows - 1);            // 0 = back row, 1 = front row
      // Rows bunch up toward the back (perspective).
      const y = Math.round(L.stageY + 20 + k ** 1.35 * (H - L.stageY - 26));
      const size = 4 + Math.round(k * 7);  // head size in pixels
      const gap = Math.round(size * 1.9);
      for (let x = -6 + (r % 2) * (gap / 2); x < W + 8; x += gap + ((x * 7 + r * 13) % 3)) {
        const seed = Math.abs(Math.round(x * 31 + r * 17)) % 97;
        people.push({
          x: Math.round(x), y: y + (seed % 3), size, row: r, k,
          arms: seed % 3 === 0 ? 2 : seed % 3 === 1 ? 1 : 0,
          phone: seed % 13 === 0,
          shirt: SHIRTS[seed % SHIRTS.length],
          hair: HAIR[(seed >> 2) % HAIR.length],
          phase: (seed % 8) / 8,
        });
      }
    }
    return people;
  }

  // ===========================================================================
  // THE LOGO
  // ===========================================================================
  function buildLogo() {
    const s1 = 3;       // RHYTHM: each font pixel = 3×3 canvas pixels
    const s2 = 5;       // RIOT: 5×5, the big word
    const slant = 0.24; // italic lean
    const pad = 8;
    const depth = 4;    // 3D extrusion depth
    const w1 = textWidth('RHYTHM', 'big') * s1;
    const w2 = textWidth('RIOT', 'big') * s2;
    const h1 = 9 * s1;
    const h2 = 9 * s2;
    const gap = 5;
    const lw = Math.ceil(Math.max(w1 + h1 * slant, w2 + h2 * slant)) + pad * 2 + depth;
    const lh = h1 + gap + h2 + pad * 2 + depth;

    // 1. A plain mask of the letters, and which word each row belongs to.
    const mask = newCanvas(lw, lh);
    const m = mask.getContext('2d');
    m.fillStyle = '#fff';
    const x1 = Math.round((lw - depth - w1 - h1 * slant) / 2);
    const x2 = Math.round((lw - depth - w2 - h2 * slant) / 2);
    const y1 = pad;
    const y2 = pad + h1 + gap;
    drawPixelText(m, 'RHYTHM', x1, y1, { set: 'big', scale: s1, slant });
    drawPixelText(m, 'RIOT', x2, y2, { set: 'big', scale: s2, slant });
    const on = m.getImageData(0, 0, lw, lh).data;
    const at = (x, y) => x >= 0 && y >= 0 && x < lw && y < lh && on[(y * lw + x) * 4 + 3] > 0;

    // 2. Paint the finished logo pixel by pixel: face, highlight, extrusion, outline.
    const out = newCanvas(lw, lh);
    const o = out.getContext('2d');
    const img = o.createImageData(lw, lh);
    const px = img.data;
    const put = (x, y, hex) => {
      const i = (y * lw + x) * 4;
      px[i] = parseInt(hex.slice(1, 3), 16);
      px[i + 1] = parseInt(hex.slice(3, 5), 16);
      px[i + 2] = parseInt(hex.slice(5, 7), 16);
      px[i + 3] = 255;
    };
    // Face colors from top to bottom of each word (gold to fire).
    const RHYTHM_RAMP = ['#ffffff', '#fff6cf', '#ffe48a', '#ffcb4a', '#ffad2e', '#ff8f22'];
    const RIOT_RAMP = ['#fffbe6', '#fff0a6', '#ffdd55', '#ffc23a', '#ff9f2a', '#ff7a1f', '#ff5a1f', '#ee3524', '#cc1f2e'];
    const faceColor = (y) => {
      const inRiot = y >= y2;
      const ramp = inRiot ? RIOT_RAMP : RHYTHM_RAMP;
      const k = inRiot ? (y - y2) / h2 : (y - y1) / h1;
      return ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(k * ramp.length)))];
    };
    const extruded = (x, y) => {
      for (let d = 1; d <= depth; d++) if (at(x - Math.round(d * 0.5), y - d)) return d;
      return 0;
    };
    const solid = (x, y) => at(x, y) || extruded(x, y) > 0;
    const edges = [];
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        if (at(x, y)) {
          if (!at(x, y - 1)) put(x, y, '#ffffff');                 // shiny top edge
          else if (!at(x, y + 1)) put(x, y, '#b8282a');            // shaded bottom edge
          else put(x, y, faceColor(y));
          if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1)) edges.push([x, y]);
        } else {
          const d = extruded(x, y);
          if (d) put(x, y, d <= 2 ? '#7c1a4a' : '#4a0f36');        // the 3D side
          else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
            put(x, y, '#14061c');                                  // dark outline
          }
        }
      }
    }
    o.putImageData(img, 0, 0);

    // 3. A soft orange glow version (drawn behind the logo, pulsing on the beat).
    const glow = newCanvas(lw + 40, lh + 40);
    const gl = glow.getContext('2d');
    gl.shadowColor = '#ff7a2a';
    gl.shadowBlur = 14;
    gl.drawImage(out, 20, 20);
    gl.drawImage(out, 20, 20);

    return { canvas: out, mask, glow, w: lw, h: lh, edges, riotTop: y2, riotX: x2, riotW: w2 };
  }

  // ===========================================================================
  // EVERY FRAME
  // ===========================================================================
  function update(dt, musicTime = null) {
    resize();
    if (!bg) return;
    dt = Math.max(0, dt);
    time += dt;
    if (musicTime != null) {
      // Follow the title song's own beats, and strike where the song says.
      beat = titleBeat(musicTime);
      if (lastMusic != null && musicTime < lastMusic - 1) riotUntil = -1; // the song looped
      if (lastMusic != null) {
        for (const st of TITLE_SONG.strikes) {
          if (lastMusic < st.time && musicTime >= st.time) strike(st.bars, true);
        }
      }
      lastMusic = musicTime;
    } else {
      beat += dt * (bpm / 60);
      lastMusic = null;
      if (time > nextStrike) {
        nextStrike = time + 4 + Math.random() * 4;
        strike(2, false);
      }
    }
    const pulse = Math.exp(-(((beat % 1) + 1) % 1) * 5); // 1 right on the beat, fading
    const bar = Math.floor(beat / 4);
    g.imageSmoothingEnabled = false;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    g.drawImage(bg, 0, 0);
    drawHaze(bar);
    drawLedWall(pulse);
    drawBeams(bar, pulse);
    drawLamps(bar, pulse);
    drawSpeakers(pulse);
    drawStageLights();
    drawBand();
    updateSparks(dt, pulse);
    drawCrowd(pulse, bar);
    if (mode === 'title') drawLogo(dt, pulse);
    drawBolts(dt);

    if (flash > 0) {
      g.fillStyle = `rgba(230,245,255,${(flash * 0.45).toFixed(3)})`;
      g.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - dt * 5);
    }
    g.drawImage(fg, 0, 0);
  }

  function drawHaze(bar) {
    g.globalCompositeOperation = 'lighter';
    const tint = lightColor(bar);
    for (let i = 0; i < 3; i++) {
      const x = ((time * (6 + i * 3) + i * 90) % (W + 120)) - 60;
      const y = L.stageY - 60 + i * 26;
      const r = 70 + i * 10;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, hexA(tint, 0.07));
      grd.addColorStop(1, hexA(tint, 0));
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }

  /** The LED wall: an equalizer of lit dots bouncing to the beat. */
  function drawLedWall(pulse) {
    const wl = L.wall;
    g.fillStyle = '#0d0918';
    g.fillRect(wl.x, wl.y, wl.w, wl.h);
    const cols = Math.floor(wl.w / 4);
    for (let c = 0; c < cols; c++) {
      // Each column bounces at its own speed, everything jumps on the beat.
      const wave = 0.35 + 0.3 * Math.sin(time * 2.1 + c * 0.45) + 0.25 * Math.sin(time * 5.3 + c * 1.7);
      const level = Math.max(0.05, Math.min(1, wave * (0.6 + 0.5 * pulse)));
      const n = Math.floor(level * (wl.h / 4));
      for (let r = 0; r < n; r++) {
        const k = r / (wl.h / 4);
        g.fillStyle = k > 0.75 ? '#ff4d6d' : k > 0.5 ? '#ffbe3b' : '#3fd6a0';
        g.globalAlpha = 0.28 + 0.2 * pulse;
        g.fillRect(wl.x + c * 4 + 1, wl.y + wl.h - 4 - r * 4 + 1, 2, 2);
      }
    }
    g.globalAlpha = 1;
  }

  /** Colored beams from the lights on the top truss, sweeping side to side. */
  function drawBeams(bar, pulse) {
    g.globalCompositeOperation = 'lighter';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = L.towerL + 20 + (i * (L.towerR - L.towerL - 28)) / (n - 1);
      const y = L.trussY + 15;
      const swing = Math.sin(time * 0.8 + i * 1.3 + (i % 2) * Math.PI) * 50;
      const tx = x + swing;
      const ty = L.stageY + 30;
      const spread = 16;
      const color = lightColor(bar + i);
      const a = 0.1 + 0.12 * pulse;
      const grd = g.createLinearGradient(x, y, tx, ty);
      grd.addColorStop(0, hexA(color, a + 0.1));
      grd.addColorStop(1, hexA(color, 0));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x - 1, y);
      g.lineTo(x + 1, y);
      g.lineTo(tx + spread, ty);
      g.lineTo(tx - spread, ty);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  /** The lights themselves (hanging under the top truss) and the side blinders. */
  function drawLamps(bar, pulse) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = Math.round(L.towerL + 20 + (i * (L.towerR - L.towerL - 28)) / (n - 1));
      const y = L.trussY + 10;
      g.fillStyle = '#1c1a26';
      g.fillRect(x - 2, y, 5, 5);
      g.fillStyle = lightColor(bar + i);
      g.fillRect(x - 1, y + 4, 3, 2);
    }
    // Blinders on the towers: white flashes on the first beat of every 2nd bar.
    const blink = bar % 2 === 0 && beat % 4 < 0.5;
    for (const x of [L.towerL + 1, L.towerR + 1]) {
      const y = L.stageY - 70;
      g.fillStyle = '#26232f';
      g.fillRect(x, y, 10, 10);
      g.fillStyle = blink ? '#ffffff' : '#5a5466';
      g.fillRect(x + 1, y + 1, 3, 3);
      g.fillRect(x + 6, y + 1, 3, 3);
      g.fillRect(x + 1, y + 6, 3, 3);
      g.fillRect(x + 6, y + 6, 3, 3);
      if (blink) glowDot(x + 5, y + 5, 26, '#fff6e0', 0.35 * pulse + 0.15);
    }
  }

  /** Speaker cones that thump on the beat. */
  function drawSpeakers(pulse) {
    for (const x of [L.speakerL, L.speakerR]) {
      for (let k = 0; k < 2; k++) {
        const y = L.stageY - 26 * (k + 1);
        for (const [cx, cy, r] of [[x + 13, y + 7, 5], [x + 13, y + 18, 5]]) {
          const rr = r + (pulse > 0.6 ? 1 : 0);
          g.fillStyle = '#05040a';
          g.beginPath();
          g.arc(cx, cy, rr, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#2e2a3c';
          g.fillRect(cx - 1, cy - 1, 2, 2);
        }
      }
    }
  }

  /** A row of little lights along the stage edge, chasing left to right. */
  function drawStageLights() {
    const step = Math.floor(beat * 2);
    for (let x = 18, i = 0; x < W - 18; x += 6, i++) {
      const lit = (i + step) % 4 === 0;
      g.fillStyle = lit ? '#ffd27a' : '#4a3560';
      g.fillRect(x, L.stageY + 5, 2, 1);
    }
  }

  // ---- The band ----------------------------------------------------------------
  function drawBand() {
    const riot = beat < riotUntil;
    const s = L.spots;
    // Drummer first (he's behind his kit), then the front line, singer last.
    drawMember('drummer', s.drummer, riot);
    if (ready(kit)) g.drawImage(kit, Math.round(s.drummer.x - kit.width / 2), Math.round(s.drummer.y - kit.height + 8));
    drawMember('bassist', s.bassist, riot);
    drawMember('guitarist', s.guitarist, riot);
    drawMember('singer', s.singer, riot);
  }

  function drawMember(name, spot, riot) {
    const set = riot ? RETRO_ART.riot.manifest : RETRO_ART.manifest;
    const img = riot ? riotSheets[name] : sheets[name];
    if (!ready(img)) return;
    const info = set.members[name];
    // Riot versions play their wild loops; otherwise calm, with hype every few bars.
    const animName = riot ? (Math.floor(beat / 8) % 2 ? 'riot2' : 'riot')
      : Math.floor(beat / 16) % 3 === 2 ? 'hype' : 'calm';
    const a = info.anims[animName] || info.anims.hub;
    const beats = a.beats || 2;
    const frame = Math.floor((((beat / beats) % 1) + 1) % 1 * a.frames);
    const [cw, ch] = info.cell;
    const lift = name === 'drummer' ? 14 : 0;   // stands up behind the kit
    const x = Math.round(spot.x - cw / 2);
    const y = Math.round(spot.y - info.footY - lift);
    g.drawImage(img, frame * cw, a.row * ch, cw, ch, x, y, cw, ch);
  }

  // ---- Pyro --------------------------------------------------------------------
  function updateSparks(dt, pulse) {
    // Sparkler fountains at the front corners of the stage, every 4th bar.
    const fountain = Math.floor(beat / 4) % 4 === 3;
    if (fountain) {
      for (const x of [26, W - 26]) {
        for (let k = 0; k < 3; k++) {
          sparks.push({ x, y: L.stageY, vx: (Math.random() - 0.5) * 30, vy: -70 - Math.random() * 60 - 40 * pulse, life: 0.9 });
        }
      }
    }
    // Now and then a spark drops from the top truss.
    if (Math.random() < dt * 3) {
      sparks.push({ x: 20 + Math.random() * (W - 40), y: L.trussY + 10, vx: 0, vy: 10, life: 1.6 });
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      p.vy += 140 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle = p.life > 0.5 ? '#fff4c2' : '#ff8a2a';
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    g.globalCompositeOperation = 'source-over';
    if (sparks.length > 300) sparks.splice(0, sparks.length - 300);
  }

  // ---- Crowd -------------------------------------------------------------------
  // Silhouettes, lit from the stage: the back rows catch more light, and every
  // head, shoulder and hand gets a bright rim in the color of the lights.
  function drawCrowd(pulse, bar) {
    const tint = lightColor(bar);
    const shade = (rgb, f) => `rgb(${Math.round(rgb[0] * f)},${Math.round(rgb[1] * f)},${Math.round(rgb[2] * f)})`;
    for (const p of crowd) {
      const hop = Math.round(Math.max(0, Math.sin((beat + p.phase) * Math.PI * 2)) * (1 + p.k * 2) * (0.5 + pulse));
      const y = p.y - hop;
      const s = p.size;
      const dim = 0.95 - p.k * 0.55;          // the front rows are in shadow
      const wave = Math.round(Math.sin((beat + p.phase) * Math.PI) * (1 + p.k));
      const armH = Math.round(s * 2.4);
      const arms = [];
      if (p.arms >= 1) arms.push(p.x - s + wave);
      if (p.arms === 2) arms.push(p.x + s - 1 - wave);
      const hx = p.x - Math.floor(s / 2);   // head left edge
      const sw = Math.round(s * 1.3);        // half the shoulder width
      const bx = p.x - sw;                   // body left edge
      const bw = sw * 2 + 1;
      const neck = Math.max(1, Math.round(s * 0.25));
      const top = y - s - neck;              // top of the head
      // 1. A dark outline so each fan stands apart from the ones behind.
      g.fillStyle = '#07040b';
      for (const ax of arms) g.fillRect(ax - 2, y - armH - 3, 6, armH + 4);
      g.fillRect(hx - 1, top - 1, s + 2, s + neck + 1);
      g.fillRect(bx, y - 1, bw, 1);
      g.fillRect(bx - 1, y, bw + 2, H - y);
      // 2. Shirt (shoulders, body, arms), then a round head of hair (we see
      //    the backs of their heads).
      g.fillStyle = shade(p.shirt, dim);
      for (const ax of arms) {
        g.fillRect(ax, y - armH, 2, armH + 2);
        g.fillRect(ax - 1, y - armH - 2, 4, 3);
      }
      g.fillRect(bx + 1, y, bw - 2, 1);       // rounded shoulders
      g.fillRect(bx, y + 1, bw, H - y);
      g.fillStyle = shade(p.hair, dim);
      g.fillRect(hx + 1, top, s - 2, s);
      g.fillRect(hx, top + 1, s, s - 2);
      g.fillRect(p.x - 1, top + s, 2, neck);  // neck
      // 3. Rim light from the stage along the top edges.
      g.fillStyle = hexA(tint, 0.85 - p.k * 0.45);
      g.fillRect(hx + 1, top, s - 2, 1);
      g.fillRect(bx + 1, y, Math.ceil(sw / 2), 1);
      g.fillRect(bx + bw - 1 - Math.ceil(sw / 2), y, Math.ceil(sw / 2), 1);
      for (const ax of arms) g.fillRect(ax - 1, y - armH - 2, 4, 1);
      if (p.phone && arms.length) {
        g.fillStyle = '#e8f6ff';
        g.fillRect(arms[0], y - armH - 4, 2, 2);
        glowDot(arms[0] + 1, y - armH - 3, 7, '#bfe8ff', 0.5);
      }
    }
  }

  // ---- Logo and electricity ------------------------------------------------------
  function drawLogo(dt, pulse) {
    const lx = Math.round((W - logo.w) / 2);
    const ly = L.logoY + Math.round(Math.sin(time * 1.6) * 1.5);
    logoX = lx;
    logoY = ly;
    // Glow behind, pulsing on the beat.
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.35 + 0.45 * pulse;
    g.drawImage(logo.glow, lx - 20, ly - 20);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(logo.canvas, lx, ly);
    drawGlint(lx, ly);

    // "STARRING X-ROADS" plate under the logo.
    const tag1 = 'STARRING ';
    const tag2 = 'X-ROADS';
    const tw = textWidth(tag1 + tag2);
    const tx = Math.round((W - tw) / 2);
    const ty = ly + logo.h - 2;
    g.fillStyle = 'rgba(10,5,20,0.75)';
    g.fillRect(tx - 5, ty - 3, tw + 10, 13);
    g.fillStyle = '#ff9b52';
    g.fillRect(tx - 5, ty - 3, tw + 10, 1);
    g.fillRect(tx - 5, ty + 9, tw + 10, 1);
    g.fillStyle = '#fff2d1';
    drawPixelText(g, tag1, tx, ty);
    g.fillStyle = '#ffc86b';
    drawPixelText(g, tag2, tx + textWidth(tag1) + 1, ty);

    // Little sparks of electricity crackling along the letters.
    if (Math.random() < dt * 14) {
      const [ex, ey] = logo.edges[(Math.random() * logo.edges.length) | 0];
      const ang = Math.random() * Math.PI * 2;
      const len = 6 + Math.random() * 12;
      bolts.push({ pts: jagged(lx + ex, ly + ey, lx + ex + Math.cos(ang) * len, ly + ey + Math.sin(ang) * len, 3), life: 0.09 });
    }
  }

  /**
   * A BIG lightning strike from the truss (through the logo on the title
   * screen) onto the band, who flash into their Riot Mode versions for
   * `bars` bars. onBeat = it's a music strike, exactly on a bar line.
   */
  function strike(bars, onBeat) {
    const fromX = 30 + Math.random() * (W - 60);
    const end = L.spots.singer;
    if (mode === 'title') {
      const midX = logoX + logo.riotX + Math.random() * logo.riotW;
      const midY = logoY + logo.riotTop + 10;
      bolts.push({ pts: jagged(fromX, L.trussY + 12, midX, midY, 6), life: 0.3, big: true });
      bolts.push({ pts: jagged(midX, midY + 30, end.x, end.y - 50, 5), life: 0.3, big: true });
    } else {
      bolts.push({ pts: jagged(fromX, L.trussY + 12, end.x, end.y - 50, 6), life: 0.3, big: true });
    }
    flash = 1;
    riotUntil = (onBeat ? Math.round(beat) : Math.ceil(beat)) + bars * 4;
    for (let k = 0; k < 30; k++) {
      sparks.push({ x: end.x, y: end.y - 40, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 0.7 });
    }
  }

  /** A sweeping shine across the letters every few seconds. */
  const glintLayer = newCanvas(logo.w, logo.h);
  function drawGlint(lx, ly) {
    const period = 3.2;
    const p = (time % period) / 0.7; // the sweep takes 0.7 s, then a pause
    if (p > 1) return;
    const t = glintLayer.getContext('2d');
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, logo.w, logo.h);
    t.drawImage(logo.mask, 0, 0);
    t.globalCompositeOperation = 'source-in';
    const x = -30 + p * (logo.w + 60);
    t.fillStyle = 'rgba(255,255,255,0.85)';
    t.beginPath();
    t.moveTo(x, 0);
    t.lineTo(x + 10, 0);
    t.lineTo(x - 20, logo.h);
    t.lineTo(x - 30, logo.h);
    t.closePath();
    t.fill();
    g.globalCompositeOperation = 'lighter';
    g.drawImage(glintLayer, lx, ly);
    g.globalCompositeOperation = 'source-over';
  }

  /** A zig-zag line from (x0,y0) to (x1,y1), split `depth` times. */
  function jagged(x0, y0, x1, y1, depth) {
    let pts = [[x0, y0], [x1, y1]];
    let amp = Math.hypot(x1 - x0, y1 - y0) * 0.25;
    for (let d = 0; d < depth; d++) {
      const next = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        next.push([(ax + bx) / 2 + (Math.random() - 0.5) * amp, (ay + by) / 2 + (Math.random() - 0.5) * amp * 0.5]);
        next.push(pts[i]);
      }
      pts = next;
      amp *= 0.55;
    }
    return pts;
  }

  function drawBolts(dt) {
    g.globalCompositeOperation = 'lighter';
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= dt;
      if (b.life <= 0) { bolts.splice(i, 1); continue; }
      if (b.big && Math.random() < 0.3) continue; // flicker
      for (let k = 1; k < b.pts.length; k++) {
        const [ax, ay] = b.pts[k - 1];
        const [bx, by] = b.pts[k];
        plotLine(ax, ay, bx, by, b.big ? 'rgba(120,220,255,0.55)' : 'rgba(120,220,255,0.45)', 1);
        plotLine(ax, ay, bx, by, '#ffffff', 0);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  /** Crisp pixel line (no blurry anti-aliasing). `fat` adds a 1-pixel halo. */
  function plotLine(x0, y0, x1, y1, color, fat) {
    g.fillStyle = color;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      if (fat) g.fillRect(x - 1, y - 1, 3, 3);
      else g.fillRect(x, y, 1, 1);
    }
  }

  function glowDot(x, y, r, color, a) {
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, hexA(color, a));
    grd.addColorStop(1, hexA(color, 0));
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.globalCompositeOperation = prev;
  }

  return {
    update,
    setMode(m) { mode = m; },
    get mode() { return mode; },
  };
}

/** '#rrggbb' + alpha -> 'rgba(...)'. */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
