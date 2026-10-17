// =============================================================================
// riotEffects.js — the LIBRARY OF RIOT MODE EFFECTS. Every time you unleash
// Riot Mode, one of these is picked at random (never the same one twice in a
// row), and the band, the stage and the floating sign change to match.
//
//   id      the name the code uses
//   name    the effect's name (for us: the sign always just says RIOT MODE!)
//   look    'riot' = the band wears their Riot versions (flaming guitar,
//           glowing bass...), 'normal' = their usual look with the effect on top
//   colors  the colours of the RIOT MODE! sign's letters, top to bottom
//
// HOW TO ADD ONE: add an entry here, then give it its motion in
// bandSprites.js (search "RIOT EFFECTS") and, if it needs stage extras,
// in showfx.js (search "RIOT EFFECTS").
// =============================================================================

export const RIOT_EFFECTS = [
  { id: 'inferno', name: 'INFERNO!', look: 'riot', colors: ['#fff6c8', '#ffc83a', '#ff5a2a'],
    about: 'The classic: the band in their flaming Riot versions.' },
  { id: 'giants', name: 'GIANTS!', look: 'riot', colors: ['#ffffff', '#ffbe3b', '#ff6a3d'],
    about: 'The band grows huge and stomps on every beat (the camera shakes).' },
  { id: 'zerog', name: 'ZERO GRAVITY!', look: 'normal', colors: ['#f2e8ff', '#b78bff', '#6b55c9'],
    about: 'Everyone floats up off the stage and drifts, sparkles rising around them.' },
  { id: 'disco', name: 'DISCO FEVER!', look: 'normal', colors: ['#ff8ad8', '#ffe36b', '#5be0ff'],
    about: 'Rainbow colors, a bounce on every beat, and a spinning disco ball.' },
  { id: 'echo', name: 'ECHO ECHO ECHO!', look: 'riot', colors: ['#e8fbff', '#7fdcff', '#4b7bff'],
    about: 'Ghostly copies of each musician play right beside them.' },
  { id: 'glitch', name: 'SYSTEM OVERLOAD!', look: 'normal', colors: ['#ffffff', '#ff4fd8', '#3be8ff'],
    about: 'The band glitches like a broken video game: jumps, red and blue copies, flicker.' },
  { id: 'glory', name: 'GLORY!', look: 'normal', colors: ['#ffffff', '#fff1b0', '#ffc83a'],
    about: 'Golden light rays behind the band, halos, and a gentle float.' },
  { id: 'voltage', name: 'HIGH VOLTAGE!', look: 'riot', colors: ['#ffffff', '#bfefff', '#4bbdff'],
    about: 'Electricity arcs from musician to musician; everyone flickers blue.' },
];

/** Pick a random effect, never the same as the last one. */
export function pickRiotEffect(lastId = null, random = Math.random) {
  const pool = RIOT_EFFECTS.filter((e) => e.id !== lastId);
  return pool[Math.floor(random() * pool.length) % pool.length];
}

/** Look one up by id (falls back to the classic). */
export const riotEffect = (id) => RIOT_EFFECTS.find((e) => e.id === id) || RIOT_EFFECTS[0];
