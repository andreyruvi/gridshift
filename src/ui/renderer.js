/**
 * Board renderer.
 *
 * The upstream actuator rebuilt every tile element on every move and relied on
 * CSS classes named after grid coordinates (`tile-position-1-3`), which capped
 * the board at 4x4 and forced a full repaint each frame. Here each tile owns a
 * DOM node keyed by its stable id, position is two CSS custom properties, and
 * the board's cell size is published as `--cell` so a resize repositions every
 * tile without touching the DOM.
 */

const TRANSITION_MS = 120;

export class Renderer {
  constructor(root, { onResize } = {}) {
    this.root = root;
    this.cellsLayer = root.querySelector('[data-cells]');
    this.tilesLayer = root.querySelector('[data-tiles]');
    this.nodes = new Map();
    this.size = 0;
    this.onResize = onResize;

    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(root);
  }

  /** Publish the pixel size of one cell so tile transforms stay in px. */
  measure() {
    if (!this.size) return;
    const styles = getComputedStyle(this.root);
    const gap = parseFloat(styles.getPropertyValue('--gap')) || 0;
    const padding = parseFloat(styles.paddingLeft) || 0;
    const inner = this.root.clientWidth - padding * 2;
    const cell = (inner - gap * (this.size - 1)) / this.size;
    this.root.style.setProperty('--cell', `${Math.max(cell, 0)}px`);
    this.onResize?.(cell);
  }

  /** Lay out the static backing cells for a board of `size`. */
  setSize(size) {
    if (this.size === size) return;
    this.size = size;
    this.root.style.setProperty('--n', String(size));
    this.cellsLayer.replaceChildren();
    for (let i = 0; i < size * size; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      this.cellsLayer.append(cell);
    }
    this.clear();
    this.measure();
  }

  clear() {
    this.nodes.clear();
    this.tilesLayer.replaceChildren();
  }

  createNode(tile) {
    const node = document.createElement('div');
    node.className = 'tile';
    node.dataset.value = String(tile.value);
    if (tile.value > 8192) node.dataset.value = 'huge';
    const label = document.createElement('span');
    label.className = 'tile-value';
    label.textContent = String(tile.value);
    node.append(label);
    this.position(node, tile.x, tile.y);
    return node;
  }

  position(node, x, y) {
    node.style.setProperty('--x', String(x));
    node.style.setProperty('--y', String(y));
  }

  /**
   * Draw the current board.
   * @param {import('../engine/game.js').Game} game
   */
  render(game) {
    this.setSize(game.size);
    const seen = new Set();

    for (const tile of game.grid.tiles()) {
      seen.add(tile.id);
      let node = this.nodes.get(tile.id);

      if (!node) {
        node = this.createNode(tile);
        // A merge result starts on top of the tiles that made it, then pops.
        if (tile.mergedFrom) {
          this.position(node, tile.previousPosition?.x ?? tile.x, tile.previousPosition?.y ?? tile.y);
          this.tilesLayer.append(node);
          this.nextFrame(() => {
            this.position(node, tile.x, tile.y);
            node.classList.add('is-merged');
          });
          for (const source of tile.mergedFrom) this.retire(source.id, tile);
        } else {
          node.classList.add('is-new');
          this.tilesLayer.append(node);
        }
        this.nodes.set(tile.id, node);
        continue;
      }

      node.dataset.value = tile.value > 8192 ? 'huge' : String(tile.value);
      node.querySelector('.tile-value').textContent = String(tile.value);
      this.position(node, tile.x, tile.y);
    }

    for (const [id, node] of this.nodes) {
      if (!seen.has(id) && !node.dataset.retiring) {
        node.remove();
        this.nodes.delete(id);
      }
    }
  }

  /** Slide a consumed tile under its merge result, then drop it. */
  retire(id, target) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.dataset.retiring = 'true';
    node.classList.add('is-retiring');
    this.position(node, target.x, target.y);
    this.nodes.delete(id);
    setTimeout(() => node.remove(), TRANSITION_MS * 2);
  }

  nextFrame(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  destroy() {
    this.observer.disconnect();
  }
}
