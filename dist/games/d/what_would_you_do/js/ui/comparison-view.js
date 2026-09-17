import { LitElement, html, nothing } from '../vendor/lit.js';
import { comparisonRecords } from '../comparison-engine.js';
import { answerLabel, dateLabel } from './history-view.js';
import './plain-text.js';
import { reevaluationReason } from '../reevaluation-engine.js';

class ComparisonView extends LitElement {
  static properties = { state: {}, catalog: {}, comparisonId: {}, busy: {}, stance: { state: true }, text: { state: true } };
  constructor() { super(); this.reset(); }
  createRenderRoot() { return this; }
  reset() { this.stance = ''; this.text = ''; }
  willUpdate(changed) { if (changed.has('comparisonId')) this.reset(); }
  render() {
    const records = comparisonRecords(this.state, this.catalog);
    const selected = records.find(c => c.id === this.comparisonId);
    const definition = this.catalog.followups.comparisonDialogue;
    const answers = selected?.answerIds.map(id => this.state.answers.find(a => a.id === id)).sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt)) ?? [];
    const replies = (this.state.comparisons ?? []).filter(r => r.comparison.id === selected?.id);
    return html`<section class="comparison-page"><div class="reading"><p class="eyebrow">二つの場面の、その間に</p>
      <h1 tabindex="-1" data-page-heading>二つの答えを見比べる</h1>
      <p class="intro">同じ判断にも、違う判断にも。<br>あなたなりの理由があるかもしれません。</p></div>
      ${selected ? html`<div class="reading"><a class="text-link" href="#compare">組み合わせを選び直す</a></div>
        <div class="comparison-pair">${answers.map((a, index) => html`<article class="paper comparison-answer" aria-label=${`比較する回答 ${index + 1}`}><p class="eyebrow">場面 ${index + 1}</p><time class="small muted" datetime=${a.answeredAt}>${dateLabel(a.answeredAt)}</time>
          <h2><plain-text .text=${a.snapshot.title}></plain-text></h2><p class="preserve-lines"><plain-text .text=${a.snapshot.body}></plain-text></p>
          <p class="answer-quote"><plain-text .text=${answerLabel(a)}></plain-text></p>
          ${reevaluationReason(this.state, a.id) ? html`<p class="small muted">当時の理由</p><p class="preserve-lines"><plain-text .text=${reevaluationReason(this.state, a.id)}></plain-text></p>` : nothing}
          ${a.followUps.length ? a.followUps.map(f => html`<div class="reason-note"><p class="small muted">当時の理由</p><plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></div>`) : reevaluationReason(this.state, a.id) ? nothing : html`<p class="small muted">この回答には、理由の記録がありません。</p>`}
          ${this.state.reflections.filter(r => r.sourceAnswerId === a.id).map(r => html`<details><summary>この回答に添えた言葉</summary><p><plain-text .text=${r.promptSnapshot}></plain-text></p><p class="preserve-lines"><plain-text .text=${r.text}></plain-text></p></details>`)}
        </article>`)}</div>
        <div class="reading"><section class="paper comparison-reflection"><p class="eyebrow">あなたには、どう見えますか</p><p class="preserve-lines"><plain-text .text=${selected.comment}></plain-text></p>
          <h2>${definition.promptsByType?.[selected.type] ?? definition.prompt}</h2><p class="small muted">一貫しているか、矛盾しているかを、ここで決めつけることはありません。</p>
          <form @submit=${event => { event.preventDefault(); if (!this.stance || this.busy) return; this.dispatchEvent(new CustomEvent('comparison-reply', { bubbles: true, detail: { comparisonId: selected.id, stanceId: this.stance, text: this.text } })); }}>
            <fieldset ?disabled=${this.busy}><legend>今の捉え方に近いものを選んでください。</legend><div class="choices">${definition.options.map(o => html`<label class="choice ${this.stance === o.id ? 'selected' : ''}"><input type="radio" name="comparison-stance" .value=${o.id} .checked=${this.stance === o.id} @change=${() => { this.stance = o.id; }}><span>${o.label}</span></label>`)}</div>
              <label class="field-label" for="comparison-text">あなたの言葉で振り返る（任意）</label><textarea id="comparison-text" rows="6" maxlength=${definition.maxLength} .value=${this.text} @input=${event => { this.text = event.target.value; }} aria-describedby="comparison-note"></textarea>
              <p id="comparison-note" class="small muted">何を大切にしたのか、どこに違いを感じるのか。書いた言葉はそのまま残ります。</p><button class="button" ?disabled=${this.busy || !this.stance}>振り返りを記録する</button>
            </fieldset>
          </form></section>
          ${replies.length ? html`<section aria-label="これまでの振り返り" class="comparison-replies"><h2>これまでの振り返り</h2>${replies.map(r => html`<article class="paper"><time class="small muted" datetime=${r.createdAt}>${dateLabel(r.createdAt)}</time><h3><plain-text .text=${r.stanceLabelSnapshot}></plain-text></h3>${r.text ? html`<p class="preserve-lines"><plain-text .text=${r.text}></plain-text></p>` : nothing}</article>`)}</section>` : nothing}
        </div>` : html`<div class="reading">${this.comparisonId ? html`<p role="status" class="quiet-note">この組み合わせは今は表示できません。回答が変更された可能性があります。</p>` : nothing}
          ${records.length ? records.map(c => html`<a class="paper comparison-item" href=${`#compare?id=${encodeURIComponent(c.id)}`}><h2>${c.answerIds.map(id => this.state.answers.find(a => a.id === id)).map((a, i) => html`${i ? html`<span class="comparison-and">と</span>` : nothing}<plain-text .text=${a.snapshot.title}></plain-text>`)}</h2><p>${(this.state.comparisons ?? []).some(r => r.comparison.id === c.id) ? '以前の振り返りと、当時の回答を読む' : '二つの場面を読み、今の言葉を残す'} →</p></a>`)
            : html`<div class="paper"><h2>二つの答えがそろうまで</h2><p>関連する問いへの回答が集まり、ルールに沿った組み合わせが見つかると表示します。今は、気になる問いからどうぞ。</p><a class="button" href="#archive">ほかの問いを読む</a></div>`}
          <p><a class="text-link" href="#past">過去の自分へ戻る</a></p></div>`}
    </section>`;
  }
}
customElements.define('comparison-view', ComparisonView);
