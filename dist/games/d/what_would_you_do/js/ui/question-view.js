import { LitElement, html, nothing } from '../vendor/lit.js';
import './plain-text.js';

class QuestionView extends LitElement {
  static properties = { question: { attribute: false }, revision: { type: Boolean }, previousLabel: { type: String }, busy: { type: Boolean }, selection: { state: true } };
  constructor() { super(); this.selection = ''; }
  createRenderRoot() { return this; }
  willUpdate(changes) { if (changes.has('question')) this.selection = ''; }
  render() {
    const q = this.question;
    if (!q) return nothing;
    return html`<article class="reading paper">
      <p class="eyebrow">${this.revision ? 'もう一度、考えてみる' : 'ひとつの問い'}</p>
      <h1 tabindex="-1" data-page-heading>${q.title}</h1>
      <p class="question-body"><plain-text .text=${q.body}></plain-text></p>
      ${q.scoringMode === 'none' ? html`<p class="small muted">この問いは地図の位置には反映せず、あとから読み返すための記録として残します。</p>` : nothing}
      ${this.revision ? html`<aside class="quiet-note">以前の選択：<plain-text .text=${this.previousLabel}></plain-text><br>選び直しても、以前の回答は残ります。</aside>` : nothing}
      <form @submit=${event => { event.preventDefault(); if (this.selection && !this.busy) this.dispatchEvent(new CustomEvent('answer-submit', { bubbles: true, detail: { optionId: this.selection } })); }}>
        <fieldset ?disabled=${this.busy}>
          <legend>今のあなたの考えに近いものを選んでください。</legend>
          <div class="choices">${q.options.map(o => html`<label class="choice ${this.selection === o.id ? 'selected' : ''}">
            <input type="radio" name="answer" .value=${o.id} .checked=${this.selection === o.id} @change=${() => { this.selection = o.id; }}>
            <span>${o.label}</span>
          </label>`)}</div>
        </fieldset>
        <div class="submit-row"><button class="button" type="submit" ?disabled=${!this.selection || this.busy}>${this.busy ? '記録しています…' : 'この答えを記録する'}</button><p class="small muted">正解はありません。あとから考え直せます。</p></div>
      </form>
    </article>`;
  }
}
customElements.define('question-view', QuestionView);
