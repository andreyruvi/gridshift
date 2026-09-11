import { Grid } from './grid.js';

/** Direction indices, kept compatible with the original 0=up..3=left order. */
export const DIRECTION = Object.freeze({ up: 0, right: 1, down: 2, left: 3 });

const VECTORS = Object.freeze({
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
});

export const MIN_SIZE = 3;
export const MAX_SIZE = 8;

/**
 * Rules engine.
 *
 * Differences from the upstream `GameManager` that matter:
 *  - it constructs no input manager, actuator or storage, so it runs headless
 *    under `node --test`;
 *  - randomness is injected, so a game is reproducible from a seed;
 *  - board size and win target are parameters rather than constants;
 *  - every tile carries a stable id, letting a renderer animate a tile across
 *    moves instead of rebuilding the board each frame;
 *  - `move()` reports what happened rather than pushing to a view;
 *  - snapshots make undo possible.
 */
export class Game {
  constructor(options = {}) {
    const {
      size = 4,
      winTarget = 2048,
      startTiles = 2,
      random = Math.random,
      fourChance = 0.1,
      maxUndo = 16,
    } = options;

    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
      throw new RangeError(`Board size must be a whole number from ${MIN_SIZE} to ${MAX_SIZE}, got ${size}`);
    }
    if (!Number.isInteger(winTarget) || winTarget < 8 || (winTarget & (winTarget - 1)) !== 0) {
      throw new RangeError(`Win target must be a power of two of at least 8, got ${winTarget}`);
    }
    if (typeof random !== 'function') {
      throw new TypeError('random must be a function returning a number in [0, 1)');
    }

    this.size = size;
    this.winTarget = winTarget;
    this.startTiles = startTiles;
    this.random = random;
    this.fourChance = fourChance;
    this.maxUndo = maxUndo;
    this.nextTileId = 1;
    this.history = [];

