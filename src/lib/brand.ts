// brand.ts — everything this site says, in one place.
//
// The shell is a product company's landing page, not a portfolio. Pointing it
// at a different product means editing this file and nothing else: the header,
// the display line and the terminal all read from here.
//
// The product it currently advertises is an open-weights AI lab. That choice is
// not arbitrary — the page is built from monospace, a boot log and a binary
// rail, so it reads as something close to the machine. A drinks brand in this
// shell would be fighting the type, not wearing it.
//
// The name is invented on purpose. Dressing the page as a real company's site
// would make it an impersonation the moment it went live, and a made-up name
// can be shaped to fit the display face.

export const BRAND = {
  name: 'FLINT',

  /** the display line: two words around the star, and nothing else */
  headline: 'OPEN ✦ WEIGHTS',

  /** a product company's sections, not a freelancer's */
  nav: ['Models', 'Research', 'Company'] as const,

  /** the two stacked cells at top right: the claim, then what shipped */
  status: {
    claim: 'Open weights, open license, no waiting list.',
    release: 'Flint 3 is out, 32B and 8B',
    action: '→ Download',
  },

  /** where a lab like this actually lives. Placeholders until the org exists. */
  social: [
    { label: 'GitHub', href: 'https://github.com/poojahooda22' },
    { label: 'X', href: 'https://x.com' },
  ],

  /**
   * The terminal: a model coming up on a machine, one line at a time. The
   * typewriter used to narrate a designer at work, which is the single most
   * portfolio thing on the page. A boot log earns the same box.
   */
  terminal: [
    'Loading checkpoint…',
    'Verifying weights…',
    'Warming the cache…',
    'Sampling at temperature…',
    'Streaming first token…',
    'Ready on device…',
  ],
} as const;
