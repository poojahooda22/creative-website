import { useEffect, useRef } from 'react';
import { MemoryField as Engine, POOL } from '../lib/memory-field';
import { subscribe, prefersReducedMotion } from '../lib/ticker';
import { BRAND } from '../lib/brand';
import { STAR_PATH } from '../lib/star';

/**
 * The arrivals corridor.
 *
 * At the vanishing point sits the index: a ring holding a lattice of cells,
 * turning slowly, with a light running through it. Deliberately not a face.
 * A face would make the page about a character, and this page is about the
 * thing that catches what you said. The lattice reads as storage, and it is
 * the same vocabulary as the bubbles in the section above rather than a second
 * unrelated mascot.
 *
 * Cards fly out of it carrying real episodes, and the type on the floor recedes
 * into the same point.
 */
export function MemoryField() {
  const hostRef = useRef<HTMLElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const core = coreRef.current;
    const stage = stageRef.current;
    if (!host || !core || !stage) return;

    const field = new Engine(host, core, stage);

    if (prefersReducedMotion()) {
      field.drawStatic();
      return () => field.dispose();
    }

    let unsubscribe: (() => void) | undefined;
    const presence = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !unsubscribe) {
          unsubscribe = subscribe((_elapsed, delta) => field.tick(delta));
        } else if (!entry.isIntersecting && unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
        }
      },
      { threshold: 0 },
    );
    presence.observe(host);

    const resizeObserver = new ResizeObserver(() => field.resize());
    resizeObserver.observe(host);

    return () => {
      presence.disconnect();
      resizeObserver.disconnect();
      unsubscribe?.();
      field.dispose();
    };
  }, []);

  return (
    <section className="field" ref={hostRef}>
      <div className="field__core" ref={coreRef} aria-hidden="true">
        <span className="field__core-ring" />
        <span className="field__core-lattice">
          {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}
        </span>
      </div>

      <div className="field__stage" ref={stageRef} aria-hidden="true">
        {Array.from({ length: POOL }, (_, i) => {
          // every fourth object is a star rather than a frame, so the field has
          // a rhythm instead of reading as one repeated card
          if (i % 4 === 3) {
            return (
              <div className="flyer flyer--star is-parked" key={i}>
                <svg className="flyer__star" viewBox="0 0 100 100"><path d={STAR_PATH} /></svg>
              </div>
            );
          }
          const episode = BRAND.episodes[i % BRAND.episodes.length];
          return (
            <div className="flyer is-parked" key={i}>
              <div className="flyer__face">
                <span className="flyer__plate">
                  {episode.image ? (
                    <img
                      src={`/episodes/${episode.image}`}
                      alt=""
                      width={384}
                      height={512}
                      /* eager, not lazy: these sit far off-screen at rest, and the
                         browser never counts them as "in viewport", so a lazy
                         image can go the whole page without decoding and the
                         first flight shows an empty frame */
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      /* A missing file is silent in dev: the server answers a
                         404 with the app's own HTML and a 200, so the tag fails
                         as "not an image" and logs nothing. Say so out loud. */
                      onError={(event) => {
                        console.error('episode image failed to load:',
                          (event.currentTarget as HTMLImageElement).src);
                      }}
                    />
                  ) : null}
                </span>
                <span className="flyer__caption">{episode.caption}</span>
              </div>
              <span className="flyer__side flyer__side--x" />
              <span className="flyer__side flyer__side--y" />
            </div>
          );
        })}
      </div>

      {/* The same block twice. The near copy is sheared onto the floor and cut
          off at this section's edge; the far copy is flat and begins one pixel
          above that cut, continuing over the panel below. A letter leaves one
          clip and reappears in the other at the same pixel, so the type walks
          off the floor and stands up instead of either stopping dead at the
          boundary or running loose across the next section. */}
      <div className="field__catcher" aria-hidden="true">
        <div className="field__catcher-wrap field__catcher-wrap--near">
          <div className="field__catcher-plane">
            <div className="field__catcher-text field__catcher-text--near">
              {BRAND.floor.map((line) => <span key={line}>{line}</span>)}
            </div>
          </div>
        </div>
        <div className="field__catcher-wrap field__catcher-wrap--far">
          <div className="field__catcher-plane field__catcher-plane--flat">
            <div className="field__catcher-text field__catcher-text--far">
              {BRAND.floor.map((line) => <span key={line}>{line}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
