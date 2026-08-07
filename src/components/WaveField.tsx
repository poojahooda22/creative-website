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

    // The field breathes from the first frame. The intro decides only when the
    // curtain is uncovered — it does not gate the field's existence or its
    // motion, which is what the previous await chain did.
    const unsubscribe = subscribe((elapsed) => engine.tick(elapsed));
    const offIntro = onIntro(() => engine.beginReveal());

    return () => {
      offIntro();
      unsubscribe();
      engine.dispose();
    };
  }, []);

  return <div className="wave" ref={hostRef} aria-hidden="true" />;
}
