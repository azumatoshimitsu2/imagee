import { LitElement, html, nothing } from '../vendor/lit.js';
import { wordThreads } from '../word-engine.js';
import { dateLabel } from './history-view.js';
import './plain-text.js';

class WordsView extends LitElement {
  static properties = { state: {}, definition: {}, threadId: {}, busy: {}, stance: { state: true }, text: { state: true } };
  constructor() { super(); this.reset(); }
  createRenderRoot() { return this; }
  reset() { this.stance = ''; this.text = ''; }
  willUpdate(changed) { if (changed.has('threadId')) this.reset(); }
  render() {
    const threads = wordThreads(this.state);
    const thread = threads.find(t => t.roots.includes(this.threadId));
    const d = this.definition;
    return html`<section class="reading words-page"><p class="eyebrow">あのときの言葉に、今の言葉を重ねる</p>
      <h1 tabindex="-1" data-page-heading>言葉の足あと</h1>
      ${thread ? html`<p><a class="text-link" href="#words">問いを選び直す</a></p><h2><plain-text .text=${thread.prompt}></plain-text></h2>
        <p class="intro">同じ問いに残した言葉を、古い順に。<br>今のあなたは、どんな言葉で表すでしょう。</p>
        <ol class="word-timeline" aria-label="この問いに残した言葉">${thread.entries.map(e => html`<li><article class="paper word-entry"><time class="small muted" datetime=${e.at}>${dateLabel(e.at)}</time><h3><plain-text .text=${e.label}></plain-text></h3>${e.text ? html`<p class="preserve-lines"><plain-text .text=${e.text}></plain-text></p>` : html`<p class="small muted">このときは気持ちだけを残しました。</p>`}</article></li>`)}</ol>
        <section class="paper word-form"><h2>今の言葉を残す</h2><p>${d.prompt}</p>
          <form @submit=${event => { event.preventDefault(); if (!this.stance || !this.text.trim() || this.busy) return; this.dispatchEvent(new CustomEvent('words-submit', { bubbles: true, detail: { sourceReflectionId: thread.id, stanceId: this.stance, text: this.text } })); }}>
            <fieldset ?disabled=${this.busy}><legend>読み返して、今の気持ちに近いものを選んでください。</legend><div class="choices">${d.options.map(o => html`<label class="choice ${this.stance === o.id ? 'selected' : ''}"><input type="radio" name="word-stance" .value=${o.id} .checked=${this.stance === o.id} @change=${() => { this.stance = o.id; }}><span>${o.label}</span></label>`)}</div>
              <label class="field-label" for="word-text">今のあなたの言葉</label><textarea id="word-text" rows="6" required maxlength=${d.maxLength} .value=${this.text} @input=${event => { this.text = event.target.value; }} aria-describedby="word-help"></textarea><p id="word-help" class="small muted">短い言葉でも、まだ分からない気持ちでも構いません。以前の文章はそのまま残ります。</p>
              <button class="button" ?disabled=${this.busy || !this.stance || !this.text.trim()}>今の言葉を記録する</button>
            </fieldset>
          </form><p><a class="text-link" href="#words">今は書かずに戻る</a></p>
        </section>`
        : html`<p class="intro">一つの問いに、何度でも自分の言葉で。<br>変わったところも、変わらないところも、読み返してみませんか。</p>
          ${this.threadId ? html`<p class="quiet-note" role="status">この記録は見つかりませんでした。一覧から選び直してください。</p>` : nothing}
          ${threads.length ? html`<div class="word-list">${threads.map(t => html`<a class="paper word-link" href=${`#words?id=${encodeURIComponent(t.id)}`}><h2><plain-text .text=${t.prompt}></plain-text></h2><p class="small muted">最初の記録：<time datetime=${t.entries[0].at}>${dateLabel(t.entries[0].at)}</time></p><p class="word-preview"><plain-text .text=${t.entries[0].text}></plain-text></p><p class="small muted">${t.entries.length}件の記録</p><span class="text-link">この問いの言葉を読み返す →</span></a>`)}</div>`
            : html`<div class="paper word-entry"><h2>自由に書いた言葉が、ここに集まります。</h2><p>問いを進めて自由記述の質問に答えると、当時の言葉を読み返し、今の言葉を残せます。</p><a class="button" href="#home">問いを読む</a></div>`}`}
      <p><a class="text-link" href="#past">過去の自分へ戻る</a></p>
    </section>`;
  }
}
customElements.define('words-view', WordsView);
