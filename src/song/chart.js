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
    firstDownbeat: chart.first_downbeat || 0, // which beat is "1" of the first bar
    allNotes: chart.notes,
    solo: entry.solo || null,                 // call-and-response solo (songs.js)
    bigRockEnding: !!entry.bigRockEnding,      // free-for-all finale (songs.js)
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

/**
 * The drummer's count-in: 4 stick clicks (game times) on the song's own beat,
 * the last one a beat before the song's first beat. The beat is extended
 * backwards from the chart's first beat, so the clicks lead straight in.
 */
export function countInTimes() {
  const first = SONG.beats[0] ?? 0;
  return [4, 3, 2, 1].map((k) => LEAD + first - k * SONG.beatLength);
}

/** When the results screen appears (game time) for the current song. */
export const songEnd = () => LEAD + SONG.duration + 0.28;

/**
 * Build the list of notes to play for one difficulty.
 * Each note gets a little bit of state the game fills in as you play.
 */
export function notesForDifficulty(difficulty) {
  const maxTier = DIFFICULTIES[difficulty].maxTier;
  const notes = SONG.allNotes
    .filter((n) => n.tier <= maxTier)
    .map((n, id) => ({
      id,
      time: LEAD + n.time, // convert to game time
      lane: n.lane,
      hold: n.hold,        // seconds; 0 = normal tap note
      role: n.role,        // e.g. "kick", "guitar-strum" (used for animation)
      riot: 0,             // which Riot phrase this note belongs to (0 = none)
      ghost: false,        // a solo "call" note: the soloist plays it, not you
      solo: false,         // a solo "response" note: you copy the soloist
      finale: false,       // the Big Rock Ending's final note (any lane hits it)
      hit: false,          // player hit the head of the note
      miss: false,         // note went past without a hit
      done: false,         // nothing more can happen to this note
    }))
    .sort((a, b) => a.time - b.time || a.lane - b.lane);
  markRiotPhrases(notes, difficulty);
  return notes;
}

/**
 * Everything needed to play the current song on a difficulty: the notes,
 * plus the song's big moments if it has them (see songs.js):
 *   solo   { who, lane, pairs: [{ callStart, responseStart, end }], start, end }
 *   finale { start, time }  (game times)
 */
export function prepareSong(difficulty) {
  let notes = notesForDifficulty(difficulty);
  const solo = SONG.solo ? applySolo(notes, SONG.solo) : null;
  const finale = SONG.bigRockEnding ? applyFinale(notes) : null;
  notes = notes.filter((n) => !n.removed);
  for (const n of notes) if (n.ghost || n.solo || n.finale) n.riot = 0;
  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
  notes.forEach((n, i) => { n.id = i; });
  return { notes, solo, finale };
}

/** Song time of a beat position (the opposite of beatPosition). */
export function timeAtBeat(pos) {
  const beats = SONG.beats;
  if (pos <= 0) return beats[0] + pos * SONG.beatLength;
  const last = beats.length - 1;
  if (pos >= last) return beats[last] + (pos - last) * SONG.beatLength;
  const i = Math.floor(pos);
  return beats[i] + (pos - i) * (beats[i + 1] - beats[i]);
}

const SOLO_LANE = { bassist: 0, singer: 1, guitarist: 2, drummer: 3 };

/**
 * CALL AND RESPONSE: inside the solo section, every 4 bars are split in two.
 * In the first 2 bars ("call") the soloist plays: those notes become ghost
 * notes you just watch. In the next 2 bars ("response") you play the very
 * same rhythm back. Pairs whose call has fewer than 2 notes are left alone.
 */
function applySolo(notes, { section, who }) {
  const i = SONG.sections.findIndex((s) => s.name.startsWith(section));
  if (i < 0) return null;
  const secStart = SONG.sections[i].time;
  const secEnd = SONG.sections[i + 1]?.time ?? SONG.duration;
  const fd = SONG.firstDownbeat;
  const firstBar = Math.round((beatPosition(secStart) - fd) / 4);
  const endBar = Math.floor((beatPosition(secEnd) - fd) / 4);
  const at = (bar) => LEAD + timeAtBeat(fd + bar * 4); // game time a bar starts
  const pairs = [];
  for (let bar = firstBar; bar + 4 <= endBar; bar += 4) {
    const callStart = at(bar);
    const responseStart = at(bar + 2);
    const end = at(bar + 4);
    const call = notes.filter((n) => !n.removed && n.time >= callStart - 0.02 && n.time < responseStart - 0.02);
    if (call.length < 2) continue;
    for (const n of notes) if (n.time >= responseStart - 0.02 && n.time < end - 0.02) n.removed = true;
    for (const n of call) {
      n.ghost = true;
      n.done = true; // nothing to judge: the soloist plays it
      const copy = { ...n, ghost: false, done: false, solo: true };
      copy.time = LEAD + timeAtBeat(beatPosition(n.time - LEAD) + 8); // same spot, 2 bars later
      notes.push(copy);
    }
    pairs.push({ callStart, responseStart, end });
  }
  if (!pairs.length) return null;
  return { who, lane: SOLO_LANE[who] ?? 2, pairs, start: pairs[0].callStart, end: pairs[pairs.length - 1].end };
}

/**
 * BIG ROCK ENDING: the last 4 bars before the song's final hit are cleared.
 * You mash any pads for bonus points, then hit the big final note (any lane)
 * to keep them.
 */
function applyFinale(notes) {
  const last = notes.reduce((a, n) => (n.time > a.time ? n : a), notes[0]);
  if (!last) return null;
  const time = last.time;
  const start = LEAD + timeAtBeat(beatPosition(time - LEAD) - 16);
  for (const n of notes) if (n.time >= start - 0.02 && !n.removed) n.removed = true;
  notes.push({
    id: 0, time, lane: -1, hold: 0, role: 'finale', riot: 0, ghost: false, solo: false, finale: true,
    hit: false, miss: false, done: false,
  });
  return { start, time };
}

/**
 * RIOT PHRASES: short gold sections that fill the Riot meter when you play
 * every note in them (like Guitar Hero's star phrases). We pick one bar in
 * every 8: the first bar in that stretch with enough notes to be a little
 * challenge, skipping the quiet opening.
 */
const PHRASE_NOTES = { casual: 2, standard: 3, expert: 4 }; // fewest notes a phrase may have
export function markRiotPhrases(notes, difficulty) {
  const barOf = (n) => Math.floor((beatPosition(n.time - LEAD) - SONG.firstDownbeat) / 4);
  const bars = new Map(); // bar number -> its notes
  for (const n of notes) {
    if (n.hold > 0 || sectionAt(n.time - LEAD) === 'OPENING') continue;
    const bar = barOf(n);
    if (!bars.has(bar)) bars.set(bar, []);
    bars.get(bar).push(n);
  }
  const lastBar = Math.max(...bars.keys());
  let id = 0;
  for (let start = 4; start <= lastBar; start += 8) {
    for (let bar = start; bar < start + 8; bar++) {
      const inBar = bars.get(bar) || [];
      if (inBar.length >= PHRASE_NOTES[difficulty]) {
        id++;
        for (const n of inBar) n.riot = id;
        break;
      }
    }
  }
  return id; // how many phrases
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
