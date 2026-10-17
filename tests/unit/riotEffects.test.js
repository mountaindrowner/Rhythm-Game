// Unit tests for the library of Riot Mode effects (src/world/riotEffects.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIOT_EFFECTS, pickRiotEffect, riotEffect } from '../../src/world/riotEffects.js';

test('every effect has an id, a name for the sign, a look and three colours', () => {
  const ids = new Set();
  for (const e of RIOT_EFFECTS) {
    assert.ok(e.id && !ids.has(e.id), `unique id ${e.id}`);
    ids.add(e.id);
    assert.ok(e.name.length > 0 && e.name.length <= 18, `${e.id}: a short name for the sign`);
    assert.ok(['riot', 'normal'].includes(e.look));
    assert.equal(e.colors.length, 3);
  }
  assert.ok(RIOT_EFFECTS.length >= 6, 'a real library');
});

test('the random pick never repeats the last effect, and every effect comes up', () => {
  const seen = new Set();
  let last = null;
  for (let i = 0; i < 500; i++) {
    const e = pickRiotEffect(last?.id);
    assert.notEqual(e.id, last?.id);
    seen.add(e.id);
    last = e;
  }
  assert.equal(seen.size, RIOT_EFFECTS.length);
});

test('looking up an unknown effect gives the classic', () => {
  assert.equal(riotEffect('nope').id, 'inferno');
  assert.equal(riotEffect('glory').id, 'glory');
});
