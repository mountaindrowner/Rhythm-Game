// =============================================================================
// input.js — turns fingers and keys into "lane pressed / lane released".
//
// Touch: the whole pad strip at the bottom is one big touch area split into
// four equal columns, so a thumb that lands a bit off-center still counts.
// Several fingers can be down at once (for chords).
//
// Improvement over the original: we COUNT how many fingers/keys hold each
// lane, so lifting one of two fingers on the same pad doesn't end a hold.
//
// SWIPE UP (Riot Mode): a finger that moves up quickly (45+ pixels within
// half a second) counts as a swipe, whether it started on a pad or anywhere
// on the stage above them. Space does the same on a keyboard.
// =============================================================================
const SWIPE_PX = 45;
const SWIPE_MS = 500;
import { LANES } from '../config.js';

export class Input {
  /**
   * @param {HTMLElement} padArea  element covering the four pads
   * @param {{onPress:(lane:number)=>void, onRelease:(lane:number)=>void, onSwipeUp?:()=>void}} handlers
   * @param {HTMLElement} [swipeArea]  extra area (the game view) where a swipe up also counts
   */
  constructor(padArea, { onPress, onRelease, onSwipeUp = () => {} }, swipeArea = null) {
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.onSwipeUp = onSwipeUp;
    this.swipeStart = new Map(); // pointerId -> { y, time, done }
    this.downCount = [0, 0, 0, 0];
    this.pointerLane = new Map(); // pointerId -> lane
    this.keyLane = new Map();     // key code -> lane
    this.enabled = false;

    const laneFromEvent = (e) => {
      const r = padArea.getBoundingClientRect();
      return Math.min(3, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 4)));
    };

    padArea.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      padArea.setPointerCapture?.(e.pointerId);
      const lane = laneFromEvent(e);
      this.pointerLane.set(e.pointerId, lane);
      this.trackSwipe(e);
      this.down(lane);
    });
    padArea.addEventListener('pointermove', (e) => this.checkSwipe(e));
    if (swipeArea) {
      swipeArea.addEventListener('pointerdown', (e) => { if (this.enabled) this.trackSwipe(e); });
      swipeArea.addEventListener('pointermove', (e) => this.checkSwipe(e));
    }
    const end = (e) => {
      this.swipeStart.delete(e.pointerId);
      const lane = this.pointerLane.get(e.pointerId);
      if (lane === undefined) return;
      this.pointerLane.delete(e.pointerId);
      this.up(lane);
    };
    padArea.addEventListener('pointerup', end);
    padArea.addEventListener('pointercancel', end);
    padArea.addEventListener('lostpointercapture', end);

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.repeat) return;
      if (e.code === 'Space') { e.preventDefault(); this.onSwipeUp(); return; }
      const lane = LANES.findIndex((l) => l.keys.includes(e.code));
      if (lane < 0) return;
      e.preventDefault();
      this.keyLane.set(e.code, lane);
      this.down(lane);
    });
    window.addEventListener('keyup', (e) => {
      const lane = this.keyLane.get(e.code);
      if (lane === undefined) return;
      this.keyLane.delete(e.code);
      this.up(lane);
    });
  }

  trackSwipe(e) {
    this.swipeStart.set(e.pointerId, { y: e.clientY, time: eventTime(e), done: false });
  }

  checkSwipe(e) {
    const s = this.swipeStart.get(e.pointerId);
    if (!s || s.done || !this.enabled) return;
    if (eventTime(e) - s.time > SWIPE_MS) return;
    if (s.y - e.clientY >= SWIPE_PX) {
      s.done = true; // one swipe per finger
      this.onSwipeUp();
    }
  }

  down(lane) {
    this.downCount[lane]++;
    if (this.downCount[lane] === 1) this.onPress(lane);
  }

  up(lane) {
    if (this.downCount[lane] === 0) return;
    this.downCount[lane]--;
    if (this.downCount[lane] === 0) this.onRelease(lane);
  }

  isHeld(lane) { return this.downCount[lane] > 0; }

  /** Forget everything that's held (used on pause/quit). */
  reset() {
    this.downCount.fill(0);
    this.pointerLane.clear();
    this.keyLane.clear();
    this.swipeStart.clear();
  }
}

/**
 * When the touch really happened (the event's own timestamp), not when the
 * game got round to handling it: if the phone is busy for a moment, a quick
 * swipe still counts as quick.
 */
function eventTime(e) {
  return e.timeStamp > 0 ? e.timeStamp : performance.now();
}
