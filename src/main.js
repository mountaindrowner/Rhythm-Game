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
//   menu -> loading -> playing <-> paused
//                        |-> results   (song finished)
//                        |-> failing -> failed   (energy ran out)
//
// MENU SCREENS (all while status = 'menu', in front of their own pixel-art
// rock show, src/ui/menuScene.js; the 3D game isn't drawn at all):
//   title (START THE SHOW) -> difficulty -> set list (song + best score,
//   with a preview) -> PLAY -> loading screen -> the show intro + count-in
// =============================================================================
import { BUILD_LABEL, BUILD_DATE, GAME_TITLE, LEAD, BEAT, ENERGY, RIOT, SOLO, STAGE } from './config.js';
import {
  SONG, SONGS, selectSong, onSongChange, songEnd, DIFFICULTIES, prepareSong, sectionAt, beatPosition,
  countInTimes, timeAtBeat,
} from './song/chart.js';
import { VENUES, paintPoster } from './world/venues.js';
import { getBest, recordResult, starText } from './progress.js';
import { settings, updateSettings } from './settings.js';
import { SongPlayer } from './audio/player.js';
import { createPreview } from './audio/preview.js';
import { createTitleMusic } from './audio/titleMusic.js';
import { Performance, perfectScore, starsFor } from './game/rules.js';
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
import { createMenuScene } from './ui/menuScene.js';
import { createTakeover, GAMES } from './ui/takeover.js';

// These imports become embedded data inside the final index.html (see
// vite.config.js), so the published game never has to download a file.
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
const player = new SongPlayer(SONG.audio);
const preview = createPreview(player);
const titleMusic = createTitleMusic();
// The menu's rock show; when the title song's lightning strikes, play thunder
// (and the first strike ends the intro).
const menuScene = createMenuScene($('menuScene'), {
  onStrike() {
    player.sfx('thunder');
    if ($('menu').classList.contains('intro')) endIntro();
  },
});

// When a different song is picked: its recording, its venue, and who sings
// lead (her, him, or both) so the band animates to match.
onSongChange((song) => {
  player.setSong(song.audio);
  stage.setVenue(song.venue);
  for (const b of Object.values(bands)) b.setVocalist?.(song.vocalist);
});

let band = bands.retro;
let status = 'menu';
let perf = new Performance([]);
let hype = 0;          // extra stage excitement from combos (0..1), fades over time
let lastSection = '';
let failedAt = 0;      // game time when energy ran out
let lastChanceUntil = 0; // game time the "swipe to save the show" chance ends (0 = none)
// This song's big moments (from prepareSong): the solo and the Big Rock Ending.
let solo = null;
let finale = null;
let soloStep = -1;       // which part of the solo we're in (to show each banner once)
let ghostCursor = 0;     // next solo "call" note the soloist will play
let finaleStarted = false;
let freestyleTaps = 0;
// CENTER STAGE: when the ready musician's takeover is scheduled ({start, end}
// in game time), or 'never' if no bar fits before the end of the song.
let pendingTakeover = null;
const MUSICIAN_OF_LANE = ['bassist', 'singer', 'guitarist', 'drummer'];
const SOLOIST_NAME = { bassist: 'BASS', singer: 'VOCAL', guitarist: 'GUITAR', drummer: 'DRUM' };

const offset = () => settings.tapOffsetMs / 1000;

// Developer/demo tool: add ?autoplay to the page address and the game plays
// itself perfectly — handy for watching the band and testing effects.
const AUTOPLAY = new URLSearchParams(location.search).has('autoplay');
const autoRelease = [Infinity, Infinity, Infinity, Infinity];
function autoplay(t) {
  if (perf.riotReady) handle(perf.activateRiot(t)); // the robot loves Riot Mode
  if (perf.takeover) { takeover.autoplay(t); return; }
  // Big Rock Ending: mash a random pad every few frames.
  if (finale && t >= finale.start && t < finale.time - 0.2 && Math.random() < 0.3) {
    const lane = (Math.random() * 4) | 0;
    handle(perf.press(lane, t));
    handle(perf.release(lane, t));
  }
  for (let i = perf.cursor; i < perf.notes.length; i++) {
    const n = perf.notes[i];
    if (n.time > t) break;
    if (!n.hit && !n.miss && !n.ghost) {
      const lane = n.lane < 0 ? 1 : n.lane; // the finale note can be hit with any pad
      handle(perf.press(lane, n.time));
      autoRelease[lane] = n.time + Math.max(n.hold, 0.06);
    }
  }
  for (let lane = 0; lane < 4; lane++) {
    if (t >= autoRelease[lane]) {
      handle(perf.release(lane, t));
      autoRelease[lane] = Infinity;
    }
  }
}

