// =============================================================================
// preview.js — plays a short loop of a song (from its first chorus) while
// it's picked on the set list, like the song previews in Guitar Hero.
//
// Decoding a whole song takes a moment and a lot of memory, so the preview
// cuts just the chorus out of the MP3 and decodes only that. (An MP3 file is
// a chain of small independent "frames", so a slice from the middle still
// plays. We guess where the chorus is in the file from its average size per
// second, which is close enough for a preview.)
//
//   play(song)   start this song's preview (call it from a tap: iPhone rule)
//   stop()       fade the preview out
// =============================================================================
import { songBytes } from './player.js';

const CLIP = 16;      // seconds of music in a preview
const VOLUME = 0.7;

export function createPreview(player) {
  const clips = new Map(); // song id -> decoded clip (small, so we keep them)
  let current = null;      // { src, gain } playing right now
  let wanted = null;       // id of the song that should be playing

  async function clipFor(song) {
    if (clips.has(song.id)) return clips.get(song.id);
    const bytes = await songBytes(song.audio);
    const chorus = song.sections.find((s) => /CHORUS/.test(s.name));
    const startSec = chorus ? chorus.time : song.duration * 0.33;
    const audioStart = id3Size(bytes); // skip the tag (title, cover art) at the front
    const perSecond = (bytes.length - audioStart) / song.duration;
    const from = audioStart + Math.floor(startSec * perSecond);
    const to = Math.min(bytes.length, from + Math.ceil((CLIP + 1) * perSecond));
    const clip = await player.ctx.decodeAudioData(bytes.slice(from, to).buffer);
    clips.set(song.id, clip);
    return clip;
  }

  function fadeOut(seconds = 0.35) {
    if (!current || !player.ctx) return;
    const { src, gain } = current;
    current = null;
    const now = player.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
    try { src.stop(now + seconds + 0.05); } catch { /* already stopped */ }
  }

  function start(clip, id) {
    const ctx = player.ctx;
    const src = ctx.createBufferSource();
    src.buffer = clip;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const len = Math.min(CLIP, clip.duration - 0.2);
    // Fade in, hold, fade out at the end of the clip.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(VOLUME, now + 0.6);
    gain.gain.setValueAtTime(VOLUME, now + len - 1.6);
    gain.gain.linearRampToValueAtTime(0, now + len);
    src.connect(gain).connect(ctx.destination);
    src.start(now, 0.15, len); // skip the first sliver (the cut can click)
    current = { src, gain };
    // When it finishes, play it again (if this song is still picked).
    src.onended = () => {
      if (current?.src === src && wanted === id) start(clip, id);
    };
  }

  return {
    async play(song) {
      wanted = song.id;
      try {
        const woke = player.unlock(); // inside the tap
        fadeOut();
        const clip = await clipFor(song);
        await woke;
        if (wanted !== song.id) return; // they picked another song meanwhile
        fadeOut(0.1);
        start(clip, song.id);
      } catch {
        // No preview (old browser, odd file): the game works fine without one.
      }
    },
    stop() {
      wanted = null;
      fadeOut();
    },
    /** Is a preview playing right now? (for the tests) */
    get playing() { return !!current; },
  };
}

/** Size of the ID3 tag at the start of an MP3 (0 if there isn't one). */
function id3Size(b) {
  if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0; // "ID3"
  const size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9];
  return 10 + size + (b[5] & 0x10 ? 10 : 0);
}
