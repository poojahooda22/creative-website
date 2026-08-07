// ripple-grid.ts — a lattice of points held by springs, struck by expanding rings.
//
// Every vertex knows its distance from the source and the direction pointing
// away from it. A ring travels outward; any vertex the ring is currently
// passing through gets shoved along that direction, then a spring pulls it home
// while damping bleeds the energy off.
//
// That spring-and-damping pair is the whole effect. A keyframe would snap the
// grid out and back; a spring overshoots and settles, which is what reads as a
// wave passing through a surface rather than a shape being animated.
//
// The entire lattice is serialised into one path string per frame: one DOM
// write for roughly two hundred line segments.

const BAND = 30;          // how wide the ring's influence is, px
const SPRING = 0.001;     // pull toward home
const DAMPING = 0.9;      // energy bled per frame
const REFERENCE_FRAME = 1000 / 60;

interface Vertex {
  x: number; y: number;      // home
  vx: number; vy: number;    // velocity
  wx: number; wy: number;    // current displacement
  dx: number; dy: number;    // outward direction, weighted by closeness
  ox: number; oy: number;    // the static bulge, scaled by `open`
  dist: number;
}

export class RippleGrid {
  private readonly svg: SVGSVGElement;
  private readonly path: SVGPathElement;
  private columns: Vertex[][] = [];

  private width = 0;
  private height = 0;
  private srcX = 0;
  private srcY = 0;

  private progress = 0;
  private speed = 0;
  private strength = 0;
  private running = false;

  /** 0 while idle, tweened to 1 on hover: how far the lens bulge is applied. */
  open = 0;

  constructor(host: HTMLElement, private readonly source: HTMLElement) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'cta__grid');
    this.svg.setAttribute('aria-hidden', 'true');
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.svg.appendChild(this.path);
    host.insertBefore(this.svg, host.firstChild);
    this.resize();
  }

  resize(): void {
    // Measure the DRAWING SURFACE, not the section. The svg is deliberately
    // shorter than the panel so the lattice stops at the closing band, and
    // taking the section's height here would build a coordinate space taller
    // than the surface it is painted on: the whole grid renders squashed.
    const rect = this.svg.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

    const srcRect = this.source.getBoundingClientRect();
    this.srcX = srcRect.left - rect.left + srcRect.width / 2;
    this.srcY = srcRect.top - rect.top + srcRect.height / 2;

    const cols = window.innerWidth > 767 ? 12 : 8;
    const gapX = this.width / cols;
    // Rows are sized off a screen height, not off this box. The box now runs the
    // whole panel including the ground reserved for the type above, and dividing
    // THAT by a fixed row count would stretch every cell into a tall rectangle.
    const gapY = window.innerHeight / 8;
    const rows = Math.max(2, Math.floor(this.height / gapY));
    // the leftover goes to every row but the first, so the lattice bottom-aligns
    // and the odd short row hides at the top
    const bleed = this.height - gapY * rows;

    const diagonal = Math.hypot(this.width, this.height);
    const reach = Math.min(this.width, this.height) / 2;

    this.columns = [];
    for (let c = 0; c <= cols; c += 1) {
      const column: Vertex[] = [];
      for (let r = 0; r <= rows; r += 1) {
        const x = gapX * c;
        const y = gapY * r + (r === 0 ? 0 : bleed);
        const hx = x - this.srcX;
        const hy = y - this.srcY;
        const dist = Math.max(Math.hypot(hx, hy), 1);
        const angle = Math.atan2(hy, hx);
        // closer vertices are pushed harder, which is what curves the lattice
        // around the disc instead of translating the whole sheet
        const weight = (this.width / 2) / dist;
        const dx = Math.cos(angle) * weight * 5;
        const dy = Math.sin(angle) * weight * 5;
        const ease = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
        column.push({
          x, y, vx: 0, vy: 0, wx: 0, wy: 0, dx, dy, dist,
          // 75 threw the lattice apart on hover; the bulge should bend the mesh
          // around the disc, not evacuate the section
          ox: ease(dx / diagonal) * gapX * 26 * (dist / reach),
          oy: ease(dy / diagonal) * gapY * 26 * (dist / reach),
        });
      }
      this.columns.push(column);
    }
    this.draw();
  }

  /** Send a ring outward. A gentle one on the idle beat, a hard one on hover. */
  pulse(speed: number, strength: number): void {
    this.progress = 0;
    this.speed = speed;
    this.strength = strength;
    this.running = true;
  }

  tick(deltaMs: number): void {
    const step = Math.min(deltaMs, 50) / REFERENCE_FRAME;

    if (this.running) {
      this.progress += this.speed * step;
      if (this.progress > Math.hypot(this.width, this.height)) this.running = false;
    }

    for (const column of this.columns) {
      for (const p of column) {
        const offset = Math.abs(p.dist - this.progress);
        if (this.running && offset < BAND) {
          const falloff = 1 - offset / BAND;
          const angle = Math.atan2(p.dy, p.dx);
          const amp = Math.cos(offset * 0.01) * falloff;
          p.vx += Math.cos(angle) * amp * BAND * 0.5 * this.strength;
          p.vy += Math.sin(angle) * amp * BAND * 0.5 * this.strength;
        }
        p.vx += (0 - p.wx) * SPRING;
        p.vy += (0 - p.wy) * SPRING;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.wx += p.vx * 3 * step;
        p.wy += p.vy * 3 * step;
        p.wx *= DAMPING;
        p.wy *= DAMPING;
      }
    }
    this.draw();
  }

  private draw(): void {
    let d = '';
    const at = (p: Vertex) =>
      `${(p.x + p.wx * 0.1 + p.ox * this.open).toFixed(1)} ${(p.y + p.wy * 0.1 + p.oy * this.open).toFixed(1)}`;

    for (const column of this.columns) {
      column.forEach((p, i) => { d += (i ? 'L' : 'M') + at(p); });
    }
    const rows = this.columns[0]?.length ?? 0;
    for (let r = 0; r < rows; r += 1) {
      this.columns.forEach((column, i) => { d += (i ? 'L' : 'M') + at(column[r]); });
    }
    this.path.setAttribute('d', d);
  }

  dispose(): void {
    this.svg.remove();
  }
}
