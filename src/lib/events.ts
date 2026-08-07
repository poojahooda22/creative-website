// events.ts — the intro baton. The preloader fires one event when its logo
// sequence is nearly finished; the header, the wave field and the headline each
// listen for it and start their own timeline. No shared timeline object, no
// imports between those modules.

export const INTRO_EVENT = 'site:intro';

export function fireIntro(): void {
  document.dispatchEvent(new CustomEvent(INTRO_EVENT));
}

export function onIntro(handler: () => void): () => void {
  document.addEventListener(INTRO_EVENT, handler, { once: true });
  return () => document.removeEventListener(INTRO_EVENT, handler);
}
