import { useEffect } from 'react';
import Lenis from 'lenis';
import { subscribe, prefersReducedMotion } from '../lib/ticker';

/**
 * Smooth scrolling on the shared clock. Lenis is driven from the same rAF loop
 * as everything else, so the page never runs two competing frame callbacks.
 * Also takes over in-page anchor jumps so they glide instead of teleport.
 */
export function useLenis(): void {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    const unsubscribe = subscribe((elapsed) => lenis.raf(elapsed));

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a[href^="#"]');
      const href = anchor?.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { duration: 1.5 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      unsubscribe();
      lenis.destroy();
    };
  }, []);
}
