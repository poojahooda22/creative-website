// perlin.ts — classic 2D Perlin noise (Ken Perlin's improved algorithm).
// Seeded so each page load gets a different field, deterministic within a run.

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + t * (b - a);

/** 2D gradient: hash picks one of 4 diagonal unit vectors. */
function grad(hash: number, x: number, y: number): number {
  switch (hash & 3) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    default: return -x - y;
  }
}

export class Perlin {
  private readonly perm: Uint8Array;

  constructor(seed = Math.random()) {
    const table = new Uint8Array(256);
    for (let i = 0; i < 256; i++) table[i] = i;

    // xorshift32 keeps the shuffle reproducible for a given seed
    let state = (Math.floor(seed * 0xffffffff) || 1) >>> 0;
    const rand = (): number => {
      state ^= state << 13; state >>>= 0;
      state ^= state >> 17;
      state ^= state << 5; state >>>= 0;
      return state / 0x100000000;
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = table[i];
      table[i] = table[j];
      table[j] = tmp;
    }

    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = table[i & 255];
  }

  /** Sample the field. Returns roughly -1..1. */
  noise2(x: number, y: number): number {
    const p = this.perm;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);

    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const top = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const bottom = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(top, bottom, v);
  }
}
