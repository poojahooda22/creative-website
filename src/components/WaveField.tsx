import { useEffect, useRef } from 'react';
import { WaveField as Engine } from '../lib/wave-field';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { onIntro } from '../lib/events';

export function WaveField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // the engine paints its resting grid as it builds, so the hero is never an
    // empty box waiting on a promise
    const engine = new Engine(host);

    if (prefersReducedMotion()) {
      host.classList.add('is-revealed');
      return () => engine.dispose();
    }

    // The field breathes from the first frame it is ON SCREEN. The intro decides
    // only when the curtain is uncovered — it does not gate the field's
    // existence or its motion, which is what the previous await chain did.
    //
    // This is the most expensive thing on the page: seven thousand noise samples
    // and ninety kilobytes of path string per frame. Run ungated it costs that
    // even when the hero is scrolled a whole page away, which is most of the
    // visit. The field simply stops when it leaves the viewport and picks up
    // where it left off, exactly as the other three sections already do.
    let unsubscribe: (() => void) | undefined;
    const presence = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !unsubscribe) {
          unsubscribe = subscribe((elapsed, delta) => engine.tick(elapsed, delta));
        } else if (!entry.isIntersecting && unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
        }
      },
      { threshold: 0 },
    );
    presence.observe(host);

    const offIntro = onIntro(() => engine.beginReveal());

    return () => {
      presence.disconnect();
      offIntro();
      unsubscribe?.();
      engine.dispose();
    };
  }, []);

  return <div className="wave" ref={hostRef} aria-hidden="true" />;
}
