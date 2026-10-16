// browser-smoke.mjs — plays the BUILT game in a real (headless) Chrome and
// checks the important things actually work:
//   * the title screen (its own rock-show scene, no game behind it), the
//     difficulty and set-list screens, the song preview, the loading screen,
//     and the show intro with the drummer's count-in
//   * the settings screen works, with no errors
//   * each difficulty loads the right number of notes
//   * every song in the set list can be picked and played, in its own venue
//   * the embedded recording decodes and the audio clock moves
//   * tapping pads gets judged, pause freezes time, resume continues
//   * every band look (Retro / HD pixel / 3D models / classic) can be selected
//   * the game's per-frame work stays inside a smoothness budget
//   * Riot Mode: a finger swipe up on the pads saves a show that's out of energy
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

// Notes YOU play in the first song (the solo's ghost notes are the guitarist's, and the
// Big Rock Ending turns its last 4 bars into one final note).
const EXPECTED = { casual: 184, standard: 333, expert: 596 };
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

// ---- Getting around the menus like a player would ---------------------------
const screen = async () => (await state()).screen;
/** Back to the title screen from any menu screen. */
async function toTitle() {
  for (let i = 0; i < 3 && (await screen()) !== 'menu'; i++) {
    await page.click(`#${await screen()} [data-back]`);
  }
}
/** Title -> difficulty -> set list (or straight there from the set list). */
async function toSongs(diff) {
  const at = await screen();
  if (at === 'menu') await page.click('#startBtn');
  else if (at === 'songScreen') await page.click('#diffChip');
  await page.click(`[data-diff="${diff}"]`);
}
/** Pick a song (one tap = select + preview; a second tap would start it). */
async function pick(id) {
  const selected = await page.$eval(`[data-song="${id}"]`, (e) => e.classList.contains('selected'));
  if (!selected) await page.click(`[data-song="${id}"]`);
}
/** Play a song from the menus; resolves once the show has started. */
async function playSong(diff, id) {
  await toSongs(diff);
  if (id) await pick(id);
  await page.click('#playBtn');
  await waitFor('playing');
}

await page.goto(`file://${file}`);
await page.waitForTimeout(1500);
await snap('01-menu');
let s = await state();
check(await page.isVisible('#startBtn') && s.screen === 'menu', 'title screen shows START THE SHOW');
check(s.inMenus && await page.isVisible('#menuScene'), 'the menus have their own rock-show scene (the game is not drawn behind them)');

// ---- Settings: turn on practice mode so the next checks can't game-over ----
await page.click('#settingsBtn');
await snap('02-settings');
await page.click('label:has(#practiceToggle)');
check((await state()).practice === true, 'practice mode can be switched on');
await page.click('#settingsDone');
check(await screen() === 'menu', 'settings DONE returns to the title screen');

// ---- START THE SHOW -> difficulty -> set list ---------------------------------
await page.click('#startBtn');
await snap('01b-difficulty');
check(await screen() === 'diffScreen', 'START THE SHOW opens the difficulty screen');
await page.click('[data-diff="casual"]');
check(await screen() === 'songScreen', 'picking a difficulty opens the set list');
await page.waitForFunction(() => window.__BURN_BRIGHT_TEST__.state.previewing, null, { timeout: 8000 }).catch(() => {});
check((await state()).previewing, 'the picked song plays a preview on the set list');
await snap('01c-set-list');
await page.click('#playBtn');
check(await page.isVisible('#loading'), 'PLAY shows the loading screen (gig poster)');
await snap('01d-loading');
await waitFor('playing');
s = await state();
check(!s.previewing && !s.inMenus, 'the preview stops and the menu scene goes away when the show starts');
check(s.total === EXPECTED.casual, `casual: ${s.total} notes (expected ${EXPECTED.casual})`);
check(s.hasRecording, 'casual: recording is playing');
// The show intro, then the drummer's count-in on the song's own beat.
await page.waitForFunction(() => window.__BURN_BRIGHT_TEST__.state.intro, null, { timeout: 5000 }).catch(() => {});
check((await state()).intro, 'the show intro card appears ("LIVE AT ...")');
const clicks = s.countIn;
// Four evenly spaced clicks (one beat apart), after the intro has had time.
const gaps = clicks.slice(1).map((c, i) => c - clicks[i]);
check(clicks.length === 4 && clicks[0] > 1.5 && gaps.every((g) => Math.abs(g - gaps[0]) < 1e-6 && g > 0.25 && g < 0.7),
  `4 count-in clicks on the beat (${clicks.map((c) => c.toFixed(2)).join(', ')} s)`);
