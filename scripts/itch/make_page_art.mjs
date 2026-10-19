// =============================================================================
// make_page_art.mjs — draws the extra pictures for the itch.io page's
// description, using the game's own pixel font (src/ui/pixelFont.js) and band
// art: logo-style section headers, a divider, the controls picture, and the
// frames of the "Meet X-ROADS" animation (the band, a lightning strike, then
// their Riot Mode versions).
//
//   node scripts/itch/make_page_art.mjs <out-folder>
//   python3 scripts/itch/make_gif.py <out-folder>      (joins the frames into a GIF)
//
// Everything is drawn small and then scaled up 2x so the pixels stay crisp.
// =============================================================================
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const R = fileURLToPath(new URL('../../', import.meta.url)); // the project folder
const OUT = process.argv[2];
const font = readFileSync(R + 'src/ui/pixelFont.js', 'utf8').replace(/^export /gm, '');
const art = {};
for (const dir of ['pixellab-retro', 'pixellab-retro-riot']) {
  art[dir] = { band: JSON.parse(readFileSync(`${R}assets/art/${dir}/band.json`, 'utf8')), png: {} };
  for (const f of ['bassist', 'singer', 'guitarist', 'drummer', 'drumkit']) {
    art[dir].png[f] = 'data:image/png;base64,' + readFileSync(`${R}assets/art/${dir}/${f}.png`).toString('base64');
  }
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: font + '\nwindow.PF = { drawPixelText, textWidth };' });
const result = await page.evaluate(async (art) => {
  const { drawPixelText, textWidth } = window.PF;
  const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  for (const d of Object.values(art)) for (const k of Object.keys(d.png)) d.png[k] = await load(d.png[k]);
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const up = (c, s) => { const o = canvas(c.width * s, c.height * s); const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
  const LANE = { bassist: '#63ff79', singer: '#ffbe3b', guitarist: '#4bbdff', drummer: '#ff5b5b' };
  const BG = '#0b0b18';

  // ---- Logo-style pixel words (same treatment as the RHYTHM RIOT logo) -----
  const RAMP = ['#fffbe6', '#fff0a6', '#ffdd55', '#ffc23a', '#ff9f2a', '#ff7a1f', '#ff5a1f', '#ee3524'];
  function logoWord(text, scale, ramp = RAMP) {
    const slant = 0.24, depth = 2, pad = 3;
    const tw = textWidth(text) * scale, th = 7 * scale;
    const lw = Math.ceil(tw + th * slant) + pad * 2 + depth, lh = th + pad * 2 + depth;
    const m = canvas(lw, lh).getContext('2d'); m.fillStyle = '#fff';
    drawPixelText(m, text, pad, pad, { scale, slant });
    const on = m.getImageData(0, 0, lw, lh).data;
    const at = (x, y) => x >= 0 && y >= 0 && x < lw && y < lh && on[(y * lw + x) * 4 + 3] > 0;
    const out = canvas(lw, lh); const o = out.getContext('2d');
    const put = (x, y, c) => { o.fillStyle = c; o.fillRect(x, y, 1, 1); };
    const ext = (x, y) => { for (let d = 1; d <= depth; d++) if (at(x - Math.round(d * 0.5), y - d)) return d; return 0; };
    const solid = (x, y) => at(x, y) || ext(x, y) > 0;
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      if (at(x, y)) {
        if (!at(x, y - 1)) put(x, y, '#ffffff');
        else if (!at(x, y + 1)) put(x, y, '#b8282a');
        else put(x, y, ramp[Math.min(ramp.length - 1, Math.floor(((y - pad) / th) * ramp.length))]);
      } else if (ext(x, y)) put(x, y, '#7c1a4a');
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) put(x, y, '#14061c');
    }
    return out;
  }
  function jagged(x0, y0, x1, y1, n, amp) {
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * amp, y0 + (y1 - y0) * t + (Math.random() - 0.5) * amp * 0.4]);
    }
    pts.push([x1, y1]); return pts;
  }
  function boltLine(g, pts, core = '#ffffff', glow = '#4bbdff', w = 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = glow; g.globalAlpha = 0.5; g.lineWidth = w + 2; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = core; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.restore();
  }

  // ---- 1. Section headers: 300x34 base, x2 = 600x68 ------------------------
  const headers = {};
  for (const text of ['HOW TO PLAY', 'RIOT MODE!', 'CENTER STAGE', 'MEET X-ROADS', 'THE SET LIST', 'CONTROLS', 'TIPS', 'CREDITS', "WHAT'S INSIDE"]) {
    const W = 300, H = 34, c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    const word = logoWord(text, 3);
    const x = Math.round((W - word.width) / 2), y = Math.round((H - word.height) / 2);
    // glow behind
    g.save(); g.shadowColor = '#ff7a2a'; g.shadowBlur = 8; g.globalAlpha = 0.55; g.drawImage(word, x, y); g.restore();
    // amp-orange rails out to the edges, fading
    for (const side of [-1, 1]) {
      const from = side < 0 ? x - 6 : x + word.width + 4, to = side < 0 ? 8 : W - 8;
      const grad = g.createLinearGradient(from, 0, to, 0); grad.addColorStop(0, '#ff9b52'); grad.addColorStop(1, 'rgba(255,155,82,0)');
      g.fillStyle = grad; g.fillRect(Math.min(from, to), H / 2 - 1, Math.abs(to - from), 1);
      g.fillStyle = 'rgba(255,155,82,0.35)'; g.fillRect(Math.min(from, to), H / 2, Math.abs(to - from), 1);
      // a little spark at the inner end
      g.fillStyle = '#fff2d1'; g.fillRect(from - (side < 0 ? 1 : 0), H / 2 - 2, 2, 2);
    }
    g.drawImage(word, x, y);
    headers[text] = up(c, 2);
  }

  // ---- 2. Divider: 300x12 -> 600x24 ----------------------------------------
  const div = canvas(300, 12); { const g = div.getContext('2d'); g.fillStyle = BG; g.fillRect(0, 0, 300, 12);
    g.imageSmoothingEnabled = false;
    // a pixel zigzag of electricity
    let y = 6; for (let x = 20; x < 280; x++) { const prev = y; if (x % 5 === 0) y = 6 + [-3, -1, 1, 3][(Math.random() * 4) | 0]; const a = Math.min(1, Math.min(x - 20, 280 - x) / 40);
      const y0 = Math.min(prev, y), y1 = Math.max(prev, y);
      g.globalAlpha = a * 0.35; g.fillStyle = '#4bbdff'; g.fillRect(x - 1, y0 - 1, 3, y1 - y0 + 3); g.globalAlpha = a; g.fillStyle = '#e8fbff'; g.fillRect(x, y0, 1, y1 - y0 + 1); }
    g.globalAlpha = 1; const lanes = Object.values(LANE); g.fillStyle = BG; g.fillRect(132, 0, 36, 12); lanes.forEach((col, i) => { g.fillStyle = col; g.fillRect(137 + i * 7, 4, 4, 4); }); }
  const divider = up(div, 2);

  // ---- 3. Meet X-ROADS GIF frames: 300x150 base -> 600x300 -----------------
  const ORDER = [['bassist', 'BASS', 'SCIENTIST'], ['singer', 'VOCALS', 'SINGER'], ['guitarist', 'GUITAR', 'GUITARIST'], ['drummer', 'DRUMS', 'DRUMMER']];
  function member(g, set, name, anim, frame, cx, footY) {
    const b = art[set].band.members[name]; const a = b.anims[anim]; const [cw, ch] = b.cell;
    const f = frame % a.frames;
    g.drawImage(art[set].png[name], f * cw, a.row * ch, cw, ch, Math.round(cx - cw / 2), Math.round(footY - b.footY), cw, ch);
  }
  const crowdSeed = Array.from({ length: 40 }, () => [Math.random() * 300, Math.random()]);
  function bandFrame(set, anim, frame, flash, bolts) {
    const W = 300, H = 150, c = canvas(W, H), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    ORDER.forEach(([name, role, who], i) => {
      const cx = 37 + i * 75, col = LANE[name];
      // spotlight cone in the lane colour
      const grad = g.createLinearGradient(0, 0, 0, 112); grad.addColorStop(0, col + '00'); grad.addColorStop(1, col + (set.includes('riot') ? '55' : '33'));
      g.fillStyle = grad; g.beginPath(); g.moveTo(cx - 6, 0); g.lineTo(cx + 6, 0); g.lineTo(cx + 30, 112); g.lineTo(cx - 30, 112); g.fill();
      // floor disc
      g.fillStyle = col + '44'; g.beginPath(); g.ellipse(cx, 111, 28, 4, 0, 0, Math.PI * 2); g.fill();
      if (name === 'drummer') {
        member(g, set, name, anim === 'hype' ? 'hype' : anim, frame, cx, 104);
        const kit = art[set].png.drumkit; g.drawImage(kit, Math.round(cx - kit.width / 2), 112 - kit.height + 2);
      } else member(g, set, name, anim, frame, cx, 112);
      // labels
      g.fillStyle = col; const rw = textWidth(role); drawPixelText(g, role, Math.round(cx - rw / 2), 119);
      g.fillStyle = '#fff2d1'; const ww = textWidth(who); drawPixelText(g, who, Math.round(cx - ww / 2), 130);
    });
    // stage edge
    g.fillStyle = '#ff9b52'; g.fillRect(0, 114, W, 1); g.fillStyle = '#3a2a4a'; g.fillRect(0, 115, W, 1);
    if (bolts) for (const b of bolts) boltLine(g, b, '#ffffff', '#7fdcff', 1);
    if (flash) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
    // little "RIOT MODE!" tag when riot
    if (set.includes('riot') && !flash) {
      const tag = logoWord('RIOT MODE!', 2);
      g.save(); g.shadowColor = '#ff7a2a'; g.shadowBlur = 6; g.drawImage(tag, Math.round((W - tag.width) / 2), 1); g.restore();
    }
    return c;
  }
  const frames = [];
  for (let k = 0; k < 32; k++) frames.push([up(bandFrame('pixellab-retro', 'hype', k), 2), 70]);
  const strikes = [0, 1, 2, 3].map((i) => jagged(37 + i * 75 + (Math.random() - 0.5) * 30, 0, 37 + i * 75, 60, 7, 14));
  frames.push([up(bandFrame('pixellab-retro', 'hype', 32, 0, strikes), 2), 60]);
  frames.push([up(bandFrame('pixellab-retro', 'hype', 33, 0.85, strikes), 2), 60]);
  frames.push([up(bandFrame('pixellab-retro-riot', 'riot', 0, 0.5, strikes), 2), 60]);
  frames.push([up(bandFrame('pixellab-retro-riot', 'riot', 1, 0.2), 2), 60]);
  for (let k = 2; k < 48; k++) frames.push([up(bandFrame('pixellab-retro-riot', 'riot', k), 2), 70]);
  frames.push([up(bandFrame('pixellab-retro', 'hype', 0, 0.6), 2), 70]);

  // ---- 4. Controls: 300x112 base -> 600x224 ---------------------------------
  const ctl = canvas(300, 112); { const g = ctl.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = BG; g.fillRect(0, 0, 300, 112);
    const pads = [['BASS', 'D', '#63ff79'], ['VOX', 'F', '#ffbe3b'], ['GUITAR', 'J', '#4bbdff'], ['DRUMS', 'K', '#ff5b5b']];
    pads.forEach(([label, key, col], i) => {
      const x = 14 + i * 50, y = 34, w = 44, h = 30;
      // keycap above
      g.fillStyle = '#2a2440'; g.fillRect(x + 15, y - 22, 14, 14); g.fillStyle = '#4a4266'; g.fillRect(x + 15, y - 22, 14, 1);
      g.fillStyle = '#fff2d1'; drawPixelText(g, key, x + 20, y - 19);
      // pad
      g.fillStyle = col + '33'; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
      g.fillStyle = col + '88'; g.fillRect(x + 2, y + h - 6, w - 4, 3);
      const lw = textWidth(label); g.fillStyle = col; drawPixelText(g, label, Math.round(x + (w - lw) / 2), y + 10);
    });
    g.fillStyle = '#b9b2d6'; const t1 = 'TAP ON THE LINE. HOLD LONG NOTES.'; drawPixelText(g, t1, Math.round(107 - textWidth(t1) / 2), 74);
    g.fillStyle = '#b9b2d6'; const t2 = 'KEYS: D F J K  OR  1 2 3 4'.replace(/[0-9]/g, ' '); // (no digits in the pixel font)
    // swipe up panel on the right
    const sx = 222; g.fillStyle = '#ffc86b22'; g.fillRect(sx, 8, 70, 96); g.fillStyle = '#ffc86b'; g.fillRect(sx, 8, 70, 1); g.fillRect(sx, 103, 70, 1);
    // arrow
    g.fillStyle = '#ffc86b'; g.fillRect(sx + 33, 24, 4, 26);
    for (let k = 0; k < 9; k++) g.fillRect(sx + 35 - k, 16 + k, k * 2, 1);
    g.fillStyle = '#fff2d1'; drawPixelText(g, 'SWIPE UP', Math.round(sx + 35 - textWidth('SWIPE UP') / 2), 55);
    const rm = logoWord('RIOT!', 2); g.drawImage(rm, Math.round(sx + 35 - rm.width / 2), 64);
    g.fillStyle = '#b9b2d6'; drawPixelText(g, 'OR SPACE', Math.round(sx + 35 - textWidth('OR SPACE') / 2), 92);
    g.fillStyle = '#b9b2d6'; const t3 = 'ARROW KEYS WORK TOO.'; drawPixelText(g, t3, Math.round(107 - textWidth(t3) / 2), 86);
    g.fillStyle = '#6b6488'; const t4 = 'ESC PAUSES.'; drawPixelText(g, t4, Math.round(107 - textWidth(t4) / 2), 98);
  }
  const controls = up(ctl, 2);
  return { headers, divider, frames, controls };
}, art);
const save = (name, url) => writeFileSync(`${OUT}/${name}`, Buffer.from(url.split(',')[1], 'base64'));
mkdirSync(`${OUT}/frames`, { recursive: true });
for (const [t, url] of Object.entries(result.headers)) save(`header_${t.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '')}.png`, url);
save('divider.png', result.divider);
save('controls.png', result.controls);
result.frames.forEach(([url, ms], i) => save(`frames/${String(i).padStart(3, '0')}_${ms}.png`, url));
console.log('frames', result.frames.length);
await browser.close();
