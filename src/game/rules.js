// =============================================================================
// rules.js — the referee. Decides PERFECT / GREAT / GOOD / MISS, keeps score,
// combo and energy.
//
// This file knows nothing about graphics or sound. It is given the time and
// which lanes were pressed, and it returns "events" describing what happened
// (e.g. { type: 'hit', grade: 'perfect', lane: 2 }). Other parts of the game
// listen to those events to draw sparks, animate the band, update the HUD.
// Keeping the rules separate makes them easy to test (see tests/unit/).
// =============================================================================
import { WINDOWS, SCORE, ENERGY, LEAD, WRONG_PRESS_COOLDOWN } from '../config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Performance {
  /** @param {Array} notes  from notesForDifficulty() */
  constructor(notes) {
    this.notes = notes;
    this.total = notes.length;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.energy = ENERGY.start;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0, wrong: 0 };
    this.judged = 0;
    this.holding = [null, null, null, null];  // hold note being sustained per lane
    this.lastMistake = [-99, -99, -99, -99];
    this.cursor = 0; // index of the first note that might still need checking
  }

  /**
   * A lane was pressed at game time t. `offset` is the player's calibration
   * (seconds) — positive means "my taps register late, judge them earlier".
   */
  press(lane, t, offset = 0) {
    const now = t + offset;
    let best = null;
    let bestDelta = Infinity;
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.time > now + WINDOWS.good) break; // the rest are further in the future
      if (n.lane !== lane || n.hit || n.miss) continue;
      const d = Math.abs(n.time - now);
      if (d < WINDOWS.good && d < bestDelta) { best = n; bestDelta = d; }
    }

    if (!best) {
      // Pressing during the count-in is free practice; after that it's a mistake.
      if (t >= LEAD - 0.02 && t - this.lastMistake[lane] > WRONG_PRESS_COOLDOWN) {
        this.counts.wrong++;
        return this.mistake(lane, t, 'wrong', ENERGY.wrong);
      }
      return { type: 'press', lane };
    }

    const grade = bestDelta < WINDOWS.perfect ? 'perfect' : bestDelta < WINDOWS.great ? 'great' : 'good';
    best.hit = true;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.counts[grade]++;
    const s = SCORE[grade];
    this.score += s.base + Math.min(s.maxBonus, this.combo * s.perCombo);
    this.energy = clamp(this.energy + ENERGY[grade], 0, 100);
    this.judged++;
    if (best.hold > 0) this.holding[lane] = best;
    else best.done = true;
    return {
      type: 'hit', lane, grade, note: best,
      milestone: this.combo % SCORE.comboMilestone === 0,
    };
  }

  /** A lane was released. Only matters if a long note was being held. */
  release(lane, t) {
    const n = this.holding[lane];
    if (!n) return null;
    this.holding[lane] = null;
    // A little forgiveness: letting go up to 0.13 s early still counts.
    if (t < n.time + n.hold - 0.13) {
      n.done = true;
      return this.mistake(lane, t, 'holdLost', ENERGY.holdLost);
    }
    return this.completeHold(n);
  }

  /** Call every frame. Returns a list of events (misses, finished holds). */
  update(t, offset = 0) {
    const events = [];
    const now = t + offset;

    for (let lane = 0; lane < 4; lane++) {
      const n = this.holding[lane];
      if (n && t >= n.time + n.hold - 0.04) {
        this.holding[lane] = null;
        events.push(this.completeHold(n));
      }
    }

    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.time > now + 0.2) break;
      if (!n.hit && !n.miss && now - n.time > WINDOWS.missAfter) {
        n.miss = true;
        n.done = true;
        this.counts.miss++;
        this.judged++;
        events.push(this.mistake(n.lane, t, 'miss', ENERGY.miss));
      }
    }
    // Move the cursor past notes that are completely finished.
    while (this.cursor < this.notes.length && this.notes[this.cursor].done) this.cursor++;
    return events;
  }

  /** Pausing drops any long notes being held (no bonus, no penalty). */
  cancelHolds() {
    for (let lane = 0; lane < 4; lane++) {
      if (this.holding[lane]) this.holding[lane].done = true;
      this.holding[lane] = null;
    }
  }

  completeHold(n) {
    n.done = true;
    this.score += SCORE.holdBonus;
    this.energy = clamp(this.energy + ENERGY.holdComplete, 0, 100);
    return { type: 'holdComplete', lane: n.lane };
  }

  mistake(lane, t, kind, energyChange) {
    this.lastMistake[lane] = t;
    this.combo = 0;
    this.energy = clamp(this.energy + energyChange, 0, 100);
    return { type: 'mistake', kind, lane };
  }

  /** Weighted accuracy: perfect = 100%, great = 85%, good = 65%, miss = 0%. */
  get accuracy() {
    const c = this.counts;
    return this.total ? Math.round(((c.perfect + c.great * 0.85 + c.good * 0.65) / this.total) * 100) : 0;
  }

  get headline() {
    return this.energy >= 80 ? 'HEADLINER!' : this.energy >= 48 ? 'NICE SET!' : 'KEEP ROCKING!';
  }
}
