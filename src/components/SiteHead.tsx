import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { onIntro } from '../lib/events';
import { toggleTheme } from '../lib/theme';
import { BRAND } from '../lib/brand';

const LINES = BRAND.terminal;

/** Pacing per character: punctuation buys a pause, ordinary letters fly. */
function delayFor(ch: string): number {
  if (ch === '…') return 400;
  if (ch === '.') return 400;
  if (ch === ',') return 100;
  if (ch === ' ') return 200;
  return 22;
}

export function SiteHead() {
  const headRef = useRef<HTMLElement>(null);
  const termRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const head = headRef.current;
    const term = termRef.current;
    if (!head || !term) return;

    const cells = Array.from(head.querySelectorAll<HTMLElement>('.head__rise'));

    if (prefersReducedMotion()) {
      gsap.set(head, { opacity: 1 });
      term.textContent = LINES[0];
      return;
    }

    const offIntro = onIntro(() => {
      const tl = gsap.timeline();
      tl.set(head, { opacity: 1 });
      tl.from(head, { yPercent: -100, duration: 1.5, ease: 'expo.inOut' }, 0);
      tl.from(cells, {
        yPercent: -100, duration: 1.5, ease: 'expo.out', stagger: 0.1,
      }, 0.5);
      tl.call(() => { typing = true; }, undefined, 0.5);
    });

    // typewriter: one shared clock, no timers of its own
    let typing = false;
    let queue = '';
    let nextAt = 0;
    let previous = -1;

    const unsubscribe = subscribe((elapsed) => {
      if (!typing || elapsed < nextAt) return;
      if (queue === '') {
        let index = Math.floor(Math.random() * LINES.length);
        if (index === previous) index = (index + 1) % LINES.length;
        previous = index;
        queue = `\n${LINES[index]}`;
        nextAt = elapsed + 1400;
        return;
      }
      const ch = queue[0];
      queue = queue.slice(1);
      nextAt = elapsed + delayFor(ch);
      const next = term.textContent + ch;
      term.textContent = next.split('\n').slice(-4).join('\n');
    });

    return () => {
      offIntro();
      unsubscribe();
      gsap.killTweensOf(head);
    };
  }, []);

  return (
    <header className="head" ref={headRef} aria-label="Main">
      <div className="head__cell head__cell--logo">
        <span className="head__rise">
          <a className="logo" href="/" aria-label={`${BRAND.name} home`}>
            <span className="logo__mark" aria-hidden="true"><i /><i /><i /></span>
            <span className="logo__name">{BRAND.name}</span>
          </a>
        </span>
      </div>

      <div className="head__cell head__cell--term">
        <span className="head__rise">
          <pre className="term" ref={termRef} aria-hidden="true" />
        </span>
      </div>

      <nav className="head__cell head__cell--nav" aria-label="Sections">
        {BRAND.nav.map((label) => (
          <span className="head__rise" key={label}>
            <a className="navlink" href={`#${label.toLowerCase()}`}>
              <span className="navlink__caret" aria-hidden="true" />
              {label}
            </a>
          </span>
        ))}
      </nav>

      <div className="head__cell head__cell--social">
        <a className="social" href="https://github.com/poojahooda22" target="_blank"
          rel="noreferrer noopener" aria-label="GitHub profile">
          <span>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
                1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
                0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0
                1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0
                3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01
                8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </span>
        </a>
        <a className="social" href={BRAND.social[1].href} target="_blank"
          rel="noreferrer noopener" aria-label={`${BRAND.name} on ${BRAND.social[1].label}`}>
          <span>{BRAND.social[1].label}</span>
        </a>
      </div>

      <div className="head__cell head__cell--toggle">
        <button className="contrast" type="button" aria-label="Toggle light and dark theme"
          onClick={toggleTheme}>
          <span className="contrast__icon" aria-hidden="true" />
        </button>
      </div>

      <div className="head__cell head__cell--status">
        <span className="head__rise status">{BRAND.status.claim}</span>
        <span className="head__rise status">
          {BRAND.status.release} <em>{BRAND.status.action}</em>
        </span>
      </div>

    </header>
  );
}
