// theme.ts — the contrast switch.
//
// One fixed panel, painted the dark ground, parked off-screen left by CSS. A
// single tween of x moves it; the palette swap is one class on the root.
//
// The whole feel comes from WHEN that class flips relative to the tween, and it
// is deliberately different in each direction:
//
//   going dark   panel slides in from the left over the still-light page, and
//                the class lands on the last frame. The page turns dark at the
//                same moment the panel teleports back off-screen, so the handoff
//                has no seam and it reads as the dark being painted on.
//
//   going light  the class flips first, so the page is already light, hidden
//                under the panel sitting at full cover. The panel then slides
//                away and uncovers it, which reads as the dark being wiped off.
//
// Swap that timing and one direction slides over an already-changed page while
// the other flashes for a frame.
//
// Note on the panel being opaque: a blend mode could let the line art show
// through the wipe, but only for a palette whose ink colour is the same in both
// themes. Ours inverts, so there is no blend that preserves it in both
// directions and the panel covers everything on the way past.

import { gsap } from 'gsap';
import { prefersReducedMotion } from './ticker';

const DURATION = 1;
let running = false;

export function toggleTheme(): void {
  if (running) return;
  const root = document.documentElement;
  const mask = document.querySelector<HTMLElement>('.theme-mask');

  if (!mask || prefersReducedMotion()) {
    root.classList.toggle('theme-contrasted');
    return;
  }

  const goingDark = !root.classList.contains('theme-contrasted');
  running = true;

  // leaving the dark theme: change underneath first, then uncover
  if (!goingDark) root.classList.remove('theme-contrasted');

  gsap.fromTo(
    mask,
    // x is pinned to 0 as well as xPercent: the parked position lives in a CSS
    // transform, and without this the tween reads that as its own starting x
    // and stacks the percentage on top, sending the panel twice as far out
    { x: 0, xPercent: goingDark ? -100 : 0 },
    {
      xPercent: goingDark ? 0 : -100,
      duration: DURATION,
      ease: 'expo.inOut',
      onComplete: () => {
        // arriving at the dark theme: the page changes on the same frame the
        // panel is dropped, and both are the same colour, so nothing moves
        if (goingDark) root.classList.add('theme-contrasted');
        gsap.set(mask, { clearProps: 'transform' });  // back to the parked CSS default
        running = false;
      },
    },
  );
}