// The CENTER STAGE overlay. Its points go through the referee (times your
// multiplier, so Riot Mode doubles them too).
const takeover = createTakeover($('takeover'), {
  score(base) {
    const pts = base * perf.multiplier;
    perf.addBonus(pts);
    return pts;
  },
  sfx: (name) => player.sfx(name),
  now: () => player.time,
  canPlay: () => status === 'playing',
  beatLength: () => SONG.beatLength,
});

const input = new Input($('pads'), {
  onPress(lane) {
    if (status !== 'playing' || perf.takeover) return; // (the pads rest during a takeover)
    handle(perf.press(lane, player.time, offset()));
  },
  onRelease(lane) {
    if (status !== 'playing' || perf.takeover) return;
    handle(perf.release(lane, player.time));
  },
  onSwipeUp: tryRiot,
}, world.renderer.domElement);

/** A swipe up (or Space): unleash Riot Mode if the meter is ready. */
function tryRiot() {
  if (status !== 'playing') return;
  handle(perf.activateRiot(player.time));
}

// Funny reasons the show ended (one is picked at random on game over).
const FAIL_LINES = [
  "The bassist's lab-coat experiment blew every fuse in the building.",
  'Someone unplugged the amps to charge their phone.',
  'The drummer threw a stick into the crowd. It was his only stick.',
  'The fog machine won. Nobody can find the stage.',
  'A pigeon landed on the mixing desk and pressed every button.',
  'The guitarist tripped over his cable and took the whole stage with him.',
  'The crowd went to get snacks. All of them. At once.',
];

// ---- React to what the rules decided ---------------------------------------
function handle(e) {
  if (!e) return;
  const t = player.time;
  band.onEvent(e, t);
  if (e.type === 'hit') {
    highway.flash(e.lane, t);
    effects.burst(e.lane, e.grade === 'perfect' ? 26 : 14);
    hud.judgement(e.grade, e.timing);
    if (e.riotPhrase) hud.banner(perf.riotReady ? 'RIOT READY!' : 'RIOT PHRASE!');
    if (e.stageReady) {
      hud.banner(`${GAMES[MUSICIAN_OF_LANE[e.lane]].who} IS READY!`);
      player.sfx('chord');
    }
    if (e.note.finale) {
      // The final note of the Big Rock Ending: bank the bonus!
      highway.setFreestyle(false);
      showfx.celebrate(true);
      kick(1);
      hud.banner(e.finaleBonus ? `BIG ROCK ENDING! +${e.finaleBonus.toLocaleString('en-US')}` : 'BIG ROCK ENDING!');
    }
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
  } else if (e.type === 'freestyle') {
    // Big Rock Ending: every tap is a little firework.
    highway.flash(e.lane, t);
    effects.burst(e.lane, 10);
    freestyleTaps++;
    if (freestyleTaps % 5 === 0) showfx.pop();
  } else if (e.type === 'mistake') {
    hud.judgement(e.kind);
    if (e.finaleLost) {
      highway.setFreestyle(false);
      hud.banner('SO CLOSE! THE BONUS GOT AWAY');
    }
  } else if (e.type === 'riotStart') {
    player.sfx('riot');
    player.sfx('thunder');
    showfx.setRiot(true);
    showfx.transform();
    showfx.lightning(); // lightning strikes the band as they transform
    band.setRiot?.(true); // the band turns into their Riot versions
    highway.setRiot(true);
    if (lastChanceUntil) hud.banner('SAVED BY THE RIOT!'); // (the big sign on stage says RIOT MODE)
    lastChanceUntil = 0;
    kick(1);
  } else if (e.type === 'takeoverStart') {
    // CENTER STAGE! The musician leaves the stage and slams onto the board.
    const who = MUSICIAN_OF_LANE[e.lane];
    takeover.start({ who, start: e.start, end: e.end, beatAt: (time) => beatPosition(time - LEAD) });
    band.setAway?.(who);
    showfx.lightning();
    player.sfx('thunder');
    $('pads').classList.add('takeover');
    input.reset();
    kick(1);
  } else if (e.type === 'takeoverEnd') {
    takeover.finish();
    band.setAway?.(null);
    $('pads').classList.remove('takeover');
    showfx.celebrate(false);
  } else if (e.type === 'riotEnd') {
    showfx.setRiot(false);
    showfx.transform();
    band.setRiot?.(false);
    highway.setRiot(false);
    hud.banner('RIOT OVER!');
  }
}

const kick = (amount) => world.kick(settings.reduceFlashing ? amount * 0.3 : amount);

