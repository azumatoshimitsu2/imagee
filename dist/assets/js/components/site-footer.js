export default class SiteFooter extends HTMLElement {
  constructor() {
    super();
    const template = `<style>
    footer {
      background: linear-gradient(to right,#0a111b,#0a101e);
      padding: 1rem .4rem;
      text-align: center;
      color:#fff
    }
    </style><footer><small>&copy; DELFT</small></footer>`;
    this.attachShadow({'mode': 'open'});
    this.shadowRoot.innerHTML = template;
  }
};

// customElements.define('site-header', SiteHeader);
