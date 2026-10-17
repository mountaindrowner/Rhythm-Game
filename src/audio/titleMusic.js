// =============================================================================
// titleMusic.js — the menu music: "Holy Rollerz" plays (and loops) on the
// title screen and the difficulty screen, from the moment you tap START.
//
// The title screen's lights, band and lightning follow this song: its beat
// map (assets/audio/title_holy_rollerz.json, found by scripts/chart/listen.py)
// says when every beat is, and "strikes" says when the lightning hits and the
// band turns into their Riot versions (16.05 s is where the song kicks in).
//
// It plays through a plain <audio> element rather than the game's audio
// engine: a long song decoded into memory takes about 50 MB, and the menus
// don't need sample-perfect timing.
//
//   play()   start from the top (call it from a tap: iPhone rule)
//   stop()   fade out
//   time     seconds into the song right now (null when not playing)
// =============================================================================
import titleUrl from '../../assets/audio/title_holy_rollerz.mp3';
import beatMap from '../../assets/audio/title_holy_rollerz.json';
import { songBytes } from './player.js';

export const TITLE_SONG = beatMap;
const VOLUME = 0.8;

/**
 * Beat position at `t` seconds into the title song, counted so that whole
 * multiples of 4 are bar lines (negative before the first bar).
 */
export function titleBeat(t) {
  const b = beatMap.beats;
  const fd = beatMap.first_downbeat;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]) - fd;
  if (t >= b[b.length - 1]) return b.length - 1 + (t - b[b.length - 1]) / (b[b.length - 1] - b[b.length - 2]) - fd;
  let lo = 0;
  let hi = b.length - 1;
  while (hi - lo > 1) {             // binary search for the beat just before t
    const mid = (lo + hi) >> 1;
    if (b[mid] <= t) lo = mid; else hi = mid;
  }
  return lo + (t - b[lo]) / (b[lo + 1] - b[lo]) - fd;
}

export function createTitleMusic() {
  let on = false;   // should it be playing?
  let fade = 0;     // the fade-out timer
  const el = new Audio();
  el.loop = true;
  el.preload = 'auto';
  el.src = titleUrl;
  // Phones are happier playing a "blob" (a file kept in memory) than a huge
  // data: address, so swap to one as soon as it's ready (a split second).
  songBytes(titleUrl).then((bytes) => {
    if (on) return; // already playing: keep the source it's using
    el.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  }).catch(() => { /* keep the plain address */ });

  return {
    play() {
      clearInterval(fade);
      on = true;
      el.volume = VOLUME;
      try { el.currentTime = 0; } catch { /* not loaded yet: it starts at 0 anyway */ }
      const p = el.play();
      if (p) p.catch(() => { on = false; });
    },
    stop() {
      if (!on) return;
      on = false;
      // Fade out over 0.4 s. (iPhones ignore volume changes, so there it just
      // stops when the fade would have finished.)
      clearInterval(fade);
      let step = 0;
      fade = setInterval(() => {
        step++;
        try { el.volume = Math.max(0, VOLUME * (1 - step / 8)); } catch { /* read-only volume */ }
        if (step >= 8) {
          clearInterval(fade);
          el.pause();
        }
      }, 50);
    },
    get time() { return on && !el.paused ? el.currentTime : null; },
    get playing() { return on && !el.paused; },
  };
}
