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
// Seconds from "go" to the first sound of the song: the camera swoops in over
// the crowd, then the drummer clicks his sticks 4 times (on the song's own
// beat, see countInTimes in song/chart.js), then the band starts.
export const LEAD = 3.6;

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
// Points = the grade's base points × your MULTIPLIER. The multiplier grows
// with your streak like Guitar Hero's: ×1, then ×2 after 10 hits in a row,
// ×3 after 20 and ×4 after 30 (shown as a badge next to the combo). A miss
// drops it back to ×1.
export const SCORE = {
  perfect: { base: 100 },
  great:   { base: 70 },
  good:    { base: 40 },
  holdBonus: 50,       // finishing a long note (also multiplied)
  streakPerStep: 10,   // hits in a row for each step up
  maxMultiplier: 4,
  comboMilestone: 25,  // "crowd on fire" every 25 hits in a row
};

// ---- Riot Mode (the power-up) -------------------------------------------------
// Play every note of a gold Riot phrase to fill the meter; swipe up (or press
// Space) once it's at least half full. While it lasts your multiplier is
// doubled (up to ×8) and misses can't drain your energy.
export const RIOT = {
  perPhrase: 0.25,   // meter gained for each perfect-ly completed phrase (any grade counts)
  minToUse: 0.5,     // the meter must be at least this full to unleash it
  fullBeats: 32,     // a full meter lasts 32 beats (8 bars); half lasts 4 bars
  rescue: 30,        // energy given back when you unleash it
  lastChance: 2.5,   // seconds to swipe when your energy runs out with Riot ready
};

// ---- Solos and the Big Rock Ending -------------------------------------------
export const SOLO = {
  // Share of the solo's "response" notes you need to hit for each medal.
  bronze: 0.6, silver: 0.8, gold: 0.95,
  bonus: { bronze: 1000, silver: 2500, gold: 5000 },
};
export const FINALE = {
  perTap: 25,        // points per pad tap during the Big Rock Ending (× multiplier)
};

// ---- Stars (results screen and song picker) --------------------------------
// Stars come from your score as a share of a "perfect run" (every note
// PERFECT, never dropping the streak). Gold stars: an Expert full combo
// that also earns 5 stars.
export const STARS = [0.08, 0.2, 0.38, 0.55, 0.75]; // share needed for 1, 2, 3, 4, 5 stars

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
