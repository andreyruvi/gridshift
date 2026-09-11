import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStats, normaliseStats, recordGame, bestScoreFor, bestTileFor, winRate, averageScore,
} from '../src/stats.js';
import { createStorage } from '../src/ui/storage.js';

test('an empty record has no games and a zero win rate', () => {
  const stats = emptyStats();
  assert.equal(stats.games, 0);
  assert.equal(winRate(stats), 0);
  assert.equal(averageScore(stats), 0);
});

test('a finished game is folded in', () => {
  let stats = emptyStats();
  stats = recordGame(stats, { size: 4, score: 1200, moves: 90, largestTile: 256, won: false });
  assert.equal(stats.games, 1);
  assert.equal(stats.wins, 0);
  assert.equal(bestScoreFor(stats, 4), 1200);
  assert.equal(bestTileFor(stats, 4), 256);
  assert.equal(averageScore(stats), 1200);
});

test('bests are kept per board size', () => {
  let stats = emptyStats();
  stats = recordGame(stats, { size: 4, score: 5000, largestTile: 512 });
  stats = recordGame(stats, { size: 6, score: 900, largestTile: 64 });
  assert.equal(bestScoreFor(stats, 4), 5000);
  assert.equal(bestScoreFor(stats, 6), 900);
  assert.equal(bestScoreFor(stats, 5), 0);
});

test('a best is never lowered by a worse game', () => {
  let stats = recordGame(emptyStats(), { size: 4, score: 5000, largestTile: 512 });
  stats = recordGame(stats, { size: 4, score: 10, largestTile: 4 });
  assert.equal(bestScoreFor(stats, 4), 5000);
  assert.equal(bestTileFor(stats, 4), 512);
  assert.equal(stats.games, 2);
});

test('win rate counts wins against games', () => {
  let stats = emptyStats();
  stats = recordGame(stats, { size: 4, won: true });
  stats = recordGame(stats, { size: 4, won: false });
  stats = recordGame(stats, { size: 4, won: true });
  assert.equal(winRate(stats), 2 / 3);
});

test('corrupt stored data is repaired, not trusted', () => {
  const junk = { games: -5, wins: 'many', bestScore: { 4: 'lots', nope: 3, 6: 12 }, extra: 'ignored' };
  const stats = normaliseStats(junk);
  assert.equal(stats.games, 0);
  assert.equal(stats.wins, 0);
  assert.equal(stats.bestScore['4'], undefined);
  assert.equal(stats.bestScore['6'], 12);
  assert.equal(stats.extra, undefined);
});

test('an invalid board size is rejected', () => {
  assert.throws(() => recordGame(emptyStats(), { size: 0 }), RangeError);
});

test('storage round-trips values', () => {
  const map = new Map();
  const fake = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
  const store = createStorage('test', fake);
  assert.ok(store.persistent);
  store.write('stats', { games: 3 });
  assert.deepEqual(store.read('stats'), { games: 3 });
  store.remove('stats');
  assert.equal(store.read('stats', 'gone'), 'gone');
});

test('storage that throws falls back to memory instead of crashing', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const store = createStorage('test', hostile);
  assert.ok(!store.persistent);
  assert.equal(store.write('a', 1), true);
  assert.equal(store.read('a'), 1);
});

test('unparseable stored text returns the fallback', () => {
  const fake = { getItem: () => '{not json', setItem() {}, removeItem() {} };
  const store = createStorage('test', fake);
  assert.equal(store.read('stats', 'fallback'), 'fallback');
});
