// Unit tests for the referee (src/game/rules.js). Run with:  npm test
// Each test builds a tiny chart by hand and checks the rules' decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Performance, multiplierFor, perfectScore, starsFor } from '../../src/game/rules.js';
import { LEAD, ENERGY } from '../../src/config.js';

const note = (time, lane, hold = 0) => ({ time: LEAD + time, lane, hold, hit: false, miss: false, done: false });

test('a tap right on time is PERFECT and scores 100 × the multiplier', () => {
  const p = new Performance([note(1, 0)]);
  const e = p.press(0, LEAD + 1.01);
  assert.equal(e.type, 'hit');
  assert.equal(e.grade, 'perfect');
  assert.equal(e.timing, '');   // PERFECT hits don't say early or late
  assert.equal(p.score, 100);   // 100 × ×1
  assert.equal(p.combo, 1);
});

test('the multiplier climbs ×1 → ×4 every 10 hits in a row, and a miss resets it', () => {
  assert.deepEqual([0, 9, 10, 19, 20, 30, 99].map(multiplierFor), [1, 1, 2, 2, 3, 4, 4]);
  const notes = Array.from({ length: 12 }, (_, i) => note(1 + i * 0.5, 0));
  const p = new Performance(notes);
  for (let i = 0; i < 11; i++) p.press(0, LEAD + 1 + i * 0.5);
  assert.equal(p.multiplier, 2);
  // hits 1-9 at ×1, hit 10 at ×2 (the streak reaches 10), hit 11 at ×2
  assert.equal(p.score, 9 * 100 + 2 * 200);
  p.update(LEAD + 1 + 11 * 0.5 + 0.3); // the 12th note goes by: a miss
  assert.equal(p.multiplier, 1);
});

test('GREAT and GOOD hits say whether they were EARLY or LATE', () => {
  const p = new Performance([note(1, 0), note(2, 0)]);
  assert.equal(p.press(0, LEAD + 1 - 0.07).timing, 'early');
  assert.equal(p.press(0, LEAD + 2 + 0.07).timing, 'late');
  assert.equal(p.early, 1);
  assert.equal(p.late, 1);
});

test('consistently late taps show up as a typical offset (for the timing tip)', () => {
  const notes = Array.from({ length: 30 }, (_, i) => note(1 + i * 0.5, i % 4));
  const p = new Performance(notes);
  notes.forEach((n) => p.press(n.lane, n.time + 0.04));
  assert.ok(Math.abs(p.typicalOffset - 0.04) < 0.001);
});

test('stars come from the share of a perfect run; gold needs an Expert full combo', () => {
  const notes = Array.from({ length: 40 }, (_, i) => note(1 + i * 0.5, 0));
  const best = perfectScore(notes);
  // notes 1-9 at ×1, 10-19 at ×2, 20-29 at ×3, 30-40 at ×4
  assert.equal(best, 9 * 100 + 10 * 200 + 10 * 300 + 11 * 400);
  assert.equal(starsFor(0, best).stars, 0);
  assert.equal(starsFor(best * 0.5, best).stars, 3);
  assert.equal(starsFor(best, best).stars, 5);
  assert.equal(starsFor(best, best, { expert: false, fullCombo: true }).gold, false);
  assert.equal(starsFor(best, best, { expert: true, fullCombo: true }).gold, true);
});

test('timing windows: 60 ms = GREAT, 120 ms = GOOD, 200 ms = no hit', () => {
  const p = new Performance([note(1, 0), note(2, 1), note(3, 2)]);
  assert.equal(p.press(0, LEAD + 1.06).grade, 'great');
  assert.equal(p.press(1, LEAD + 2 - 0.12).grade, 'good');
  assert.equal(p.press(2, LEAD + 3.2).type, 'mistake'); // too far: wrong note
});

test('pressing the wrong lane does not hit the note', () => {
  const p = new Performance([note(1, 0)]);
  const e = p.press(3, LEAD + 1);
  assert.equal(e.type, 'mistake');
  assert.equal(e.kind, 'wrong');
  assert.equal(p.notes[0].hit, false);
});

test('a note that passes the line is a MISS and breaks the combo', () => {
  const p = new Performance([note(1, 0), note(2, 0)]);
  p.press(0, LEAD + 1);
  assert.equal(p.combo, 1);
  const events = p.update(LEAD + 2.2);
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'miss');
  assert.equal(p.combo, 0);
  assert.equal(p.counts.miss, 1);
});

test('energy: a miss costs exactly ENERGY.miss', () => {
  const p = new Performance([note(1, 0)]);
  p.update(LEAD + 1.5);
  assert.equal(p.energy, ENERGY.start + ENERGY.miss);
});

