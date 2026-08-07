// memory-field.ts — the corridor of arriving memories.
//
// Three things share one vanishing point: a fan of rays drawn as a single SVG
// path, a pool of cards flying out of it toward the camera, and a block of type
// lying flat on the floor. Everything converges on the core's measured centre,
// so moving the core moves the whole universe.
//
// Nothing here writes element.style.transform. The engine only sets custom
// properties and lets the stylesheet compose the transform, which keeps the
// authoring in CSS where it can be read, and keeps the per-frame work down to a
// handful of property writes.

const POOL_SIZE = 24;
const MAX_IN_FLIGHT = 5;
const LAUNCH_MIN = 500;
const LAUNCH_JITTER = 500;
// Depth the cards are born at. Far enough to arrive from the vanishing point,
// close enough that they are readable for most of the trip: starting them at
// twenty thousand made them specks a couple of pixels wide for six of their
// seven seconds, which is a lot of machinery for almost no picture.
const START_Z = -6000;
// Retire the card well short of the camera plane. The stage's perspective is
// 1000px, and scale runs as P/(P - z), so a card allowed near z = 1000 divides
// by almost nothing: one measured 678,911px wide before this was capped. At 600
// the biggest a card ever gets is two and a half times its size, which is the
// rush past the lens without the divide-by-zero behind it.
const END_Z = 600;
const REFERENCE_FRAME = 1000 / 60;

interface Flyer {
  el: HTMLElement;
  live: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rx: number; ry: number;
  vrx: number; vry: number;
  s: number;
}

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

export class MemoryField {
  private readonly svg: SVGSVGElement;
  private readonly path: SVGPathElement;
  private readonly flyers: Flyer[] = [];

  private width = 0;
  private height = 0;
  private centreX = 0;
  private centreY = 0;

  private start = 0;
  private end = 1;
  private progress = 0;
  private smoothed = 0;