    this.reset();
  }

  reset() {
    this.grid = new Grid(this.size);
    this.score = 0;
    this.moves = 0;
    this.merges = 0;
    this.largestTile = 0;
    this.over = false;
    this.won = false;
    this.keepPlaying = false;
    this.history = [];
    this.nextTileId = 1;
    for (let i = 0; i < this.startTiles; i += 1) this.spawnTile();
    return this;
  }

  createTile(position, value) {
    return {
      id: this.nextTileId++,
      x: position.x,
      y: position.y,
      value,
      previousPosition: null,
      mergedFrom: null,
      spawned: false,
    };
  }

  spawnTile() {
    const cell = this.grid.randomAvailableCell(this.random);
    if (!cell) return null;
    const value = this.random() < this.fourChance ? 4 : 2;
    const tile = this.createTile(cell, value);
    tile.spawned = true;
    this.grid.insertTile(tile);
    if (value > this.largestTile) this.largestTile = value;
    return tile;
  }

  isTerminated() {
    return this.over || (this.won && !this.keepPlaying);
  }

  /** Dismiss the win banner and carry on playing past the target. */
  continueAfterWin() {
    this.keepPlaying = true;
    return this;
  }

  prepareTiles() {
    this.grid.forEachCell((_x, _y, tile) => {
      if (tile) {
        tile.mergedFrom = null;
        tile.spawned = false;
        tile.previousPosition = { x: tile.x, y: tile.y };
      }
    });
  }

  moveTile(tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.x = cell.x;
    tile.y = cell.y;
  }

  farthestPosition(cell, vector) {
    let previous;
    let current = cell;
    do {
      previous = current;
      current = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(current) && this.grid.cellAvailable(current));
    return { farthest: previous, next: current };
  }

  buildTraversals(vector) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < this.size; i += 1) {
      xs.push(i);
      ys.push(i);
    }
    if (vector.x === 1) xs.reverse();
    if (vector.y === 1) ys.reverse();
    return { x: xs, y: ys };
  }

  /**
   * Attempt a move.
   * @returns {{moved:boolean,gained:number,merges:number,spawned:object|null,
   *            won:boolean,over:boolean,reachedTarget:boolean}}
   */
  move(direction) {
    const result = {
      moved: false, gained: 0, merges: 0, spawned: null,
      won: this.won, over: this.over, reachedTarget: false,
    };
    if (this.isTerminated()) return result;

    const vector = VECTORS[direction];
    if (!vector) throw new RangeError(`Unknown direction ${direction}`);

    const snapshot = this.snapshot();
    const traversals = this.buildTraversals(vector);
    this.prepareTiles();

    for (const x of traversals.x) {
      for (const y of traversals.y) {
        const cell = { x, y };
        const tile = this.grid.cellContent(cell);
        if (!tile) continue;

        const positions = this.farthestPosition(cell, vector);
        const next = this.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          // One merge per tile per move: `mergedFrom` marks the result so a
          // third equal tile sliding in behind it cannot merge again.
          const merged = this.createTile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];
          merged.previousPosition = { x: tile.x, y: tile.y };

          this.grid.insertTile(merged);
          this.grid.removeTile(tile);
          tile.x = positions.next.x;
          tile.y = positions.next.y;

          this.score += merged.value;
          result.gained += merged.value;
          result.merges += 1;
          if (merged.value > this.largestTile) this.largestTile = merged.value;
          if (merged.value >= this.winTarget && !this.won) {
            this.won = true;
            result.reachedTarget = true;
          }
        } else {
          this.moveTile(tile, positions.farthest);
        }

        if (tile.x !== cell.x || tile.y !== cell.y) result.moved = true;
      }
    }

    if (!result.moved) return result;

    this.pushHistory(snapshot);
    this.moves += 1;
    this.merges += result.merges;
    result.spawned = this.spawnTile();
    if (!this.movesAvailable()) this.over = true;

    result.won = this.won;
    result.over = this.over;
    return result;
  }

  movesAvailable() {
    return this.grid.hasAvailableCells() || this.matchesAvailable();
  }

  matchesAvailable() {
    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        const tile = this.grid.cellContent({ x, y });
        if (!tile) continue;
        // Only right and down need checking; left and up are their mirrors.
        for (const vector of [VECTORS[DIRECTION.right], VECTORS[DIRECTION.down]]) {
          const other = this.grid.cellContent({ x: x + vector.x, y: y + vector.y });
          if (other && other.value === tile.value) return true;
        }
      }
    }
    return false;
  }

  // ---- history -----------------------------------------------------------

  snapshot() {
    return {
      values: this.grid.toValues(),
      score: this.score,
      moves: this.moves,
      merges: this.merges,
      largestTile: this.largestTile,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying,
    };
  }

  pushHistory(snapshot) {
    if (this.maxUndo <= 0) return;
    this.history.push(snapshot);
    if (this.history.length > this.maxUndo) this.history.shift();
  }

  get canUndo() {
    return this.history.length > 0;
  }

  /** Step back one move. Returns true if a step was taken. */
  undo() {
    const snapshot = this.history.pop();
    if (!snapshot) return false;
    this.restore(snapshot);
    return true;
  }

  restore(snapshot) {
    this.grid = new Grid(this.size);
    snapshot.values.forEach((column, x) => {
      column.forEach((value, y) => {
        if (value) this.grid.insertTile(this.createTile({ x, y }, value));
      });
    });
    this.score = snapshot.score;
    this.moves = snapshot.moves;
    this.merges = snapshot.merges;
    this.largestTile = snapshot.largestTile;
    this.over = snapshot.over;
    this.won = snapshot.won;
    this.keepPlaying = snapshot.keepPlaying;
  }

  // ---- serialisation -----------------------------------------------------

  toJSON() {
    return { version: 1, size: this.size, winTarget: this.winTarget, ...this.snapshot() };
  }

  static fromJSON(data, options = {}) {
    const game = new Game({ ...options, size: data.size, winTarget: data.winTarget, startTiles: 0 });
    game.restore(data);
    return game;
  }
}
