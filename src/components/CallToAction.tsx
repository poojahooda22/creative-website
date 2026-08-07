import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { RippleGrid } from '../lib/ripple-grid';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { BRAND } from '../lib/brand';
import { STAR_PATH } from '../lib/star';

/**
 * The closing panel.
 *
 * A lattice of springs with a button sitting on it. The button breathes, and on
 * every beat it sends a ring out through the lattice. Reaching for it lands a
 * much harder ring and opens the disc.
 *
 * The framing is not decoration: a pulse travelling out through a mesh and
 * coming back is what a recall query does to a memory graph. Same code as any
 * ripple, but here it is the product's own gesture.
 */
export function CallToAction() {
  const hostRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    const button = buttonRef.current;
    const hover = hoverRef.current;
    if (!host || !stage || !button || !hover) return;
    if (prefersReducedMotion()) return;

    // The lattice covers the whole panel, including the ground reserved at the
    // top for the type bleeding down from the section above. Confining it to the
    // stage left that reserved band blank white, so the type crossed the seam
    // onto nothing.
    const grid = new RippleGrid(host, button);
    const label = button.querySelector<HTMLElement>('.cta__label');

    // the idle heartbeat: swell, strike the lattice, snap back
    const beat = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
    beat.call(() => grid.pulse(15, 1));
    beat.fromTo(label, { scale: 0.85 }, { scale: 1.05, duration: 2.7, ease: 'power2.in' });
    beat.to(label, { scale: 0.85, duration: 0.15, ease: 'power4.out' });

    let shockTimer = 0;
    const onEnter = () => {
      hover.classList.add('is-open');
      beat.pause();
      // the hard ring lands slightly after the disc starts opening, so the
      // lattice recoils from the disc rather than announcing it
      shockTimer = window.setTimeout(() => grid.pulse(30, 5), 600);
      gsap.to(grid, { open: 1, delay: 0.3, duration: 1.2, ease: 'expo.inOut', overwrite: true });
    };
    const onLeave = () => {
      hover.classList.remove('is-open');
      window.clearTimeout(shockTimer);
      beat.play(0);
      gsap.to(grid, { open: 0, duration: 0.7, ease: 'expo.inOut', overwrite: true });
    };
    hover.addEventListener('mouseenter', onEnter);
    hover.addEventListener('mouseleave', onLeave);

    let unsubscribe: (() => void) | undefined;
    const presence = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !unsubscribe) {
          unsubscribe = subscribe((_e, delta) => grid.tick(delta));
          beat.play();
        } else if (!entry.isIntersecting && unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
          beat.pause();
        }
      },
      { threshold: 0 },
    );
    presence.observe(host);

    const resizeObserver = new ResizeObserver(() => grid.resize());
    resizeObserver.observe(host);

    return () => {
      presence.disconnect();
      resizeObserver.disconnect();
      unsubscribe?.();
      window.clearTimeout(shockTimer);
      hover.removeEventListener('mouseenter', onEnter);
      hover.removeEventListener('mouseleave', onLeave);
      beat.kill();
      gsap.killTweensOf(grid);
      grid.dispose();
    };
  }, []);

  return (
    <section className="cta" ref={hostRef}>
      <div className="cta__stage" ref={stageRef}>
      <div className="cta__hover" ref={hoverRef}>
        <button className="cta__button" type="button" ref={buttonRef}
          onClick={() => window.open(BRAND.repo, '_blank', 'noreferrer')}>
          <span className="cta__label">{BRAND.cta.button}</span>
        </button>

        <span className="cta__ring" aria-hidden="true" />

        <div className="cta__disc" aria-hidden="true">
          <span className="cta__dots" />
          {[0, 1, 2, 3].map((i) => (
            <svg className={`cta__star cta__star--${i}`} key={i} viewBox="0 0 100 100">
              <path d={STAR_PATH} />
            </svg>
          ))}
          <span className="cta__lines">
            {BRAND.cta.lines.map((line) => <span key={line}>{line}</span>)}
          </span>
          <span className="cta__address">{BRAND.cta.address}</span>
        </div>
      </div>
      </div>

      {/* its own band: the lattice ends at the rule above this */}
      <div className="cta__foot">
        <a className="cta__mark" href={BRAND.repo} target="_blank" rel="noreferrer noopener"
          aria-label={`${BRAND.name} on GitHub`}>
          <i /><i /><i />
        </a>
      </div>
    </section>
  );
}
