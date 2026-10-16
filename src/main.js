// =============================================================================
// main.js — the conductor. Creates every part of the game, connects them,
// and runs the game loop (one "frame" ~60 times per second).
//
// FLOW OF ONE FRAME:
//   1. Ask the audio player for the current time (the master clock).
//   2. Let the rules check for missed notes / finished holds -> events.
//   3. Send events to the band, highway, effects and HUD so they react.
//   4. Move everything in the 3D world to match the current time.
//   5. Draw the 3D scene.
//
// GAME STATES:
//   menu -> preparing -> playing <-> paused
//                          |-> results   (song finished)
//                          |-> failing -> failed   (energy ran out)
// =============================================================================
import { BUILD_LABEL, BUILD_DATE, GAME_TITLE, BAND_NAME, LEAD, BEAT, ENERGY } from './config.js';
import { SONG, SONG_END, DIFFICULTIES, notesForDifficulty, sectionAt, beatPosition } from './song/chart.js';
import { settings, updateSettings } from './settings.js';
import { SongPlayer } from './audio/player.js';
import { Performance } from './game/rules.js';
import { Input } from './game/input.js';
import { createWorld } from './world/scene.js';
import { createStage } from './world/stage.js';
import { createBandPixel } from './world/bandPixel.js';
import { createSpriteBand } from './world/bandSprites.js';
import { HD_ART, RETRO_ART } from './world/bandArt.js';
import { createBand3D } from './world/band3d/index.js';
import { createHighway } from './world/highway.js';
import { createEffects } from './world/effects.js';
import { createShowFx } from './world/showfx.js';
import { createCrowd } from './world/crowd.js';
import { createPerfMonitor } from './perf.js';
import { createHud } from './ui/hud.js';
import { createCalibration } from './ui/calibration.js';

// These imports become embedded data inside the final index.html (see
// vite.config.js), so the published game never has to download a file.
import songUrl from '../assets/audio/you_wont_let_me_fall.mp3';
import atlasUrl from '../assets/art/burn_bright_clean_atlas.png';

const $ = (id) => document.getElementById(id);

// ---- Build everything ------------------------------------------------------
const world = createWorld($('world'));
const stage = createStage(world.scene);
const bands = {
  hd: createSpriteBand(world.scene, HD_ART),
  retro: createSpriteBand(world.scene, RETRO_ART),
  '3d': createBand3D(world.scene),
  pixel: createBandPixel(world.scene, atlasUrl),
};
const highway = createHighway(world.scene);
const effects = createEffects(world.scene);
const showfx = createShowFx(world.scene, stage.fans, $('flash'));
const crowd = createCrowd(world.scene, stage.fans);
const perfMonitor = createPerfMonitor(world);
const hud = createHud();
const player = new SongPlayer(songUrl);

let band = bands.hd;
let status = 'menu';
let perf = new Performance([]);
let hype = 0;          // extra stage excitement from combos (0..1), fades over time
let lastSection = '';
let failedAt = 0;      // game time when energy ran out

const offset = () => settings.tapOffsetMs / 1000;

// Developer/demo tool: add ?autoplay to the page address and the game plays
// itself perfectly — handy for watching the band and testing effects.
const AUTOPLAY = new URLSearchParams(location.search).has('autoplay');
const autoRelease = [Infinity, Infinity, Infinity, Infinity];
function autoplay(t) {
  for (let i = perf.cursor; i < perf.notes.length; i++) {
    const n = perf.notes[i];
    if (n.time > t) break;
    if (!n.hit && !n.miss) {
      handle(perf.press(n.lane, n.time));
      autoRelease[n.lane] = n.time + Math.max(n.hold, 0.06);
    }
  }
  for (let lane = 0; lane < 4; lane++) {
    if (t >= autoRelease[lane]) {
      handle(perf.release(lane, t));
      autoRelease[lane] = Infinity;
    }
  }
}

const input = new Input($('pads'), {
  onPress(lane) {
    if (status !== 'playing') return;
    handle(perf.press(lane, player.time, offset()));
  },
  onRelease(lane) {
    if (status !== 'playing') return;
    handle(perf.release(lane, player.time));
  },
});

