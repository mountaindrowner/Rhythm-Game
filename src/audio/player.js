// =============================================================================
// player.js — plays the real recording and provides the game's master clock.
//
// WHY THIS MATTERS: a rhythm game lives or dies on timing. Instead of counting
// animation frames (which stutter), the whole game asks the audio hardware
// "what time is it?" via AudioContext.currentTime. Notes, judging and
// animation all read that one clock, so they can never drift from the music.
//
// iPHONE RULES (learned the hard way in the original project):
//   1. Audio may only be unlocked inside a real tap. So start() must be called
//      directly from the Start button's click handler, and it calls
//      ctx.resume() BEFORE doing anything slow.
//   2. The MP3 is embedded inside the built index.html as a "data URL", so
//      itch.io never has to find a separate file (that caused HTTP 404 errors).
// =============================================================================
import { LEAD } from '../config.js';

export class SongPlayer {
  /** @param {string} songUrl  a data: URL (built game) or normal URL (dev server) */
  constructor(songUrl) {
    this.songUrl = songUrl;
    this.ctx = null;       // the AudioContext (created on first Start tap)
    this.buffer = null;    // decoded song, kept so Restart is instant
    this.buffers = new Map(); // the decoded song, by URL (only the current one is kept)
    this.source = null;    // the node currently playing the song
    this.begin = 0;        // ctx time at which game time = 0
    this.playing = false;
  }

  /** Pick which recording start() plays (decoded songs are remembered). */
  setSong(songUrl) {
    if (songUrl === this.songUrl) return;
    this.songUrl = songUrl;
    this.buffer = this.buffers.get(songUrl) || null;
  }

  /**
   * Get the song ready to play: unlock audio and decode the MP3 (the slow
   * part, done once per song). MUST be called from a tap/click handler.
   * Resolves when ready; rejects with a readable error.
   */
  async load() {
    // Step 1 — unlock audio synchronously, while we are still inside the tap.
    const unlocked = this.unlock();
    this.stopSource();
    this.playing = false;

    // Step 2 — the slow part: turn the MP3 bytes into playable audio (once).
    if (!this.buffer) {
      const url = this.songUrl;
      const bytes = await songBytes(url);
      // decodeAudioData takes the bytes over, so give it a copy (the original
      // stays cached for the song previews).
      const buffer = await this.ctx.decodeAudioData(bytes.slice(0).buffer);
      // A decoded song is big (about 70 MB for 3.5 minutes), so only the
      // current one is kept: phones run out of memory otherwise.
      this.buffers.clear();
      this.buffers.set(url, buffer);
      if (url !== this.songUrl) throw new Error('The song was changed while loading.');
      this.buffer = buffer;
    }
    await unlocked;
  }

