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
// GAME STATES: menu -> preparing -> playing <-> paused -> results -> menu
// =============================================================================
import { BUILD_LABEL, LEAD, BEAT } from './config.js';
import { SONG, SONG_END, DIFFICULTIES, notesForDifficulty, sectionAt, beatPosition } from './song/chart.js';
import { SongPlayer } from './audio/player.js';
import { Performance } from './game/rules.js';
import { Input } from './game/input.js';
import { createWorld } from './world/scene.js';
import { createStage } from './world/stage.js';
import { createBand } from './world/band.js';
import { createHighway } from './world/highway.js';
import { createEffects } from './world/effects.js';
import { createHud } from './ui/hud.js';

// These imports become embedded data inside the final index.html (see
// vite.config.js), so the published game never has to download a file.
import songUrl from '../assets/audio/you_wont_let_me_fall.mp3';
import atlasUrl from '../assets/art/burn_bright_clean_atlas.png';

const $ = (id) => document.getElementById(id);

// ---- Build everything ------------------------------------------------------
const world = createWorld($('world'));
const stage = createStage(world.scene);
const band = createBand(world.scene, atlasUrl);
const highway = createHighway(world.scene);
const effects = createEffects(world.scene);
const hud = createHud();
const player = new SongPlayer(songUrl);

let status = 'menu';
let perf = new Performance([]);
let difficulty = load('difficulty', 'casual');
let offsetMs = Number(load('offsetMs', 0)) || 0;
let hype = 0;   // extra stage excitement from combos (0..1), fades over time

const input = new Input($('pads'), {
  onPress(lane) {
    if (status !== 'playing') return;
    handle(perf.press(lane, player.time, offsetMs / 1000));
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
    if (e.grade === 'perfect') world.kick(0.25);
    if (e.milestone) {
      hype = 1;
      hud.banner(`${perf.combo} COMBO! CROWD ON FIRE!`);
      for (let lane = 0; lane < 4; lane++) effects.burst(lane, 12);
      world.kick(0.8);
    }
  } else if (e.type === 'holdComplete') {
    highway.flash(e.lane, t);
    effects.burst(e.lane, 10);
    hud.judgement('holdComplete');
  } else if (e.type === 'mistake') {
    hud.judgement(e.kind);
  }
}

// ---- Game states -----------------------------------------------------------
async function startGame() {
  if (status === 'preparing') return;
  status = 'preparing';
  show({ menu: true });
  setStatus('Tuning up… preparing the recording.');
  $('startBtn').disabled = true;

  perf = new Performance(notesForDifficulty(difficulty));
  highway.setNotes(perf.notes);
  band.reset();
  effects.clear();
  input.reset();
  hud.reset();
  hype = 0;

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
  input.reset();
  input.enabled = false;
  highway.setNotes([]);
  show({ menu: true });
}

function endGame() {
  status = 'results';
  player.stop();
  input.enabled = false;
  $('headline').textContent = perf.headline;
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

function show({ menu = false, hud: hudOn = false, pause = false, results = false }) {
  $('menu').hidden = !menu;
  $('hud').hidden = !hudOn;
  $('pauseScreen').hidden = !pause;
  $('results').hidden = !results;
}

function setStatus(msg, error = false) {
  const s = $('status');
  s.textContent = msg;
  s.hidden = !msg;
  s.classList.toggle('error', error);
}

// ---- The game loop ---------------------------------------------------------
let lastFrame = performance.now();
let menuClock = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const live = status === 'playing' || status === 'paused';

  // 1. The master clock. In menus we fake a clock so the stage keeps moving.
  menuClock += dt;
  const t = live ? player.time : LEAD + (menuClock % 140);

  // 2–3. Rules + reactions.
  if (status === 'playing') {
    for (const e of perf.update(t, offsetMs / 1000)) handle(e);
    if (t >= SONG_END) endGame();
  }

  // 4. Animate the world.
  const songTime = t - LEAD;
  const beat = beatPosition(songTime);
  const section = live ? sectionAt(Math.max(0, songTime)) : 'OPENING';
  hype = Math.max(Math.min(1, perf.combo / 60) * (live ? 1 : 0), hype - dt * 0.5);
  stage.update(now / 1000, beat, section, hype);
  band.update(live ? t : menuClock, live ? beat : menuClock / BEAT, live && songTime > -0.2);
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
$('buildLabel').textContent = `THE PIXEL RIOT · ${BUILD_LABEL}`;
$('menuSongTitle').textContent = SONG.title;
$('menuBpm').textContent = `~${SONG.bpm} BPM`;

const diffButtons = [...document.querySelectorAll('[data-diff]')];
function selectDifficulty(d) {
  difficulty = DIFFICULTIES[d] ? d : 'casual';
  diffButtons.forEach((b) => {
    const on = b.dataset.diff === difficulty;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on);
  });
  save('difficulty', difficulty);
}
diffButtons.forEach((b) => b.addEventListener('click', () => selectDifficulty(b.dataset.diff)));
selectDifficulty(difficulty);

const offsetInput = $('offset');
offsetInput.value = offsetMs;
const showOffset = () => { $('offsetValue').textContent = `${offsetMs > 0 ? '+' : ''}${offsetMs} ms`; };
offsetInput.addEventListener('input', () => {
  offsetMs = Number(offsetInput.value);
  save('offsetMs', offsetMs);
  showOffset();
});
showOffset();

$('startBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', startGame);
$('quitBtn').addEventListener('click', quitGame);
$('againBtn').addEventListener('click', startGame);
$('menuBtn').addEventListener('click', quitGame);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') pauseGame();
  else if ((e.code === 'Space' || e.code === 'Enter') && status === 'paused') resumeGame();
});
// Auto-pause when the player switches apps or tabs.
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', pauseGame);

// ---- Remember settings (safely: storage can be blocked) --------------------
function load(key, fallback) {
  try { return localStorage.getItem(`burnbright.${key}`) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(`burnbright.${key}`, value); } catch { /* ignore */ }
}

// ---- Hook for automated browser tests (tests/browser-smoke.mjs) ------------
window.__BURN_BRIGHT_TEST__ = {
  get state() {
    return {
      status, t: player.time, difficulty, total: perf.total, notesCount: perf.notes.length,
      score: perf.score, combo: perf.combo, energy: perf.energy, judged: perf.judged,
      ...perf.counts, hasRecording: player.hasRecording, build: BUILD_LABEL,
    };
  },
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  press: (lane) => input.down(lane),
  release: (lane) => input.up(lane),
};