// ---- React to what the rules decided ---------------------------------------
function handle(e) {
  if (!e) return;
  const t = player.time;
  band.onEvent(e, t);
  if (e.type === 'hit') {
    highway.flash(e.lane, t);
    effects.burst(e.lane, e.grade === 'perfect' ? 26 : 14);
    hud.judgement(e.grade);
    if (e.grade === 'perfect') kick(0.25);
    if (e.milestone) {
      hype = 1;
      hud.banner(`${perf.combo} COMBO! CROWD ON FIRE!`);
      for (let lane = 0; lane < 4; lane++) effects.burst(lane, 12);
      // Pyro every 50 in a row, confetti too every 100.
      if (perf.combo % 50 === 0) showfx.celebrate(perf.combo % 100 === 0);
      kick(0.8);
    }
  } else if (e.type === 'holdComplete') {
    highway.flash(e.lane, t);
    effects.burst(e.lane, 10);
    hud.judgement('holdComplete');
  } else if (e.type === 'mistake') {
    hud.judgement(e.kind);
  }
}

const kick = (amount) => world.kick(settings.reduceFlashing ? amount * 0.3 : amount);

// ---- Game states -----------------------------------------------------------
async function startGame() {
  if (status === 'preparing') return;
  status = 'preparing';
  show({ menu: true });
  setStatus('Tuning up… preparing the recording.');
  $('startBtn').disabled = true;

  perf = new Performance(notesForDifficulty(settings.difficulty), { drain: ENERGY.drain[settings.difficulty] });
  highway.setNotes(perf.notes);
  band.reset();
  effects.clear();
  showfx.clear();
  input.reset();
  hud.reset();
  hype = 0;
  lastSection = '';

  // player.start() is called right here, inside the tap, so iPhones allow audio.
  try {
    await player.start();
  } catch (err) {
    status = 'menu';
    setStatus(`Audio failed to start: ${err?.message || err}. Tap Start to try again.`, true);
    $('startBtn').disabled = false;
    return;
  }
  if (status !== 'preparing') return; // player quit while loading
  $('startBtn').disabled = false;
  setStatus('');
  status = 'playing';
  input.enabled = true;
  show({ hud: true });
}

function pauseGame() {
  if (status !== 'playing') return;
  status = 'paused';
  player.pause();
  perf.cancelHolds();
  input.reset();
  input.enabled = false;
  show({ hud: true, pause: true });
}

function resumeGame() {
  if (status !== 'paused') return;
  status = 'playing';
  player.resume();
  input.enabled = true;
  show({ hud: true });
}

function quitGame() {
  status = 'menu';
  player.stop();
  showfx.clear();
  band.setDefeated(false);
  input.reset();
  input.enabled = false;
  highway.setNotes([]);
  show({ menu: true });
}

/** Energy hit zero: cut the power, let the band slump, then show the result. */
function failGame() {
  status = 'failing';
  failedAt = player.time;
  input.reset();
  input.enabled = false;
  perf.cancelHolds();
  player.powerDown();
  band.setDefeated(true);
  hud.banner("SHOW'S OVER!");
  setTimeout(() => {
    if (status !== 'failing') return;
    status = 'failed';
    player.stop();
    const reached = Math.max(0, failedAt - LEAD);
    const pct = Math.round((reached / SONG.duration) * 100);
    showResults("SHOW'S OVER", `The crowd ran out of energy at ${clock(reached)} (${pct}% of the song). `
      + 'Hit notes to keep the energy up — or turn on Practice mode in Settings.');
  }, 1700);
}

function endGame() {
  status = 'results';
  player.stop();
  input.enabled = false;
  showfx.celebrate();
  showResults(perf.headline, settings.practice ? 'Practice mode was on.' : '');
}

