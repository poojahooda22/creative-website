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
      {/* The ref stays on this wrapper and NOT on the face inside it. The face
          rotates, and a rotating square's measured box swells to its diagonal
          and back on every turn; the vanishing point has to be read off
          something that holds still. */}
      <div className="field__core" ref={coreRef} aria-hidden="true">
        <svg className="field__face" viewBox="0 0 100 100">
          {/* Proportions taken from the reference and expressed against a
              hundred-unit box, so the face holds its shape at 90px on the
              desktop and 64px on the narrow layout without a second set of
              numbers. Eyes sit at 39.5% of the height, one fifth of the box
              either side of centre. */}
          <ellipse className="field__face-eye" cx="32.8" cy="39.5" rx="5.4" ry="9.76" />
          <ellipse className="field__face-eye" cx="67.2" cy="39.5" rx="5.4" ry="9.76" />
          {/* radius equals half the chord, which is exactly 180 degrees */}
          <path className="field__face-mouth" d="M20.95 50.1A29.05 29.05 0 0 0 79.05 50.1" />
        </svg>
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
                      /* the file's real pixel dimensions: they reserve the
                         right box before decode, and the card takes its height
                         from them, so a wrong pair here reshapes the frame */
                      width={episode.w}
                      height={episode.h}
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