// ---- Big moments: call-and-response solo, Big Rock Ending -------------------
function bigMoments(t) {
  if (solo) {
    // Which part are we in? -1 before, then 0,1 = call,response of pair 0, ...
    let step = -1;
    solo.pairs.forEach((p, i) => {
      if (t >= p.callStart) step = i * 2;
      if (t >= p.responseStart) step = i * 2 + 1;
    });
    const over = t >= solo.end;
    if (over) step = solo.pairs.length * 2;
    if (step !== soloStep) {
      soloStep = step;
      const name = SOLOIST_NAME[solo.who] || 'GUITAR';
      if (over) {
        // Solo finished: medal, bonus, and for gold, the SHRED moment.
        showfx.setSoloSpot(null);
        const medal = perf.soloMedal(SOLO);
        if (medal) {
          perf.addBonus(SOLO.bonus[medal]);
          hud.banner(`${medal.toUpperCase()} SOLO! +${SOLO.bonus[medal].toLocaleString('en-US')}`);
          showfx.celebrate(medal !== 'bronze');
          kick(medal === 'gold' ? 1 : 0.5);
          if (medal === 'gold') {
            band.shred?.(solo.who, t);
            showfx.shred(solo.who);
          }
        } else {
          hud.banner('THE SOLO GOT AWAY FROM US!');
        }
      } else if (step >= 0) {
        showfx.setSoloSpot(solo.who);
        if (step % 2 === 0) hud.banner(step === 0 ? `${name} SOLO! LISTEN…` : 'LISTEN…');
        else hud.banner('YOUR TURN! COPY IT!');
      }
    }
    // The soloist "plays" the call notes: flash the lane as each one passes.
    const notes = perf.notes;
    while (ghostCursor < notes.length && notes[ghostCursor].time <= t) {
      const n = notes[ghostCursor++];
      if (!n.ghost) continue;
      highway.flash(n.lane, t);
      effects.burst(n.lane, 6);
      band.onEvent({ type: 'hit', lane: solo.lane, grade: 'great' }, t);
    }
  }
  if (finale && !finaleStarted && t >= finale.start) {
    finaleStarted = true;
    highway.setFreestyle(true);
    hud.banner('BIG ROCK ENDING! MASH THE PADS!');
    band.onEvent({ type: 'riotStart' }, t); // everyone does their big move
  }
}

// ---- CENTER STAGE scheduling ---------------------------------------------------
/**
 * When a meter fills, the takeover starts on the next bar line and lasts
 * STAGE.bars bars, but never during the solo, the Big Rock Ending or the very
 * end of the song. Returns { start, end } (game times), or null if no bar fits.
 */
function scheduleTakeover(t) {
  const fd = SONG.firstDownbeat;
  const beats = STAGE.bars * 4;
  let b = fd + Math.ceil((beatPosition(t - LEAD + 0.3) - fd) / 4) * 4; // next bar line, 0.3 s away or more
  for (let k = 0; k < 64; k++, b += 4) {
    const start = LEAD + timeAtBeat(b);
    const end = LEAD + timeAtBeat(b + beats);
    if (end > songEnd() - 2) return null;
    if (finale && end > finale.start - 0.3) return null;
    if (solo && start < solo.end + 0.3 && end > solo.start - 0.3) continue; // not during the solo
    return { start, end };
  }
  return null;
}

// ---- Game states -----------------------------------------------------------
// Funny and useful lines for the loading screen.
const TIPS = [
  'TIP: Gold notes fill the RIOT meter. When it\'s full, swipe up!',
  'TIP: Riot Mode doubles your score and can save a show that\'s going wrong.',
  'TIP: Every 10 notes in a row raises your multiplier, up to ×4.',
  'TIP: In a solo, watch the lights, then copy what the band just played.',
  'TIP: Big Rock Ending: mash the pads, then hit the very last note!',
  'TIP: Notes feel early or late? Try the TIMING CHECK in the main menu.',
  'TIP: Headphones make the timing feel tighter than phone speakers.',
  'BACKSTAGE: The drummer has lost 14 sticks this tour. He blames the fans.',
  'BACKSTAGE: The bassist says the lab coat is "for science". Nobody asks.',
  'BACKSTAGE: The guitarist tuned for 45 minutes. It\'s still a little sharp.',
];
const LOADING_STEPS = ['WARMING UP THE AMPS…', 'TUNING THE GUITARS…', 'SOUNDCHECK: ONE, TWO…', 'THE CROWD IS GETTING LOUD…'];
let loadingTimer = 0;

