import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/engine/grid.js';

test('a new grid is empty and square', () => {
  const grid = new Grid(5);
  assert.equal(grid.size, 5);
  assert.equal(grid.availableCells().length, 25);
  assert.equal(grid.tiles().length, 0);
  assert.ok(grid.hasAvailableCells());
});

test('bounds checking rejects cells outside the board', () => {
  const grid = new Grid(4);
  assert.ok(grid.withinBounds({ x: 0, y: 0 }));
  assert.ok(grid.withinBounds({ x: 3, y: 3 }));
  assert.ok(!grid.withinBounds({ x: -1, y: 0 }));
  assert.ok(!grid.withinBounds({ x: 4, y: 0 }));
  assert.equal(grid.cellContent({ x: 9, y: 9 }), null);
});

test('tiles can be inserted and removed', () => {
  const grid = new Grid(3);
  const tile = { x: 1, y: 2, value: 8 };
  grid.insertTile(tile);
  assert.equal(grid.cellContent({ x: 1, y: 2 }), tile);
  assert.ok(!grid.cellAvailable({ x: 1, y: 2 }));
  assert.equal(grid.availableCells().length, 8);
  grid.removeTile(tile);
  assert.equal(grid.availableCells().length, 9);
});

test('randomAvailableCell uses the injected generator', () => {
  const grid = new Grid(3);
  assert.deepEqual(grid.randomAvailableCell(() => 0), { x: 0, y: 0 });
  assert.deepEqual(grid.randomAvailableCell(() => 0.999), { x: 2, y: 2 });
});

test('randomAvailableCell returns undefined on a full board', () => {
  const grid = new Grid(2);
  grid.forEachCell((x, y) => grid.insertTile({ x, y, value: 2 }));
  assert.equal(grid.randomAvailableCell(() => 0), undefined);
  assert.ok(!grid.hasAvailableCells());
});

test('toValues renders empty cells as zero', () => {
  const grid = new Grid(2);
  grid.insertTile({ x: 0, y: 1, value: 16 });
  assert.deepEqual(grid.toValues(), [[0, 16], [0, 0]]);
});
