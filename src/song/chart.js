// =============================================================================
// chart.js — the song's "sheet music" for the game.
//
// charts/song_chart.json lists every note: when it happens (seconds from the
// start of the MP3), which lane, and which difficulty it first appears in
// (tier 0 = Casual, 1 = Standard, 2 = Expert). It also has section names
// (VERSE 1, CHORUS 1...) and the times of every detected beat.
//
// Two clocks to keep straight:
//   songTime = seconds since the MP3 started
//   gameTime = seconds since you pressed Start = songTime + LEAD (count-in)
// =============================================================================
import chart from '../../charts/song_chart.json';
import { LEAD, BEAT } from '../config.js';

export const SONG = {
  title: chart.title,
  duration: chart.duration,
  bpm: chart.estimated_bpm,
  // Who sings lead: 'singer' (her), 'guitarist' (him) or 'duet' (both).
  // The band animates to match (see world/animBlocks.js).
  vocalist: chart.vocalist || 'singer',
  sections: chart.sections,
  beats: chart.beats,
  allNotes: chart.notes,
};

export const DIFFICULTIES = {
  casual:   { label: 'CASUAL',   maxTier: 0 },
  standard: { label: 'STANDARD', maxTier: 1 },
  expert:   { label: 'EXPERT',   maxTier: 2 },
};

// When the results screen appears (game time).
export const SONG_END = LEAD + SONG.duration + 0.28;

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
  if (songTime <= beats[0]) return (songTime - beats[0]) / BEAT;
  const last = beats.length - 1;
  if (songTime >= beats[last]) return last + (songTime - beats[last]) / BEAT;
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
