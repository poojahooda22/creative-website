// star.ts — the four-point mark, in one place.
//
// Each arm is a curve pulled in toward the centre, which is what keeps the
// points needle-sharp instead of letting them read as a fat diamond. That
// concave pull is the same thing a Minkowski form does with an exponent below
// one: the lower the exponent, the more the edges bow inward.
//
// Drawn on a 0 0 100 100 box so it can be dropped in at any size.
export const STAR_PATH =
  'M50 2 C53 33 67 47 98 50 C67 53 53 67 50 98 C47 67 33 53 2 50 C33 47 47 33 50 2 Z';
