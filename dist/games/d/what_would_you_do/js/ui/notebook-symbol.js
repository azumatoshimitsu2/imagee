import { html } from '../vendor/lit.js';

// Use a vector mark so platforms cannot substitute a colored emoji.
export const notebookSymbol = html`<svg class="notebook-symbol" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false">
  <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5"></path>
</svg>`;
