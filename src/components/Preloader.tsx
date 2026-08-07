import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { fireIntro } from '../lib/events';
import { prefersReducedMotion } from '../lib/ticker';

/** When the baton goes out, and when the mark is gone. Named because the
 *  catch-up seek below is capped against the first and must not drift from it. */
const BATON = 1.9;
const END = 3.2;

/**
 * The first paint. A mark built from bare bars draws itself, collapses, and
 * hands the page over: the rest of the site waits on the intro event rather
 * than on this component, so nothing here needs to know what comes next.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (prefersReducedMotion()) {
      fireIntro();
      onDone();
      return;
    }

    const verticals = root.querySelectorAll<HTMLElement>('.pre__v');
    const horizontals = root.querySelectorAll<HTMLElement>('.pre__h');

    const tl = gsap.timeline();
    tl.fromTo(verticals, { scaleY: 0 }, {
      scaleY: 1, duration: 1, ease: 'power4.inOut', stagger: 0.15,
    }, 0);
    tl.fromTo(horizontals, { scaleX: 0 }, {
      scaleX: 1, duration: 0.4, ease: 'power4.inOut',
    }, 1);
    tl.set(verticals, { transformOrigin: '50% 0%' });
    tl.fromTo(verticals, { scaleY: 1 }, {
      scaleY: 0, duration: 1, ease: 'power4.in', stagger: 0.1,
    }, 2);
    // The baton goes out well before the curtain starts lifting, so the hero has
    // most of its reveal behind it by the time the mark clears. At 2.4 the gap
    // was 200ms against a 600ms fade, and the page was still assembling itself
    // in full view.
    tl.call(fireIntro, undefined, BATON);
    tl.to(root, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 2.6);
    tl.call(onDone, undefined, END);

    // Catch up to real elapsed time. The clock starts when the document is
    // parsed; if the bundle then took 900ms to arrive, the visitor has already
    // waited that 900ms and should not be charged for it twice.
    //
    // Capped at the baton, and never with events suppressed. Seeking past a
    // callback with suppressEvents on simply skips it — in dev the module graph
    // routinely takes longer than the whole timeline, so the seek landed at the
    // end and fireIntro was never called at all; only the failsafe below rescued
    // the page, four seconds in. Capping here means the mark's draw-in is what
    // compresses, and everything from the baton onward always plays in full.
    //
    // Only when the tab is actually being looked at. requestAnimationFrame is
    // throttled to nothing in a hidden tab and GSAP's ticker is a rAF loop, so
    // there the elapsed wall-clock is real but the animation has not run at all,
    // and catching up would skip a sequence the visitor has not yet seen.
    const clockStart = window.__introStart;
    if (document.visibilityState === 'visible' && typeof clockStart === 'number') {
      const already = (performance.now() - clockStart) / 1000;
      if (already > 0) tl.time(Math.min(already, BATON), false);
    }

    // A hard ceiling. Nothing in the page may hold the hero hostage: if the
    // timeline is starved for any reason, the baton goes out anyway. fireIntro
    // dispatches to `once` listeners, so a duplicate is harmless.
    const failsafe = window.setTimeout(() => { fireIntro(); onDone(); }, 4000);
    tl.call(() => window.clearTimeout(failsafe), undefined, END);

    return () => {
      window.clearTimeout(failsafe);
      tl.kill();
    };
  }, [onDone]);

  return (
    <div className="pre" ref={rootRef}>
      <div className="pre__mark" aria-label="Loading">
        <span className="pre__v" />
        <span className="pre__v" />
        <span className="pre__v" />
        <span className="pre__h" />
        <span className="pre__h pre__h--low" />
      </div>
    </div>
  );
}
