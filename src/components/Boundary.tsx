import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * A fence around one section.
 *
 * React unmounts the entire tree when a render throws anywhere in it, so
 * without this a single bad section takes the whole page down to a blank
 * document. Wrapping each section means a failure costs that section and
 * nothing else: the rest of the page stays up and scrollable.
 *
 * There is deliberately no fallback UI. These are decorative panels, and a
 * visitor is better served by the page quietly being one section shorter than
 * by an apology box in the middle of it. The error still goes to the console
 * in full, so it is never silent to whoever is looking for it.
 */
export class Boundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`section "${this.props.name}" failed to render and was dropped`, error, info);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