  private nextLaunchAt = 0;
  private elapsed = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly core: HTMLElement,
    private readonly stage: HTMLElement,
  ) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'field__rays');
    this.svg.setAttribute('aria-hidden', 'true');
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.svg.appendChild(this.path);
    host.insertBefore(this.svg, host.firstChild);

    for (const el of Array.from(stage.querySelectorAll<HTMLElement>('.flyer'))) {
      this.flyers.push({
        el, live: false, x: 0, y: 0, z: START_Z,
        vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, vrx: 0, vry: 0, s: 0,
      });
    }
    this.resize();
  }

  resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    const coreRect = this.core.getBoundingClientRect();
    this.centreX = coreRect.left - rect.left + coreRect.width / 2;
    this.centreY = coreRect.top - rect.top + coreRect.height / 2;

    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

    // The camera sits on the core, so the field's vanishing point and the rays'
    // convergence are the same point rather than two things that merely look
    // aligned until the viewport changes shape.
    //
    // Measured against the STAGE, not the section. The stage is deliberately
    // taller than the section so cards can enter and leave out of sight, which
    // means its top edge sits above the section's: using section coordinates
    // here puts the vanishing point half a screen off and the cards emerge from
    // empty space instead of from the core.
    const stageRect = this.stage.getBoundingClientRect();
    const originX = coreRect.left - stageRect.left + coreRect.width / 2;
    const originY = coreRect.top - stageRect.top + coreRect.height / 2;
    this.stage.style.perspectiveOrigin = `${originX.toFixed(1)}px ${originY.toFixed(1)}px`;
    this.stage.style.setProperty('--core-x', `${originX.toFixed(1)}px`);
    this.stage.style.setProperty('--core-y', `${originY.toFixed(1)}px`);

    // How hard the floor type is pushed away from the camera. Scaled off the
    // diagonal so the recession looks the same on a laptop and on a wide
    // monitor instead of flattening out as the viewport grows.
    const distortion = Math.hypot(this.width, (this.height - this.centreY) / 2) * 0.14;
    this.host.style.setProperty('--distortion', distortion.toFixed(2));
    this.host.style.setProperty('--floor-perspective', `${(distortion * 5).toFixed(0)}px`);
    // the floor starts at the vanishing point, so the type recedes into the
    // same place the rays converge on rather than into its own private horizon
    this.host.style.setProperty('--core-top', `${this.centreY.toFixed(1)}px`);

    const top = rect.top + window.scrollY;
    this.start = top;
    this.end = top + this.height + window.innerHeight;

    this.buildRays();
    this.readScroll();
    this.smoothed = this.progress;
  }

  /** One path: a horizon, then every edge point drawn back to the centre. */
  private buildRays(): void {
    const divisions = window.innerWidth > 767 ? 12 : 8;
    const cx = this.centreX.toFixed(1);
    const cy = this.centreY.toFixed(1);
    const stepX = this.width / divisions;
    const stepY = this.height / divisions;

    let d = `M0 ${this.height.toFixed(1)}L${this.width.toFixed(1)} ${this.height.toFixed(1)}`;
    for (let i = 0; i <= divisions; i += 1) {
      const x = (stepX * i).toFixed(1);
      d += `M${x} 0L${cx} ${cy}`;
      d += `M${x} ${this.height.toFixed(1)}L${cx} ${cy}`;
    }
    for (let i = 1; i < divisions; i += 1) {
      const y = (stepY * i).toFixed(1);
      d += `M0 ${y}L${cx} ${cy}`;
      d += `M${this.width.toFixed(1)} ${y}L${cx} ${cy}`;
    }
    this.path.setAttribute('d', d);
  }

  private readScroll(): void {
    const edge = window.scrollY + window.innerHeight;
    if (edge < this.start) this.progress = 0;
    else if (edge > this.end) this.progress = 1;
    else this.progress = (edge - this.start) / (this.end - this.start);
  }

  private launch(flyer: Flyer, index: number): void {
    flyer.live = true;
    flyer.z = START_Z;
    flyer.x = 0;
    flyer.y = 0;
    flyer.s = 0;
    flyer.vz = rand(18, 26);
    // alternating signs so the field spreads instead of drifting one way
    flyer.vx = Math.random() * this.width * 0.0025 * (index % 2 ? -1 : 1);
    flyer.vy = Math.random() * this.height * 0.0025 * (index % 3 ? -1 : 1);
    flyer.rx = 90;
    flyer.ry = 0;
    flyer.vrx = rand(0.25, 1.25);
    flyer.vry = rand(0.25, 1.25);
    flyer.el.classList.remove('is-parked');
  }

  private park(flyer: Flyer): void {
    flyer.live = false;
    flyer.el.classList.add('is-parked');
  }

  tick(deltaMs: number): void {
    const step = Math.min(deltaMs, 50) / REFERENCE_FRAME;
    this.elapsed += deltaMs;

    this.readScroll();
    this.smoothed += (this.progress - this.smoothed) * 0.1;
    this.host.style.setProperty('--scroll-progress', this.smoothed.toFixed(4));

    if (this.elapsed >= this.nextLaunchAt) {
      const inFlight = this.flyers.reduce((n, f) => n + (f.live ? 1 : 0), 0);
      if (inFlight < MAX_IN_FLIGHT) {
        const index = this.flyers.findIndex((f) => !f.live);
        if (index !== -1) this.launch(this.flyers[index], index);
      }
      this.nextLaunchAt = this.elapsed + (LAUNCH_MIN + Math.random() * LAUNCH_JITTER) * 1.25;
    }

    for (const f of this.flyers) {
      if (!f.live) continue;
      if (f.z > END_Z) { this.park(f); continue; }

      f.s = Math.min(f.s + 0.005 * step, 1);
      f.z += f.vz * step;
      f.x += f.vx * step;
      f.y += f.vy * step;
      f.rx += f.vrx * step;
      f.ry += f.vry * step;

      const style = f.el.style;
      style.setProperty('--x', `${f.x.toFixed(1)}px`);
      style.setProperty('--y', `${f.y.toFixed(1)}px`);
      style.setProperty('--z', `${f.z.toFixed(0)}px`);
      style.setProperty('--rx', f.rx.toFixed(1));
      style.setProperty('--ry', f.ry.toFixed(1));
      style.setProperty('--s', f.s.toFixed(3));
    }
  }

  /** Everything at rest, for visitors who asked for no motion. */
  drawStatic(): void {
    this.host.style.setProperty('--scroll-progress', '0.5');
    this.flyers.forEach((f) => this.park(f));
  }

  dispose(): void {
    this.svg.remove();
  }
}

export const POOL = POOL_SIZE;
