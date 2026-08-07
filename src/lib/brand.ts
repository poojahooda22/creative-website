// brand.ts — everything this site says, in one place.
//
// Pointing the page at a different product means editing this file and nothing
// else: the header, the display line, the corridor panel and the specification
// grid all read from here.
//
// Every claim below is drawn from the project's own README. There are no
// benchmark figures anywhere, on purpose. The two established products in this
// space are in an open dispute over whose numbers are real, so a third set of
// unaudited numbers would buy nothing, and the project is early enough that any
// figure would be invented. What it has instead is a schema, and a schema is
// checkable.

/** A tile in the specification grid. Header and footer tiles carry no note. */
export interface GridCell {
  id: string;
  kind: 'wide' | 'brand' | 'text';
  /** row-start / column-start / row-end / column-end, across four columns */
  area: string;
  title: string;
  note?: string;
}

/*
 * Four rows. The first and the last run the full width, and the middle band is
 * one tall block on the left against a wide line and a single square on the
 * right, with one cell left unclaimed so the hatch shows through.
 *
 * Nothing here is a paper number. A reader who does not already know the
 * literature learns nothing from "arXiv 2502.06975", and a tile that teaches
 * nothing is decoration wearing a technical costume. Every cell below is a
 * thing the repository actually contains.
 */
const GRID: readonly GridCell[] = [
  { id: 'head', kind: 'wide', area: '1 / 1 / 2 / 5', title: 'Two papers, one engine' },
  {
    id: 'episodes', kind: 'brand', area: '2 / 1 / 4 / 3',
    title: 'episodes', note: 'what happened, with its when, where and why',
  },
  {
    id: 'ops', kind: 'text', area: '2 / 3 / 3 / 5',
    title: 'Facts are added, updated or retired. Nothing is deleted quietly.',
  },
  {
    id: 'mcp', kind: 'brand', area: '3 / 4 / 4 / 5',
    title: 'mcp', note: 'recall and remember, from any host',
  },
  {
    id: 'foot', kind: 'wide', area: '4 / 1 / 5 / 5',
    title: 'FastAPI, Postgres and pgvector. One database, no new infrastructure.',
  },
];

/** One address for the project, used by the mark, the nav and the socials. */
const REPO = 'https://github.com/poojahooda22/chat-memory';

export const BRAND = {
  name: 'chat-memory',

  /** the mark in the header links straight here; there is nowhere else to go yet */
  repo: REPO,

  /** the display line: two words around the star, and nothing else */
  headline: 'EPISODIC ✦ RECALL',

  nav: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Get started', href: REPO },
  ],

  /** the two stacked cells at top right: the claim, then the way in */
  status: {
    claim: 'Memory your assistant can explain, not just recall.',
    release: 'Open source, self-hosted, your data stays yours',
    action: '→ Read the code',
  },

  social: [
    { label: 'GitHub', href: REPO },
    { label: 'X', href: 'https://x.com' },
  ],

  /**
   * The terminal: the extraction pipeline talking to itself. It teaches the
   * product passively, which is more than a decorative typewriter earns.
   */
  terminal: [
    'Reading the conversation…',
    'Writing the episode, with its when and where…',
    'Distilling a durable fact…',
    'Searching for similar memories…',
    'Deciding: add, update, delete or leave alone…',
    'Linking the fact back to its episode…',
    'Rolling summary updated…',
    'Nothing deleted, only superseded.',
  ],

  /**
   * This is the only place on the page that explains what the thing is, so it
   * gets the room. Anyone who leaves after reading these four paragraphs should
   * be able to describe the product to someone else.
   */
  about: [
    'Every conversation with an assistant starts from nothing. You reintroduce '
    + 'yourself, restate what you are working on, and explain the same preferences '
    + 'you explained yesterday. The assistant is not being careless. It genuinely '
    + 'has no yesterday.',

    'A bigger context window does not fix this. A long context is working memory: '
    + 'it can hold a great deal while you are in the room, and it keeps none of it '
    + 'once you leave. A bigger desk is not a filing cabinet.',

    'chat-memory is the filing cabinet. It reads a conversation, writes down what '
    + 'happened as a timestamped episode, and distils the durable facts out of it. '
    + 'The episode keeps its own when, where and why. The fact keeps a link back to '
    + 'the episode that produced it, so the assistant can always show its working.',

    'That link is the point. When a new fact arrives, the system decides whether to '
    + 'add it, update what was already believed, or retire what it contradicts, and '
    + 'it records the decision either way. You can ask not only what your assistant '
    + 'knows about you, but why it thinks so, and you can remove one memory without '
    + 'demolishing the rest.',
  ],

  /**
   * The specification grid. Two cells are deliberately left unclaimed so the
   * hatch behind the grid shows through; that gap is doing as much visual work
   * as the tiles.
   */
  grid: GRID,

  /**
   * The cards that fly out of the vanishing point. These are not decoration:
   * each one is an episode as the system would actually hold it, a thing that
   * happened with the time it happened at. A visitor understands the data model
   * in three seconds without reading a line of prose.
   */
  /*
   * `image` is a portrait file under public/episodes/. Leave it out and the
   * frame shows an empty plate instead: an honest "no photo yet" rather than a
   * stock face pretending to be someone's memory. Drop a file in and set the
   * name here and it appears with no other change.
   */
  episodes: [
    { caption: 'MONTY · GOA · JAN 2023', image: 'dog.jpg' },
    { caption: 'THE VILLAGE ABOVE THE LAKE', image: 'village.jpg' },
    { caption: 'BLUE LAGOON · MAR 2023', image: 'lagoon.jpg' },
    { caption: 'RODE THE RIDGE · SEP 2021', image: 'ridge.jpg' },
    { caption: 'KYOTO · APR 2024', image: 'pagoda.jpg' },
    { caption: 'THE COVE · JUN 2023', image: 'cove.jpg' },
  ] as readonly { caption: string; image?: string }[],

  /**
   * Lying flat on the floor, receding to the vanishing point. Four lines, and
   * the order is the whole trick: the shear makes each one larger than the one
   * above it, so the sentence arrives from the far distance and the count lands
   * at your feet.
   */
  floor: ['REMEMBER', 'SINCE', 'TURN', '001'],

  /** The closing panel. The button asks; the disc behind it answers. */
  cta: {
    button: 'ASK',
    lines: ['LET’S', 'CONNECT'],
    address: 'GITHUB.COM/POOJAHOODA22/CHAT-MEMORY',
  },
} as const;
