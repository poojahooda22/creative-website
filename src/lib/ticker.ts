// ticker.ts — one requestAnimationFrame loop for the whole page.
// Every animated surface subscribes here instead of opening its own loop, so
// the page costs a single frame callback no matter how many effects run.

export type TickFn = (elapsedMs: number, deltaMs: number) => void;

const subscribers = new Set<TickFn>();
let rafId = 0;
let startTime = 0;
let lastTime = 0;

function frame(now: number): void {
  const elapsed = now - startTime;
  const delta = Math.min(now - lastTime, 50); // clamp: a backgrounded tab must not jump
  lastTime = now;

  // Booked BEFORE the subscribers run. Scheduling the next frame after them
  // means anything that throws takes the clock down with it: the loop never
  // reschedules, and every animation on the page plus the smooth scrolling
  // stops for good, from one exception in one effect.
  rafId = requestAnimationFrame(frame);

  for (const fn of subscribers) {
    try {
      fn(elapsed, delta);
    } catch (error) {
      // Reported, not swallowed, and then evicted. A subscriber that throws
      // once will throw every frame, so leaving it in trades a dead page for
      // sixty identical errors a second, which buries the first one. Dropping
      // it costs that one effect and keeps the rest of the page alive.
      subscribers.delete(fn);
      console.error('ticker: removed a subscriber after it threw', error);
    }
  }

  // everything either unsubscribed or was evicted: stop the clock
  if (subscribers.size === 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

export function subscribe(fn: TickFn): () => void {
  if (subscribers.size === 0) {
    startTime = performance.now();
    lastTime = startTime;
    rafId = requestAnimationFrame(frame);
  }
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) cancelAnimationFrame(rafId);
  };
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
