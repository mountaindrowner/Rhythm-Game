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
import { WINDOWS, SCORE, ENERGY, LEAD, WRONG_PRESS_COOLDOWN, STARS, RIOT } from '../config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The streak multiplier (×1–×4) after `streak` hits in a row. */
export const multiplierFor = (streak) => Math.min(SCORE.maxMultiplier, 1 + Math.floor(streak / SCORE.streakPerStep));

/** The score of a perfect run: every note PERFECT, every long note held. */
export function perfectScore(notes) {
  let total = 0;
  notes.forEach((n, i) => {
    const mult = multiplierFor(i + 1);
    total += SCORE.perfect.base * mult + (n.hold > 0 ? SCORE.holdBonus * mult : 0);
  });
  return total;
}

/** 0-5 stars for a score, and whether they're gold (Expert full combo + 5 stars). */
export function starsFor(score, best, { expert = false, fullCombo = false } = {}) {
  const share = best ? score / best : 0;
  const stars = STARS.filter((need) => share >= need).length;
  return { stars, gold: expert && fullCombo && stars === 5, share };
}

export class Performance {
  /**
   * @param {Array} notes  from notesForDifficulty()
   * @param {{drain?:number, beatLength?:number}} options  drain scales energy
   *   lost from mistakes; beatLength (seconds) sets how long Riot Mode lasts
   */
  constructor(notes, { drain = 1, beatLength = 0.4 } = {}) {
    this.notes = notes;
    this.drain = drain;
    this.beatLength = beatLength;
    // Riot Mode: the meter (0..1), whether it's running, and each gold
    // phrase's progress: { notes in it, hit so far, broken by a miss }.
    this.riotMeter = 0;
    this.riotActive = false;
    this.riotUses = 0;
    this.lastUpdate = null;
    this.lastWrong = null;
    this.phrases = new Map();
    for (const n of notes) {
      if (!n.riot) continue;
      if (!this.phrases.has(n.riot)) this.phrases.set(n.riot, { total: 0, hit: 0, broken: false });
      this.phrases.get(n.riot).total++;
    }
    this.total = notes.length;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.energy = ENERGY.start;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0, wrong: 0 };
    this.offsets = [];  // how early (-) or late (+) each hit was, in seconds
    this.early = 0;     // GREAT/GOOD hits that were early...
    this.late = 0;      // ...or late (shown as EARLY / LATE)
    this.bonusFactor = 1; // Riot Mode doubles this
    this.judged = 0;
    this.holding = [null, null, null, null];  // hold note being sustained per lane
    this.lastMistake = [-99, -99, -99, -99];
    this.cursor = 0; // index of the first note that might still need checking
  }

  /**
   * A lane was pressed at game time t. `offset` is the player's tap timing
   * calibration in seconds: +0.05 means "my taps arrive 50 ms late", so we
   * judge each tap as if it happened 50 ms earlier.
   */
  press(lane, t, offset = 0) {
    const now = t - offset;
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
        // Remember what this cost, in case it was really the start of a swipe.
        this.lastWrong = { lane, t, combo: this.combo, energy: this.energy };
        return this.mistake(lane, t, 'wrong', ENERGY.wrong);
      }
      return { type: 'press', lane };
    }

    const grade = bestDelta < WINDOWS.perfect ? 'perfect' : bestDelta < WINDOWS.great ? 'great' : 'good';
    const error = now - best.time; // how far off this hit was: negative = early, positive = late
    const timing = grade === 'perfect' ? '' : error < 0 ? 'early' : 'late';
    if (timing) this[timing]++;
    this.offsets.push(error);
    best.hit = true;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.counts[grade]++;
    this.score += SCORE[grade].base * this.multiplier;
    this.energy = clamp(this.energy + ENERGY[grade], 0, 100);
    this.judged++;
    if (best.hold > 0) this.holding[lane] = best;
    else best.done = true;
    // Riot phrase: every note hit = more meter.
    let riotPhrase = false;
    const phrase = best.riot && this.phrases.get(best.riot);
    if (phrase && !phrase.broken && ++phrase.hit === phrase.total) {
      this.riotMeter = Math.min(1, this.riotMeter + RIOT.perPhrase);
      riotPhrase = true;
    }
    return {
      type: 'hit', lane, grade, note: best, timing, riotPhrase,
      combo: this.combo,
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
    const now = t - offset;

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
        const phrase = n.riot && this.phrases.get(n.riot);
        if (phrase && !phrase.broken) {
          phrase.broken = true; // a missed gold note loses that phrase (its notes turn normal)
          for (const other of this.notes) if (other.riot === n.riot) other.riotBroken = true;
        }
        events.push(this.mistake(n.lane, t, 'miss', ENERGY.miss));
      }
    }
    // Riot Mode drains the meter: a full meter lasts RIOT.fullBeats beats.
    const dt = this.lastUpdate === null ? 0 : Math.max(0, t - this.lastUpdate);
    this.lastUpdate = t;
    if (this.riotActive) {
      this.riotMeter -= dt / (RIOT.fullBeats * this.beatLength);
      if (this.riotMeter <= 0) {
        this.riotMeter = 0;
        this.riotActive = false;
        this.bonusFactor = 1;
        events.push({ type: 'riotEnd' });
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

  /** The score multiplier right now: the streak's ×1–×4 (×2 more in Riot Mode). */
  get multiplier() {
    return multiplierFor(this.combo) * this.bonusFactor;
  }

  /** The middle of all hit offsets (seconds, + = late), or 0 with too few hits. */
  get typicalOffset() {
    if (this.offsets.length < 20) return 0;
    const sorted = [...this.offsets].sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  }

  completeHold(n) {
    n.done = true;
    this.score += SCORE.holdBonus * this.multiplier;
    this.energy = clamp(this.energy + ENERGY.holdComplete, 0, 100);
    return { type: 'holdComplete', lane: n.lane };
  }

  mistake(lane, t, kind, energyChange) {
    this.lastMistake[lane] = t;
    this.combo = 0;
    // In Riot Mode the crowd forgives everything: no energy lost.
    if (!this.riotActive) this.energy = clamp(this.energy + energyChange * this.drain, 0, 100);
    return { type: 'mistake', kind, lane };
  }

  /** Can Riot Mode be unleashed right now? */
  get riotReady() {
    return !this.riotActive && this.riotMeter >= RIOT.minToUse - 1e-9;
  }

  /**
   * Unleash Riot Mode (from a swipe up). Doubles the multiplier, gives back
   * some energy (this is what rescues a show that's about to end), and runs
   * until the meter empties. Returns an event, or null if it isn't ready.
   */
  activateRiot(t) {
    if (!this.riotReady) return null;
    // A swipe that started on a pad also counted as a tap; if that tap was a
    // wrong note, undo its penalty.
    if (this.lastWrong && t - this.lastWrong.t < 0.45) {
      this.counts.wrong--;
      this.combo = this.lastWrong.combo;
      this.energy = this.lastWrong.energy;
      this.lastWrong = null;
    }
    this.riotActive = true;
    this.riotUses++;
    this.bonusFactor = 2;
    this.energy = clamp(this.energy + RIOT.rescue, 0, 100);
    this.lastUpdate = t;
    return { type: 'riotStart' };
  }

  /** Weighted accuracy: perfect = 100%, great = 85%, good = 65%, miss = 0%. */
  get accuracy() {
    const c = this.counts;
    return this.total ? Math.round(((c.perfect + c.great * 0.85 + c.good * 0.65) / this.total) * 100) : 0;
  }

  /** Out of energy: the crowd has had enough (game over unless practicing). */
  get failed() {
    return this.energy <= 0;
  }

  get headline() {
    return this.energy >= 80 ? 'HEADLINER!' : this.energy >= 48 ? 'NICE SET!' : 'KEEP ROCKING!';
  }
}
