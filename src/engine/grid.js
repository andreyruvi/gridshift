/**
 * The board. Pure data plus queries — it knows nothing about scoring, rules
 * or the DOM, which is what makes it testable in isolation.
 *
 * Cells are addressed [x][y] with the origin at the top-left, matching the
 * upstream convention so the move vectors read the same way.
 */
export class Grid {
  constructor(size, cells) {
    this.size = size;
    this.cells = cells ?? Grid.emptyCells(size);
  }

  static emptyCells(size) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
  }

  forEachCell(callback) {
    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        callback(x, y, this.cells[x][y]);
      }
    }
  }

  /** Every tile on the board, in column-major order. */
  tiles() {
    const found = [];
    this.forEachCell((_x, _y, tile) => {
      if (tile) found.push(tile);
    });
    return found;
  }

  availableCells() {
    const free = [];
    this.forEachCell((x, y, tile) => {
      if (!tile) free.push({ x, y });
    });
    return free;
  }

  hasAvailableCells() {
    return this.availableCells().length > 0;
  }

  /**
   * Pick a free cell using the injected generator.
   * Returns undefined when the board is full.
   */
  randomAvailableCell(random) {
    const free = this.availableCells();
    if (!free.length) return undefined;
    return free[Math.floor(random() * free.length)];
  }

  withinBounds({ x, y }) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  cellContent(cell) {
    return this.withinBounds(cell) ? this.cells[cell.x][cell.y] : null;
  }

  cellAvailable(cell) {
    return !this.cellContent(cell);
  }

  insertTile(tile) {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile) {
    this.cells[tile.x][tile.y] = null;
  }

  /** Board as a plain array-of-arrays of numbers, 0 for empty. */
  toValues() {
    return this.cells.map((column) => column.map((tile) => (tile ? tile.value : 0)));
  }
}
