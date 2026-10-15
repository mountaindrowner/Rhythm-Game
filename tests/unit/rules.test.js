// Unit tests for the referee (src/game/rules.js). Run with:  npm test
// Each test builds a tiny chart by hand and checks the rules' decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Performance } from '../../src/game/rules.js';
import { LEAD, ENERGY } from '../../src/config.js';

const note = (time, lane, hold = 0) => ({ time: LEAD + time, lane, hold, hit: false, miss: false, done: false });

test('a tap right on time is PERFECT and scores 300 + combo bonus', () => {
  const p = new Performance([note(1, 0)]);
  const e = p.press(0, LEAD + 1.01);
  assert.equal(e.type, 'hit');
  assert.equal(e.grade, 'perfect');
  assert.equal(p.score, 302); // 300 + min(200, combo 1 × 2)
  assert.equal(p.combo, 1);
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
  assert.equal(p.score, scoreAfterHead + 150);
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
  // The tap arrives 80 ms late, but the player set a +80 ms offset.
  const e = p.press(0, LEAD + 1.08, -0.08);
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