function showResults(headline, note) {
  $('headline').textContent = headline;
  $('resultNote').textContent = note;
  $('resultNote').hidden = !note;
  $('finalScore').textContent = perf.score.toLocaleString('en-US');
  $('rPerfect').textContent = perf.counts.perfect;
  $('rGreat').textContent = perf.counts.great;
  $('rGood').textContent = perf.counts.good;
  $('rMiss').textContent = perf.counts.miss;
  $('rWrong').textContent = perf.counts.wrong;
  $('rCombo').textContent = perf.maxCombo;
  $('rAccuracy').textContent = `${perf.accuracy}%`;
  show({ results: true });
}

const OVERLAYS = ['menu', 'hud', 'pauseScreen', 'results', 'settingsScreen'];
function show({ menu = false, hud: hudOn = false, pause = false, results = false, settings: settingsOn = false }) {
  const on = { menu, hud: hudOn, pauseScreen: pause, results, settingsScreen: settingsOn };
  for (const id of OVERLAYS) $(id).hidden = !on[id];
}

function setStatus(msg, error = false) {
  const s = $('status');
  s.textContent = msg;
  s.hidden = !msg;
  s.classList.toggle('error', error);
}

const clock = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

// ---- The game loop ---------------------------------------------------------
let lastFrame = performance.now();
let menuClock = 0;

function frame(now) {
  const frameMs = now - lastFrame;
  const dt = Math.min(0.05, frameMs / 1000);
  lastFrame = now;
  perfMonitor.frame(frameMs);
  const live = status === 'playing' || status === 'paused' || status === 'failing';

  // 1. The master clock. In menus we fake a clock so the stage keeps moving.
  //    After a game over, time freezes where the power was cut.
  menuClock += dt;
  let t = live ? player.time : LEAD + (menuClock % 140);
  if (status === 'failing') t = failedAt;

  // 2–3. Rules + reactions.
  if (status === 'playing') {
    if (AUTOPLAY) autoplay(t);
    for (const e of perf.update(t, offset())) handle(e);
    if (!settings.practice && perf.failed) failGame();
    else if (t >= SONG_END) endGame();
  }

  // 4. Animate the world.
  const songTime = t - LEAD;
  const beat = beatPosition(songTime);
  const section = live ? sectionAt(Math.max(0, songTime)) : 'OPENING';
  if (live && section !== lastSection) {
    if (lastSection) showfx.onSection(section);
    lastSection = section;
  }
  const big = section.includes('CHORUS') || section === 'OUTRO';
  const musicEnergy = live ? (big ? 1 : section.includes('BUILD') ? 0.7 : 0.45) : 0.2;
  hype = Math.max(Math.min(1, perf.combo / 60) * (live ? 1 : 0), hype - dt * 0.5);
  const stageTime = status === 'failing' ? failedAt : now / 1000;
  stage.update(stageTime, beat, status === 'failing' ? 'OPENING' : section, hype);
  showfx.update(now / 1000, beat, section, live && status !== 'failing', dt);
  crowd.update(beat, status === 'failing' ? 0 : stage.intensity);
  band.update(live ? t : menuClock, live ? beat : menuClock / BEAT, live && songTime > -0.2, dt, musicEnergy);
  highway.update(t, (lane) => input.isHeld(lane));
  effects.update(dt);
  world.updateCamera(dt, now / 1000);
  if (live) hud.update(perf, t, section);
  for (let lane = 0; lane < 4; lane++) hud.setPadDown(lane, input.isHeld(lane));

  // 5. Draw.
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- Menu wiring -----------------------------------------------------------
$('buildLabel').textContent = `${BAND_NAME} · LIVE`;
document.title = GAME_TITLE.replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase());
// Version badge on every screen, so you always know which build you're playing.
for (const el of document.querySelectorAll('.version')) {
  el.textContent = `${BUILD_LABEL}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`;
}
$('menuSongTitle').textContent = SONG.title;
$('menuBpm').textContent = `~${SONG.bpm} BPM`;

const diffButtons = [...document.querySelectorAll('[data-diff]')];
function selectDifficulty(d) {
  updateSettings({ difficulty: DIFFICULTIES[d] ? d : 'casual' });
  diffButtons.forEach((b) => {
    const on = b.dataset.diff === settings.difficulty;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on);
  });
}
diffButtons.forEach((b) => b.addEventListener('click', () => selectDifficulty(b.dataset.diff)));
selectDifficulty(settings.difficulty);

