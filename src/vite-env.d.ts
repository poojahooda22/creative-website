/// <reference types="vite/client" />

declare global {
  interface Window {
    /**
     * When the document was parsed, in performance.now() terms. Set by an inline
     * script in index.html so the intro clock does not start at "the bundle has
     * finished downloading and React has mounted", which is a variable and
     * sometimes large amount of time after the visitor asked for the page.
     */
    __introStart?: number;
  }
}

export {};
