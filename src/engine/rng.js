/**
 * Deterministic pseudo-random number generation.
 *
 * The upstream game called `Math.random()` directly inside the grid and the
 * game manager, which made every game unreproducible and the move logic
 * impossible to unit-test. Everything random in gridshift goes through a
 * function supplied by the caller, so tests inject a fixed sequence and the
 * daily challenge injects a date-derived seed.
 */

/** Fast, well-distributed 32-bit PRNG. Returns a function producing [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash, used to turn a human-readable seed into a 32-bit int. */
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The seed every player shares on a given UTC date. */
export function dailySeed(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  return { key, seed: hashSeed(`gridshift:${key}`) };
}

/** Convenience: a seeded generator from a string or number. */
export function seededRandom(seed) {
  return mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed);
}
