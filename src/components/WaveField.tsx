import { useEffect, useRef } from 'react';
import { WaveField as Engine } from '../lib/wave-field';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { onIntro } from '../lib/events';

export function WaveField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new Engine(host);
    let unsubscribe: (() => void) | undefined;

    if (prefersReducedMotion()) {
      engine.drawStatic();
      return () => engine.dispose();
    }

    const offIntro = onIntro(() => {
      // lines draw themselves on first, then the field comes alive
      void engine.introDraw().then(() => {
        unsubscribe = subscribe((elapsed) => engine.tick(elapsed));
      });
    });

    return () => {
      offIntro();
      unsubscribe?.();
      engine.dispose();
    };
  }, []);

  return <div className="wave" ref={hostRef} aria-hidden="true" />;
}
