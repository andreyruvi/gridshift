/**
 * Player statistics. Pure functions over a plain record so they can be tested
 * without a browser and persisted as JSON.
 *
 * The upstream game remembered a single number — the best score — and nothing
 * else. Because gridshift supports several board sizes, bests are kept per
 * size; a 3x3 record and a 6x6 record are not comparable.
 */

export const STATS_VERSION = 1;

export function emptyStats() {
  return {
    version: STATS_VERSION,
    games: 0,
    wins: 0,
    totalMoves: 0,
    totalScore: 0,
    bestScore: {},
    bestTile: {},
  };
}

/** Accept anything, return something valid. Corrupt storage must not break play. */
export function normaliseStats(input) {
  const base = emptyStats();
  if (!input || typeof input !== 'object') return base;
  const num = (value) => (Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
  const record = (value) => {
    const out = {};
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        if (/^\d+$/.test(key) && Number.isFinite(entry) && entry >= 0) out[key] = Math.floor(entry);
      }
    }
    return out;
  };
  return {
    version: STATS_VERSION,
    games: num(input.games),
    wins: num(input.wins),
    totalMoves: num(input.totalMoves),
    totalScore: num(input.totalScore),
    bestScore: record(input.bestScore),
    bestTile: record(input.bestTile),
  };
}

/** Fold a finished game into the record. Returns a new record. */
export function recordGame(stats, game) {
  const { size, score = 0, moves = 0, largestTile = 0, won = false } = game;
  if (!Number.isInteger(size) || size <= 0) throw new RangeError(`Invalid board size ${size}`);
  const next = normaliseStats(stats);
  const key = String(size);
  next.games += 1;
  if (won) next.wins += 1;
  next.totalMoves += moves;
  next.totalScore += score;
  next.bestScore[key] = Math.max(next.bestScore[key] ?? 0, score);
  next.bestTile[key] = Math.max(next.bestTile[key] ?? 0, largestTile);
  return next;
}

export function bestScoreFor(stats, size) {
  return normaliseStats(stats).bestScore[String(size)] ?? 0;
}

export function bestTileFor(stats, size) {
  return normaliseStats(stats).bestTile[String(size)] ?? 0;
}

/** Win rate as a fraction in [0, 1]; zero games is zero, never NaN. */
export function winRate(stats) {
  const { games, wins } = normaliseStats(stats);
  return games === 0 ? 0 : wins / games;
}

export function averageScore(stats) {
  const { games, totalScore } = normaliseStats(stats);
  return games === 0 ? 0 : totalScore / games;
}
