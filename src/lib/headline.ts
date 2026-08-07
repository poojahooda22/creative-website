// headline.ts — the display line, swappable from the URL while we settle on one.
//
// The live line lives in brand.ts with the rest of the copy; the extras here
// are only so alternatives can be judged at full size rather than from a list.
//
// Every candidate is two words around the star. The title splits on spaces and
// gives each glyph its own animated box, so the mark has to sit alone between
// exactly two words or it stops reading as a centre point. Length is free — the
// line measures itself and grows to fill the screen whatever it says.

import { BRAND } from './brand';

const ALTERNATES: Record<string, string> = {
  'open-weights': BRAND.headline,
  'think-locally': 'THINK ✦ LOCALLY',
  'runs-anywhere': 'RUNS ✦ ANYWHERE',
  'nothing-hidden': 'NOTHING ✦ HIDDEN',
  'yours-entirely': 'YOURS ✦ ENTIRELY',
  'weights-included': 'WEIGHTS ✦ INCLUDED',
  'frontier-unsealed': 'FRONTIER ✦ UNSEALED',
};

export function resolveHeadline(): string {
  const key = new URLSearchParams(location.search).get('h');
  return (key && ALTERNATES[key]) || BRAND.headline;
}
