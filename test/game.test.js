import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, DIRECTION, MIN_SIZE, MAX_SIZE } from '../src/engine/game.js';
import { seededRandom } from '../src/engine/rng.js';
import { boardFrom, toRows } from './helpers.js';

const E = 0;

test('a new game starts with two tiles and no score', () => {
  const game = new Game({ random: seededRandom('start') });
  assert.equal(game.grid.tiles().length, 2);
  assert.equal(game.score, 0);
  assert.equal(game.moves, 0);
  assert.ok(!game.over);
  assert.ok(!game.won);
});

test('starting tiles are 2 or 4', () => {
  for (let seed = 0; seed < 50; seed += 1) {
    const game = new Game({ random: seededRandom(seed) });
    for (const tile of game.grid.tiles()) {
      assert.ok(tile.value === 2 || tile.value === 4, `unexpected start value ${tile.value}`);
    }
  }
});

test('board size is validated', () => {
  assert.throws(() => new Game({ size: MIN_SIZE - 1 }), RangeError);
  assert.throws(() => new Game({ size: MAX_SIZE + 1 }), RangeError);
  assert.throws(() => new Game({ size: 4.5 }), RangeError);
  for (let size = MIN_SIZE; size <= MAX_SIZE; size += 1) {
    assert.equal(new Game({ size, random: seededRandom(size) }).size, size);
  }
});

test('win target must be a power of two of at least 8', () => {
  assert.throws(() => new Game({ winTarget: 1000 }), RangeError);
  assert.throws(() => new Game({ winTarget: 4 }), RangeError);
  assert.equal(new Game({ winTarget: 512 }).winTarget, 512);
});

test('the random source must be a function', () => {
  assert.throws(() => new Game({ random: 0.5 }), TypeError);
});

test('tiles slide to the wall without merging', () => {
  const game = boardFrom([
    [E, E, E, 2],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const result = game.move(DIRECTION.left);
  assert.ok(result.moved);
  assert.equal(result.gained, 0);
  assert.equal(result.merges, 0);
  assert.deepEqual(toRows(game)[0], [2, E, E, E]);
});

test('two equal tiles merge and score their sum', () => {
  const game = boardFrom([
    [2, E, E, 2],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const result = game.move(DIRECTION.left);
  assert.equal(result.merges, 1);
  assert.equal(result.gained, 4);
  assert.equal(game.score, 4);
  assert.deepEqual(toRows(game)[0], [4, E, E, E]);
});

test('a row of four equal tiles produces exactly two merges, not a chain', () => {
  const game = boardFrom([
    [2, 2, 2, 2],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const result = game.move(DIRECTION.left);
  assert.equal(result.merges, 2);
  assert.equal(result.gained, 8);
  assert.deepEqual(toRows(game)[0], [4, 4, E, E]);
});

test('a merged tile cannot merge again in the same move', () => {
  const game = boardFrom([
    [4, 2, 2, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  game.move(DIRECTION.left);
  assert.deepEqual(toRows(game)[0], [4, 4, E, E]);
});

test('merging picks the pair nearest the wall', () => {
  const game = boardFrom([
    [2, 2, 4, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  game.move(DIRECTION.left);
  assert.deepEqual(toRows(game)[0], [4, 4, E, E]);
});

test('every direction moves the right way', () => {
  const cases = [
    [DIRECTION.left, [2, E, E, E]],
    [DIRECTION.right, [E, E, E, 2]],
  ];
  for (const [direction, expected] of cases) {
    const game = boardFrom([
      [E, 2, E, E],
      [E, E, E, E],
      [E, E, E, E],
      [E, E, E, E],
    ]);
    game.move(direction);
    assert.deepEqual(toRows(game)[0], expected, `direction ${direction}`);
  }

  const up = boardFrom([
    [E, E, E, E],
    [E, 2, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  up.move(DIRECTION.up);
  assert.equal(toRows(up)[0][1], 2);

  const down = boardFrom([
    [E, 2, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  down.move(DIRECTION.down);
  assert.equal(toRows(down)[3][1], 2);
});

test('a move that changes nothing is rejected and spawns no tile', () => {
  const game = boardFrom([
    [2, 4, 8, 16],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const before = toRows(game);
  const result = game.move(DIRECTION.left);
  assert.ok(!result.moved);
  assert.equal(result.spawned, null);
  assert.equal(game.moves, 0);
  assert.deepEqual(toRows(game), before);
});

test('a successful move spawns exactly one new tile', () => {
  const game = boardFrom([
    [2, 2, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const result = game.move(DIRECTION.left);
  assert.ok(result.spawned);
  assert.equal(game.grid.tiles().length, 2);
  assert.equal(game.moves, 1);
});

test('a moving tile keeps its identity', () => {
  const game = boardFrom([
    [E, E, E, 2],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const id = game.grid.cellContent({ x: 3, y: 0 }).id;
  game.move(DIRECTION.left);
  const moved = game.grid.cellContent({ x: 0, y: 0 });
  assert.equal(moved.id, id);
  assert.deepEqual(moved.previousPosition, { x: 3, y: 0 });
});

test('reaching the target wins, and play can continue past it', () => {
  const game = boardFrom([
    [1024, 1024, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  const result = game.move(DIRECTION.left);
  assert.ok(result.reachedTarget);
  assert.ok(game.won);
  assert.ok(game.isTerminated());
  assert.ok(!game.move(DIRECTION.right).moved, 'moves are refused while the win is unacknowledged');

  game.continueAfterWin();
  assert.ok(!game.isTerminated());
  assert.ok(game.move(DIRECTION.right).moved);
});

test('a custom win target is honoured', () => {
  const game = boardFrom([
    [64, 64, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ], { winTarget: 128 });
  assert.ok(game.move(DIRECTION.left).reachedTarget);
});

test('a full board with no equal neighbours is game over', () => {
  const game = boardFrom([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 8],
  ]);
  assert.ok(!game.movesAvailable());
  // Prime the state the way a real move would.
  game.over = !game.movesAvailable();
  assert.ok(game.isTerminated());
  assert.ok(!game.move(DIRECTION.left).moved);
});

test('a full board with an equal neighbour is not game over', () => {
  const game = boardFrom([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 4],
  ]);
  assert.ok(game.movesAvailable());
});

test('the game ends when the last move fills the board', () => {
  // The board below has no matching neighbours, one free cell, and stays
  // match-free after the slide and the tile that spawns behind it.
  const game = boardFrom([
    [E, 2, 32, 128],
    [64, 128, 4, 8],
    [32, 8, 2, 128],
    [8, 4, 64, 16],
  ], { random: () => 0.999, fourChance: 0 });
  assert.ok(game.movesAvailable(), 'a move exists before the last move');
  const result = game.move(DIRECTION.left);
  assert.ok(result.moved);
  assert.deepEqual(toRows(game)[0], [2, 32, 128, 2]);
  assert.ok(result.over, 'board is full and nothing matches');
  assert.ok(game.isTerminated());
});

test('largest tile is tracked', () => {
  const game = boardFrom([
    [128, 128, E, E],
    [E, E, E, E],
    [E, E, E, E],
    [E, E, E, E],
  ]);
  game.move(DIRECTION.left);
  assert.equal(game.largestTile, 256);
});
