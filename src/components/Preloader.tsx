import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { fireIntro } from '../lib/events';
import { prefersReducedMotion } from '../lib/ticker';

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
    // the baton goes out before the curtain finishes lifting, so the page is
    // already moving by the time it clears
    tl.call(fireIntro, undefined, 2.4);
    tl.to(root, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 2.6);
    tl.call(onDone, undefined, 3.2);

    return () => { tl.kill(); };
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
