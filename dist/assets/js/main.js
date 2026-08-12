import SiteHeader from "/assets/js/components/site-header.js";
import SiteFooter from "/assets/js/components/site-footer.js";
import ModalDialog from "/assets/js/components/modal/index.js";
import ButtonHelp from "/assets/js/components/button/help.js";
customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
customElements.define('imagee-modal', ModalDialog);
customElements.define('imagee-btn-help', ButtonHelp);

window.addEventListener('DOMContentLoaded', (e) => {
  document.querySelectorAll('.js-show-modal-btn').forEach(el => {
    el.addEventListener('click', e => {
      const btn = e.currentTarget;
      const target = document.getElementById(el.dataset.target);
      const openEvent = new CustomEvent('modalShow', { detail: {'triggerEl': el} });
      target.dispatchEvent(openEvent);
    });
  });
});
