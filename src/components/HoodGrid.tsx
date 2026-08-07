import { BRAND } from '../lib/brand';

/**
 * The specification block, which lives inside the About panel rather than in a
 * section of its own. Markup only: the reveal and the bubbles are owned by the
 * room around it, because they are drawn on the room's canvas and measured
 * against the room's box.
 */
export function HoodGrid() {
  return (
    <>
      <h2 className="room__label" id="architecture">Under the hood</h2>
      <div className="hood__grid">
        {BRAND.grid.map((cell) => (
          <article className={`hood__tile hood__tile--${cell.kind}`} key={cell.id}
            style={{ gridArea: cell.area }}>
            <div className="hood__tile__inner">
              <p className="hood__tile__title">{cell.title}</p>
              {cell.note ? <p className="hood__tile__note">{cell.note}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