await page.waitForFunction((c) => window.__BURN_BRIGHT_TEST__.state.t > c[0] + 0.05, clicks, { timeout: 8000 });
const counted = (await state()).countText;
check(['3', '2', '1', 'ROCK!'].includes(counted), `the count-in shows on screen ("${counted}")`);
await page.click('#pauseBtn');
await page.click('#quitBtn');
check(await screen() === 'songScreen', 'quitting a song returns to the set list');

for (const [diff, count] of Object.entries(EXPECTED).slice(1)) {
  await playSong(diff);
  s = await state();
  check(s.total === count, `${diff}: ${s.total} notes (expected ${count})`);
  check(s.hasRecording, `${diff}: recording is playing`);
  await page.click('#pauseBtn');
  await page.click('#quitBtn');
}

// ---- Every song in the set list: pick it, play a few seconds, check venue --
const songIds = await page.$$eval('[data-song]', (els) => els.map((e) => e.dataset.song));
check(songIds.length >= 3, `song picker lists ${songIds.length} songs`);
const VENUE = { you_wont_let_me_fall: 'arena', youre_not_my_plan_b: 'rooftop', trust_god_anyway: 'sunrise' };
for (const id of songIds.slice(1)) {
  await pick(id);
  s = await state();
  check(s.songId === id && s.venue === VENUE[id], `${id}: picked, venue ${s.venue}`);
  await page.click('#playBtn');
  await waitFor('playing');
  const a = (await state()).t;
  await page.waitForTimeout(2500);
  s = await state();
  check(s.total > 250 && s.hasRecording && s.t - a > 2.1, `${id}: ${s.total} notes, recording plays (${(s.t - a).toFixed(2)} s in 2.5 s)`);
  await snap(`02b-song-${id}`);
  await page.click('#pauseBtn');
  await page.click('#quitBtn');
}
await pick(songIds[0]);
check((await state()).venue === 'arena', 'back to the first song: arena venue');

await playSong('standard');
await page.waitForTimeout(900);
await snap('03-intro');
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
s = await state();
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

// Smoothness test: how long the game's own work takes per frame. Headless
// Chrome draws with a slow software renderer, so only the UPDATE half (our
// JavaScript: notes, band, crowd, effects) is held to a budget here; the
// render half and the fps are printed for information.
const work = (await state()).perf;
check(work.updateMs < 6, `smoothness: update ${work.updateMs.toFixed(2)} ms per frame (budget 6 ms); `
  + `render call ${work.renderMs.toFixed(2)} ms, ${work.fps.toFixed(0)} fps in software rendering`);

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

// ---- Band looks: Retro (default), HD pixel, 3D models, classic pixel art ----
check((await state()).bandStyle === 'retro', 'the animated Retro band is the default look');
await toTitle();
check(await screen() === 'menu', 'BACK buttons lead back to the title screen');
for (const look of ['hd', '3d', 'pixel', 'retro']) {
  await page.click('#settingsBtn');
  await page.click(`[data-band="${look}"]`);
  check((await state()).bandStyle === look, `band look switches to ${look}`);
  await page.click('#settingsDone');
}
await page.click('#settingsBtn');

// ---- Game over: practice off, play Expert without touching anything --------
await page.click('label:has(#practiceToggle)');
check((await state()).practice === false, 'practice mode can be switched off');
await page.click('#settingsDone');
await playSong('expert');

// Riot Mode rescue: with a full Riot meter, running out of energy gives a
// moment to swipe up. A real finger-style swipe (press on a pad, slide up).
await page.waitForFunction(() => window.__BURN_BRIGHT_TEST__.state.energy < 30, null, { timeout: 60000 });
await page.evaluate(() => window.__BURN_BRIGHT_TEST__.fillRiot());
await page.waitForFunction(() => window.__BURN_BRIGHT_TEST__.state.lastChance, null, { timeout: 60000 });
s = await state();
check(s.status === 'playing' && s.energy === 0, 'out of energy with Riot ready: the show waits for a swipe');
// (No screenshot here: the rescue window is only 2.5 s and screenshots are slow.)
const padBox = await page.locator('#pads').boundingBox();
await page.mouse.move(padBox.x + padBox.width * 0.6, padBox.y + padBox.height * 0.5);
await page.mouse.down();
await page.mouse.move(padBox.x + padBox.width * 0.6, padBox.y - 90, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
s = await state();
check(s.riotActive && s.energy > 0 && s.status === 'playing', `swipe up unleashed Riot Mode and saved the show (energy ${s.energy})`);
await snap('09b-riot-mode');

await waitFor('failed', 90000);
await page.waitForTimeout(400);
await snap('09-game-over');
check((await page.textContent('#headline')).includes("SHOW'S OVER"), 'running out of energy shows the game-over screen');
await page.click('#menuBtn');
check(await screen() === 'songScreen', 'after the game over, SET LIST returns to the set list');
await toTitle();

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
