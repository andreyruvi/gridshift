/**
 * Input handling: keyboard, pointer swipes, and on-screen controls.
 *
 * Upstream bound arrows, WASD and vim keys but nothing else, and its touch
 * handling used the long-deprecated `MSPointer` APIs. This version uses Pointer
 * Events, ignores swipes that are mostly scroll, and exposes undo and restart
 * as first-class actions so they can be driven from the keyboard or a button.
 */
import { DIRECTION } from '../engine/game.js';

const KEYS = new Map(Object.entries({
  ArrowUp: DIRECTION.up, ArrowRight: DIRECTION.right,
  ArrowDown: DIRECTION.down, ArrowLeft: DIRECTION.left,
  w: DIRECTION.up, d: DIRECTION.right, s: DIRECTION.down, a: DIRECTION.left,
  k: DIRECTION.up, l: DIRECTION.right, j: DIRECTION.down, h: DIRECTION.left,
}));

const SWIPE_THRESHOLD = 24; // px before a drag counts as a swipe

export class InputManager {
  constructor(surface, handlers = {}) {
    this.surface = surface;
    this.handlers = handlers;
    this.start = null;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    document.addEventListener('keydown', this.onKeyDown);
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('pointerup', this.onPointerUp);
    surface.addEventListener('pointercancel', () => { this.start = null; });
  }

  onKeyDown(event) {
    if (event.altKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement
      && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

    if (event.ctrlKey) {
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        this.handlers.undo?.();
      }
      return;
    }

    const direction = KEYS.get(event.key) ?? KEYS.get(event.key.toLowerCase());
    if (direction !== undefined) {
      event.preventDefault(); // stop arrows scrolling the page mid-game
      this.handlers.move?.(direction);
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'u': event.preventDefault(); this.handlers.undo?.(); break;
      case 'r': event.preventDefault(); this.handlers.restart?.(); break;
      case '?': this.handlers.help?.(); break;
      default: break;
    }
  }

  onPointerDown(event) {
    this.start = { x: event.clientX, y: event.clientY };
  }

  onPointerUp(event) {
    if (!this.start) return;
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    this.start = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

    const direction = absX > absY
      ? (dx > 0 ? DIRECTION.right : DIRECTION.left)
      : (dy > 0 ? DIRECTION.down : DIRECTION.up);
    this.handlers.move?.(direction);
  }

  destroy() {
    document.removeEventListener('keydown', this.onKeyDown);
  }
}