  /**
   * Start the clock: game time 0 is right now, and the song itself begins
   * LEAD seconds later (after the intro and the count-in). load() first.
   */
  play() {
    this.stopSource();
    this.master.gain.cancelScheduledValues(0);
    this.master.gain.value = 0.9;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.master);
    this.begin = this.ctx.currentTime + 0.12; // tiny safety margin
    this.source.start(this.begin + LEAD);
    this.playing = true;
  }

  /** load() + play() in one go (Restart). MUST be called from a tap. */
  async start() {
    await this.load();
    this.play();
  }

  /**
   * The drummer's count-in: a stick click at each of these GAME times
   * (seconds; scheduled on the audio clock, so they're perfectly in time).
   */
  countIn(times) {
    const ctx = this.ctx;
    if (!ctx) return;
    times.forEach((t, i) => stickClick(ctx, this.master, this.begin + t, i === times.length - 1));
  }

  /**
   * Create (first time) and wake up the AudioContext. Must run inside a tap.
   * Also used by the calibration screen, which plays clicks on the same clock.
   */
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('This browser does not support Web Audio.');
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx.resume();
  }

  /**
   * Game over sound: the band's power gets cut. The song slows down like a
   * tape machine losing power and fades out over about 1.5 seconds.
   */
  powerDown() {
    if (!this.ctx || !this.source) return;
    const now = this.ctx.currentTime;
    this.source.playbackRate.setValueAtTime(1, now);
    this.source.playbackRate.exponentialRampToValueAtTime(0.25, now + 1.4);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 1.5);
  }

  /**
   * Little sound effects, made from scratch with oscillators (no extra
   * files). They play on top of the music.
   *   'blip'     a menu button
   *   'chord'    a big power chord (START THE SHOW)
   *   'boom'     a deep thump (the show is about to start)
   *   'thunder'  a lightning crack and a rolling rumble
   *   'thwack' 'pop' 'chime' 'slash'   CENTER STAGE target hits
   *   'riot'     a rising whoosh and a big power chord (Riot Mode!)
   *   'trombone' the classic "wah wah wah waaah" (the show is over)
   */
  sfx(name, retry = true) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') {
      // Audio is asleep (menus): wake it, then play the sound (one try only).
      if (retry) ctx.resume().then(() => this.sfx(name, false), () => {});
      return;
    }
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(ctx.destination);
    if (name === 'thwack' || name === 'pop' || name === 'chime' || name === 'slash') {
      // CENTER STAGE hit sounds (short, so lots of them can overlap).
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.connect(gn).connect(out);
      if (name === 'thwack') {          // a drum hit: a quick low thump
        o.type = 'sine';
        o.frequency.setValueAtTime(180, now);
        o.frequency.exponentialRampToValueAtTime(55, now + 0.12);
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(0.5, now + 0.004);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      } else if (name === 'pop') {      // a bubble: a quick upward blip
        o.type = 'sine';
        o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      } else if (name === 'chime') {    // a heart: a bright bell
        o.type = 'triangle';
        o.frequency.setValueAtTime(1318, now);
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      } else {                          // a string: a twangy zap sliding down
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(880, now);
        o.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      }
      o.start(now);
      o.stop(now + 0.4);
    } else if (name === 'blip') {
      // Menu button: a short bright "bip" that slides up.
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(520, now);
      o.frequency.exponentialRampToValueAtTime(1040, now + 0.06);
      out.gain.setValueAtTime(0.05, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      o.connect(out);
      o.start(now);
      o.stop(now + 0.1);
    } else if (name === 'chord') {
      // START THE SHOW: a big crunchy power chord that rings out.
      for (const [f, delay] of [[82.4, 0], [123.5, 0.01], [164.8, 0.02], [247, 0.03]]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2600, now);
        lp.frequency.exponentialRampToValueAtTime(500, now + 1.4);
        const gn = ctx.createGain();
        gn.gain.setValueAtTime(0.0001, now + delay);
        gn.gain.exponentialRampToValueAtTime(0.09, now + delay + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        o.connect(lp).connect(gn).connect(out);
        o.start(now + delay);
        o.stop(now + 1.7);
      }
    } else if (name === 'thunder') {
      // LIGHTNING: a sharp electric crack, a zap sweeping down, then a long
      // rolling rumble. All made from noise (random numbers) shaped by filters.
      const sr = ctx.sampleRate;
      const noiseBuf = (seconds, brown) => {
        const buf = ctx.createBuffer(1, Math.ceil(sr * seconds), sr);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < d.length; i++) {
          const white = Math.random() * 2 - 1;
          // "Brown" noise = each sample drifts from the last one: deep and rumbly.
          last = brown ? (last + 0.02 * white) / 1.02 : white;
          d[i] = brown ? last * 3.5 : white;
        }
        return buf;
      };
      out.gain.value = 0.7;
      // 1. The crack: a very short, very bright burst.
      const crack = ctx.createBufferSource();
      crack.buffer = noiseBuf(0.25, false);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0001, now);
      cg.gain.exponentialRampToValueAtTime(0.9, now + 0.004);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      crack.connect(hp).connect(cg).connect(out);
      crack.start(now);
      // 2. The zap: a filter sweeping from high to low through the noise.
      const zap = ctx.createBufferSource();
      zap.buffer = noiseBuf(0.5, false);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.setValueAtTime(5000, now);
      bp.frequency.exponentialRampToValueAtTime(400, now + 0.4);
      const zg = ctx.createGain();
      zg.gain.setValueAtTime(0.5, now);
      zg.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      zap.connect(bp).connect(zg).connect(out);
      zap.start(now);
      // 3. The rumble: deep noise that swells and rolls away over 3 seconds,
      //    with a few random "rolls" in the middle.
      const rumble = ctx.createBufferSource();
      rumble.buffer = noiseBuf(3.2, true);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, now);
      lp.frequency.exponentialRampToValueAtTime(160, now + 2.5);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0.0001, now);
      rg.gain.exponentialRampToValueAtTime(1, now + 0.06);
      let at = now + 0.06;
      for (let k = 0; k < 4; k++) {
        at += 0.12 + Math.random() * 0.18;
        rg.gain.exponentialRampToValueAtTime(0.35 + Math.random() * 0.35, at);
        at += 0.12 + Math.random() * 0.18;
        rg.gain.exponentialRampToValueAtTime(0.6 + Math.random() * 0.3, at);
      }
      rg.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
      rumble.connect(lp).connect(rg).connect(out);
      rumble.start(now);
    } else if (name === 'boom') {
      // The curtain drops: a deep thump.
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, now);
      o.frequency.exponentialRampToValueAtTime(38, now + 0.5);
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      o.connect(out);
      o.start(now);
      o.stop(now + 0.75);
    } else if (name === 'riot') {
      // Whoosh: white noise through a filter that sweeps up.
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(300, now);
      bp.frequency.exponentialRampToValueAtTime(6000, now + 0.6);
      noise.connect(bp).connect(out);
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.35, now + 0.5);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      noise.start(now);
      noise.stop(now + 1.6);
      // Power chord (root, fifth, octave) with a bit of grit, hitting as the whoosh peaks.
      for (const f of [110, 165, 220]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + 0.5);
        g.gain.exponentialRampToValueAtTime(0.12, now + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        o.connect(g).connect(out);
        o.start(now + 0.5);
        o.stop(now + 1.7);
      }
    } else if (name === 'trombone') {
      // Four sad notes sliding down, the last one long and wobbly.
      const notes = [[293.7, 0, 0.42], [277.2, 0.45, 0.42], [261.6, 0.9, 0.42], [246.9, 1.35, 1.3]];
      out.gain.value = 0.3;
      for (const [f, at, len] of notes) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 1.02, now + at);
        o.frequency.linearRampToValueAtTime(f, now + at + 0.08);
        const lp = ctx.createBiquadFilter(); // the "wah": a filter opening and closing
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(400, now + at);
        lp.frequency.linearRampToValueAtTime(1400, now + at + 0.15);
        lp.frequency.linearRampToValueAtTime(500, now + at + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(0.5, now + at + 0.05);
        g.gain.setValueAtTime(0.5, now + at + len - 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
        if (len > 1) { // wobble on the last note
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 6;
          const depth = ctx.createGain();
          depth.gain.value = 6;
          lfo.connect(depth).connect(o.frequency);
          lfo.start(now + at + 0.2);
          lfo.stop(now + at + len);
        }
        o.connect(lp).connect(g).connect(out);
        o.start(now + at);
        o.stop(now + at + len + 0.05);
      }
    }
  }

  /** Game time in seconds (0 = moment Start was pressed, LEAD = song begins). */
  get time() {
    return this.ctx && this.playing ? this.ctx.currentTime - this.begin : 0;
  }

  // Suspending the AudioContext freezes the music AND the clock together,
  // so pausing can never knock the notes out of sync.
  pause() { if (this.ctx) this.ctx.suspend(); }
  resume() { return this.ctx ? this.ctx.resume() : Promise.resolve(); }

  stop() {
    this.stopSource();
    this.playing = false;
    if (this.ctx) this.ctx.suspend(); // save battery while in menus
  }

  stopSource() {
    if (!this.source) return;
    try { this.source.stop(); } catch { /* already stopped */ }
    this.source.disconnect();
    this.source = null;
  }

  get hasRecording() { return !!this.source; }
}

