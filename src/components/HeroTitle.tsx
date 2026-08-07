import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { onIntro } from '../lib/events';

const DIRECTIONS = ['to-top', 'to-right', 'to-bottom', 'to-left'] as const;
const FLIP_CHANCE = 0.01;   // per frame, per title: sparse on purpose
const FLIP_HOLD_MS = 2000;

/** Only letters and digits swap; punctuation and symbols stay put. */
const isSwappable = (ch: string): boolean => /[\p{L}\p{N}]/u.test(ch);

/** The mark that separates the two words: a four-point star drawn as one path,
 *  each arm a curve pulled in toward the centre so the points stay needle-sharp. */
const STAR_CHAR = '✦';
const STAR_PATH = 'M50 2 C53 33 67 47 98 50 C67 53 53 67 50 98 C47 67 33 53 2 50 C33 47 47 33 50 2 Z';

/**
 * The line is a poster: it should touch both edges whatever it says. The size
 * in the stylesheet is only a starting guess — it was tuned against one
 * particular string, so a shorter headline would sit marooned in the middle.
 *
 * Measure the real ink and correct the size to match the space. Twice, because
 * width scales linearly with the size so the first pass lands within a pixel
 * and the second clears the rounding.
 *
 * Clearing the inline size first matters: without it every resize would scale
 * the already-scaled value and the line would walk away from the edges.
 */
function fitLine(root: HTMLElement): void {
  root.style.fontSize = '';
  // narrow screens let the line wrap, and a wrapped line has no single width
  // to fit against — leave those to the stylesheet
  if (getComputedStyle(root).whiteSpace !== 'nowrap') return;

  const range = document.createRange();
  for (let pass = 0; pass < 2; pass += 1) {
    const styles = getComputedStyle(root);
    const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const available = root.clientWidth - padding;
    range.selectNodeContents(root);
    const ink = range.getBoundingClientRect().width;
    if (ink <= 0 || available <= 0) return;
    root.style.fontSize = `${parseFloat(styles.fontSize) * (available / ink)}px`;
  }
}

/**
 * The display line. Each character is rendered transparent; what you actually
 * see are two pseudo-elements holding three copies of the letter, one row and
 * one column. Sliding the character a full 100% in any direction brings an
 * identical copy into the box, so a letter can swap forever without JavaScript
 * touching it per frame.
 *
 * Two nested spans on purpose: the intro tween owns the outer one and the flip
 * keyframes own the inner one. Sharing a single element would make GSAP's
 * inline transform and the keyframe fight, and the letter would drift
 * diagonally instead of tracking one axis.
 */
export function HeroTitle({ text }: { text: string }) {
  const rootRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.replaceChildren();
    const words = text.split(' ');
    for (const [wordIndex, word] of words.entries()) {
      const wordEl = document.createElement('span');
      wordEl.className = 'word';
      for (const letter of word) {
        const isStar = letter === STAR_CHAR;
        const charEl = document.createElement('span');
        charEl.className = isStar
          ? 'char char--fixed char--star'
          : isSwappable(letter) ? 'char' : 'char char--fixed';
        const reveal = document.createElement('span');
        reveal.className = 'char__reveal';
        const inner = document.createElement('span');
        inner.className = 'char__inner';
        if (isStar) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 100 100');
          svg.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', STAR_PATH);
          svg.appendChild(path);
          inner.appendChild(svg);
        } else {
          inner.dataset.letter = letter;
          inner.textContent = letter;
        }
        reveal.appendChild(inner);
        charEl.appendChild(reveal);
        wordEl.appendChild(charEl);
      }
      root.appendChild(wordEl);
      // between words only: a trailing space would be measured as part of the
      // line and push it off-centre by half a space when the size is fitted
      if (wordIndex < words.length - 1) root.appendChild(document.createTextNode(' '));
    }

    const swappable = Array.from(root.querySelectorAll<HTMLElement>('.char:not(.char--fixed)'));
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.char__reveal'));

    let disposed = false;
    let refitFrame = 0;
    const refit = () => {
      if (disposed) return;
      cancelAnimationFrame(refitFrame);
      refitFrame = requestAnimationFrame(() => fitLine(root));
    };
    fitLine(root);
    // the first measurement can land on the fallback face; once the display
    // font is in, the glyph widths change and the fit has to be redone
    document.fonts.ready.then(refit);
    window.addEventListener('resize', refit);

    const stopFitting = () => {
      disposed = true;
      cancelAnimationFrame(refitFrame);
      window.removeEventListener('resize', refit);
    };

    if (prefersReducedMotion()) return stopFitting;

    // Reveal state: the stand-in copies are switched off and the per-character
    // clip is released, so a letter parked below the line is genuinely absent
    // rather than showing the copy that normally waits there. The outer mask
    // hides everything until each letter climbs into place.
    root.classList.add('is-revealing');
    gsap.set(reveals, { yPercent: 100 });

    const offIntro = onIntro(() => {
      gsap.to(reveals, {
        yPercent: 0,
        duration: 1.15,
        ease: 'expo.out',
        stagger: 0.035,
        delay: 0.35,
        onComplete: () => root.classList.remove('is-revealing'),
      });
    });

    const timeouts = new Set<number>();
    const unsubscribe = subscribe(() => {
      if (Math.random() > FLIP_CHANCE) return;
      const char = swappable[Math.floor(Math.random() * swappable.length)];
      if (DIRECTIONS.some((d) => char.classList.contains(d))) return;
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      char.classList.add(dir);
      const id = window.setTimeout(() => {
        char.classList.remove(dir);
        timeouts.delete(id);
      }, FLIP_HOLD_MS);
      timeouts.add(id);
    });

    return () => {
      stopFitting();
      offIntro();
      unsubscribe();
      timeouts.forEach((id) => window.clearTimeout(id));
      gsap.killTweensOf(reveals);
    };
  }, [text]);

  return <h1 className="hero__title" ref={rootRef} aria-label={text} />;
}