/** Fill in the loading screen's gig poster for the current song. */
function showLoadingScreen() {
  const venue = VENUES[SONG.venue] || VENUES.arena;
  $('loadVenue').textContent = `AT ${venue.name}`;
  $('loadTitle').textContent = SONG.title;
  const best = getBest(SONG.id, settings.difficulty);
  $('loadInfo').textContent = `${DIFFICULTIES[settings.difficulty].label} · ${SONG.bpm} BPM`
    + (best ? ` · BEST ${best.score.toLocaleString('en-US')}` : '');
  $('loadTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  paintPoster($('posterArt'), SONG.venue);
  $('loadBack').hidden = true;
  setStatus('');
  // The "amp" bar fills while the song gets ready, with a new line every so often.
  let step = 0;
  $('loadStep').textContent = LOADING_STEPS[0];
  $('loadFill').style.transition = 'none';
  $('loadFill').style.width = '4%';
  void $('loadFill').offsetWidth;
  $('loadFill').style.transition = '';
  $('loadFill').style.width = '80%';
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    step = Math.min(step + 1, LOADING_STEPS.length - 1);
    $('loadStep').textContent = LOADING_STEPS[step];
  }, 650);
  $('loading').classList.remove('leaving');
  show('loading');
}

async function startGame() {
  if (status === 'loading') return;
  const restart = status !== 'menu'; // Play Again / Restart: a shorter loading screen
  status = 'loading';
  preview.stop();
  input.reset();
  input.enabled = false;
  band.setRiot?.(false);
  band.setDefeated(false);

  const play = prepareSong(settings.difficulty);
  solo = play.solo;
  finale = play.finale;
  soloStep = -1;
  ghostCursor = 0;
  finaleStarted = false;
  freestyleTaps = 0;
  highway.setFreestyle(false);
  perf = new Performance(play.notes, {
    drain: ENERGY.drain[settings.difficulty], beatLength: SONG.beatLength, finale,
  });
  highway.setRiot(false);
  lastChanceUntil = 0;
  pendingTakeover = null;
  takeover.clear();
  band.setAway?.(null);
  $('pads').classList.remove('takeover');
  highway.setNotes(perf.notes);
  highway.warmUp(); // draw every kind of note once (hidden) while the song loads
  band.reset();
  effects.clear();
  showfx.clear();
  hud.reset();
  const countIn = countInTimes();
  hud.setShow({ venue: (VENUES[SONG.venue] || VENUES.arena).name, title: SONG.title.toUpperCase(), countIn });
  hype = 0;
  lastSection = '';
  showLoadingScreen();
  const shownAt = performance.now();

  // player.load() is called right here, inside the tap, so iPhones allow audio.
  try {
    await player.load();
  } catch (err) {
    if (status !== 'loading') return;
    status = 'menu';
    clearInterval(loadingTimer);
    $('loadStep').textContent = 'THE AMPS WON\'T TURN ON';
    setStatus(`Audio failed to start: ${err?.message || err}. Go back and try again.`, true);
    $('loadBack').hidden = false;
    return;
  }
  // Keep the poster up long enough to read (the 3D stage gets ready behind it).
  const minimum = restart ? 900 : 2300;
  await new Promise((r) => setTimeout(r, Math.max(0, minimum - (performance.now() - shownAt))));
  if (status !== 'loading') return; // player quit while loading
  clearInterval(loadingTimer);
  $('loadFill').style.width = '100%';
  $('loadStep').textContent = 'HERE WE GO!';
  await new Promise((r) => setTimeout(r, 250));
  if (status !== 'loading') return;

  // GO: the clock starts, the loading screen drops away, the camera swoops in.
  player.play();
  player.countIn(countIn);
  player.sfx('boom');
  status = 'playing';
  input.enabled = true;
  show('hud', 'loading');
  $('loading').classList.add('leaving');
  setTimeout(() => {
    $('loading').classList.remove('leaving');
    if (status !== 'loading') $('loading').hidden = true;
  }, 600);
}

function pauseGame() {
  if (status !== 'playing') return;
  status = 'paused';
  player.pause();
  perf.cancelHolds();
  input.reset();
  input.enabled = false;
  show('hud', 'pauseScreen');
}

function resumeGame() {
  if (status !== 'paused') return;
  status = 'playing';
  player.resume();
  input.enabled = true;
  show('hud');
}

/** Leave the song: back to the set list (or the title screen). */
function quitGame(to = 'songScreen') {
  status = 'menu';
  try { player.unlock(); } catch { /* no Web Audio */ } // (a tap: keep menu sounds working)
  takeover.clear();
  band.setAway?.(null);
  $('pads').classList.remove('takeover');
  band.setRiot?.(false);
  highway.setFreestyle(false);
  player.stop();
  showfx.clear();
  band.setDefeated(false);
  input.reset();
  input.enabled = false;
  highway.setNotes([]);
  if (to === 'songScreen') openSongs();
  else show(to);
}

