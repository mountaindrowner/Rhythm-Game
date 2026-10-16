// browser-smoke.mjs — plays the BUILT game in a real (headless) Chrome and
// checks the important things actually work:
//   * the menu and settings screen work, with no errors
//   * each difficulty loads the right number of notes
//   * the embedded recording decodes and the audio clock moves
//   * tapping pads gets judged, pause freezes time, resume continues
//   * every band look (HD pixel / retro / 3D models / classic) can be selected
//   * running out of energy ends the show (game over)
//   * the timing check measures taps and sets the tap offset
//   * the page never downloads anything from the internet
//
// Usage:  npm run build && npm run test:browser
//         node tests/browser-smoke.mjs dist/index.html [screenshot-folder]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const file = resolve(process.argv[2] || 'dist/index.html');
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });

const EXPECTED = { casual: 331, standard: 697, expert: 1091 };
let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 });
const errors = [];
const external = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => {
  const url = r.url();
  if (!url.startsWith('data:') && !url.startsWith('file:') && !url.startsWith('blob:')) external.push(url);
});

const state = () => page.evaluate(() => window.__BURN_BRIGHT_TEST__.state);
const snap = async (name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
const waitFor = (status, timeout = 30000) =>
  page.waitForFunction((s) => window.__BURN_BRIGHT_TEST__.state.status === s, status, { timeout });

await page.goto(`file://${file}`);
await page.waitForTimeout(1500);
await snap('01-menu');
check(await page.isVisible('#startBtn'), 'menu shows the Start button');

// ---- Settings: turn on practice mode so the next checks can't game-over ----
await page.click('#settingsBtn');
await snap('02-settings');
await page.click('label:has(#practiceToggle)');
check((await state()).practice === true, 'practice mode can be switched on');
await page.click('#settingsDone');

for (const [diff, count] of Object.entries(EXPECTED)) {
  await page.click(`[data-diff="${diff}"]`);
  await page.click('#startBtn');
  await waitFor('playing');
  const s = await state();
  check(s.total === count, `${diff}: ${s.total} notes (expected ${count})`);
  check(s.hasRecording, `${diff}: recording is playing`);
  await page.click('#pauseBtn');
  await page.click('#quitBtn');
}

await page.click('[data-diff="standard"]');
await page.click('#startBtn');
await waitFor('playing');
await page.waitForTimeout(900);
await snap('03-count-in');
const t0 = (await state()).t;
await page.waitForTimeout(5000);
const t1 = (await state()).t;
check(Math.abs(t1 - t0 - 5) < 0.4, `audio clock advanced ${(t1 - t0).toFixed(2)} s in 5 s`);
await snap('04-playing');

// Tap each pad by touching the pad strip (like a thumb would).
const pads = await page.locator('#pads').boundingBox();
for (let lane = 0; lane < 4; lane++) {
  await page.mouse.move(pads.x + (pads.width * (lane + 0.5)) / 4, pads.y + pads.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(30);
  if (lane === 2) await snap('05-pad-pressed');
  await page.mouse.up();
}
await page.waitForTimeout(2500);
let s = await state();
check(s.judged > 0, `notes are being judged (${s.judged} so far, ${s.miss} missed, ${s.wrong} wrong taps)`);
await page.waitForFunction(() => window.__BURN_BRIGHT_TEST__.state.energy === 0, null, { timeout: 30000 }).catch(() => {});
s = await state();
check(s.status === 'playing' && s.energy === 0, `practice mode: still playing with empty energy (${s.energy})`);

// Mash all four pads for 3 seconds through the test hook; some taps will land
// on notes, which proves hits are scored (and shows the hit effects).
const hits = await page.evaluate(async () => {
  const api = window.__BURN_BRIGHT_TEST__;
  const hitCount = () => api.state.perfect + api.state.great + api.state.good;
  const before = hitCount();
  const end = performance.now() + 3000;
  while (performance.now() < end) {
    for (let lane = 0; lane < 4; lane++) { api.press(lane); api.release(lane); }
    await new Promise((r) => setTimeout(r, 40));
  }
  return hitCount() - before;
});
check(hits > 0, `rapid tapping scored ${hits} hits`);
await snap('06-hits');

await page.click('#pauseBtn');
const p0 = (await state()).t;
await page.waitForTimeout(1200);
const p1 = (await state()).t;
check((await state()).status === 'paused' && Math.abs(p1 - p0) < 0.01, 'pause freezes the clock');
await snap('07-paused');
await page.click('#resumeBtn');
await page.waitForTimeout(1000);
s = await state();
check(s.status === 'playing' && s.t > p1 + 0.8, 'resume continues the song');
await page.click('#pauseBtn');
await page.click('#quitBtn');

// ---- Band looks: HD pixel (default), 3D models, classic pixel art -----------
check((await state()).bandStyle === 'hd', 'the HD pixel band is the default look');
for (const look of ['retro', '3d', 'pixel', 'hd']) {
  await page.click('#settingsBtn');
  await page.click(`[data-band="${look}"]`);
  check((await state()).bandStyle === look, `band look switches to ${look}`);
  await page.click('#settingsDone');
  await page.waitForTimeout(500);
  await snap(`08-band-${look}`);
}
await page.click('#settingsBtn');

// ---- Game over: practice off, play Expert without touching anything --------
await page.click('label:has(#practiceToggle)');
check((await state()).practice === false, 'practice mode can be switched off');
await page.click('#settingsDone');
await page.click('[data-diff="expert"]');
await page.click('#startBtn');
await waitFor('playing');
await waitFor('failed', 60000);
await page.waitForTimeout(400);
await snap('09-game-over');
check((await page.textContent('#headline')).includes("SHOW'S OVER"), 'running out of energy shows the game-over screen');
await page.click('#menuBtn');

// ---- Timing check: tap 16 times along with the clicks ---------------------
await page.click('#calibrateBtn');
await page.click('#calStart');
// Clicks start 0.6 s after Start, one every 0.6 s; the first 4 are listen-only.
await page.waitForTimeout(600 + 4 * 600 - 40);
for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
}
await page.waitForSelector('#calApply:not([hidden])', { timeout: 5000 }).catch(() => {});
await snap('10-timing-check');
const applyVisible = await page.isVisible('#calApply');
check(applyVisible, `timing check measured taps: "${await page.textContent('#calResult')}"`);
if (applyVisible) {
  await page.click('#calApply');
  const ms = (await state()).tapOffsetMs;
  check(Math.abs(ms) <= 150, `tap offset set from the timing check (${ms} ms)`);
}

check(external.length === 0, `no internet downloads${external.length ? ': ' + external.join(', ') : ''}`);
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll browser checks passed');
process.exit(failures ? 1 : 0);
