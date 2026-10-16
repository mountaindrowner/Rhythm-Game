// Unit tests for the band's choreographer (src/world/animBlocks.js).
// They feed it a made-up animation library and step through the beats,
// checking the smoothness rules: grooves change only on bar lines, mistakes
// start instantly and end where a loop restarts, accents wait their turn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDirector, hasBlocks } from '../../src/world/animBlocks.js';

const anim = (row, block, extra = {}) => ({ row, frames: 15, block, ...extra });
const library = (withSing = false) => ({
  anims: {
    hub: { row: 0, frames: 1 },
    idle: anim(1, 'idle', { loop: true, beats: 4 }),
    calm: anim(2, 'groove', { energy: 'calm', loop: true, beats: 2 }),
    hype: anim(3, 'groove', { energy: 'hype', loop: true, beats: 2 }),
    step: anim(4, 'groove', { energy: 'any', loop: true, beats: 2 }),
    accent: anim(5, 'accent', { beats: 4 }),
    mistake_a: anim(6, 'mistake', { beats: 2 }),
    mistake_b: anim(7, 'mistake', { beats: 2 }),
    celebrate: anim(8, 'celebrate', { beats: 4 }),
    bow: anim(9, 'bow', { beats: 4 }),
    ...(withSing ? { sing: anim(10, 'sing', { loop: true, beats: 2 }) } : {}),
  },
});
const ctx = (over = {}) => ({ live: true, energy: 'calm', section: 'VERSE 1', defeated: false, ...over });

/** Step a director from beat `from` to `to`, returning every frame's pick. */
function run(d, from, to, c = ctx(), step = 0.05) {
  const out = [];
  for (let b = from; b < to; b += step) out.push({ beat: b, ...d.update(b, c) });
  return out;
}

test('only sets with blocks get a choreographer', () => {
  assert.equal(hasBlocks(library()), true);
  assert.equal(hasBlocks({ anims: { idle: { row: 0, frames: 1 }, play: { row: 1, frames: 8 } } }), false);
});

test('menus show the idle loop', () => {
  const d = createDirector(library(), 'bassist', 1);
  const picks = run(d, 0, 12, ctx({ live: false }));
  assert.ok(picks.every((p) => p.anim === 'idle'));
});

test('verses use calm grooves, choruses use hype grooves', () => {
  const d = createDirector(library(), 'bassist', 1);
  const calm = new Set(run(d, 0, 64).map((p) => p.anim));
  assert.ok(!calm.has('hype'));
  assert.ok(calm.has('calm'));
  const d2 = createDirector(library(), 'bassist', 1);
  const hype = new Set(run(d2, 0, 64, ctx({ energy: 'hype', section: 'CHORUS 1' })).map((p) => p.anim));
  assert.ok(!hype.has('calm'));
  assert.ok(hype.has('hype'));
});

test('grooves only change on bar lines, starting from the first frame', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const d = createDirector(library(), 'drummer', seed);
    const picks = run(d, 0, 200, ctx(), 0.01);
    let changes = 0;
    for (let i = 1; i < picks.length; i++) {
      if (picks[i].anim !== picks[i - 1].anim) {
        changes++;
        const bar = Math.round(picks[i].beat / 4) * 4;
        assert.ok(Math.abs(picks[i].beat - bar) < 0.02, `changed at beat ${picks[i].beat}`);
        assert.equal(picks[i].frame, 0);
      }
    }
    assert.ok(changes > 0, 'variations should appear over 50 bars');
  }
});

test('a mistake starts instantly and ends where a loop restarts', () => {
  const d = createDirector(library(), 'singer', 2);
  run(d, 0, 5.3);
  d.mistake();
  const now = d.update(5.3, ctx());
  assert.match(now.anim, /^mistake_/);
  // 5.3 + 1.25 = 6.55 -> the next 2-beat line is 8.
  assert.match(d.update(7.95, ctx()).anim, /^mistake_/);
  const after = d.update(8.0, ctx());
  assert.doesNotMatch(after.anim, /^mistake_/);
  assert.equal(after.frame, 0);
});

test('an accent waits for the current loop to finish, then plays 4 beats', () => {
  const d = createDirector(library(), 'bassist', 1);
  run(d, 0, 4.5);
  d.accent(true);
  assert.notEqual(d.update(4.6, ctx()).anim, 'accent');
  assert.equal(d.update(6.0, ctx()).anim, 'accent');
  assert.equal(d.update(9.9, ctx()).anim, 'accent');
  assert.notEqual(d.update(10.0, ctx()).anim, 'accent');
});

test('the finale cheers, then bows, even when the clock jumps', () => {
  const d = createDirector(library(), 'guitarist', 3);
  run(d, 300, 310);
  d.finale();
  const menu = ctx({ live: false });
  assert.equal(d.update(2, menu).anim, 'celebrate'); // clock jumped back to the menu clock
  assert.equal(d.update(6.5, menu).anim, 'bow');
  assert.equal(d.update(10.5, menu).anim, 'idle');
});

test('the guitarist sings lead when it is his song', () => {
  const d = createDirector(library(true), 'guitarist', 3);
  d.setVocalist('guitarist');
  const picks = run(d, 0, 32, ctx({ section: 'VERSE 1' }));
  assert.ok(picks.every((p) => p.anim === 'sing'));
  // ...but not in the intro, where nobody sings.
  const d2 = createDirector(library(true), 'guitarist', 3);
  d2.setVocalist('guitarist');
  assert.ok(run(d2, 0, 32, ctx({ section: 'OPENING' })).every((p) => p.anim !== 'sing'));
});

test('in her songs he does not sing (he has no mic)', () => {
  const d = createDirector(library(true), 'guitarist', 3);
  assert.ok(run(d, 0, 64, ctx({ section: 'VERSE 1' })).every((p) => p.anim !== 'sing'));
  const d2 = createDirector(library(true), 'guitarist', 3);
  assert.ok(run(d2, 0, 128, ctx({ energy: 'hype', section: 'CHORUS 1' })).every((p) => p.anim !== 'sing'));
});

test('in duets he trades lines and sings the choruses', () => {
  const d = createDirector(library(true), 'guitarist', 3);
  d.setVocalist('duet');
  assert.ok(run(d, 0, 128, ctx({ energy: 'hype', section: 'CHORUS 1' })).every((p) => p.anim === 'sing'));
});
