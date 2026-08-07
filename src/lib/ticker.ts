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
  subscribers.forEach((fn) => fn(elapsed, delta));
  rafId = requestAnimationFrame(frame);
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