test('taps during the count-in are free practice', () => {
  const p = new Performance([note(5, 0)]);
  const e = p.press(0, 0.5);
  assert.equal(e.type, 'press');
  assert.equal(p.counts.wrong, 0);
});

test('hold notes: holding to the end earns the bonus', () => {
  const p = new Performance([note(1, 1, 1.0)]);
  p.press(1, LEAD + 1);
  const scoreAfterHead = p.score;
  const events = p.update(LEAD + 2);
  assert.equal(events[0].type, 'holdComplete');
  assert.equal(p.score, scoreAfterHead + 50); // hold bonus 50 × ×1
});

test('hold notes: letting go early is HOLD LOST', () => {
  const p = new Performance([note(1, 1, 1.0)]);
  p.press(1, LEAD + 1);
  const e = p.release(1, LEAD + 1.3);
  assert.equal(e.kind, 'holdLost');
  assert.equal(p.combo, 0);
});

test('calibration offset shifts judging', () => {
  const p = new Performance([note(1, 0)]);
  // The tap arrives 80 ms late, and the player calibrated a +80 ms offset.
  const e = p.press(0, LEAD + 1.08, 0.08);
  assert.equal(e.grade, 'perfect');
});

test('every 25th hit in a row is a combo milestone', () => {
  const notes = Array.from({ length: 25 }, (_, i) => note(1 + i * 0.5, i % 4));
  const p = new Performance(notes);
  let last;
  notes.forEach((n) => { last = p.press(n.lane, n.time); });
  assert.equal(p.combo, 25);
  assert.equal(last.milestone, true);
});

test('energy can run out: failed becomes true at 0', () => {
  const notes = Array.from({ length: 40 }, (_, i) => note(1 + i * 0.3, 0));
  const p = new Performance(notes);
  assert.equal(p.failed, false);
  p.update(LEAD + 20);
  assert.equal(p.energy, 0);
  assert.equal(p.failed, true);
});

test('easier difficulties drain less energy per miss', () => {
  const p = new Performance([note(1, 0)], { drain: 0.5 });
  p.update(LEAD + 1.5);
  assert.equal(p.energy, ENERGY.start + ENERGY.miss * 0.5);
});

// ---- Riot Mode ---------------------------------------------------------------
const gold = (time, lane, id) => ({ ...note(time, lane), riot: id });

test('playing every note of a gold phrase fills a quarter of the Riot meter', () => {
  const p = new Performance([gold(1, 0, 1), gold(1.5, 1, 1), gold(2, 2, 1)]);
  p.press(0, LEAD + 1);
  p.press(1, LEAD + 1.5);
  assert.equal(p.riotMeter, 0);
  const e = p.press(2, LEAD + 2);
  assert.equal(e.riotPhrase, true);
  assert.equal(p.riotMeter, 0.25);
});

test('missing a gold note loses that phrase', () => {
  const p = new Performance([gold(1, 0, 1), gold(2, 1, 1)]);
  p.update(LEAD + 1.3); // first gold note goes by
  p.press(1, LEAD + 2);
  assert.equal(p.riotMeter, 0);
});

test('Riot Mode: needs half a meter, doubles the multiplier, rescues energy, forgives misses, then ends', () => {
  const notes = [note(1, 0), note(2, 0), note(3, 0)];
  const p = new Performance(notes, { beatLength: 0.5 });
  p.riotMeter = 0.25;
  assert.equal(p.activateRiot(LEAD), null); // not enough yet
  p.riotMeter = 0.5;
  p.energy = 5;
  assert.equal(p.activateRiot(LEAD).type, 'riotStart');
  assert.equal(p.energy, 35);               // +30 rescue
  p.press(0, LEAD + 1);
  assert.equal(p.multiplier, 2);            // ×1 streak × 2 Riot
  assert.equal(p.score, 200);
  p.update(LEAD + 2.3);                     // a miss during Riot...
  assert.equal(p.energy, 35 + ENERGY.perfect); // ...costs no energy
  // Half a meter lasts 16 beats = 8 s at 0.5 s per beat.
  const ended = p.update(LEAD + 8.1).find((e) => e.type === 'riotEnd');
  assert.ok(ended);
  assert.equal(p.riotActive, false);
  assert.equal(p.multiplier, 1);
});

test('a swipe that starts on an empty pad gets its wrong-note penalty back', () => {
  const p = new Performance([note(5, 0)]);
  p.riotMeter = 1;
  const before = p.energy;
  p.press(2, LEAD + 1);                     // the swipe's first touch: a wrong note
  assert.equal(p.counts.wrong, 1);
  p.activateRiot(LEAD + 1.2);
  assert.equal(p.counts.wrong, 0);
  assert.equal(p.energy, Math.min(100, before + 30));
});