/** Energy hit zero: cut the power, let the band slump, then show the result. */
function failGame() {
  status = 'failing';
  takeover.clear();
  band.setAway?.(null);
  $('pads').classList.remove('takeover');
  failedAt = player.time;
  input.reset();
  input.enabled = false;
  perf.cancelHolds();
  player.powerDown();
  band.setDefeated(true);
  band.setRiot?.(false);
  highway.setRiot(false);
  hud.banner("SHOW'S OVER!");
  // Make it funny, not sad: a sad trombone, and a tumbleweed rolls past.
  setTimeout(() => { if (status === 'failing') player.sfx('trombone'); }, 1300);
  setTimeout(() => { if (status === 'failing') showfx.tumbleweed(); }, 700);
  setTimeout(() => {
    if (status !== 'failing') return;
    status = 'failed';
    const reached = Math.max(0, failedAt - LEAD);
    const pct = Math.round((reached / SONG.duration) * 100);
    const why = FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)];
    showResults("SHOW'S OVER", `${why} (The crowd ran out of energy at ${clock(reached)}, ${pct}% of the song.) `
      + 'Fill the RIOT meter and swipe up to save the show next time, or turn on Practice mode in Settings.', false);
    // Let the trombone finish before the audio goes to sleep.
    setTimeout(() => { if (status === 'failed') player.stop(); }, 1500);
  }, 4200); // long enough to see the tumbleweed roll past and hear the trombone
}

function endGame() {
  status = 'results';
  player.stop();
  input.enabled = false;
  showfx.celebrate();
  band.finale?.(); // cheer, then bow
  showResults(perf.headline, settings.practice ? 'Practice mode was on.' : '');
}

function showResults(headline, note, finished = true) {
  $('headline').textContent = headline;
  $('resultNote').textContent = note;
  $('resultNote').hidden = !note;
  $('finalScore').textContent = perf.score.toLocaleString('en-US');

  // Stars, and saving your best (only for a finished song).
  const c = perf.counts;
  const fullCombo = c.miss === 0 && c.wrong === 0 && c.good + c.great + c.perfect === perf.total - c.skipped;
  const rating = starsFor(perf.score, perfectScore(perf.notes), { expert: settings.difficulty === 'expert', fullCombo });
  const stars = finished ? rating.stars : 0;
  $('stars').textContent = starText(stars);
  $('stars').classList.toggle('gold', finished && rating.gold);
  let isNewBest = false;
  if (finished) {
    ({ isNewBest } = recordResult(SONG.id, settings.difficulty, {
      score: perf.score, stars, gold: rating.gold, accuracy: perf.accuracy, fullCombo,
    }));
  }
  $('newBest').hidden = !isNewBest;
  $('newBest').textContent = rating.gold && finished ? 'GOLD STARS! NEW BEST!' : 'NEW BEST!';
  refreshSongBests();

  // Timing tip: if your taps were steadily early or late, offer to fix it.
  $('rEarlyLate').textContent = `${perf.early} / ${perf.late}`;
  const driftMs = Math.round(perf.typicalOffset * 1000 / 5) * 5;
  const tip = Math.abs(driftMs) >= 25;
  $('timingTip').hidden = !tip;
  if (tip) {
    $('timingTipText').textContent = `Your taps were usually about ${Math.abs(driftMs)} ms ${driftMs > 0 ? 'late' : 'early'}. `
      + 'That can be your phone or headphones, not you.';
    $('timingTipBtn').onclick = () => {
      setOffset(settings.tapOffsetMs + driftMs);
      $('timingTipText').textContent = `Timing adjusted to ${settings.tapOffsetMs > 0 ? '+' : ''}${settings.tapOffsetMs} ms. Play again to try it!`;
      $('timingTipBtn').hidden = true;
    };
    $('timingTipBtn').hidden = false;
  }
  $('rPerfect').textContent = perf.counts.perfect;
  $('rGreat').textContent = perf.counts.great;
  $('rGood').textContent = perf.counts.good;
  $('rMiss').textContent = perf.counts.miss;
  $('rWrong').textContent = perf.counts.wrong;
  $('rCombo').textContent = perf.maxCombo;
  $('rAccuracy').textContent = `${perf.accuracy}%`;
  show('results');
}

