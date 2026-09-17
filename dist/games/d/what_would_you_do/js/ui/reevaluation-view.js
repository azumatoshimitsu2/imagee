import { LitElement, html, nothing } from '../vendor/lit.js';
import { reevaluationChoices, reevaluationReason } from '../reevaluation-engine.js';
import { answerLabel, dateLabel } from './history-view.js';
import './plain-text.js';

class ReevaluationView extends LitElement {
  static properties = { state: {}, definition: {}, answerId: {}, resultId: {}, busy: {}, selection: { state: true }, reason: { state: true }, stance: { state: true }, text: { state: true } };
  constructor() { super(); this.selection = ''; this.reason = ''; this.resetNote(); }
  createRenderRoot() { return this; }
  resetNote() { this.stance = ''; this.text = ''; }
  willUpdate(changed) {
    if (changed.has('answerId') || changed.has('resultId')) { this.selection = ''; this.reason = ''; this.resetNote(); }
  }
  renderAnswer(answer, label) {
    const reason = reevaluationReason(this.state, answer.id);
    const words = this.state.reflections.filter(r => r.sourceAnswerId === answer.id);
    return html`<article class="paper reevaluation-answer" aria-label=${label}><p class="eyebrow">${label}</p>
      <time class="small muted" datetime=${answer.answeredAt}>${dateLabel(answer.answeredAt)}</time>
      <p class="answer-quote"><plain-text .text=${answerLabel(answer)}></plain-text></p>
      ${answer.followUps.map(f => html`<p class="reason-note">当時の理由：<plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></p>`)}
      ${reason ? html`<p class="small muted">この答えを選んだ理由</p><p class="preserve-lines"><plain-text .text=${reason}></plain-text></p>` : !answer.followUps.length ? html`<p class="small muted">理由の記録はありません。</p>` : nothing}
      ${words.map(r => html`<details><summary>この回答に添えた言葉</summary><p><plain-text .text=${r.promptSnapshot}></plain-text></p><p class="preserve-lines"><plain-text .text=${r.text}></plain-text></p></details>`)}
    </article>`;
  }
  render() {
    const choices = reevaluationChoices(this.state);
    const answer = choices.find(a => a.id === this.answerId);
    const entry = (this.state.reevaluations ?? []).find(r => r.id === this.resultId);
    const d = this.definition;
    if (this.resultId && entry) {
      const previous = this.state.answers.find(a => a.id === entry.previousAnswerId);
      const current = this.state.answers.find(a => a.id === entry.answerId);
      const notes = (this.state.reevaluationNotes ?? []).filter(n => n.reevaluationId === entry.id);
      return html`<section class="reevaluation-page"><div class="reading"><p class="eyebrow">以前の自分と、今の自分</p><h1 tabindex="-1" data-page-heading>同じ問いに、もう一度</h1>
        <h2><plain-text .text=${previous.snapshot.title}></plain-text></h2><p class="preserve-lines"><plain-text .text=${previous.snapshot.body}></plain-text></p>
        <p>${previous.optionId === current.optionId ? '今回は、以前と同じ選択でした。理由も同じでしょうか。' : '今回は、以前とは別の選択でした。何が影響したのでしょうか。'}</p></div>
        <div class="comparison-pair">${this.renderAnswer(previous, '以前の回答')}${this.renderAnswer(current, '今回の回答')}</div>
        <section class="reading paper reevaluation-card"><h2>${d.prompt}</h2><p class="small muted">同じ答えでも、違う答えでも。変化の意味は、あなたの言葉で考えられます。</p>
          <form @submit=${event => { event.preventDefault(); if (!this.stance || this.busy) return; this.dispatchEvent(new CustomEvent('reevaluation-note', { bubbles: true, detail: { reevaluationId: entry.id, stanceId: this.stance, text: this.text } })); }}>
            <fieldset ?disabled=${this.busy}><legend>今の気持ちに近いものを選んでください。</legend><div class="choices">${d.options.map(o => html`<label class="choice ${this.stance === o.id ? 'selected' : ''}"><input type="radio" name="reevaluation-stance" .value=${o.id} .checked=${this.stance === o.id} @change=${() => { this.stance = o.id; }}><span>${o.label}</span></label>`)}</div>
              <label class="field-label" for="reevaluation-note">見比べて気づいたこと（任意）</label><textarea id="reevaluation-note" rows="5" maxlength=${d.maxLength} .value=${this.text} @input=${e => { this.text = e.target.value; }} aria-describedby="reevaluation-note-help"></textarea><p id="reevaluation-note-help" class="small muted">変わった理由が分からなくても構いません。言葉はそのまま保存します。</p>
              <button class="button" ?disabled=${!this.stance || this.busy}>気づきを記録する</button>
            </fieldset>
          </form>
        </section>
        ${notes.length ? html`<section class="reading reevaluation-notes" aria-label="この問いでの気づき"><h2>この問いでの気づき</h2>${notes.map(n => html`<article class="paper reevaluation-card"><time class="small muted" datetime=${n.createdAt}>${dateLabel(n.createdAt)}</time><h3><plain-text .text=${n.stanceLabelSnapshot}></plain-text></h3>${n.text ? html`<p class="preserve-lines"><plain-text .text=${n.text}></plain-text></p>` : nothing}</article>`)}</section>` : nothing}
        <p class="reading"><a class="text-link" href="#revisit">問いの一覧へ戻る</a></p>
      </section>`;
    }
    if (this.answerId && answer && !this.resultId) {
      const q = answer.snapshot;
      return html`<section class="reading reevaluation-page"><p class="eyebrow">以前の答えを開く前に</p><h1 tabindex="-1" data-page-heading><plain-text .text=${q.title}></plain-text></h1>
        <p class="small muted">以前と同じ文章の問いです。今回はどう考えるか、答えと理由を残してから見比べます。</p>
        <article class="paper reevaluation-card"><p class="preserve-lines"><plain-text .text=${q.body}></plain-text></p>
          <form @submit=${event => { event.preventDefault(); if (!this.selection || this.busy) return; this.dispatchEvent(new CustomEvent('reevaluation-answer', { bubbles: true, detail: { previousAnswerId: answer.id, optionId: this.selection, reason: this.reason } })); }}>
            <fieldset ?disabled=${this.busy}><legend>今の考えに近いものを選んでください。</legend><div class="choices">${q.options.map(o => html`<label class="choice ${this.selection === o.id ? 'selected' : ''}"><input type="radio" name="reevaluation-answer" .value=${o.id} .checked=${this.selection === o.id} @change=${() => { this.selection = o.id; }}><span>${o.label}</span></label>`)}</div>
              <label class="field-label" for="reevaluation-reason">${d.reasonPrompt}</label><textarea id="reevaluation-reason" rows="5" maxlength=${d.maxLength} .value=${this.reason} @input=${e => { this.reason = e.target.value; }} aria-describedby="reevaluation-reason-help"></textarea><p id="reevaluation-reason-help" class="small muted">理由を書かずに進んでも構いません。以前の回答も残ります。</p>
              <button class="button" ?disabled=${!this.selection || this.busy}>今の答えを残して、見比べる</button>
            </fieldset>
          </form></article><p><a class="text-link" href="#revisit">今は答えずに戻る</a></p>
      </section>`;
    }
    return html`<section class="reading reevaluation-page"><p class="eyebrow">時間をおいて、同じ問いへ</p><h1 tabindex="-1" data-page-heading>同じ問いに、もう一度</h1><p class="intro">今なら、どう答えるでしょう。<br>以前の答えを見る前に、もう一度考えてみませんか。</p>
      ${this.answerId || this.resultId ? html`<p class="quiet-note" role="status">この記録は見つからないか、すでに新しい回答が残っています。一覧から問いを選び直してください。</p>` : nothing}
      ${choices.length ? html`<h2>もう一度考える問いを選ぶ</h2><p class="small muted">最後に答えた日時と問いの名前だけを表示しています。</p><div class="reevaluation-list">${choices.map(a => html`<a class="paper reevaluation-card reevaluation-choice" href=${`#revisit?answer=${encodeURIComponent(a.id)}`}><time class="small muted" datetime=${a.answeredAt}>${dateLabel(a.answeredAt)}</time><h3><plain-text .text=${a.snapshot.title}></plain-text></h3><span class="text-link">今の考えで答える →</span></a>`)}</div>`
        : html`<div class="paper reevaluation-card"><h2>最初の答えを残すところから</h2><p>問いに答えると、ここで同じ問いを選べます。</p><a class="button" href="#home">問いを読む</a></div>`}
      ${(this.state.reevaluations ?? []).length ? html`<section aria-label="見比べた記録"><h2>見比べた記録を読む</h2>${[...this.state.reevaluations].reverse().map(r => html`<a class="paper reevaluation-card reevaluation-choice" href=${`#revisit?result=${encodeURIComponent(r.id)}`}><time class="small muted" datetime=${r.createdAt}>${dateLabel(r.createdAt)}</time><h3><plain-text .text=${this.state.answers.find(a => a.id === r.answerId).snapshot.title}></plain-text></h3><span class="text-link">回答と気づきを読み返す →</span></a>`)}</section>` : nothing}
      <p><a class="text-link" href="#past">過去の自分へ戻る</a></p>
    </section>`;
  }
}
customElements.define('reevaluation-view', ReevaluationView);
