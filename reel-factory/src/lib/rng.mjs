// Seeded randomness only. No Math.random, no Date, no wall clock anywhere in the factory's render path.
export function hash(str) { let h = 1779033703 ^ String(str).length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
export function rng(seed) { let a = typeof seed === "number" ? seed >>> 0 : hash(seed); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hash01 = (seed, n) => rng(hash(seed) + Math.imul(n, 2654435761))();