// Every screen, and which of them are MENUS (shown in front of the menu's
// own rock-show scene instead of the 3D game).
const SCREENS = ['menu', 'diffScreen', 'songScreen', 'loading', 'settingsScreen', 'hud', 'pauseScreen', 'results'];
const MENU_SCREENS = ['menu', 'diffScreen', 'songScreen', 'settingsScreen', 'calibration'];
const MUSIC_SCREENS = ['menu', 'diffScreen', 'settingsScreen'];
let inMenus = true;
/** Show exactly these screens (by id) and hide the rest. */
function show(...names) {
  for (const id of SCREENS) $(id).hidden = !names.includes(id);
  inMenus = names.some((n) => MENU_SCREENS.includes(n));
  $('menuScene').hidden = !inMenus;
  // The title music plays on the title, difficulty and settings screens (once
  // you've tapped START); the set list has song previews instead, and the
  // timing check and the game need it quiet. (show() always runs inside a tap,
  // so phones allow the music to start.)
  const musicScreen = names.some((n) => MUSIC_SCREENS.includes(n));
  if (musicScreen && $('menu').classList.contains('started')) {
    if (!titleMusic.playing) titleMusic.play();
  } else titleMusic.stop();
  menuScene.setMode(names.includes('menu') ? 'title' : 'menu');
  if (!names.includes('hud')) {
    $('riotHint').hidden = true;
    $('phone').classList.remove('riot');
  }
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
  const workStart = performance.now(); // for the smoothness numbers (perf.js)
  const frameMs = now - lastFrame;
  const dt = Math.max(0, Math.min(0.05, frameMs / 1000)); // (the first frame can be slightly negative)
  lastFrame = now;
  perfMonitor.frame(frameMs);
  const live = status === 'playing' || status === 'paused' || status === 'failing';

  // In the menus only the menu's own rock show is drawn: the 3D game rests.
  if (inMenus) {
    // If the music can't play (blocked or broken), don't keep the intro waiting.
    if (menuScene.intro && titleMusic.time == null && now - introStartedAt > 2500) endIntro();
    if (introSkip && titleMusic.time != null) {
      if (menuScene.intro && titleMusic.time < 14.6) titleMusic.skipTo(14.6); // 1.5 s before the strike
      introSkip = false;
    }
    menuScene.update(dt, titleMusic.time);
    perfMonitor.work(performance.now() - workStart, 0);
    requestAnimationFrame(frame);
    return;
  }

  // 1. The master clock. In menus we fake a clock so the stage keeps moving.
  //    After a game over, time freezes where the power was cut.
  menuClock += dt;
  let t = live ? player.time : LEAD + (menuClock % 140);
  if (status === 'failing') t = failedAt;

  // 2–3. Rules + reactions.
  if (status === 'playing') {
    if (AUTOPLAY) autoplay(t);
    for (const e of perf.update(t, offset())) handle(e);
    if (!settings.practice && perf.failed) {
      // Out of energy. If Riot Mode is ready, the player gets a moment to
      // swipe up and save the show; otherwise (or if time runs out) it's over.
      if (perf.riotReady && !lastChanceUntil) lastChanceUntil = t + RIOT.lastChance;
      if (!lastChanceUntil || t > lastChanceUntil) failGame();
    }
    else if (t >= songEnd()) endGame();
  }

  // 3b. The song's big moments (solo, Big Rock Ending, CENTER STAGE).
  if (status === 'playing') {
    bigMoments(t);
    if (perf.stageReady >= 0 && !pendingTakeover) pendingTakeover = scheduleTakeover(t) || 'never';
    if (pendingTakeover && pendingTakeover !== 'never' && !perf.takeover && t >= pendingTakeover.start) {
      handle(perf.startTakeover(pendingTakeover.start, pendingTakeover.end));
      pendingTakeover = null;
    }
    if (perf.takeover && t >= perf.takeover.end) handle(perf.endTakeover());
  }
  takeover.update(t, dt);

  // 4. Animate the world.
  const songTime = t - LEAD;
  const beat = beatPosition(songTime);
  const section = live ? sectionAt(Math.max(0, songTime)) : 'OPENING';
  if (live && section !== lastSection) {
    if (lastSection) showfx.onSection(section);
    lastSection = section;
  }
  const big = section.includes('CHORUS') || section === 'OUTRO';
  const rioting = live && perf.riotActive;
  const musicEnergy = live ? (big || rioting ? 1 : section.includes('BUILD') ? 0.7 : 0.45) : 0.2;
  hype = rioting ? 1 : Math.max(Math.min(1, perf.combo / 60) * (live ? 1 : 0), hype - dt * 0.5);
  const stageTime = status === 'failing' ? failedAt : now / 1000;
  stage.update(stageTime, beat, status === 'failing' ? 'OPENING' : section, hype);
  showfx.update(now / 1000, beat, section, live && status !== 'failing', dt);
  crowd.update(beat, status === 'failing' ? 0 : stage.intensity);
  band.update(live ? t : menuClock, live ? beat : menuClock / BEAT, live && songTime > -0.2, dt, musicEnergy, section);
  highway.update(t, (lane) => input.isHeld(lane));
  effects.update(dt);
  // The show intro: the camera swoops in until the drummer's first click.
  world.updateCamera(dt, now / 1000, live ? t / countInTimes()[0] : 0);
  if (live) hud.update(perf, t, section);
  for (let lane = 0; lane < 4; lane++) hud.setPadDown(lane, input.isHeld(lane));

  // 5. Draw.
  const renderStart = performance.now();
  world.renderer.render(world.scene, world.camera);
  perfMonitor.work(renderStart - workStart, performance.now() - renderStart);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Get the phone's graphics ready for the notes before any song starts (see
// highway.warmUp: without this, an iPhone can freeze the picture for a few
// seconds the first time notes appear, while the music keeps going).
highway.warmUp(6);

// ---- Menu wiring -----------------------------------------------------------
document.title = GAME_TITLE.replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase());
// Version badge on every screen, so you always know which build you're playing.
for (const el of document.querySelectorAll('.version')) {
  el.textContent = `${BUILD_LABEL}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`;
}

