// wave-field.ts — a curtain of vertical SVG lines that drifts on a Perlin flow
// field and gets combed aside by the pointer.
//
// Each point carries two independent displacements that are summed at draw time:
//   wave   — the ambient noise drift, never stops
//   cursor — a spring-damped impulse from the pointer, returns home on its own
// Keeping them separate is what lets the field keep breathing while you push it.

import { Perlin } from './perlin';

export interface WaveFieldOptions {
  /** horizontal distance between lines, px */
  columnGap?: number;
  /** vertical distance between points on a line, px */
  pointGap?: number;
  /** how far a point swings horizontally along the flow field, px */
  swingX?: number;
  /** how far it swings vertically, px */
  swingY?: number;
}

interface Point {
  x: number;
  y: number;
  waveX: number;
  waveY: number;
  curX: number;
  curY: number;
  velX: number;
  velY: number;
}

const BASE_RADIUS = 175;      // pointer influence radius at rest, px
const MAX_SPEED = 100;        // speed is clamped so a flick cannot tear the field
const IMPULSE = 0.00065;      // push strength per frame
const SPRING = 0.005;         // pull back toward home
const DAMPING = 0.925;        // velocity bleed per frame
const MAX_OFFSET = 100;       // hard cap on displacement, px

/** expo.out — most of the travel happens early, so the line snaps out and settles */
const easeOut = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export class WaveField {
  private readonly svg: SVGSVGElement;
  private readonly noise = new Perlin();
  private lines: Point[][] = [];
  private paths: SVGPathElement[] = [];
  /** length of each line, summed in draw() against the geometry it just wrote */
  private lengths: number[] = [];

  // reveal state, owned by the engine so it composes with the live geometry
  private revealStart = 0;
  private revealDuration = 2400;
  private revealSpread = 500;
  private revealing = false;

  // pointer: raw, smoothed, and the derived speed / heading
  private px = 0;
  private py = 0;
  private smoothX = 0;
  private smoothY = 0;
  private lastX = 0;
  private lastY = 0;
  private speed = 0;
  private heading = 0;

  private readonly opts: Required<WaveFieldOptions>;
  private readonly resizeObserver: ResizeObserver;
  private readonly onPointerMove: (e: PointerEvent) => void;

  constructor(private readonly host: HTMLElement, options: WaveFieldOptions = {}) {
    this.opts = {
      columnGap: options.columnGap ?? 10,
      pointGap: options.pointGap ?? 32,
      swingX: options.swingX ?? 32,
      swingY: options.swingY ?? 16,
    };

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'wave__svg');
    host.appendChild(this.svg);

    this.build();
    this.resizeObserver = new ResizeObserver(() => this.build());
    this.resizeObserver.observe(host);

    this.onPointerMove = (e: PointerEvent) => {
      const rect = this.host.getBoundingClientRect();
      this.px = e.clientX - rect.left;
      this.py = e.clientY - rect.top;
    };
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  /** Lay out the grid. Overscanned so the drift never exposes an edge. */
  private build(): void {
    const rect = this.host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    const { columnGap, pointGap } = this.opts;
    // Overscan generously on every side. A point can be displaced up to
    // MAX_OFFSET by the pointer plus its own swing, so the grid has to start
    // well outside the frame or a hard sweep drags the line ends into view.
    const overWidth = rect.width + 440;
    const overHeight = rect.height + 440;
    const columns = Math.ceil(overWidth / columnGap);
    const rows = Math.ceil(overHeight / pointGap);
    const startX = (rect.width - overWidth) / 2;
    const startY = (rect.height - overHeight) / 2;

    this.svg.replaceChildren();
    this.lines = [];
    this.paths = [];
    this.lengths = [];

    for (let i = 0; i <= columns; i++) {
      const points: Point[] = [];
      for (let j = 0; j <= rows; j++) {
        points.push({
          x: startX + columnGap * i,
          y: startY + pointGap * j,
          waveX: 0, waveY: 0,
          curX: 0, curY: 0,
          velX: 0, velY: 0,
        });
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'wave__line');
      this.svg.appendChild(path);
      this.lines.push(points);
      this.paths.push(path);
    }

    // Paint immediately. A freshly built path carries no geometry at all, and
    // leaving it that way until something else happens to call draw() is what
    // left the hero an empty box for five seconds. Doing it here also means a
    // resize repaints in the same frame it rebuilds.
    this.drawStatic();
  }

  /** Draw every line at its resting position, with no motion applied. */
  drawStatic(): void {
    this.movePoints(0, true);
    this.draw();
  }

  /**
   * Start the line-draw reveal, staggered from both outer edges inward.
   *
   * Deliberately returns nothing. The previous version handed back a promise
   * and the field only began simulating once it resolved, which meant the paths
   * carried no `d` at all until then — and a path with no geometry reports a
   * length of zero, so the dash written against it was one pixel wide and
   * animated nothing. The whole intro was invisible and every line appeared at
   * once, fully formed, when the ticker finally started.
   *
   * The field now runs from the first frame and this only decides when the
   * curtain is uncovered. The reveal is recomputed per frame against the
   * geometry as it moves, so a drifting line stays correctly clipped instead of
   * breathing against a length that was measured once.
   */
  beginReveal(durationMs = 2400): void {
    this.revealStart = performance.now();
    this.revealDuration = durationMs;
    this.revealing = true;
    this.host.classList.add('is-revealing');
  }

  private applyReveal(now: number): void {
    if (!this.revealing) return;
    const total = this.paths.length;
    const half = total / 2 || 1;
    const elapsed = now - this.revealStart;
    let allDone = true;

    for (let i = 0; i < total; i++) {
      const path = this.paths[i];
      // distance from the nearest edge, normalised: outer lines start first
      const edge = Math.min(i, total - 1 - i) / half;
      const local = (elapsed - edge * this.revealSpread) / this.revealDuration;

      if (local >= 1) {
        // finished: strip the dash so later frames are never re-clipped
        if (path.style.strokeDasharray) {
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
        }
        continue;
      }
      allDone = false;

      const length = this.lengths[i];
      if (!length) continue;
      const shown = length * easeOut(Math.max(0, local));
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length - shown}`;
    }

    if (allDone) {
      this.revealing = false;
      this.host.classList.remove('is-revealing');
      this.host.classList.add('is-revealed');
    }
  }

  /** One simulation step. Call from the shared ticker. */
  tick(elapsedMs: number): void {
    this.trackPointer();
    this.movePoints(elapsedMs, false);
    // order matters: draw() writes the new geometry and its length, and only
    // then can the reveal clip against it. Reversed, the dash would be measured
    // against the previous frame's shape.
    this.draw();
    this.applyReveal(performance.now());
  }

  private trackPointer(): void {
    // the visible dot lags the real pointer: that lag IS the smoothing
    this.smoothX += (this.px - this.smoothX) * 0.1;
    this.smoothY += (this.py - this.smoothY) * 0.1;

    const dx = this.px - this.lastX;
    const dy = this.py - this.lastY;
    const distance = Math.hypot(dx, dy);
    this.speed += (distance - this.speed) * 0.1;
    this.speed = Math.min(MAX_SPEED, this.speed);
    if (distance > 0.01) this.heading = Math.atan2(dy, dx);
    this.lastX = this.px;
    this.lastY = this.py;

    this.host.style.setProperty('--pointer-x', `${this.smoothX}px`);
    this.host.style.setProperty('--pointer-y', `${this.smoothY}px`);
  }

  private movePoints(elapsedMs: number, staticOnly: boolean): void {
    const { swingX, swingY } = this.opts;
    // influence grows with pointer speed, so a fast sweep combs a wider band
    const radius = Math.max(BASE_RADIUS, this.speed);

    for (const points of this.lines) {
      for (const p of points) {
        // ambient drift: read the flow field as an angle, walk along it
        const angle = this.noise.noise2(
          (p.x + elapsedMs * 0.0125) * 0.002,
          (p.y + elapsedMs * 0.005) * 0.0015,
        ) * 12;
        p.waveX = Math.cos(angle) * swingX;
        p.waveY = Math.sin(angle) * swingY;

        if (staticOnly) continue;

        const distance = Math.hypot(p.x - this.smoothX, p.y - this.smoothY);
        if (distance < radius) {
          const falloff = 1 - distance / radius;
          const force = Math.cos(distance * 0.001) * falloff;
          // pushed along the pointer's direction of travel, not radially out:
          // that is what makes it read as combing rather than repelling
          p.velX += Math.cos(this.heading) * force * radius * this.speed * IMPULSE;
          p.velY += Math.sin(this.heading) * force * radius * this.speed * IMPULSE;
        }

        p.velX += (0 - p.curX) * SPRING;
        p.velY += (0 - p.curY) * SPRING;
        p.velX *= DAMPING;
        p.velY *= DAMPING;
        p.curX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, p.curX + p.velX * 2));
        p.curY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, p.curY + p.velY * 2));
      }
    }
  }

  private draw(): void {
    for (let i = 0; i < this.lines.length; i++) {
      const points = this.lines[i];
      let d = '';
      let length = 0;
      let prevX = 0;
      let prevY = 0;
      for (let j = 0; j < points.length; j++) {
        const p = points[j];
        // the last point of every line ignores the cursor offset, pinning the
        // bottom edge so the curtain stays anchored while the body sways
        const pinned = j === points.length - 1;
        const x = p.x + p.waveX + (pinned ? 0 : p.curX);
        const y = p.y + p.waveY + (pinned ? 0 : p.curY);
        d += `${j === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        // Summed here rather than read back with getTotalLength(). The path is
        // a polyline, so the sum is exact, and it costs one hypot per point
        // against 236 synchronous geometry calls into the SVG DOM every frame.
        if (j > 0) length += Math.hypot(x - prevX, y - prevY);
        prevX = x;
        prevY = y;
      }
      this.paths[i].setAttribute('d', d);
      this.lengths[i] = length;
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    this.svg.remove();
  }
}
