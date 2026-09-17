import { LitElement, html } from '../vendor/lit.js';

// Saved prose always crosses the DOM boundary as textContent, including imports.
class PlainText extends LitElement {
  static properties = { text: { type: String } };
  createRenderRoot() { return this; }
  render() { return html`<span></span>`; }
  updated() { this.querySelector('span').textContent = this.text ?? ''; }
}
customElements.define('plain-text', PlainText);
