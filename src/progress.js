// =============================================================================
// progress.js — your best result for every song and difficulty, remembered
// between visits (like settings.js, saved in the browser's localStorage).
//
// Each entry looks like:
//   { score: 48200, stars: 4, gold: false, accuracy: 91, fullCombo: false }
// Only finished songs are saved (a game over doesn't count).
// =============================================================================
const KEY = 'rhythmriot.best.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

const slot = (songId, difficulty) => `${songId}:${difficulty}`;

/** Best result so far for a song on a difficulty, or null. */
export function getBest(songId, difficulty) {
  return readAll()[slot(songId, difficulty)] || null;
}

/**
 * Save a finished song if it beats the best score so far.
 * Returns { isNewBest, best } (best = the entry now saved).
 */
export function recordResult(songId, difficulty, result) {
  const all = readAll();
  const key = slot(songId, difficulty);
  const old = all[key];
  const isNewBest = !old || result.score > old.score;
  if (isNewBest) {
    // Keep the highest stars ever earned too (a gold run stays gold).
    all[key] = { ...result, gold: result.gold || !!old?.gold };
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: just don't save */ }
  }
  return { isNewBest, best: all[key] || old };
}

/** "★★★☆☆" for 0-5 stars. */
export const starText = (stars) => '★'.repeat(stars) + '☆'.repeat(5 - stars);
