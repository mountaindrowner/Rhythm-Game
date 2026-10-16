// =============================================================================
// settings.js — the player's preferences, remembered between visits.
//
// Saved in the browser's localStorage. Storage can be blocked (private
// browsing, some embeds), so every read/write is wrapped in try/catch and the
// game simply uses the defaults if it fails.
// =============================================================================

const DEFAULTS = {
  difficulty: 'casual',
  songId: '',          // which song is picked ('' = the first one)
  tapOffsetMs: 0,      // how late your taps arrive (+) or early (−); see calibration
  bandStyle: 'retro',  // 'retro' or 'hd' PixelLab sprites, '3d' models, or 'pixel' (classic)
  practice: false,     // true = no game over when energy runs out
  reduceFlashing: false,
};

const KEY = 'burnbright.settings.v1';

// Bump this when a new default look ships, so returning players see it once
// (they can still switch back in Settings).
const LOOK_VERSION = 2; // 2 = the animated Retro band (v0.5)

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if ((saved.lookVersion || 1) < LOOK_VERSION) {
      delete saved.bandStyle; // use the new default look
      saved.lookVersion = LOOK_VERSION;
    }
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = read();

/** Change one or more settings and save them. */
export function updateSettings(changes) {
  Object.assign(settings, changes);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
