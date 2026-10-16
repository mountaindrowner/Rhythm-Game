// =============================================================================
// settings.js — the player's preferences, remembered between visits.
//
// Saved in the browser's localStorage. Storage can be blocked (private
// browsing, some embeds), so every read/write is wrapped in try/catch and the
// game simply uses the defaults if it fails.
// =============================================================================

const DEFAULTS = {
  difficulty: 'casual',
  tapOffsetMs: 0,      // how late your taps arrive (+) or early (−); see calibration
  bandStyle: 'hd',     // 'hd' or 'retro' PixelLab sprites, '3d' models, or 'pixel' (classic)
  practice: false,     // true = no game over when energy runs out
  reduceFlashing: false,
};

const KEY = 'burnbright.settings.v1';

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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
