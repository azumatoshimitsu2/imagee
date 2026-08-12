export default class ButtonHelp extends HTMLElement {
  constructor() {
    super();
    const template = `<style>
      button {
        background: transparent;
        border: 1px solid #fff;
        padding: .4rem;
        color: #fff;
        font-family: var(--en-sans);
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
        border-radius: 100px;
      }
    </style><button type="button"><slot/></button>`;
    this.attachShadow({'mode': 'open'});
    this.shadowRoot.innerHTML = template;
    const target = this.dataset.target;
    this.button = this.shadowRoot.querySelector('button');
    this.button.disabled = this.hasAttribute('disabled');
  }
};

