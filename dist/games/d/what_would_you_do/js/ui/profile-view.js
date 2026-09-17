import { LitElement, html, nothing } from '../vendor/lit.js';
import { answerLabel, dateLabel } from './history-view.js';
import { formatComment } from '../comment-engine.js';
import './plain-text.js';
import './landscape-view.js';

class ProfileView extends LitElement {
  static properties = { profile: { attribute: false }, catalog: { attribute: false }, state: { attribute: false }, discoveries: { attribute: false } };
  createRenderRoot() { return this; }
  evidence(ids) {
    return html`<ul class="map-evidence">${ids.map(id => this.state.answers.find(a => a.id === id)).filter(Boolean).map(answer => html`<li>
      <a href=${`#answer?id=${encodeURIComponent(answer.id)}&stage=read`}>${answer.snapshot.title} <span aria-hidden="true">↗</span></a>
      <p class="small muted"><time datetime=${answer.answeredAt}>${dateLabel(answer.answeredAt)}</time></p>
      <p><plain-text .text=${answerLabel(answer)}></plain-text></p>
    </li>`)}</ul>`;
  }
  render() {
    if (!this.profile) return nothing;
    const { profile, catalog } = this;
    const unlocked = profile.distinctQuestions >= catalog.settings.progression.profileFrom;
    // Show one current discovery, never aggregate draft consistency/context scores.
    const discovery = this.discoveries?.find(d => ['CONSISTENCY', 'TENSION', 'CONTEXT_SHIFT', 'BOUNDARY'].includes(d.type));
    return html`<section class="profile-page">
      <div class="profile-intro"><p class="eyebrow">判断の足あとを、少し離れて眺める</p><h1 tabindex="-1" data-page-heading>あなたの地図</h1>
        <p class="intro">場面ごとに、何を大切にしたのでしょう。<br>これは今までの答えを並べた、小さな見取り図です。</p>
        <p class="small muted map-count">${profile.distinctQuestions}の問いに回答しています。選び直した問いは、今の回答だけを使います。</p>
      </div>
      ${!unlocked ? html`<aside class="quiet-note map-unlock"><h2>まだ、地図を描き始めたところです。</h2><p>${catalog.settings.progression.profileFrom}問に答えると、回答が集まった軸から表示します。急がず、気になる問いからどうぞ。</p><a class="text-link" href="#home">問いを読む <span aria-hidden="true">→</span></a></aside>` : nothing}
      <landscape-view .profile=${profile} .catalog=${catalog} .state=${this.state} .discoveries=${this.discoveries}></landscape-view>
      <div class="map-grid">${catalog.axes.axes.map(axis => {
        const result = profile.axes[axis.id];
        const visible = result.visibility !== 'hidden' && result.score !== null;
        const direction = result.position === 'negative' ? axis.negativeLabel : axis.positiveLabel;
        const summary = !visible ? 'この軸を眺めるには、まだ回答が足りません。' : result.position === 'middle'
          ? 'これまでの回答は、中間付近にあります。一つひとつの場面も読み返してみてください。'
          : `これまでの場面では「${direction}」を重く見る回答が、比較的多く見られます。`;
        const label = !visible ? 'まだ手がかりを集めています' : result.visibility === 'provisional' ? 'まだ暫定です' : '今までの回答から';
        return html`<article class="paper map-axis" aria-labelledby=${`axis-${axis.id}`}>
          <p class="eyebrow">${label}</p><h2 id=${`axis-${axis.id}`}>${axis.negativeLabel}<span class="axis-divider" aria-hidden="true"> / </span><span class="sr-only">と</span>${axis.positiveLabel}</h2>
          <div class="axis-scale ${visible ? '' : 'unmeasured'}" aria-hidden="true"><span class="axis-center"></span>${visible ? html`<span class="axis-position" style=${`left: ${Math.max(0, Math.min(100, (result.score + 1) * 50))}%`}></span>` : nothing}</div>
          <div class="axis-ends" aria-hidden="true"><span>${axis.negativeLabel}</span><span>${axis.positiveLabel}</span></div>
          <p class="axis-summary">${summary}</p>
          <p class="small muted">この軸の手がかり：${result.confidence}件${!visible && unlocked ? `（${catalog.settings.scoring.minimumAxisAnswers}件から表示）` : ''}</p>
          ${result.evidenceAnswerIds.length ? html`<details class="axis-details"><summary>根拠になった回答を読む（${result.confidence}件）</summary>${this.evidence(result.evidenceAnswerIds)}</details>` : nothing}
        </article>`;
      })}</div>
      <section class="reading map-reading"><p><a class="text-link" href="#boundary">条件を変えて、判断の境界を探す →</a></p><h2>二つの答えを、並べてみる</h2><p class="intro">関係のある問いだけを比べます。違う答えにも、同じ答えにも、そのときの事情があるかもしれません。</p>
        ${discovery ? html`<article class="past-dialogue" aria-label="関連する回答の発見"><p class="eyebrow">回答から見つかった、ひとつの問い</p><p class="preserve-lines"><plain-text .text=${formatComment(discovery, catalog)}></plain-text></p>${this.evidence(discovery.evidence.answerIds)}<a class="text-link" href=${`#compare?id=${encodeURIComponent(discovery.id)}`}>二つの答えを見比べて、振り返る →</a></article>` : html`<p class="quiet-note">今は、ここで並べて読む回答の組み合わせがありません。関連する問いへの答えが集まると、ここに表示します。</p>`}
      </section>
      <aside class="reading map-method"><h2>この地図の読み方</h2><p>点は、回答した場面の選択を平均した位置です。どちらの端にも、良い・悪いはありません。「手がかり」の件数は、判断の確かさを示す確率ではありません。</p><p>「決められない」という回答や、大切にしたい価値の自己申告は、軸の位置には含めません。場面によって違う考えが、平均すると中間になることもあります。</p><p class="small muted">カテゴリ全体の違いや時間による変化は、ここではまだ表示していません。</p><a class="text-link" href="#history">すべての足あとを読む <span aria-hidden="true">↗</span></a></aside>
    </section>`;
  }
}
customElements.define('profile-view', ProfileView);
