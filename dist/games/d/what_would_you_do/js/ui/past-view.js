import { LitElement, html, nothing } from '../vendor/lit.js';
import { reflectionHub } from './reflection-hub.js';
import { pastRecords } from '../dialogue-engine.js';
import { dateLabel } from './history-view.js';
import './plain-text.js';
import { reevaluationReason } from '../reevaluation-engine.js';

class PastView extends LitElement {
  static properties = { state: {}, catalog: {}, view: {}, definition: {}, sourceType: {}, sourceId: {}, busy: {}, stance: { state: true }, text: { state: true } };
  constructor() { super(); this.stance = ''; this.text = ''; }
  createRenderRoot() { return this; }
  willUpdate(changed) {
    if (changed.has('sourceId') || changed.has('sourceType')) this.reset();
  }
  reset() { this.stance = ''; this.text = ''; }
  renderHub() {
    const cards = reflectionHub(this.state, this.catalog);
    return html`<section class="past-hub"><div class="reading hub-intro"><p class="eyebrow">今の気持ちに合う、振り返り方から</p><h1 tabindex="-1" data-page-heading>過去の自分</h1>
      <p class="intro">あの頃の自分に、どう話しかけましょう。<br>読みたい、比べたい、もう一度考えたい。<br>今日は気になる入口を、一つ選んでみてください。</p></div>
      <div class="reflection-hub-grid">${cards.map(card => html`<article class="paper hub-card" aria-labelledby=${`hub-${card.id}`}><h2 id=${`hub-${card.id}`}>${card.title}</h2><p>${card.description}</p><p class="small muted hub-status">${card.status}</p>
        <a class="text-link hub-primary" href=${card.href}>${card.action}</a>
        ${card.resume ? html`<div class="hub-resume"><p class="small muted">保存済みの記録：<time datetime=${card.resume.at}>${dateLabel(card.resume.at)}</time></p><a class="button secondary" href=${card.resume.href}>${card.resume.label}</a></div>` : nothing}
      </article>`)}</div>
      ${!this.state.answers.length && !this.state.reflections.length ? html`<aside class="reading quiet-note hub-first"><h2>これから、言葉が届きます。</h2><p>まずは気になる問いを一つ。答えると、読み返す入口が増えていきます。</p><a class="text-link" href="#home">問いを読む</a></aside>` : nothing}
    </section>`;
  }
  render() {
    if (!this.sourceId && this.view !== 'records') return this.renderHub();
    const records = pastRecords(this.state);
    const selected = records.find(r => r.id === this.sourceId && r.type === this.sourceType);
    const replies = (this.state.dialogues ?? []).filter(r => r.sourceType === selected?.type && r.sourceId === selected?.id);
    return html`<section class="reading past-page"><p class="eyebrow">あの頃の言葉に、今の言葉を</p>
      <h1 tabindex="-1" data-page-heading>過去の自分</h1>
      <p class="intro">あのとき大切にしていたこと。<br>今も同じか、少し変わったか。<br>気になる記録から、話しかけてみてください。</p>
      <p><a class="text-link" href="#past">振り返り方を選び直す</a></p>
      ${selected ? html`<a class="text-link" href="#past?view=records">← 記録を選び直す</a>
        <article class="paper past-original" aria-label="当時の記録"><p class="eyebrow">${selected.type === 'answer' ? '当時の回答' : '当時の言葉'}</p>
          <time class="small muted" datetime=${selected.at}>${dateLabel(selected.at)}</time>
          <h2><plain-text .text=${selected.title}></plain-text></h2>
          ${selected.body ? html`<p class="preserve-lines"><plain-text .text=${selected.body}></plain-text></p>` : nothing}
          <p class="answer-quote preserve-lines"><plain-text .text=${selected.text}></plain-text></p>
          ${selected.answer && reevaluationReason(this.state, selected.id) ? html`<p class="small muted">この答えを選んだ理由</p><p class="preserve-lines"><plain-text .text=${reevaluationReason(this.state, selected.id)}></plain-text></p>` : nothing}
          ${selected.answer?.followUps.map(f => html`<p class="reason-note">理由：<plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></p>`)}
        </article>
        <section class="paper past-reply"><h2>今のあなたから</h2><p>${this.definition.prompt}</p>
          <form @submit=${event => { event.preventDefault(); if (!this.stance || this.busy) return; this.dispatchEvent(new CustomEvent('past-reply', { bubbles: true, detail: { sourceType: selected.type, sourceId: selected.id, stanceId: this.stance, text: this.text } })); }}>
            <fieldset ?disabled=${this.busy}><legend>今の気持ちに近いものを選んでください。</legend><div class="choices">${this.definition.options.map(o => html`<label class="choice ${this.stance === o.id ? 'selected' : ''}"><input type="radio" name="past-stance" .value=${o.id} .checked=${this.stance === o.id} @change=${() => { this.stance = o.id; }}><span>${o.label}</span></label>`)}</div>
              <label class="field-label" for="past-text">理由や、今考えていること（任意）</label>
              <textarea id="past-text" rows="5" maxlength=${this.definition.maxLength} .value=${this.text} @input=${event => { this.text = event.target.value; }} aria-describedby="past-privacy"></textarea>
              <p id="past-privacy" class="small muted">言葉がまとまらなくても構いません。返事はこのブラウザに保存されます。</p>
              <button class="button" ?disabled=${!this.stance || this.busy}>返事を記録する</button>
            </fieldset>
          </form>
        </section>
        ${replies.length ? html`<section class="past-replies" aria-label="これまでの返事"><h2>これまでの返事</h2>${replies.map(r => html`<article class="paper past-letter"><time class="small muted" datetime=${r.createdAt}>${dateLabel(r.createdAt)}</time><h3><plain-text .text=${r.stanceLabelSnapshot}></plain-text></h3>${r.text ? html`<p class="preserve-lines"><plain-text .text=${r.text}></plain-text></p>` : nothing}</article>`)}</section>` : nothing}
      ` : this.sourceId ? html`<p class="quiet-note">この記録は見つかりませんでした。</p><a href="#past?view=records" class="text-link">記録を選び直す</a>`
        : records.length ? html`<h2>話しかけたい記録を選ぶ</h2><p class="small muted">新しい順に並んでいます。答えを変える前の記録も残っています。</p><div class="past-records">${records.map(r => html`<a class="paper past-record" href=${`#past?type=${r.type}&id=${encodeURIComponent(r.id)}`}><span class="eyebrow">${r.type === 'answer' ? '問いへの回答' : '自由に書いた言葉'}</span><time class="small muted" datetime=${r.at}>${dateLabel(r.at)}</time><h3><plain-text .text=${r.title}></plain-text></h3><p class="past-preview"><plain-text .text=${r.text}></plain-text></p><span class="text-link">この頃の自分に返事を書く →</span></a>`)}</div>`
        : html`<div class="paper"><h2>これから、言葉が届きます。</h2><p>問いに答えると、ここで当時の自分に返事を書けます。</p><a class="button" href="#home">問いを読む</a></div>`}
    </section>`;
  }
}
customElements.define('past-view', PastView);