// The raw MP3 bytes of every song asked for so far (a few MB each). Kept so
// song previews and replays don't have to unpack them again.
const bytesCache = new Map();

/**
 * Get the raw MP3 bytes (a Uint8Array), either by unpacking an embedded data
 * URL or by fetching the file (dev server). Shared with the song previews.
 */
export async function songBytes(url) {
  if (bytesCache.has(url)) return bytesCache.get(url);
  let bytes;
  if (url.startsWith('data:')) {
    const raw = atob(url.slice(url.indexOf(',') + 1));
    bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load song file (HTTP ${res.status}).`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  bytesCache.set(url, bytes);
  return bytes;
}

/**
 * One drumstick click (the count-in). Made from scratch: a very short burst
 * of noise for the "tick" plus a quick high tone for the wood.
 */
function stickClick(ctx, out, when, accent) {
  const len = 0.05;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = accent ? 1.1 : 0.8;
  noise.connect(bp).connect(g).connect(out);
  noise.start(when);

  const wood = ctx.createOscillator();
  wood.type = 'triangle';
  wood.frequency.setValueAtTime(accent ? 2100 : 1800, when);
  const wg = ctx.createGain();
  wg.gain.setValueAtTime(0.0001, when);
  wg.gain.exponentialRampToValueAtTime(0.35, when + 0.002);
  wg.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
  wood.connect(wg).connect(out);
  wood.start(when);
  wood.stop(when + 0.05);
}
