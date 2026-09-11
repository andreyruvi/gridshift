# gridshift

A sliding-tile puzzle: slide the board, merge equal tiles, and keep going.
Plays on boards from 3×3 to 8×8, remembers nothing you did not ask it to
remember, takes back moves, and works fully from the keyboard or a screen
reader.

No build step, no dependencies, no tracking, nothing loaded from a CDN.

**Play:** https://andreyruvi.github.io/gridshift/

<!--
  Screenshots live in docs/screenshots/ and are referenced below once captured.
  ![The 4×4 board mid-game](docs/screenshots/board-4x4.png)
  ![A 7×7 board](docs/screenshots/board-7x7.png)
-->

## Features

- **Boards from 3×3 to 8×8**, switchable without reloading.
- **Undo** — take back the last sixteen moves, including a game over.
- **Daily board** — one deterministic board per UTC date, identical for
  everyone who plays that day.
- **Statistics per board size** — games, win rate, best score, best tile. A
  3×3 record and a 6×6 record are not comparable, so they are kept apart.
- **Configurable win target** — 2048 by default, any power of two from 8.
- **Full keyboard control** — arrows, `WASD`, or `HJKL`; `U` or `Ctrl`+`Z`
  to undo; `R` for a new game.
- **Screen-reader support** — every move is announced, and an off-screen table
  mirrors the board so the whole position can be read.
- **Touch** — swipe anywhere on the board.
- **Installable and offline** — a PWA with a cached app shell.
- **54 tests** over the rules, history, determinism, statistics and storage.

## Installation

Nothing to install. Clone and serve the directory:

```bash
git clone https://github.com/andreyruvi/gridshift.git
cd gridshift
python3 -m http.server 8000
```

Open http://localhost:8000.

> Opening `index.html` directly from the filesystem will not work. Browsers
> refuse to load ES modules over `file://`, so the game needs a server — any
> static one will do.

To host it, publish the repository with GitHub Pages (Settings → Pages →
Source: GitHub Actions). The included workflow deploys every push to `main`.

## Usage

| Action | Keys |
|---|---|
| Slide tiles | `←` `↑` `↓` `→`, or `W` `A` `S` `D`, or `H` `J` `K` `L` |
| Undo a move | `U`, or `Ctrl`+`Z` |
| New game | `R` |
| Slide on touch | Swipe across the board |

Equal tiles that collide merge into their sum. A tile that has already merged
during a move cannot merge again in that same move, so a row of four 2s becomes
two 4s, never a single 8. Each successful move spawns one new tile — a 2 nine
times out of ten, otherwise a 4. The game ends when the board is full and no
neighbouring tiles are equal.

## Configuration

Board size and mode are chosen in the interface and remembered in
`localStorage`. Everything else is a constructor option on the engine:

```js
import { Game } from './src/engine/game.js';
import { seededRandom } from './src/engine/rng.js';

const game = new Game({
  size: 5,                          // 3 to 8, default 4
  winTarget: 1024,                  // power of two, at least 8, default 2048
  startTiles: 2,                    // tiles placed at the start
  fourChance: 0.1,                  // probability a spawned tile is a 4
  maxUndo: 16,                      // history depth; 0 disables undo
  random: seededRandom('my-seed'),  // any () => number in [0, 1)
});

game.move(0);          // 0 up, 1 right, 2 down, 3 left
game.undo();
JSON.stringify(game);  // a saveable snapshot
```

Because the random source is injected, a seed fully determines a game. That is
what makes the daily board identical for every player and the rules testable
without a browser.

If the browser blocks site storage, the game says so and keeps playing — only
persistence is lost.

## Development

```bash
node --test test/*.test.js   # 54 tests, Node 20+
```

The suite uses only `node:test` and `node:assert`. There are no dependencies to
install and no build to run. CI runs the same command on Node 20 and 22.

Two rules keep the project testable:

1. `src/engine` never touches the DOM.
2. Nothing calls `Math.random()` directly; randomness arrives through the
   injected `random` function.

## Project structure

```
gridshift/
├── index.html                 markup and the accessible scaffolding
├── manifest.webmanifest       PWA metadata
├── sw.js                      offline app shell
├── styles/gridshift.css       all styling; system fonts, light and dark
├── src/
│   ├── main.js                wiring: the only file that knows about both halves
│   ├── stats.js               pure functions over the statistics record
│   ├── engine/                no DOM, fully testable
│   │   ├── game.js            rules, scoring, history, serialisation
│   │   ├── grid.js            the board and its queries
│   │   └── rng.js             seeded generation and the daily seed
│   └── ui/                    everything that touches the DOM
│       ├── renderer.js        tile elements keyed by stable id
│       ├── input.js           keyboard, pointer swipes, actions
│       ├── announcer.js       live region and the off-screen board table
│       └── storage.js         localStorage that cannot throw
└── test/                      node:test suites
```

## Credits

This project is a modified and extended version of
[2048](https://github.com/gabrielecirulli/2048), originally created by
**Gabriele Cirulli** and released under the MIT licence. The rules and the
merge model are his design.

It was derived by way of [cheahjs/2048](https://github.com/cheahjs/2048), an
unmodified fork of the original.

The engine, renderer, input handling, accessibility layer, statistics, offline
support, styling and test suite in this repository are new work.
[CHANGELOG.md](CHANGELOG.md) records exactly what changed.

This is not the original 2048, is not endorsed by its author, and does not use
its name or branding beyond the attribution required by the licence.

## License

[MIT](LICENSE).

The licence file carries two copyright notices: Gabriele Cirulli's, retained as
the MIT licence requires, and one covering only the additions made here.
