// =============================================================================
// input.js — turns fingers and keys into "lane pressed / lane released".
//
// Touch: the whole pad strip at the bottom is one big touch area split into
// four equal columns, so a thumb that lands a bit off-center still counts.
// Several fingers can be down at once (for chords).
//
// Improvement over the original: we COUNT how many fingers/keys hold each
// lane, so lifting one of two fingers on the same pad doesn't end a hold.
// =============================================================================
import { LANES } from '../config.js';

export class Input {
  /**
   * @param {HTMLElement} padArea  element covering the four pads
   * @param {{onPress:(lane:number)=>void, onRelease:(lane:number)=>void}} handlers
   */
  constructor(padArea, { onPress, onRelease }) {
    this.onPress = onPress;
    this.onRelease = onRelease;
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
      this.down(lane);
    });
    const end = (e) => {
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
  }
}
