import { Fragment, useEffect, useRef } from 'react';
import { subscribe, prefersReducedMotion } from '../lib/ticker';

const GROUPS = 8;
const DIGITS_PER_GROUP = 8;

/**
 * A rail of flickering binary broken up by runs of slashes.
 *
 * Every digit is a span whose ::before holds the literal text "01" in a
 * two-line-tall box; flipping a class slides that box, so switching a 0 to a 1
 * costs one class change and never touches a text node.
 */
export function Separator() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const digits = Array.from(root.querySelectorAll<HTMLElement>('.sep__digit'));

    return subscribe(() => {
      for (const digit of digits) {
        if (Math.random() > 0.08) continue;
        digit.classList.toggle('is-one', Math.random() > 0.5);
      }
    });
  }, []);

  return (
    <div className="sep" ref={rootRef} aria-hidden="true">
      <span className="sep__mark">&#9654;</span>
      {Array.from({ length: GROUPS }, (_, g) => (
        <Fragment key={g}>
          <span className="sep__code">
            {Array.from({ length: DIGITS_PER_GROUP }, (_, d) => (
              <span className={`sep__digit${Math.random() > 0.5 ? ' is-one' : ''}`} key={d} />
            ))}
          </span>
          <span className="sep__fill" />
        </Fragment>
      ))}
      <span className="sep__mark">&#9664;</span>
    </div>
  );
}