function refreshMenuNote() {
  const bits = ['Headphones recommended'];
  if (settings.practice) bits.push('Practice mode ON');
  if (settings.tapOffsetMs) bits.push(`Tap timing ${settings.tapOffsetMs > 0 ? '+' : ''}${settings.tapOffsetMs} ms`);
  $('menuFine').textContent = bits.join(' · ');
}

// ---- Settings screen -------------------------------------------------------
const bandButtons = [...document.querySelectorAll('[data-band]')];
function selectBand(style) {
  updateSettings({ bandStyle: bands[style] ? style : 'hd' });
  for (const [key, b] of Object.entries(bands)) b.setVisible(key === settings.bandStyle);
  band = bands[settings.bandStyle];
  bandButtons.forEach((b) => b.classList.toggle('selected', b.dataset.band === settings.bandStyle));
}
bandButtons.forEach((b) => b.addEventListener('click', () => selectBand(b.dataset.band)));
selectBand(settings.bandStyle);

const offsetInput = $('offset');
function setOffset(ms) {
  updateSettings({ tapOffsetMs: Math.max(-250, Math.min(250, Math.round(ms / 5) * 5)) });
  offsetInput.value = settings.tapOffsetMs;
  const v = settings.tapOffsetMs;
  $('offsetValue').textContent = v === 0 ? '0 ms' : `${v > 0 ? '+' : ''}${v} ms (${v > 0 ? 'late' : 'early'})`;
  refreshMenuNote();
}
offsetInput.addEventListener('input', () => setOffset(Number(offsetInput.value)));
setOffset(settings.tapOffsetMs);

$('practiceToggle').checked = settings.practice;
$('practiceToggle').addEventListener('change', (e) => { updateSettings({ practice: e.target.checked }); refreshMenuNote(); });
$('flashToggle').checked = settings.reduceFlashing;
showfx.setReduceFlashing(settings.reduceFlashing);
$('flashToggle').addEventListener('change', (e) => {
  updateSettings({ reduceFlashing: e.target.checked });
  showfx.setReduceFlashing(settings.reduceFlashing);
});

// The timing check opens from the menu or from Settings, and returns there.
let calibrationReturn = 'menu';
const calibration = createCalibration(player, {
  onApply: (ms) => setOffset(ms),
  onClose: () => show({ [calibrationReturn]: true }),
});
const openCalibration = (from) => {
  calibrationReturn = from;
  show({});
  calibration.open();
};

$('startBtn').addEventListener('click', startGame);
$('settingsBtn').addEventListener('click', () => show({ settings: true }));
$('settingsDone').addEventListener('click', () => show({ menu: true }));
$('calibrateBtn').addEventListener('click', () => openCalibration('menu'));
$('calibrateBtn2').addEventListener('click', () => openCalibration('settings'));
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', startGame);
$('quitBtn').addEventListener('click', quitGame);
$('againBtn').addEventListener('click', startGame);
$('menuBtn').addEventListener('click', quitGame);

window.addEventListener('keydown', (e) => {
  if (calibration.isOpen) return;
  if (e.code === 'Escape') pauseGame();
  else if ((e.code === 'Space' || e.code === 'Enter') && status === 'paused') resumeGame();
});
// Auto-pause when the player switches apps or tabs.
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', pauseGame);

// ---- Hook for automated browser tests (tests/browser-smoke.mjs) ------------
window.__BURN_BRIGHT_TEST__ = {
  get state() {
    return {
      status, t: player.time, difficulty: settings.difficulty, total: perf.total, notesCount: perf.notes.length,
      score: perf.score, combo: perf.combo, energy: perf.energy, judged: perf.judged,
      ...perf.counts, hasRecording: player.hasRecording, build: BUILD_LABEL,
      tapOffsetMs: settings.tapOffsetMs, practice: settings.practice, bandStyle: settings.bandStyle,
      drawCalls: world.renderer.info.render.calls, triangles: world.renderer.info.render.triangles,
    };
  },
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  press: (lane) => input.down(lane),
  release: (lane) => input.up(lane),
};
