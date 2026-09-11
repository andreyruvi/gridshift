import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, DIRECTION } from '../src/engine/game.js';
import { seededRandom } from '../src/engine/rng.js';
import { boardFrom, toRows } from './helpers.js';

const E = 0;

test('a fresh game has nothing to undo', () => {
  const game = new Game({ random: seededRandom('u1') });
  assert.ok(!game.canUndo);
  assert.ok(!game.undo());
});

test('undo restores the board, the score and the move count', () => {
  const game = boardFrom([
    [2, 2, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const before = toRows(game);
  game.move(DIRECTION.left);
  assert.equal(game.score, 4);
  assert.equal(game.moves, 1);

  assert.ok(game.undo());
  assert.deepEqual(toRows(game), before);
  assert.equal(game.score, 0);
  assert.equal(game.moves, 0);
  assert.ok(!game.canUndo);
});

test('a rejected move does not become an undo step', () => {
  const game = boardFrom([
    [2, 4, 8, 16],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  game.move(DIRECTION.left);
  assert.ok(!game.canUndo);
});

test('undo can walk back several moves', () => {
  const game = new Game({ random: seededRandom('walk') });
  const boards = [toRows(game)];
  const order = [DIRECTION.left, DIRECTION.up, DIRECTION.right, DIRECTION.down, DIRECTION.left];
  for (const direction of order) {
    if (game.move(direction).moved) boards.push(toRows(game));
  }
  while (boards.length > 1) {
    boards.pop();
    assert.ok(game.undo());
    assert.deepEqual(toRows(game), boards[boards.length - 1]);
  }
});

test('the history is bounded by maxUndo', () => {
  const game = new Game({ random: seededRandom('bound'), maxUndo: 3 });
  let applied = 0;
  const order = [DIRECTION.left, DIRECTION.up, DIRECTION.right, DIRECTION.down];
  for (let i = 0; i < 40 && applied < 10; i += 1) {
    if (game.move(order[i % 4]).moved) applied += 1;
  }
  assert.ok(applied >= 4, 'enough moves landed to overflow the history');
  assert.equal(game.history.length, 3);
});

test('undo can be disabled', () => {
  const game = boardFrom([
    [2, 2, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ], { maxUndo: 0 });
  game.move(DIRECTION.left);
  assert.ok(!game.canUndo);
});

test('undoing past a game over puts the game back in play', () => {
  const game = boardFrom([
    [E, 2, 32, 128],
    [64, 128, 4, 8],
    [32, 8, 2, 128],
    [8, 4, 64, 16],
  ], { random: () => 0.999, fourChance: 0 });
  game.move(DIRECTION.left);
  assert.ok(game.over);
  game.undo();
  assert.ok(!game.over);
  assert.ok(game.movesAvailable());
});

test('the same seed replays to the same board', () => {
  const order = [DIRECTION.left, DIRECTION.up, DIRECTION.right, DIRECTION.down];
  const play = () => {
    const game = new Game({ random: seededRandom('replay-me') });
    for (let i = 0; i < 120; i += 1) game.move(order[i % 4]);
    return { rows: toRows(game), score: game.score, moves: game.moves, over: game.over };
  };
  assert.deepEqual(play(), play());
});

test('different seeds diverge', () => {
  const order = [DIRECTION.left, DIRECTION.up, DIRECTION.right, DIRECTION.down];
  const play = (seed) => {
    const game = new Game({ random: seededRandom(seed) });
    for (let i = 0; i < 60; i += 1) game.move(order[i % 4]);
    return JSON.stringify(toRows(game));
  };
  assert.notEqual(play('seed-a'), play('seed-b'));
});

test('a game survives a serialisation round trip', () => {
  const game = new Game({ size: 5, winTarget: 1024, random: seededRandom('save') });
  for (let i = 0; i < 30; i += 1) game.move(i % 4);
  const restored = Game.fromJSON(JSON.parse(JSON.stringify(game.toJSON())), { random: seededRandom('save') });
  assert.equal(restored.size, 5);
  assert.equal(restored.winTarget, 1024);
  assert.equal(restored.score, game.score);
  assert.equal(restored.moves, game.moves);
  assert.deepEqual(toRows(restored), toRows(game));
});

test('a restored game continues to play', () => {
  const game = new Game({ random: seededRandom('resume') });
  for (let i = 0; i < 20; i += 1) game.move(i % 4);
  const restored = Game.fromJSON(game.toJSON(), { random: seededRandom('x') });
  const result = restored.move(DIRECTION.left);
  assert.equal(typeof result.moved, 'boolean');
  assert.ok(restored.grid.tiles().length > 0);
});
