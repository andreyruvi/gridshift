import { Game } from '../src/engine/game.js';

/** Cells are stored [x][y]; tests are easier to read as rows, so transpose. */
export function toRows(game) {
  const values = game.grid.toValues();
  return values[0].map((_, y) => values.map((column) => column[y]));
}

export function rowsToValues(rows) {
  return rows[0].map((_, x) => rows.map((row) => row[x]));
}

/**
 * Build a game from a literal board.
 * `random` defaults to a generator that always picks the last free cell and
 * never rolls a 4, so the tile spawned after a move is fully predictable.
 */
export function boardFrom(rows, options = {}) {
  const game = new Game({
    size: rows.length,
    startTiles: 0,
    random: () => 0.999,
    ...options,
  });
  game.restore({
    values: rowsToValues(rows),
    score: 0, moves: 0, merges: 0, largestTile: 0,
    over: false, won: false, keepPlaying: false,
  });
  return game;
}
