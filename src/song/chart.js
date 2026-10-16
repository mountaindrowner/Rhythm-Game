// =============================================================================
// chart.js — the current song's "sheet music" for the game.
//
// Each song's chart (charts/*.json, listed in songs.js) has every note: when
// it happens (seconds from the start of the MP3), which lane, and which
// difficulty it first appears in (tier 0 = Casual, 1 = Standard, 2 =
// Expert). It also has section names (VERSE 1, CHORUS 1...) and the times of
// every beat.
//
// SONG always holds the song that's picked right now. selectSong() swaps it,
// and anything that pre-computes from the notes (the 3D band, the HUD title,
// the venue...) registers with onSongChange() to hear about it.
//
// Two clocks to keep straight:
//   songTime = seconds since the MP3 started
//   gameTime = seconds since you pressed Start = songTime + LEAD (count-in)
// =============================================================================
import { LEAD } from '../config.js';
import { SONGS } from './songs.js';

export { SONGS };

/** The song that's picked right now (its fields are swapped by selectSong). */
export const SONG = {};
const listeners = [];

/** Run fn(SONG) now and every time the song changes. */
export function onSongChange(fn) {
  listeners.push(fn);
  if (SONG.id) fn(SONG);
}

/** Make the song with this id the current one (unknown ids pick the first song). */
export function selectSong(id) {
  const entry = SONGS.find((s) => s.id === id) || SONGS[0];
  if (entry.id === SONG.id) return SONG;
  const chart = entry.chart;
  const beats = chart.beats;
  Object.assign(SONG, {
    id: entry.id,
    title: chart.title,
    audio: entry.audio,
    venue: entry.venue || chart.venue || 'arena',
    duration: chart.duration,
    bpm: Math.round(chart.estimated_bpm),
    // Seconds per beat (the middle of all the gaps, so one odd gap can't skew it).
    beatLength: [...beats.slice(1).map((b, i) => b - beats[i])].sort((a, b) => a - b)[beats.length >> 1] || 0.4,
    // Who sings lead: 'singer' (her), 'guitarist' (him) or 'duet' (both).
    // The band animates to match (see world/animBlocks.js).
    vocalist: chart.vocalist || 'singer',
    sections: chart.sections,
    beats,
    allNotes: chart.notes,
  });
  for (const fn of listeners) fn(SONG);
  return SONG;
}
selectSong(SONGS[0].id);

export const DIFFICULTIES = {
  casual:   { label: 'CASUAL',   maxTier: 0 },
  standard: { label: 'STANDARD', maxTier: 1 },
  expert:   { label: 'EXPERT',   maxTier: 2 },
};

/** When the results screen appears (game time) for the current song. */
export const songEnd = () => LEAD + SONG.duration + 0.28;

/**
 * Build the list of notes to play for one difficulty.
 * Each note gets a little bit of state the game fills in as you play.
 */
export function notesForDifficulty(difficulty) {
  const maxTier = DIFFICULTIES[difficulty].maxTier;
  return SONG.allNotes
    .filter((n) => n.tier <= maxTier)
    .map((n, id) => ({
      id,
      time: LEAD + n.time, // convert to game time
      lane: n.lane,
      hold: n.hold,        // seconds; 0 = normal tap note
      role: n.role,        // e.g. "kick", "guitar-strum" (used for animation)
      hit: false,          // player hit the head of the note
      miss: false,         // note went past without a hit
      done: false,         // nothing more can happen to this note
    }))
    .sort((a, b) => a.time - b.time || a.lane - b.lane);
}

/** Name of the song section playing at `songTime`, e.g. "CHORUS 1". */
export function sectionAt(songTime) {
  let name = SONG.sections[0].name;
  for (const s of SONG.sections) {
    if (songTime >= s.time) name = s.name;
    else break;
  }
  return name;
}

/**
 * Where we are in the music, measured in beats (e.g. 12.5 = halfway between
 * beat 12 and 13). Uses the real detected beat times, so it follows the band
 * even if their tempo drifts a little.
 */
export function beatPosition(songTime) {
  const beats = SONG.beats;
  if (songTime <= beats[0]) return (songTime - beats[0]) / SONG.beatLength;
  const last = beats.length - 1;
  if (songTime >= beats[last]) return last + (songTime - beats[last]) / SONG.beatLength;
  // Binary search for the two beats around songTime.
  let a = 0;
  let b = last;
  while (a + 1 < b) {
    const mid = (a + b) >> 1;
    if (beats[mid] <= songTime) a = mid;
    else b = mid;
  }
  return a + (songTime - beats[a]) / (beats[b] - beats[a]);
}
