import { notebookSymbol } from './notebook-symbol.js';
import { LitElement, html, nothing } from '../vendor/lit.js';
import { currentAnswers } from '../answer-history.js';
import './plain-text.js';
import { reevaluationReason } from '../reevaluation-engine.js';
export const dateLabel = value => new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const answerLabel = answer => answer.snapshot.options.find(o => o.id === answer.optionId)?.label ?? '';
class HistoryView extends LitElement {
  static properties = { state: { attribute: false } };
  createRenderRoot() { return this; }
  render() {
    const state = this.state;
    if (!state) return nothing;
    const answers = currentAnswers(state.answers).sort((a,b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt) || a.id.localeCompare(b.id));
    return html`<section class="reading history-page">
      <p class="eyebrow">これまでのノート</p><h1 tabindex="-1" data-page-heading>回答の足あと</h1>
      <p class="intro">変わった考えも、変わらなかった考えも。<br>そのときの自分の言葉を、ここに残します。</p>
      ${answers.length ? html`<p class="small muted history-count">${answers.length}の問いを記録しています</p><div class="history-list">${answers.map(latest => {
        const chain = []; let cursor = latest;
        while (cursor) { chain.push(cursor); cursor = state.answers.find(a => a.id === cursor.supersedesAnswerId); }
        const ids = new Set(chain.map(a => a.id));
        const reflections = state.reflections.filter(r => ids.has(r.sourceAnswerId));
        return html`<article class="history-card paper">
          <p class="eyebrow"><time datetime=${latest.answeredAt}>${dateLabel(latest.answeredAt)}</time></p>
          <h2>${latest.snapshot.title}</h2>
          <p class="small muted">今の回答</p><p class="answer-quote"><plain-text .text=${answerLabel(latest)}></plain-text></p>
          ${reevaluationReason(state, latest.id) ? html`<div class="reason-note"><p class="small muted">この答えを選んだ理由</p><p class="preserve-lines"><plain-text .text=${reevaluationReason(state, latest.id)}></plain-text></p></div>` : nothing}
          ${latest.followUps.map(f => html`<div class="reason-note"><p class="small muted">当時の理由</p><plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></div>`)}
          ${reflections.map(r => html`<div class="reason-note"><p class="small muted"><plain-text .text=${r.promptSnapshot}></plain-text></p><p class="preserve-lines"><plain-text .text=${r.text}></plain-text></p></div>`)}
          <details><summary>問いの本文${chain.length > 1 ? `と以前の回答（${chain.length - 1}件）` : 'を読む'}</summary>
            <p class="preserve-lines"><plain-text .text=${latest.snapshot.body}></plain-text></p>
            ${chain.slice(1).map(old => html`<div class="old-answer"><p class="small muted"><time datetime=${old.answeredAt}>${dateLabel(old.answeredAt)}</time>の回答</p><p><plain-text .text=${answerLabel(old)}></plain-text></p>
              ${old.questionVersion !== latest.questionVersion ? html`<p class="small muted">当時の問い：<plain-text .text=${old.snapshot.body}></plain-text></p>` : nothing}
              ${reevaluationReason(state, old.id) ? html`<p class="preserve-lines">理由：<plain-text .text=${reevaluationReason(state, old.id)}></plain-text></p>` : nothing}
              ${old.followUps.map(f => html`<p class="small">理由：<plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></p>`)}</div>`)}
          </details>
          <div class="history-actions"><a class="text-link" href="#revisit">以前の答えを隠して、もう一度考える</a><a class="text-link" href=${`#answer?id=${encodeURIComponent(latest.id)}&stage=read`}>解説を読み返す</a><button class="text-button" @click=${() => this.dispatchEvent(new CustomEvent('reconsider-answer', { bubbles: true, detail: { answerId: latest.id } }))}>今ならどう答えるか、考える <span aria-hidden="true">↗</span></button></div>
        </article>`;
      })}</div>` : html`<div class="paper empty-state"><span class="empty-symbol" aria-hidden="true">${notebookSymbol}</span><h2>まだ、白いページです。</h2><p>最初の問いに答えると、ここに足あとが残ります。</p><a class="button" href="#home">問いを読む</a></div>`}
    </section>`;
  }
}
customElements.define('history-view', HistoryView);