// Every menu button: wake the audio (iPhone rule: only inside a tap) and blip.
// ("true" = this runs BEFORE the button's own click handler.)
document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button || !inMenus) return;
  try { player.unlock(); } catch { /* no Web Audio: play silently */ }
  if (!['startBtn', 'playBtn', 'tapStart'].includes(button.id) && !button.dataset.song) player.sfx('blip');
}, true);

// TITLE: the first tap starts the music and THE INTRO: the stage lights up
// with the song, and at 16 s lightning strikes, the logo slams in and the
// menu buttons arrive. Tapping during the intro skips to just before that.
let introStartedAt = 0;
$('tapStart').addEventListener('click', (e) => {
  e.stopPropagation(); // (this tap must not also count as "skip")
  $('menu').classList.add('started', 'intro');
  menuScene.setIntro(true);
  introSkip = false;
  introStartedAt = performance.now();
  show('menu');
});
// (The skip waits for the music to actually be playing: a very quick tap
// can come before the song has started.)
let introSkip = false;
$('menu').addEventListener('click', () => {
  if ($('menu').classList.contains('intro')) introSkip = true;
});
function endIntro() {
  $('menu').classList.remove('intro');
  menuScene.setIntro(false);
}
// START THE SHOW -> difficulty.
$('startBtn').addEventListener('click', () => {
  player.sfx('chord');
  show('diffScreen');
});
// Back buttons go to the screen named in data-back.
for (const b of document.querySelectorAll('[data-back]')) {
  b.addEventListener('click', () => {
    preview.stop();
    show(b.dataset.back);
  });
}

// DIFFICULTY: pick one -> the set list.
const diffButtons = [...document.querySelectorAll('[data-diff]')];
function selectDifficulty(d) {
  updateSettings({ difficulty: DIFFICULTIES[d] ? d : 'casual' });
  diffButtons.forEach((b) => {
    const on = b.dataset.diff === settings.difficulty;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on);
  });
  $('diffChip').textContent = `${DIFFICULTIES[settings.difficulty].label} ✎`;
  refreshSongBests();
}
diffButtons.forEach((b) => b.addEventListener('click', () => {
  selectDifficulty(b.dataset.diff);
  openSongs();
}));
$('diffChip').addEventListener('click', () => { preview.stop(); show('diffScreen'); });

// SET LIST: one row per song (song/songs.js), with your best for this level.
// Tap a song to hear a preview; tap it again (or PLAY) to start the show.
const songButtons = SONGS.map((entry) => {
  const b = document.createElement('button');
  b.dataset.song = entry.id;
  b.setAttribute('role', 'radio');
  const venue = (VENUES[entry.venue] || VENUES.arena).name;
  const extras = [entry.solo && `${entry.solo.who === 'bassist' ? 'BASS' : 'GUITAR'} SOLO`, entry.bigRockEnding && 'BIG ENDING']
    .filter(Boolean).map((x) => `<i>${x}</i>`).join('');
  b.innerHTML = `<span class="song-main"><strong>${entry.chart.title}</strong>`
    + `<span class="song-meta">${venue} · ${Math.round(entry.chart.estimated_bpm)} BPM</span>`
    + `<span class="song-tags">${extras}</span></span>`
    + '<span class="song-side"><span class="stars-small"></span><span class="best"></span></span>';
  b.addEventListener('click', () => {
    if (status !== 'menu') return;
    if (SONG.id === entry.id && b.classList.contains('selected')) startGame();
    else {
      pickSong(entry.id);
      preview.play(SONG);
    }
  });
  $('songList').append(b);
  return b;
});
/** Show your best stars and score (for the chosen difficulty) on each song. */
function refreshSongBests() {
  for (const b of songButtons) {
    const best = getBest(b.dataset.song, settings.difficulty);
    b.querySelector('.stars-small').textContent = starText(best ? best.stars : 0);
    b.querySelector('.stars-small').classList.toggle('gold', !!best?.gold);
    b.querySelector('.best').textContent = best ? best.score.toLocaleString('en-US') : 'NOT PLAYED YET';
  }
}

