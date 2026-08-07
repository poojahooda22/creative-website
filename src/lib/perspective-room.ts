// perspective-room.ts — the corridor the About panel sits inside.
//
// Two rectangles: the section itself, and a smaller one the size of the content
// panel. Every line runs from a point on the outer rectangle to the matching
// point on the inner one, so the inner rectangle reads as a far wall and the
// lines read as the floor, ceiling and side walls of a room.
//
// Scroll slides that far wall up and down. Because all sixty lines terminate on
// it, moving it swings the whole room at once, which the eye reads as the camera
// tilting rather than as lines moving. The content panel is translated by the
// exact same number, so it stays welded into the far wall. Decouple those two
// values and the illusion dies instantly.
//
// The lines are one <path> with sixty move/line pairs, rewritten as a single
// string per frame. Sixty separate <line> elements would be sixty style
// recalculations; this is one attribute write.

// How far the far wall travels either side of centre. These MUST match the
// section's vertical padding in the stylesheet (15rem desktop, 8rem narrow).
// The padding is the only slack the panel has; sweep further and the panel is
// pushed past an edge, where overflow:hidden crops real content off the page
// and the reader simply never sees it.
const SWEEP_DESKTOP = 240;
const SWEEP_MOBILE = 128;
const RINGS = 4;             // depth rings between the outer and inner rectangle
const SMOOTHING = 0.2;       // how fast the wall chases the scroll position

type Point = { x: number; y: number };
type Segment = [Point, Point];

export class PerspectiveRoom {
  private readonly svg: SVGSVGElement;
  private readonly path: SVGPathElement;
  private segments: Segment[] = [];

  private width = 0;
  private height = 0;
  private innerWidth = 0;
  private innerHeight = 0;
  private offsetY = 0;

  // the scroll span this section responds to, in document coordinates
  private start = 0;
  private end = 1;
  private progress = 0;
  private smoothed = 0;
  private forced = true;

  constructor(
    private readonly host: HTMLElement,
    private readonly panel: HTMLElement,
  ) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'room__grid');
    this.svg.setAttribute('aria-hidden', 'true');
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.svg.appendChild(this.path);
    host.insertBefore(this.svg, host.firstChild);
    this.resize();
  }

  resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    // offsetWidth ignores the panel's transform, which is what we want: the
    // untranslated size of the far wall
    this.innerWidth = this.panel.offsetWidth;
    this.innerHeight = this.panel.offsetHeight;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

    // the span runs from "the bottom of the viewport reaches the top of the
    // section" to "the top of the viewport clears its bottom"
    const top = rect.top + window.scrollY;
    this.start = top;
    this.end = top + this.height + window.innerHeight;

    this.readScroll();
    this.smoothed = this.progress;   // snap, so arriving mid-page does not slide
    this.forced = true;
  }

  private readScroll(): void {
    const edge = window.scrollY + window.innerHeight;
    if (edge < this.start) this.progress = 0;
    else if (edge > this.end) this.progress = 1;
    else this.progress = (edge - this.start) / (this.end - this.start);
  }

  tick(): void {
    this.readScroll();
    this.smoothed += (this.progress - this.smoothed) * SMOOTHING;

    // three decimals of deadzone: once the wall has settled there is nothing to
    // redraw, and this section stops costing anything at all
    const delta = Math.round((this.progress - this.smoothed) * 1000);
    if (delta === 0 && !this.forced) return;

    const sweep = window.innerWidth > 767 ? SWEEP_DESKTOP : SWEEP_MOBILE;
    this.offsetY = sweep * (this.smoothed * 2 - 1);   // 0..1 remapped to -1..+1
    this.host.style.setProperty('--offset-y', `${this.offsetY}px`);

    this.build();
    this.draw();
    this.forced = false;
  }

  private build(): void {
    const { width, height, innerWidth, innerHeight, offsetY } = this;
    const segments: Segment[] = [];

    const ox = (width - innerWidth) / 2;
    const oy = (height - innerHeight) / 2 + offsetY;
    const divisions = window.innerWidth > 767 ? 12 : 8;

    const gx = width / divisions;
    const gy = height / divisions;
    const igx = innerWidth / divisions;
    const igy = innerHeight / divisions;

    const outer = { x1: 0, y1: 0, x2: width, y2: height };
    const inner = { x1: ox, y1: oy, x2: ox + innerWidth, y2: oy + innerHeight };

    // the four corner diagonals, used as rails the depth rings slide along
    const rails: Segment[] = [
      [{ x: outer.x1, y: outer.y1 }, { x: inner.x1, y: inner.y1 }],
      [{ x: outer.x2, y: outer.y1 }, { x: inner.x2, y: inner.y1 }],
      [{ x: outer.x2, y: outer.y2 }, { x: inner.x2, y: inner.y2 }],
      [{ x: outer.x1, y: outer.y2 }, { x: inner.x1, y: inner.y2 }],
    ];

    // A ring is a line joining two rails at the same depth. The eased position
    // is what sells it: spacing them evenly reads as flat nested rectangles,
    // while crowding them toward the far wall reads as distance.
    const ring = (a: Segment, b: Segment) => {
      for (let i = 1; i < RINGS; i += 1) {
        const t = 1 - (1 - i / RINGS) ** 2;
        segments.push([
          { x: a[0].x + (a[1].x - a[0].x) * t, y: a[0].y + (a[1].y - a[0].y) * t },
          { x: b[0].x + (b[1].x - b[0].x) * t, y: b[0].y + (b[1].y - b[0].y) * t },
        ]);
      }
    };

    // ceiling and floor
    for (let i = 1; i < divisions; i += 1) {
      segments.push([{ x: gx * i, y: outer.y1 }, { x: ox + igx * i, y: inner.y1 }]);
      segments.push([{ x: gx * i, y: outer.y2 }, { x: ox + igx * i, y: inner.y2 }]);
    }
    ring(rails[0], rails[1]);
    ring(rails[3], rails[2]);

    // side walls. The loop is inclusive on purpose: i = 0 and i = divisions land
    // exactly on the corners, which is how the diagonals get drawn without
    // being a special case.
    for (let i = 0; i <= divisions; i += 1) {
      segments.push([{ x: outer.x1, y: gy * i }, { x: inner.x1, y: oy + igy * i }]);
      segments.push([{ x: outer.x2, y: gy * i }, { x: inner.x2, y: oy + igy * i }]);
    }
    ring(rails[1], rails[2]);
    ring(rails[0], rails[3]);

    this.segments = segments;
  }

  private draw(): void {
    let d = '';
    for (const [a, b] of this.segments) {
      d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    this.path.setAttribute('d', d);
  }

  /** Draw once at rest, for visitors who asked for no motion. */
  drawStatic(): void {
    this.offsetY = 0;
    this.host.style.setProperty('--offset-y', '0px');
    this.build();
    this.draw();
  }

  dispose(): void {
    this.svg.remove();
  }
}
