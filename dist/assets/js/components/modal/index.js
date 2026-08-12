
const sheetPromise = fetch(new URL('/assets/js/components/modal/index.css', import.meta.url))
  .then(res => res.text())
  .then(css => {
    const sheet = new CSSStyleSheet();
    return sheet.replace(css).then(() => sheet);
});

export default class ModalDialog extends HTMLElement {
  constructor() {
    super();
    const template = `<div class="c-modal js-modal-close-btn" role="dialog"tabindex="-1">
    <div class="c-modal__wrap">
      <div class="p-modal__content js-modal-main">
        <div>
          <slot/>
        </div>
        <button type="button" class="c-modal__close-btn js-modal-close-btn" aria-label="閉じる"></button>
      </div>
    </div>`;
    sheetPromise.then(sheet => {
      this.shadowRoot.adoptedStyleSheets = [sheet];
    });
    this.showModal = null;
    this.attachShadow({'mode': 'open'});
    this.shadowRoot.innerHTML = template;
    this._modalInitialized = false;
  }

  connectedCallback() {
    const isOpen = this.getAttribute('open');

    if (this._modalInitialized) {
      return;
    }
    this._modalInitialized = true;

    this.shadowRoot.querySelector('.js-modal-main').addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.shadowRoot.querySelectorAll('.js-modal-close-btn').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = this;
        if(target) {
          this.showModal = null;
          target.classList.remove('is-show');
          target.removeAttribute('aria-modal');
          const btn = document.querySelector('[data-target="'+target.id+'"]');
          document.body.classList.remove('is-show-modal');
          if(btn) {
            //モーダルを閉じるとモーダルを開くボタンにフォーカスを戻す
            btn.focus();
          }
          target.addEventListener('transitionend', (e) => {
              e.currentTarget.style.display = 'none';
              const closeEvent = new Event('modalClose');
              e.currentTarget.dispatchEvent(closeEvent);
            },{ once : true}
          );
        } else {
          console.log(target + ' is null');
        }
      });
    })

    this.addEventListener('modalShow', (e) => {
      e.preventDefault();
      const triggerEl = e.detail.triggerEl;
      const targetId = triggerEl.dataset.target;
      const target = document.getElementById(targetId);
      this.showModal = target;
      if(target) {
        target.style.display = 'block';
        document.body.classList.add('is-show-modal');
        setTimeout((e) => {
          target.classList.add('is-show');
          target.addEventListener('transitionend', (e) => {
            target.focus();
            target.setAttribute('aria-modal', true);
            const openEvent = new CustomEvent('modalOpen', { detail: {'triggerEl': triggerEl} });
            e.currentTarget.dispatchEvent(openEvent);
            },{ once : true}
          );
        }, 10);
      } else {
        console.log(target + ' is null');
      }
    });
  }
};


