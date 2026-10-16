// =============================================================================
// config.js — every "magic number" in the game lives here.
//
// If you want to change how the game FEELS (timing windows, scoring, how fast
// notes fly, where the camera sits), this is the first file to open. Nothing in
// here does any work; other files import these values.
// =============================================================================

// ---- Names ------------------------------------------------------------------
export const GAME_TITLE = 'RHYTHM RIOT';   // working title of the game
export const BAND_NAME = 'X-ROADS';        // the band ("Crossroads")

// ---- Version shown on the menu so you can tell which build is live. --------
// The numbers come from package.json and git at build time (vite.config.js).
/* global __APP_VERSION__, __GIT_COMMIT__, __BUILD_DATE__ */
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const COMMIT = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'local';
export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '';
export const BUILD_LABEL = `v${VERSION} · ${COMMIT}`;

// ---- Music timing -----------------------------------------------------------
export const BPM = 152;                 // estimated tempo of the song
export const BEAT = 60 / BPM;           // seconds per beat (~0.395 s)
export const LEAD = BEAT * 4;           // 4-beat count-in before the song starts

// How many seconds a note is visible before it reaches the hit line.
// Smaller = faster notes. (The original game used 1.84.)
export const TRAVEL = 1.84;

// ---- The four lanes (order must never change) -------------------------------
// `keys` uses KeyboardEvent.code values, so they work on any keyboard layout.
export const LANES = [
  { id: 0, name: 'BASS',   label: 'BASS',   color: '#63ff79', icon: '♮', keys: ['KeyD', 'Digit1', 'ArrowLeft'] },
  { id: 1, name: 'VOCALS', label: 'VOX',    color: '#ffbe3b', icon: '♪', keys: ['KeyF', 'Digit2', 'ArrowDown'] },
  { id: 2, name: 'GUITAR', label: 'GUITAR', color: '#4bbdff', icon: 'ϟ', keys: ['KeyJ', 'Digit3', 'ArrowUp'] },
  { id: 3, name: 'DRUMS',  label: 'DRUMS',  color: '#ff5b5b', icon: '✕', keys: ['KeyK', 'Digit4', 'ArrowRight'] },
];

// ---- Judging: how close (in seconds) a tap must be to the note --------------
export const WINDOWS = {
  perfect: 0.045,   // < 45 ms
  great: 0.097,     // < 97 ms
  good: 0.175,      // < 175 ms  (anything further away can't hit the note)
  missAfter: 0.174, // a note this far past the line counts as missed
};

// ---- Scoring ---------------------------------------------------------------
// Points = base + a bonus that grows with your combo (up to a cap).
export const SCORE = {
  perfect: { base: 300, perCombo: 2, maxBonus: 200 },
  great:   { base: 180, perCombo: 1, maxBonus: 130 },
  good:    { base: 90,  perCombo: 1, maxBonus: 80 },
  holdBonus: 150,      // finishing a long note
  comboMilestone: 25,  // "crowd on fire" every 25 hits in a row
};

// ---- Energy (life meter, 0–100) -------------------------------------------
// The original game stacked several small penalties on top of each other.
// They are written out here as single, explicit numbers with the same effect.
export const ENERGY = {
  start: 85,
  perfect: +1.15,
  great: +0.65,
  good: +0.15,
  holdComplete: +1,
  miss: -3.1,      // was 2.1 + 1
  wrong: -2,
  holdLost: -5,    // was 4 + 1
  // Energy LOST from mistakes is multiplied by this per difficulty, so Casual
  // players get more room before a game over.
  drain: { casual: 0.5, standard: 0.75, expert: 1 },
};

// A wrong press on the same lane within this time is ignored (stops
// one shaky thumb from draining the whole energy bar).
export const WRONG_PRESS_COOLDOWN = 0.26;

// ---- 3D world layout (units are arbitrary "meters") -------------------------
export const WORLD = {
  laneWidth: 1.05,
  highwayLength: 15,           // notes appear this far away
  stageZ: -17,               // front edge of the stage
  stageHeight: 1.1,            // how high the stage floor is
};
// How fast notes move toward you, in units per second.
export const NOTE_SPEED = WORLD.highwayLength / TRAVEL;

// Camera: where it sits and what it looks at. Tweak these to reframe the shot.
export const CAMERA = {
  position: [0, 4.6, 4.4],
  lookAt: [0, 0.4, -9],
  // The camera widens its field of view on narrow screens so all four lanes
  // always fit. This is the tangent of half the horizontal view angle.
  horizontalHalfTan: 0.42,
  minFov: 50,
  maxFov: 82,
};
