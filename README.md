# creative-website

An animated product landing page built around three interactions: a curtain of lines you can comb
with the cursor, display type whose letters flip in place, and a full-screen wipe that changes the
theme without covering the artwork.

## Running it

Requires Node 18 or newer.

```
npm install
npm run dev
```

The dev server prints its address, by default `http://localhost:5173`.

```
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## How it is put together

React 19, TypeScript, Vite, Tailwind v4, GSAP for timelines and Lenis for smooth scrolling. Type is
Anton for display, Space Mono for interface, Instrument Serif for running text, all served from
Google Fonts.

The heavier pieces are plain classes in `src/lib`, with thin React components in `src/components`
that mount them and get out of the way. Nothing animates through React state.

| Piece | What it does |
|---|---|
| `lib/wave-field.ts` | The line curtain. Vertical SVG paths drifting on a flow field, with a spring-damped push where the pointer passes. Ambient drift and cursor displacement are tracked separately and summed at draw time, so the field keeps breathing while you push it. |
| `lib/perlin.ts` | Classic gradient noise, seeded, used to drive the flow field. |
| `lib/ticker.ts` | One animation frame loop for the whole page. Everything subscribes to it rather than starting its own. |
| `lib/theme.ts` | The contrast switch. A single panel slides across, and the moment the palette flips relative to that slide is what makes the change read as painted on rather than snapped. |
| `lib/brand.ts` | Every word the site says. Pointing the page at a different product means editing this file alone. |
| `lib/headline.ts` | Alternate display lines, selectable with `?h=` while a headline is being chosen. |
| `components/HeroTitle.tsx` | Splits the display line into per-character boxes and measures the result, resizing the type so the line spans the viewport whatever it says. |

## Notes

Every character in the display line is its own clipped box holding three copies of its letter, one
row and one column. Sliding a character a full step in any direction brings an identical copy into
view, which is how a letter can flip forever without JavaScript touching it per frame.

The theme wipe uses a blend mode rather than an opaque panel, so the line art and type survive the
sweep instead of being erased by it. This works because only the background changes between the two
themes and the ink stays put.

Motion is disabled throughout when the visitor has asked their system to reduce it.
