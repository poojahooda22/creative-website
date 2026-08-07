// bubble-burst.ts — speech bubbles thrown from a point, falling under gravity.
//
// One canvas for the whole grid rather than one per tile, so a burst from every
// tile at once is still a single clear-and-repaint.
//
// The bubbles are launched upward and are pulled back down, which is what makes
// them read as tossed rather than dropped. They are drawn rather than loaded
// from a file so they take the ink colour from the current theme for free.

const GRAVITY = 0.45;          // per 60Hz frame
const REFERENCE_FRAME = 1000 / 60;
const SIZE = 48;

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  scale: number;
  growth: number;
  color: string;
}

const random = (min: number, max: number): number => min + Math.random() * (max - min);

export class BubbleBurst {
  private readonly ctx: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('bubble-burst: 2d context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get active(): boolean {
    return this.bubbles.length > 0;
  }

  /** Throw a handful from one point, in canvas-local coordinates. */
  burst(x: number, y: number, count: number): void {
    // read the ink once per burst rather than per bubble per frame
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--ink').trim() || '#150A08';

    for (let i = 0; i < count; i += 1) {
      this.bubbles.push({
        x,
        y,
        vx: random(-5, 5),
        vy: random(-15, -5),      // upward first; gravity brings them back
        angle: random(0, Math.PI * 2),
        spin: random(-10, 10) * (Math.PI / 180),
        scale: random(0.25, 1),
        growth: Math.random() * 0.01,
        color,
      });
    }
  }

  tick(deltaMs: number): void {
    if (!this.bubbles.length) return;

    // the physics constants are tuned per 60Hz frame, so scale them by how long
    // this frame actually took. Without this the bubbles fall twice as fast on
    // a 120Hz display.
    const step = Math.min(deltaMs, 50) / REFERENCE_FRAME;

    const surviving: Bubble[] = [];
    for (const b of this.bubbles) {
      b.vy += GRAVITY * step;
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.angle += b.spin * step;
      b.scale += b.growth * step;
      if (b.y - SIZE * b.scale < this.height) surviving.push(b);
    }
    this.bubbles = surviving;

    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const b of this.bubbles) this.drawBubble(b);
  }

  private drawBubble(b: Bubble): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.scale(b.scale, b.scale);
    ctx.fillStyle = b.color;

    const half = SIZE / 2;
    ctx.beginPath();
    ctx.roundRect(-half, -half, SIZE, SIZE * 0.72, 10);
    ctx.fill();

    // the tail, which is what makes it read as speech rather than as a pill
    ctx.beginPath();
    ctx.moveTo(-half + 14, half - 13);
    ctx.lineTo(-half + 8, half);
    ctx.lineTo(-half + 26, half - 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  clear(): void {
    this.bubbles = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
