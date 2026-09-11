import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashSeed, dailySeed, seededRandom } from '../src/engine/rng.js';

test('the same seed yields the same sequence', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const left = Array.from({ length: 200 }, () => a());
  const right = Array.from({ length: 200 }, () => b());
  assert.deepEqual(left, right);
});

test('different seeds diverge', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a(), b());
});

test('values stay inside [0, 1)', () => {
  const next = mulberry32(99);
  for (let i = 0; i < 5000; i += 1) {
    const v = next();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('the distribution is not obviously skewed', () => {
  const next = mulberry32(7);
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 100000; i += 1) buckets[Math.floor(next() * 10)] += 1;
  for (const count of buckets) {
    assert.ok(count > 9000 && count < 11000, `bucket out of tolerance: ${count}`);
  }
});

test('hashSeed is stable and case sensitive', () => {
  assert.equal(hashSeed('gridshift'), hashSeed('gridshift'));
  assert.notEqual(hashSeed('gridshift'), hashSeed('Gridshift'));
});

test('the daily seed depends only on the UTC date', () => {
  const morning = dailySeed(new Date('2026-09-11T00:00:01Z'));
  const evening = dailySeed(new Date('2026-09-11T23:59:59Z'));
  const tomorrow = dailySeed(new Date('2026-09-12T00:00:01Z'));
  assert.equal(morning.key, '2026-09-11');
  assert.deepEqual(morning, evening);
  assert.notEqual(morning.seed, tomorrow.seed);
});

test('seededRandom accepts strings and numbers', () => {
  assert.equal(seededRandom('abc')(), seededRandom('abc')());
  assert.equal(seededRandom(5)(), mulberry32(5)());
});
