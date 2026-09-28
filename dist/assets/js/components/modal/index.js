import { wasDismissed, rememberDismissal } from './dismissal-storage.js';

const sheetPromise = fetch(new URL('/assets/js/components/modal/index.css', import.meta.url))
  .then(res => res.text())
  .then(css => {
    const sheet = new CSSStyleSheet();
    return sheet.replace(css).then(() => sheet);
  });

export default class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<div class="c-modal js-modal-close-btn" role="dialog" tabindex="-1">
      <div class="c-modal__wrap">
        <div class="p-modal__content js-modal-main">
          <div><slot></slot></div>
          <button type="button" class="c-modal__close-btn js-modal-close-btn" aria-label="閉じる"></button>
        </div>
      </div>
    </div>`;
    sheetPromise.then(sheet => { this.shadowRoot.adoptedStyleSheets = [sheet]; });
    this.showModal = null;
    this._modalInitialized = false;
    this._autoOpenPending = false;
    this._onEscape = event => {
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented || this.showModal !== this) return;
      event.preventDefault();
      this.close();
    };
  }

  connectedCallback() {
    if (this._modalInitialized) return;
    this._modalInitialized = true;
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1;

    this.shadowRoot.querySelector('.js-modal-main').addEventListener('click', event => event.stopPropagation());
    this.shadowRoot.querySelectorAll('.js-modal-close-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        this.close();
      });
    });
    this.addEventListener('modalShow', event => {
      event.preventDefault();
      this.openModal(event.detail?.triggerEl ?? null);
    });

    const initialOpen = this.getAttribute('open');
    if ((initialOpen === 'true' || initialOpen === '') && !this.hasRememberedDismissal()) {
      this._autoOpenPending = true;
      // Styles must be applied before the initial fade-in.
      sheetPromise.then(() => {
        if (this.isConnected && this._autoOpenPending && !this.hasRememberedDismissal()) this.openModal();
      });
    }
  }

  openModal(triggerEl = null) {
    // A manual open supersedes any queued initial opening.
    this._autoOpenPending = false;
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
    this.showModal = this;
    document.addEventListener('keydown', this._onEscape);
    this._triggerEl = triggerEl;
    this.style.display = 'block';
    document.body.classList.add('is-show-modal');
    this.getBoundingClientRect();
    this._openTimer = setTimeout(() => {
      this.classList.add('is-show');
      this.setAttribute('aria-modal', 'true');
      this.shadowRoot.querySelector('[role=dialog]').setAttribute('aria-modal', 'true');
      this.focus();
      // Initial rendering and reduced motion may emit no transitionend.
      this.dispatchEvent(new CustomEvent('modalOpen', { detail: { triggerEl } }));
    }, 10);
  }

  close() {
    this._autoOpenPending = false;
    this.removeAttribute('open');
    if (this.hasAttribute('remember-dismissal') && this.id) rememberDismissal(location.pathname, this.id);
    document.removeEventListener('keydown', this._onEscape);
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
    this.showModal = null;
    this.classList.remove('is-show');
    this.removeAttribute('aria-modal');
    this.shadowRoot.querySelector('[role=dialog]').removeAttribute('aria-modal');
    if (!document.querySelector('imagee-modal.is-show')) document.body.classList.remove('is-show-modal');
    const trigger = this._triggerEl ?? [...document.querySelectorAll('[data-target]')].find(button => button.dataset.target === this.id);
    trigger?.focus();
    // Complete closing even if the browser skips the opacity transition.
    // Reopening cancels this timer so an earlier close cannot hide a new open.
    this._closeTimer = setTimeout(() => {
      this.style.display = 'none';
      this.dispatchEvent(new Event('modalClose'));
    }, 400);
  }

  disconnectedCallback() {
    this._autoOpenPending = false;
    document.removeEventListener('keydown', this._onEscape);
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
  }

  hasRememberedDismissal() {
    return this.hasAttribute('remember-dismissal') && this.id && wasDismissed(location.pathname, this.id);
  }
}
