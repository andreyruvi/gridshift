# Changelog

All notable changes to this project are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-09-11

First release of gridshift as a standalone project.

### Original project

| | |
|---|---|
| Original repository | https://github.com/gabrielecirulli/2048 |
| Original author | Gabriele Cirulli |
| Original licence | MIT |
| Forked via | https://github.com/cheahjs/2048 (an unmodified fork of the above) |

The rules of the game — the 4×4 grid, the slide-and-merge model, one merge per
tile per move, a 2 or 4 spawning after every successful move, 2048 as the
target — are Gabriele Cirulli's design and are preserved. Everything listed
below is new work in this repository.

### Changes from upstream

**Architecture**
- Rewrote the game as ES modules. Upstream loaded eight global constructor
  functions through eight `<script>` tags with no module boundary.
- Separated rules from presentation: `src/engine` has no reference to `document`
  and runs headless under Node; `src/ui` holds everything that touches the DOM.
- Replaced the coordinate-named CSS classes (`tile-position-1-3`) that capped
  the board at 4×4 with two CSS custom properties per tile and a published
  cell size, so any board size renders from the same stylesheet.
- Gave every tile a stable id, so the renderer moves a tile's existing element
  instead of rebuilding the whole board on each move.

**Added**
- Board sizes from 3×3 to 8×8, selectable during play.
- Undo, with a bounded history that also reverses a game over.
- Injectable random source, making a game reproducible from a seed.
- Daily board mode: one deterministic board per UTC date, the same for everyone.
- A configurable win target rather than a hard-coded 2048.
- Statistics kept per board size: games, win rate, best score, best tile.
- Save and restore of a game via `toJSON()` / `fromJSON()`.
- Installable PWA with an offline app shell (`sw.js`, `manifest.webmanifest`).
- A test suite of 54 tests covering the merge rules, the history, determinism,
  serialisation, statistics and storage. Upstream shipped no tests.
- GitHub Actions workflow running the suite on every push and pull request.

**Accessibility**
- The result of every move is announced through a polite live region.
- An off-screen table mirrors the board so the whole position can be read.
- The board is focusable and reachable through a skip link; the end-of-game
  panel is a labelled dialog that takes focus.
- Visible focus rings throughout, and `prefers-reduced-motion` is honoured.
- Upstream had no roles, labels, announcements or focus management at all.

**Fixed**
- Storage access is wrapped in `try`/`catch` and falls back to memory. Upstream
  tested only whether `localStorage` existed, so a quota or security error in a
  private window threw and stopped the game.
- Corrupt or hand-edited saved data is repaired on read rather than trusted.
- Arrow keys no longer scroll the page while the board has focus.
- Replaced the deprecated `MSPointer` touch handling with Pointer Events, and
  added a movement threshold so a scroll is not read as a swipe.
- `matchesAvailable` checks two directions per cell instead of four; the other
  two are the same pairs seen from the other side.

**Removed**
- The three Clear Sans web fonts in four formats each — roughly 400 KB — in
  favour of a system font stack with tabular figures.
- The score-sharing widget and its third-party network calls.
