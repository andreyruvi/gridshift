/**
 * Application wiring. Nothing here knows the game rules; nothing in
 * `src/engine` knows the DOM exists.
 */
import { Game, DIRECTION, MIN_SIZE, MAX_SIZE } from './engine/game.js';
import { seededRandom, dailySeed } from './engine/rng.js';
import { Renderer } from './ui/renderer.js';
import { Announcer } from './ui/announcer.js';
import { InputManager } from './ui/input.js';
import { createStorage } from './ui/storage.js';
import {
  emptyStats, normaliseStats, recordGame, bestScoreFor, bestTileFor, winRate,
} from './stats.js';

const store = createStorage('gridshift');
const el = (id) => document.getElementById(id);

const ui = {
  board: el('board'),
  score: el('score'),
  best: el('best'),
  moves: el('moves'),
  size: el('size'),
  mode: el('mode'),
  undo: el('undo'),
  restart: el('restart'),
  overlay: el('overlay'),
  overlayTitle: el('overlay-title'),
  overlayText: el('overlay-text'),
  keepPlaying: el('keep-playing'),
  overlayRestart: el('overlay-restart'),
  seedLabel: el('seed-label'),
  statGames: el('stat-games'),
  statWins: el('stat-wins'),
  statBestTile: el('stat-best-tile'),
  live: el('live'),
  boardTable: el('board-table'),
  persistence: el('persistence'),
};

let stats = normaliseStats(store.read('stats', emptyStats()));
let settings = { size: 4, mode: 'free', ...(store.read('settings') ?? {}) };
if (!Number.isInteger(settings.size) || settings.size < MIN_SIZE || settings.size > MAX_SIZE) settings.size = 4;
if (!['free', 'daily'].includes(settings.mode)) settings.mode = 'free';

let game;
let counted = false;

const renderer = new Renderer(ui.board);
const announcer = new Announcer(ui.live, ui.boardTable);

function randomSource() {
  if (settings.mode === 'daily') {
    const { key, seed } = dailySeed();
    ui.seedLabel.textContent = `Daily board — ${key}`;
    return seededRandom(seed);
  }
  ui.seedLabel.textContent = 'Free play';
  return Math.random;
}

function newGame() {
  game = new Game({ size: settings.size, random: randomSource() });
  counted = false;
  renderer.clear();
  hideOverlay();
  draw();
  announcer.say(`New ${settings.size} by ${settings.size} game.`);
}

function draw() {
  renderer.render(game);
  announcer.describeBoard(game);
  ui.score.textContent = game.score.toLocaleString();
  ui.best.textContent = Math.max(bestScoreFor(stats, game.size), game.score).toLocaleString();
  ui.moves.textContent = game.moves.toLocaleString();
  ui.undo.disabled = !game.canUndo;
  ui.statGames.textContent = stats.games.toLocaleString();
  ui.statWins.textContent = `${Math.round(winRate(stats) * 100)}%`;
  ui.statBestTile.textContent = bestTileFor(stats, game.size).toLocaleString() || '—';
}

function finish() {
  if (counted) return;
  counted = true;
  stats = recordGame(stats, {
    size: game.size, score: game.score, moves: game.moves,
    largestTile: game.largestTile, won: game.won,
  });
  store.write('stats', stats);
}

function showOverlay(title, text, { offerContinue }) {
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.keepPlaying.hidden = !offerContinue;
  ui.overlay.hidden = false;
  (offerContinue ? ui.keepPlaying : ui.overlayRestart).focus();
}

function hideOverlay() {
  ui.overlay.hidden = true;
}

function onMove(direction) {
  if (!game || game.isTerminated()) return;
  const result = game.move(direction);
  if (!result.moved) {
    announcer.describeMove(result, game);
    return;
  }
  draw();
  announcer.describeMove(result, game);

  if (result.over) {
    finish();
    showOverlay('No moves left', `You finished on ${game.score.toLocaleString()} points after ${game.moves} moves.`, { offerContinue: false });
  } else if (result.reachedTarget) {
    finish();
    showOverlay(`${game.winTarget} reached`, 'You hit the target. Keep going for a bigger tile, or start again.', { offerContinue: true });
  }
}

function onUndo() {
  if (!game?.undo()) return;
  counted = false;
  hideOverlay();
  draw();
  announcer.say(`Move taken back. Score ${game.score}.`);
}

new InputManager(ui.board, {
  move: onMove,
  undo: onUndo,
  restart: newGame,
});

ui.undo.addEventListener('click', onUndo);
ui.restart.addEventListener('click', newGame);
ui.overlayRestart.addEventListener('click', newGame);
ui.keepPlaying.addEventListener('click', () => {
  game.continueAfterWin();
  hideOverlay();
  ui.board.focus();
  announcer.say('Carrying on past the target.');
});

ui.size.addEventListener('change', () => {
  settings.size = Number(ui.size.value);
  store.write('settings', settings);
  newGame();
});
ui.mode.addEventListener('change', () => {
  settings.mode = ui.mode.value;
  store.write('settings', settings);
  newGame();
});

for (let size = MIN_SIZE; size <= MAX_SIZE; size += 1) {
  const option = document.createElement('option');
  option.value = String(size);
  option.textContent = `${size} × ${size}`;
  ui.size.append(option);
}
ui.size.value = String(settings.size);
ui.mode.value = settings.mode;

if (!store.persistent) {
  ui.persistence.hidden = false;
}

newGame();

// Offline support. Skipped on file:// and anywhere the API is missing.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline play is a bonus, never a requirement */
    });
  });
}
