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
    this.source = null;    // the node currently playing the song
    this.begin = 0;        // ctx time at which game time = 0
    this.playing = false;
  }

  /**
   * Start the song from the beginning. MUST be called from a tap/click handler.
   * Resolves once the music is scheduled; rejects with a readable error.
   */
  async start() {
    // Step 1 — unlock audio synchronously, while we are still inside the tap.
    const unlocked = this.unlock();
    this.stopSource();
    this.master.gain.cancelScheduledValues(0);
    this.master.gain.value = 0.9;

    // Step 2 — the slow part: turn the MP3 bytes into playable audio (once).
    if (!this.buffer) {
      const bytes = await loadBytes(this.songUrl);
      this.buffer = await this.ctx.decodeAudioData(bytes);
    }
    await unlocked;

    // Step 3 — schedule the song to begin after the count-in.
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.master);
    this.begin = this.ctx.currentTime + 0.12; // tiny safety margin
    this.source.start(this.begin + LEAD);
    this.playing = true;
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

/** Get the raw MP3 bytes, either by decoding an embedded data URL or fetching. */
async function loadBytes(url) {
  if (url.startsWith('data:')) {
    const base64 = url.slice(url.indexOf(',') + 1);
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load song file (HTTP ${res.status}).`);
  return res.arrayBuffer();
}