function pickSong(id) {
  if (status !== 'menu') return;
  selectSong(id);
  updateSettings({ songId: SONG.id });
  songButtons.forEach((b) => {
    const on = b.dataset.song === SONG.id;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on);
  });
}
pickSong(settings.songId);
selectDifficulty(settings.difficulty);

/** Open the set list and start the picked song's preview. */
function openSongs() {
  refreshSongBests();
  show('songScreen');
  preview.play(SONG);
}
$('playBtn').addEventListener('click', startGame);
$('loadBack').addEventListener('click', () => quitGame());

function refreshMenuNote() {
  const bits = ['Headphones recommended'];
  if (settings.practice) bits.push('Practice mode ON');
  if (settings.tapOffsetMs) bits.push(`Tap timing ${settings.tapOffsetMs > 0 ? '+' : ''}${settings.tapOffsetMs} ms`);
  $('menuFine').textContent = bits.join(' · ');
}

// ---- Settings screen -------------------------------------------------------
const bandButtons = [...document.querySelectorAll('[data-band]')];
function selectBand(style) {
  updateSettings({ bandStyle: bands[style] ? style : 'retro' });
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

// The timing check opens from the title screen, Settings or the results
// screen's timing tip, and returns there.
let calibrationReturn = 'menu';
const calibration = createCalibration(player, {
  onApply: (ms) => setOffset(ms),
  onClose: () => show(calibrationReturn),
});
const openCalibration = (from) => {
  calibrationReturn = from;
  show('calibration');
  calibration.open();
};

$('settingsBtn').addEventListener('click', () => show('settingsScreen'));
$('settingsDone').addEventListener('click', () => show('menu'));
$('calibrateBtn').addEventListener('click', () => openCalibration('menu'));
$('calibrateBtn2').addEventListener('click', () => openCalibration('settingsScreen'));
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', startGame);
$('quitBtn').addEventListener('click', () => quitGame());
$('againBtn').addEventListener('click', startGame);
$('menuBtn').addEventListener('click', () => quitGame());
$('titleBtn').addEventListener('click', () => quitGame('menu'));

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
      songId: SONG.id, venue: stage.venue, songTitle: SONG.title,
      solo: solo && { who: solo.who, start: solo.start, end: solo.end, pairs: solo.pairs.length },
      soloHits: perf.soloHits, soloTotal: perf.soloTotal, finale, finaleBanked: perf.finaleBanked,
      riotMeter: perf.riotMeter, riotActive: perf.riotActive, riotUses: perf.riotUses, lastChance: lastChanceUntil > 0,
      nextRiotNote: perf.notes.find((n) => n.riot && !n.riotBroken && !n.hit && !n.miss && n.time > player.time)?.time ?? null,
      riotPhrases: new Set(perf.notes.filter((n) => n.riot).map((n) => n.riot)).size,
      drawCalls: world.renderer.info.render.calls, triangles: world.renderer.info.render.triangles,
      screen: SCREENS.find((id) => !$(id).hidden) || '', inMenus, previewing: preview.playing,
      titleMusic: titleMusic.playing, titleTime: titleMusic.time, titleIntro: $('menu').classList.contains('intro'),
      countIn: countInTimes(), intro: $('introCard').classList.contains('show'), countText: $('countIn').textContent,
      stageMeters: [0, 1, 2, 3].map((l) => perf.stageLevel(l)), stageNeed: perf.stageNeed, stageReady: perf.stageReady,
      stageUses: perf.stageUses, takeover: perf.takeover, takeoverStats: takeover.stats, takeoverTargets: takeover.targets,
      perf: { ...perfMonitor.stats },
    };
  },
  start: startGame,
  finish: () => endGame(), // tests only: jump to the results screen
  fillRiot: () => { perf.riotMeter = 1; }, // tests only: a full Riot meter
  fillStage: (lane = 3) => { // tests only: this musician's meter is full (takeover at the next bar)
    perf.stageMeter = perf.stageMeter.map((_, i) => (i === lane ? perf.stageNeed[i] : 0));
    perf.stageReady = lane;
  },
  pickSong,
  pause: pauseGame,
  resume: resumeGame,
  press: (lane) => input.down(lane),
  release: (lane) => input.up(lane),
};
