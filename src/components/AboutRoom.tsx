import { useEffect, useRef } from 'react';
import { PerspectiveRoom } from '../lib/perspective-room';
import { BubbleBurst } from '../lib/bubble-burst';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { BRAND } from '../lib/brand';
import { HoodGrid } from './HoodGrid';

/** Bubbles thrown per hover. Ten read as confetti; five read as a handful. */
const BUBBLES_PER_HOVER = 5;

/**
 * One section, one panel, one corridor. The prose and the specification grid
 * are the same sheet of paper seen at the end of the same room, which is why
 * there is no separate section for the grid: a second section would mean a
 * second room, and the reader would have walked out of the first one.
 *
 * The panel is deliberately taller than the space it is given. It runs off the
 * bottom edge and is cut there, and the binary rail sitting on that cut is what
 * makes the crop read as an edge rather than as content that went missing.
 */
export function AboutRoom() {
  const hostRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!host || !panel || !canvas) return;

    const room = new PerspectiveRoom(host, panel);
    const tiles = Array.from(host.querySelectorAll<HTMLElement>('.hood__tile'));

    if (prefersReducedMotion()) {
      room.drawStatic();
      tiles.forEach((tile) => tile.classList.add('is-revealed'));
      return () => room.dispose();
    }

    const burst = new BubbleBurst(canvas);

    /** Throw from the middle of a tile, in coordinates local to the canvas. */
    const throwFrom = (tile: HTMLElement) => {
      const tileRect = tile.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      burst.burst(
        tileRect.left - hostRect.left + tileRect.width / 2,
        tileRect.top - hostRect.top + tileRect.height / 2,
        BUBBLES_PER_HOVER,
      );
    };

    // Scrolling past a tile wipes it in. It does not throw bubbles: those are
    // the reward for reaching for a tile, and firing them unprompted spends the
    // moment on someone who was only passing through.
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          reveal.unobserve(entry.target);   // the wipe happens once
        });
      },
      { threshold: 0.5 },
    );
    tiles.forEach((tile) => reveal.observe(tile));

    const onEnter = (event: Event) => throwFrom(event.currentTarget as HTMLElement);
    tiles.forEach((tile) => {
      tile.addEventListener('mouseenter', onEnter);
      tile.addEventListener('touchstart', onEnter, { passive: true });
    });

    // The corridor only runs while it is on screen. Rebuilding sixty lines a
    // frame for a section nobody is looking at is how a page quietly eats a
    // laptop battery.
    let unsubscribe: (() => void) | undefined;
    const presence = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !unsubscribe) {
          unsubscribe = subscribe((_elapsed, delta) => {
            room.tick();
            burst.tick(delta);
          });
        } else if (!entry.isIntersecting && unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
          burst.clear();
        }
      },
      { threshold: 0 },
    );
    presence.observe(host);

    const resizeObserver = new ResizeObserver(() => {
      room.resize();
      burst.resize();
    });
    resizeObserver.observe(host);

    return () => {
      reveal.disconnect();
      presence.disconnect();
      resizeObserver.disconnect();
      unsubscribe?.();
      tiles.forEach((tile) => {
        tile.removeEventListener('mouseenter', onEnter);
        tile.removeEventListener('touchstart', onEnter);
      });
      burst.clear();
      room.dispose();
    };
  }, []);

  return (
    <section className="room" ref={hostRef}>
      <div className="room__panel" ref={panelRef}>
        <h2 className="room__label" id="how-it-works">About</h2>
        <div className="room__body">
          {BRAND.about.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <HoodGrid />
      </div>
      <canvas className="room__canvas" ref={canvasRef} aria-hidden="true" />
    </section>
  );
}
