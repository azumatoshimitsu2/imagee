export default class SiteHeader extends HTMLElement {
  constructor() {
    super();
    const template = `<style>
    .sitename {
      background: #0f131a;
      padding: .5em 1em;
      font-family: serif;
      font-style: italic;
      display: flex;
      justify-content: space-between;
    }
    .sitename a {
      width: 100px;
      display: block;
      font-size: 1rem;
      color: #fff;
      text-decoration: none;
      line-height: 1;
    }
    img {
      max-width: 100%;
      height: auto;
      vertical-align: top;
    }
    @media screen and (max-width: 500px) {
      .sitename {
        padding: .4em 1em;
        text-align: center;
      }
      .sitename a {
        font-size: .8rem;
      }
    }
    </style><header class="sitename"><a href="/"><img src="/assets/img/common/logo2.png"></a><slot/></header>`;
    this.attachShadow({'mode': 'open'});
    this.shadowRoot.innerHTML = template;
  }
};

// customElements.define('site-header', SiteHeader);
