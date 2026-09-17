import { LitElement, html, nothing } from '../vendor/lit.js';
import { boundaryJourneys } from '../boundary-engine.js';
import { answerLabel, dateLabel } from './history-view.js';
import './plain-text.js';

class BoundaryView extends LitElement {
  static properties = { state: {}, catalog: {}, journeyId: {}, questionId: {}, busy: {}, selection: { state: true } };
  constructor() { super(); this.selection = ''; }
  createRenderRoot() { return this; }
  willUpdate(changed) { if (changed.has('questionId') || changed.has('journeyId')) this.selection = ''; }
  render() {
    const journeys = boundaryJourneys(this.state, this.catalog);
    const journey = journeys.find(j => j.id === this.journeyId);
    const question = journey?.nextQuestion?.id === this.questionId ? journey.nextQuestion : null;
    const route = journey ? `#boundary?id=${encodeURIComponent(journey.id)}` : '#boundary';
    return html`<section class="reading boundary-page"><p class="eyebrow">条件を一つ変えて、考えてみる</p>
      <h1 tabindex="-1" data-page-heading>${journey?.title ?? '判断が変わる、その間を探す'}</h1>
      ${!journey ? html`<p class="intro">同じ場面でも、条件が変わるとどうでしょう。<br>答えが変わっても、変わらなくても構いません。</p>
        ${journeys.map(j => html`<article class="paper boundary-card"><h2>${j.title}</h2><p>${j.description}</p><p class="small muted">${j.answeredCount} / ${j.steps.length} の条件に回答済み</p><a class="button" href=${`#boundary?id=${encodeURIComponent(j.id)}`}>${j.complete ? '今回の回答を振り返る' : j.answeredCount ? '続きから考える' : 'この場面を考える'}</a></article>`)}
        ${this.journeyId ? html`<p role="status">指定された題材は見つかりませんでした。</p>` : nothing}`
        : html`<p class="intro">${journey.description}</p><p class="small muted">${journey.answeredCount} / ${journey.steps.length} の条件に回答済み。途中で閉じても、続きから考えられます。</p>
          ${question ? html`<article class="paper boundary-card"><p class="eyebrow">${journey.variableLabel}：${question.scenario.value}${question.scenario.unit}</p><h2>${question.title}</h2><p class="preserve-lines"><plain-text .text=${question.body}></plain-text></p>
            <form @submit=${event => { event.preventDefault(); if (!this.selection || this.busy) return; this.dispatchEvent(new CustomEvent('boundary-answer', { bubbles: true, detail: { journeyId: journey.id, questionId: question.id, optionId: this.selection } })); }}>
              <fieldset ?disabled=${this.busy}><legend>今の考えに近いものを選んでください。</legend><div class="choices">${question.options.map(o => html`<label class="choice ${this.selection === o.id ? 'selected' : ''}"><input type="radio" name="boundary-answer" .value=${o.id} .checked=${this.selection === o.id} @change=${() => { this.selection = o.id; }}><span>${o.label}</span></label>`)}</div><button class="button" ?disabled=${this.busy || !this.selection}>この条件での答えを残す</button></fieldset>
            </form><p><a class="text-link" href=${route}>今は答えずに戻る</a></p></article>`
            : html`${!journey.compatible ? html`<p class="quiet-note">問いの内容が更新されたため、以前の回答と新しい条件を続けて比較できません。以前の回答は「回答の足あと」で読めます。</p>` : nothing}
              ${journey.answeredCount ? html`<section aria-label="条件ごとの回答"><h2>今回の条件と、あなたの選択</h2>${journey.steps.filter(s => s.answer).map(s => html`<article class="paper boundary-card"><p class="eyebrow">${journey.variableLabel}：${s.answer.snapshot.scenario.value}${s.answer.snapshot.scenario.unit}</p><p class="answer-quote"><plain-text .text=${answerLabel(s.answer)}></plain-text></p><time class="small muted" datetime=${s.answer.answeredAt}>${dateLabel(s.answer.answeredAt)}</time><details><summary>問いと解説を読む</summary><p><plain-text .text=${s.answer.snapshot.body}></plain-text></p><p><plain-text .text=${s.answer.snapshot.reflection.summary}></plain-text></p>${s.answer.snapshot.reflection.perspectives.map(p => html`<p><plain-text .text=${p}></plain-text></p>`)}</details></article>`)}</section>` : nothing}
              ${journey.nextQuestion ? html`<section class="paper boundary-card"><h2>${journey.answeredCount ? '時間だけを変えて、もう一度' : '最初の条件から'}</h2><p>${journey.variableLabel}が${journey.nextQuestion.scenario.value}${journey.nextQuestion.scenario.unit}の場合を考えます。</p><a class="button" href=${`${route}&question=${encodeURIComponent(journey.nextQuestion.id)}`}>${journey.answeredCount ? '次の条件を考える' : '最初の条件を考える'}</a></section>` : nothing}
              ${journey.complete && journey.compatible ? html`<section class="paper boundary-card" aria-label="今回見えたこと"><h2>今回見えたこと</h2>
                ${journey.boundaries.length ? journey.boundaries.map(c => {
                  const values = c.answerIds.map(id => this.state.answers.find(a => a.id === id).snapshot.scenario.value).sort((a,b) => a-b);
                  return html`<p>${values[0]}${journey.steps[0].question.scenario.unit}と${values[1]}${journey.steps[0].question.scenario.unit}の条件で、選んだ行動が変わりました。</p><a class="text-link" href=${`#compare?id=${encodeURIComponent(c.id)}`}>この違いで何を重く考えたか、振り返る →</a>`;
                }) : html`<p>${journey.undecidedCount ? '「決められない」を含む今回の回答からは、行動が切り替わった二つの条件を見つけられませんでした。' : `今回の${journey.steps.length}条件では、選んだ行動は同じでした。`}</p>`}
                ${journey.undecidedCount ? html`<p class="small muted">「決められない」と答えた条件は、行動の切り替わりの判定には使っていません。</p>` : nothing}
                <p class="quiet-note">${journey.observationNote}</p><p><a class="text-link" href="#past">一つの回答に、今の言葉を残す →</a></p>
              </section>` : nothing}
            `}
          <p><a class="text-link" href="#boundary">題材の一覧へ戻る</a></p>`}
      <p><a class="text-link" href="#past">過去の自分へ戻る</a></p>
    </section>`;
  }
}
customElements.define('boundary-view', BoundaryView);
