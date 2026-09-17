import { LitElement, html, nothing } from './vendor/lit.js';
import { loadCatalog } from './data-loader.js';
import { createStorage, StorageConflictError } from './storage.js';
import { createGameService } from './game-service.js';
import { dailyReflectionCards } from './daily-reflection-engine.js';
import { currentAnswers, distinctCount, localDate } from './answer-history.js';
import { availableQuestions, eligibleFollowUps } from './question-engine.js';
import { detectComments, selectComment, formatComment } from './comment-engine.js';
import { dateLabel, answerLabel } from './ui/history-view.js';
import './ui/question-view.js';
import './ui/profile-view.js';
import './ui/past-view.js';
import './ui/comparison-view.js';
import './ui/boundary-view.js';
import './ui/reevaluation-view.js';
import './ui/words-view.js';

class SelfDialogueApp extends LitElement {
  static properties = {
    ready: { state: true }, error: { state: true }, busy: { state: true }, page: { state: true }, state: { state: true },
    activeQuestion: { state: true }, revision: { state: true }, result: { state: true }, reasonChoice: { state: true },
    reflectionText: { state: true }, notice: { state: true }, confirmation: { state: true }, importText: { state: true },
  };
  constructor() {
    super(); this.ready = false; this.busy = false; this.error = ''; this.notice = ''; this.page = 'home';
    this.reasonChoice = ''; this.reflectionText = ''; this.confirmation = ''; this.importText = '';
    this.sessionQuestions = new Set();
    this.lastSessionQuestionId = null;
    this.onHash = () => this.openRoute();
    this.onDailyFocus = () => {
      if (this.ready && this.page === 'home' && this.reflectionDate !== localDate()) this.refreshDailyReflections();
    };
  }
  createRenderRoot() { this.replaceChildren(); return this; }
  connectedCallback() { super.connectedCallback(); window.addEventListener('hashchange', this.onHash); window.addEventListener('focus', this.onDailyFocus); document.addEventListener('visibilitychange', this.onDailyFocus); this.dailyTimer = setInterval(this.onDailyFocus, 60000); this.initialize(); }
  disconnectedCallback() { window.removeEventListener('hashchange', this.onHash); window.removeEventListener('focus', this.onDailyFocus); document.removeEventListener('visibilitychange', this.onDailyFocus); clearInterval(this.dailyTimer); super.disconnectedCallback(); }
  async initialize() {
    try {
      this.catalog = await loadCatalog();
      this.storage = createStorage({ schemas: this.catalog.schemas, key: this.catalog.settings.storage.key });
      this.game = createGameService({ storage: this.storage, catalog: this.catalog });
      this.state = this.storage.getState(); this.ready = true;
      this.openRoute();
    } catch { this.error = 'ノートを開けませんでした。通信状況を確認して、もう一度お試しください。'; }
  }
  navigate(hash, replace = false) { if (location.hash === hash) this.openRoute(); else if (replace) location.replace(hash); else location.hash = hash; }
  async focusHeading() {
    await this.updateComplete;
    await Promise.all([...this.querySelectorAll('question-view, history-view, profile-view, past-view, comparison-view, boundary-view, reevaluation-view, words-view')].map(view => view.updateComplete));
    if (document.querySelector('imagee-modal.is-show')) return;
    this.querySelector('[data-page-heading]')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  openRoute() {
    if (!this.ready) return;
    if (location.hash === '#main-content') { this.querySelector('main')?.focus(); return; }
    this.state = this.storage.getState(); this.error = ''; this.notice = ''; this.confirmation = ''; this.importText = '';
    const [name = 'home', search = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(search);
    this.pastView = params.get('view'); this.pastSourceType = params.get('type'); this.pastSourceId = params.get('id'); this.comparisonId = params.get('id'); this.boundaryId = params.get('id'); this.boundaryQuestionId = params.get('question'); this.revisitAnswerId = params.get('answer'); this.revisitResultId = params.get('result'); this.wordThreadId = params.get('id');
    this.page = name || 'home'; this.revision = null; this.result = null; this.activeQuestion = null;
    if (this.page === 'question') {
      const answerId = params.get('answer');
      if (answerId) {
        this.revision = currentAnswers(this.state.answers).find(a => a.id === answerId);
        this.activeQuestion = this.revision?.snapshot;
      } else if (['next', 'daily'].includes(params.get('source'))) {
        // Legacy daily links now enter the unrestricted question sequence.
        const next = this.game.getNextQuestion();
        this.navigate(next ? `#question?id=${encodeURIComponent(next.id)}` : '#home', true);
        return;
      } else {
        this.activeQuestion = availableQuestions(this.state, this.catalog).find(q => q.id === params.get('id'));
        this.answerSource = 'archive';
      }
      if (!this.activeQuestion) this.page = 'missing';
    } else if (this.page === 'answer') {
      const answer = this.state.answers.find(a => a.id === params.get('id'));
      if (!answer) this.page = 'missing';
      else this.readResult(answer, params.get('stage') === 'read');
    } else if (!['home', 'history', 'about', 'archive', 'profile', 'past', 'compare', 'boundary', 'revisit', 'words', 'rest'].includes(this.page)) this.page = 'missing';
    if (this.page === 'rest') this.resetSession();
    if (this.page === 'home') this.refreshDailyReflections();
    const label = { rest: 'ひと休み', home: '判断のノート', question: '問い', answer: '回答を振り返る', history: '回答の足あと', profile: 'あなたの地図', past: '過去の自分', compare: '二つの答えを見比べる', boundary: '判断が変わる、その間を探す', revisit: '同じ問いに、もう一度', words: '言葉の足あと', about: 'このノートについて', archive: 'ほかの問い', missing: 'ページが見つかりません' };
    document.title = `${label[this.page]} — あなたなら、どうする？`;
    this.focusHeading();
  }
  readResult(answer, readOnly) {
    const latest = currentAnswers(this.state.answers).some(a => a.id === answer.id);
    const candidates = latest ? detectComments(this.state, this.catalog, { profile: this.game.getProfile() }) : [];
    const shown = candidates.find(c => c.evidence.answerIds.includes(answer.id) && this.state.discoveries.some(d => d.id === c.id));
    const comment = shown ?? selectComment(candidates, this.state, { answerId: answer.id });
    const followUps = !readOnly && latest ? eligibleFollowUps(this.state, this.catalog, { event: 'after_answer', answerId: answer.id, date: localDate() }) : [];
    this.result = { answer, comment, text: comment ? formatComment(comment, this.catalog) : null, followUp: followUps.find(f => ['reason', 'free_text'].includes(f.kind)) ?? null };
    this.reasonChoice = ''; this.reflectionText = '';
  }
  async updated() {
    // Record exposure only once its explanation is actually rendered.
    const comment = this.result?.comment;
    if (this.page === 'answer' && !this.result.followUp && comment && !this.state.discoveries.some(d => d.id === comment.id) && this.marking !== comment.id) {
      this.marking = comment.id;
      try { this.game.markCommentShown(comment.id); this.state = this.storage.getState(); }
      catch (error) { this.showError(error); }
      finally { this.marking = null; }
    }
  }
  showError(error) {
    this.conflict = error instanceof StorageConflictError;
    this.error = this.conflict ? '別のタブでノートが更新されました。今の内容をJSONで書き出してから、最新の記録を読み直してください。'
      : '記録を更新できませんでした。入力やファイルの内容を確認してください。今の記録はそのまま残っています。';
  }
  async perform(action) {
    if (this.busy) return;
    this.busy = true; this.error = ''; this.notice = '';
    try { await action(); this.state = this.storage.getState(); }
    catch (error) { this.showError(error); }
    finally { this.busy = false; }
  }
  refreshDailyReflections() {
    try {
      this.game.getDailyReflections();
      this.state = this.storage.getState();
    } catch (error) { this.showError(error); }
    this.reflectionDate = localDate();
  }
  actOnDailyReflection(id, action) {
    if (this.reflectionDate !== localDate()) { this.refreshDailyReflections(); this.notice = '日付が変わったので、今日の提案を読み直しました。'; return; }
    this.perform(() => {
      const href = this.game.dailyReflectionAction(id, action);
      if (action === 'opened') this.navigate(href);
      else this.notice = '今日は見送りました。気が向いたときに、過去の自分から読み返せます。';
    });
  }
  renderDailyReflections() {
    const cards = dailyReflectionCards(this.state, this.catalog);
    if (!cards.length) return nothing;
    const labels = this.catalog.settings.dailyReflection.labels;
    return html`<section class="daily-reflection-section" aria-labelledby="daily-reflection-heading"><h2 id="daily-reflection-heading">${this.catalog.settings.dailyReflection.limitPerDay === 1 ? '今日、振り返る一つ' : '今日の振り返り'}</h2>
      ${cards.map(card => html`<article class="paper daily-reflection-card" aria-label="今日の振り返り提案">
        ${card.status === 'available' ? html`<p class="eyebrow">以前の記録から</p><h3><plain-text .text=${card.title}></plain-text></h3><p class="small muted"><time datetime=${card.recordedAt}>${dateLabel(card.recordedAt)}</time>の記録</p>
          <p>${labels[card.kind]?.intro}</p><div class="data-actions"><button class="button secondary" ?disabled=${this.busy} @click=${() => this.actOnDailyReflection(card.id, 'opened')}>${card.opened ? '続きを読む' : labels[card.kind]?.action}</button><button class="text-button" ?disabled=${this.busy} @click=${() => this.actOnDailyReflection(card.id, 'dismissed')}>今日は見送る</button></div><p class="small muted">今は開かなくても構いません。</p>`
        : html`<p>${card.status === 'dismissed' ? '今日の提案は見送りました。' : '今日ご案内した記録は更新されました。'}</p><p class="small muted">今日は新しい提案を追加しません。</p><a class="text-link" href="#past">自分で振り返る記録を選ぶ →</a>`}
      </article>`)}
    </section>`;
  }
  submitWords(event) {
    this.perform(() => {
      const r = event.detail;
      this.game.writeWords(r.sourceReflectionId, r.stanceId, r.text);
      this.querySelector('words-view')?.reset();
      this.notice = this.storage.getStatus().mode === 'persistent' ? '今のあなたの言葉を記録しました。' : '言葉は、このページを開いている間だけ保持されます。';
    });
  }
  submitReevaluation(event) {
    this.perform(() => {
      const r = event.detail;
      const id = this.game.reevaluate(r.previousAnswerId, r.optionId, r.reason);
      this.navigate(`#revisit?result=${encodeURIComponent(id)}`, true);
    });
  }
  submitReevaluationNote(event) {
    this.perform(() => {
      const r = event.detail;
      this.game.writeReevaluationNote(r.reevaluationId, r.stanceId, r.text);
      this.querySelector('reevaluation-view')?.resetNote();
      this.notice = this.storage.getStatus().mode === 'persistent' ? '今回の気づきを記録しました。' : '気づきは、このページを開いている間だけ保持されます。';
    });
  }
  submitBoundaryAnswer(event) {
    this.perform(() => {
      const r = event.detail;
      this.game.answerBoundary(r.journeyId, r.questionId, r.optionId);
      this.navigate(`#boundary?id=${encodeURIComponent(r.journeyId)}`, true);
    });
  }
  submitComparisonReply(event) {
    this.perform(() => {
      const r = event.detail;
      this.game.replyToComparison(r.comparisonId, r.stanceId, r.text);
      this.querySelector('comparison-view')?.reset();
      this.notice = this.storage.getStatus().mode === 'persistent' ? 'あなたの振り返りを記録しました。' : '振り返りは、このページを開いている間だけ保持されます。';
    });
  }
  submitPastReply(event) {
    this.perform(() => {
      const r = event.detail;
      this.game.replyToPast(r.sourceType, r.sourceId, r.stanceId, r.text);
      this.querySelector('past-view')?.reset();
      this.notice = this.storage.getStatus().mode === 'persistent' ? '今のあなたの返事を記録しました。' : '返事は、このページを開いている間だけ保持されます。';
    });
  }
  submitAnswer(event) {
    this.perform(() => {
      const { optionId } = event.detail;
      const report = this.revision ? this.game.revise(this.revision.id, optionId)
        : this.game.answer(this.activeQuestion.id, optionId, { source: this.answerSource, expectedPreviousId: null });
      const answer = currentAnswers(report.state.answers).find(a => a.questionId === this.activeQuestion.id);
      if (!this.revision) {
        this.sessionQuestions.add(answer.questionId);
        this.lastSessionQuestionId = answer.questionId;
      }
      this.navigate(`#answer?id=${encodeURIComponent(answer.id)}`, true);
    });
  }
  submitFollowUp(event) {
    event.preventDefault();
    const { answer, followUp } = this.result;
    this.perform(() => {
      let answerId = answer.id;
      if (followUp.kind === 'reason') {
        if (!this.reasonChoice) return;
        const report = this.game.answerReason(answer.id, followUp.id, this.reasonChoice);
        answerId = currentAnswers(report.state.answers).find(a => a.questionId === answer.questionId).id;
      } else {
        this.game.writeReflection(followUp.id, this.reflectionText, { sourceAnswerId: answer.id });
      }
      this.navigate(`#answer?id=${encodeURIComponent(answerId)}&stage=read`, true);
    });
  }
  download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  exportData() { this.download(this.storage.exportJSON(), `judgment-notebook-${localDate()}.json`); }
  async chooseImport(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.error = 'このファイルは大きすぎます。5MB以下のJSONファイルを選んでください。'; return; }
    try { this.importText = await file.text(); this.confirmation = 'import'; this.error = ''; }
    catch { this.error = 'ファイルを読み取れませんでした。もう一度選んでください。'; }
  }
  confirmData() {
    this.perform(() => {
      if (this.confirmation === 'clear') this.storage.clear();
      else this.storage.importJSON(this.importText);
      this.confirmation = ''; this.importText = ''; this.resetSession();
      this.notice = this.storage.getStatus().issue === 'delete_failed' ? 'このブラウザの保存データを削除できませんでした。ブラウザの設定を確認してください。' : 'ノートを更新しました。';
    });
  }
  resetSession() {
    this.sessionQuestions.clear();
    this.lastSessionQuestionId = null;
  }
  renderRest() {
    return html`<article class="reading paper"><p class="eyebrow">ページを閉じる前に</p><h1 tabindex="-1" data-page-heading>ここで、ひと休み。</h1>
      <p>${this.storage.getStatus().mode === 'persistent' ? 'ここまでの答えは、このブラウザに残っています。' : 'ここまでの答えは、このページを開いている間だけ保持されます。閉じる前にデータ管理から書き出せます。'}</p>
      <p>次に考えたくなったとき、また開いてください。今、答えを振り返っても構いません。</p>
      <div class="submit-row"><a class="button secondary" href="#history">回答の足あとを読む</a><a class="text-link" href="#home">ホームへ戻る</a></div></article>`;
  }
  renderHome() {
    const count = distinctCount(this.state), question = this.game.getNextQuestion();
    return html`<section class="home-layout">
      <div class="home-intro"><p class="eyebrow">過去の自分と話す、小さなノート</p>
        <h1 tabindex="-1" data-page-heading>今の考えを、<br>未来の自分へ。</h1>
        <p class="intro">気になる問いに、自分のペースで答える。<br>以前の自分と、少し違う答えに出会う。<br>その間にあるものを、ゆっくり考えてみませんか。</p>
        <div class="note-line"><span aria-hidden="true">✳</span><p>正解も、性格のタイプも決めません。<br>残していくのは、あなたの判断の足あとです。</p></div>
        <p class="small muted record-count">${count ? `${count}の問いに、あなたの答えが残っています。` : 'まだ何も書かれていない、一冊から。'}</p>
      </div>
      <article class="paper daily-card"><div class="card-top"><p class="eyebrow">次の問い</p><span class="small muted">一問でも、続けてでも。</span></div>
        ${question ? html`<span class="page-flower" aria-hidden="true">✳</span><h2>${question.title}</h2><p class="preview">${question.body}</p>
          <a class="button full" href=${`#question?id=${encodeURIComponent(question.id)}`}>この問いを読む <span aria-hidden="true">→</span></a>
          <p class="small muted card-caption">いつでもひと休みできます。</p>` : html`<h2>今読める問いを、読み終えました。</h2><p>以前の答えを読み返したり、今の考えで答え直したりできます。条件が整うと、別の問いが現れることもあります。</p><div class="card-btn-wrap"><a class="button" href="#past">過去の自分を訪ねる</a></div>`}
      </article>
    </section>
    ${this.renderDailyReflections()}
    <section class="home-bottom"><div><p class="eyebrow">このノートの使い方</p><p>選ぶ。理由を考える。あとから読み返す。</p></div><a class="text-link" href="#archive">ほかの問いを読む <span aria-hidden="true">↗</span></a></section>`;
  }
  renderFollowUp() {
    const { followUp: f, answer } = this.result;
    return html`<article class="reading paper"><p class="eyebrow">答えのそばに、ひとこと</p><h1 tabindex="-1" data-page-heading>${f.title}</h1>
      <p class="save-label">${this.storage.getStatus().mode === 'persistent' ? '選んだ答えは記録しました。' : '選んだ答えは、このページを開いている間だけ保持されます。'}</p>
      <p class="answer-quote"><plain-text .text=${answerLabel(answer)}></plain-text></p><p>${f.body}</p>
      <form @submit=${event => this.submitFollowUp(event)}>
        ${f.kind === 'reason' ? html`<fieldset ?disabled=${this.busy}><legend>いちばん近い理由を選んでください（任意）。</legend><div class="choices">${f.options.map(o => html`<label class="choice ${this.reasonChoice === o.id ? 'selected' : ''}"><input type="radio" name="reason" .value=${o.id} .checked=${this.reasonChoice === o.id} @change=${() => { this.reasonChoice = o.id; }}><span>${o.label}</span></label>`)}</div></fieldset>` : html`<label class="field-label" for="reflection-text">あなたの言葉（任意）</label><textarea id="reflection-text" rows="6" maxlength=${f.maxLength} .value=${this.reflectionText} @input=${event => { this.reflectionText = event.target.value; }} aria-describedby="reflection-privacy"></textarea><p id="reflection-privacy" class="small muted">${this.catalog.copy.copy[f.privacyCopyId]}</p>`}
        <div class="submit-row"><button class="button" ?disabled=${this.busy || (f.kind === 'reason' ? !this.reasonChoice : !this.reflectionText.trim())}>${f.kind === 'reason' ? '理由を記録して進む' : '言葉を記録して進む'}</button><a class="text-link" href=${`#answer?id=${encodeURIComponent(answer.id)}&stage=read`}>今回は書かずに進む</a></div>
      </form></article>`;
  }
  renderResult() {
    if (this.result.followUp) return this.renderFollowUp();
    const { answer, text } = this.result;
    const next = this.game.getNextQuestion();
    const pause = this.lastSessionQuestionId === answer.questionId && this.sessionQuestions.size > 0 && this.sessionQuestions.size % 3 === 0;
    return html`<article class="reading paper result-page"><p class="eyebrow">ひとつ、足あとが残りました</p><h1 tabindex="-1" data-page-heading>${answer.snapshot.title}</h1>
      <p class="small muted"><time datetime=${answer.answeredAt}>${dateLabel(answer.answeredAt)}</time>の回答</p><p class="answer-quote"><plain-text .text=${answerLabel(answer)}></plain-text></p>
      ${answer.followUps.map(f => html`<p class="small reason-note">理由：<plain-text .text=${f.snapshot.options.find(o => o.id === f.optionId)?.label}></plain-text></p>`)}
      <section class="explanation"><p class="eyebrow">この問いの余白</p><h2>少し、視点を変えてみる</h2><p>${answer.snapshot.reflection.summary}</p>
        <ul class="perspectives">${answer.snapshot.reflection.perspectives.map(p => html`<li>${p}</li>`)}</ul><p class="reflection-question">${answer.snapshot.reflection.question}</p></section>
      ${text ? html`<section class="past-dialogue" aria-label="過去の自分との対話"><p class="eyebrow">過去の自分から</p><p class="preserve-lines"><plain-text .text=${text}></plain-text></p><p class="small muted">違いを、すぐに説明できなくても構いません。</p>${this.result.comment.evidence.answerIds.length === 2 ? html`<a class="text-link" href=${`#compare?id=${encodeURIComponent(this.result.comment.id)}`}>二つの答えを見比べて、振り返る →</a>` : nothing}</section>` : html`<p class="quiet-note">答えが増えると、関連する過去の判断と出会うことがあります。</p>`}
      ${pause ? html`<aside class="quiet-note" aria-labelledby="reading-pause-heading"><h2 id="reading-pause-heading">少し、立ち止まってみませんか。</h2><p>ここまでの答えを読み返しても、続けて答えても構いません。</p><a class="text-link" href="#history">ここまでの答えを振り返る →</a></aside>` : nothing}
      <div class="submit-row">${next ? html`<a class="button" href=${`#question?id=${encodeURIComponent(next.id)}`}>次の問いへ <span aria-hidden="true">→</span></a>` : html`<p class="small muted">今読める未回答の問いはありません。過去の答えも、いつでも読み返せます。</p>`}<a class="button secondary" href="#rest">ここでひと休み</a></div>
      <div class="submit-row"><a class="text-link" href="#history">回答の足あとを読む <span aria-hidden="true">→</span></a></div>
    </article>`;
  }
  renderArchive() {
    const questions = availableQuestions(this.state, this.catalog);
    return html`<section class="reading"><p class="eyebrow">ページをめくる</p><h1 tabindex="-1" data-page-heading>ほかの問い</h1><p class="intro">気になる問いを、あなたのペースで。<br>ここでの回答も、足あとに残ります。</p>
      <div class="archive-list">${questions.map(q => html`<a class="archive-item" href=${`#question?id=${encodeURIComponent(q.id)}`}><span>${q.title}</span><span aria-hidden="true">↗</span></a>`)}</div>
      ${!questions.length ? html`<p class="quiet-note">今読める未回答の問いはありません。回答の足あとを読み返したり、今の考えで答え直したりできます。</p>` : nothing}</section>`;
  }
  renderAbout() {
    return html`<article class="reading paper"><p class="eyebrow">安心して、書き残すために</p><h1 tabindex="-1" data-page-heading>このノートについて</h1>
      <p>これは、性格や心理状態を診断するものではありません。場面ごとに何を重く見たのか、過去と今で何が変わったのかを考えるためのノートです。</p>
      <p>回答はこのブラウザ内に保存され、外部へ送信されません。ほかの端末やブラウザとは自動で共有されません。</p>
      <section class="explanation"><h2>記録を手元に残す</h2><p>JSONファイルとして書き出し、同じノートへ読み戻せます。ファイルには、回答や自由に書いた言葉も含まれます。</p>
        <div class="data-actions"><button class="button secondary" @click=${() => this.exportData()}>JSONを書き出す</button><label class="button secondary file-button">JSONを読み込む<input type="file" accept=".json,application/json" aria-label="JSONを読み込む" @change=${event => this.chooseImport(event)}></label></div>
        ${this.storage.getRecoveryText() ? html`<button class="text-button" @click=${() => this.download(this.storage.getRecoveryText(), 'notebook-recovery.json')}>読み取れなかった元データを書き出す</button>` : nothing}
      </section>
      <section class="explanation"><h2>白いページに戻す</h2><p>このノートの回答・理由・自由記述・過去の自分への返事・二つの回答の振り返り・同じ問いへの再回答と気づき・言葉の足あとを、すべて削除します。</p><button class="text-button danger" @click=${() => { this.confirmation = 'clear'; }}>すべての記録を削除する</button></section>
      ${this.confirmation ? html`<section class="confirmation" aria-label="記録の変更確認"><h2>${this.confirmation === 'clear' ? '記録をすべて削除しますか？' : 'ファイルの記録に置き換えますか？'}</h2><p>現在の記録は置き換えられます。必要な場合は、先にJSONを書き出してください。</p><div class="data-actions"><button class="button" ?disabled=${this.busy} @click=${() => this.confirmData()}>${this.confirmation === 'clear' ? '削除する' : '置き換えて読み込む'}</button><button class="button secondary" @click=${() => { this.confirmation = ''; this.importText = ''; }}>やめる</button></div></section>` : nothing}
    </article>`;
  }
  render() {
    if (!this.ready) return html`<div class="loading" role="status">${this.error || 'ノートを開いています…'}${this.error ? html`<p><button class="button" @click=${() => location.reload()}>もう一度開く</button></p>` : nothing}</div>`;
    const status = this.storage.getStatus();
    return html`<div class="site-shell"><header class="site-header"><a class="brand" href="#home"><span class="brand-symbol" aria-hidden="true">✳</span><span>あなたなら、どうする？<small>判断のノート</small></span></a>
      <nav aria-label="主なページ"><a href="#home" aria-current=${this.page === 'home' ? 'page' : nothing}>ホーム</a><a href="#profile" aria-current=${this.page === 'profile' ? 'page' : nothing}>あなたの地図</a><a href="#past" aria-current=${['past', 'compare', 'boundary', 'revisit', 'words'].includes(this.page) ? 'page' : nothing}>過去の自分</a><a href="#history" aria-current=${this.page === 'history' ? 'page' : nothing}>回答の足あと</a></nav></header>
      ${status.mode === 'memory' ? html`<aside class="storage-warning" role="status">${status.issue === 'invalid_saved_data' ? '以前の記録を読み取れませんでした。元データは残したまま、このページ内で新しい記録を保持しています。' : this.catalog.copy.copy.memory_mode} <a href="#about">記録を書き出す</a></aside>` : nothing}
      ${this.error ? html`<aside class="error-message" role="alert">${this.error}${this.conflict ? html`<div class="data-actions"><button class="text-button" @click=${() => this.exportData()}>今の記録を書き出す</button><button class="text-button" @click=${() => this.perform(() => { this.storage.reload(); this.resetSession(); this.navigate('#home'); })}>最新の記録を読み直す</button></div>` : nothing}</aside>` : nothing}
      ${this.notice ? html`<p class="notice" role="status">${this.notice}</p>` : nothing}
      <main id="main-content" tabindex="-1">
        ${this.page === 'home' ? this.renderHome() : this.page === 'rest' ? this.renderRest() : this.page === 'question' ? html`<question-view .question=${this.activeQuestion} .revision=${Boolean(this.revision)} .previousLabel=${this.revision ? answerLabel(this.revision) : ''} .busy=${this.busy} @answer-submit=${event => this.submitAnswer(event)}></question-view>`
          : this.page === 'answer' ? this.renderResult() : this.page === 'history' ? html`<history-view .state=${this.state} @reconsider-answer=${event => this.navigate(`#question?answer=${encodeURIComponent(event.detail.answerId)}`)}></history-view>`
          : this.page === 'words' ? html`<words-view .state=${this.state} .definition=${this.catalog.followups.wordDialogue} .threadId=${this.wordThreadId} .busy=${this.busy} @words-submit=${event => this.submitWords(event)}></words-view>`
          : this.page === 'revisit' ? html`<reevaluation-view .state=${this.state} .definition=${this.catalog.followups.reevaluationDialogue} .answerId=${this.revisitAnswerId} .resultId=${this.revisitResultId} .busy=${this.busy} @reevaluation-answer=${event => this.submitReevaluation(event)} @reevaluation-note=${event => this.submitReevaluationNote(event)}></reevaluation-view>`
          : this.page === 'boundary' ? html`<boundary-view .state=${this.state} .catalog=${this.catalog} .journeyId=${this.boundaryId} .questionId=${this.boundaryQuestionId} .busy=${this.busy} @boundary-answer=${event => this.submitBoundaryAnswer(event)}></boundary-view>`
          : this.page === 'compare' ? html`<comparison-view .state=${this.state} .catalog=${this.catalog} .comparisonId=${this.comparisonId} .busy=${this.busy} @comparison-reply=${event => this.submitComparisonReply(event)}></comparison-view>`
          : this.page === 'past' ? html`<past-view .catalog=${this.catalog} .view=${this.pastView} .state=${this.state} .definition=${this.catalog.followups.manualDialogue} .sourceType=${this.pastSourceType} .sourceId=${this.pastSourceId} .busy=${this.busy} @past-reply=${event => this.submitPastReply(event)}></past-view>`
          : this.page === 'profile' ? html`<profile-view .profile=${this.game.getProfile()} .catalog=${this.catalog} .state=${this.state} .discoveries=${detectComments(this.state, this.catalog)}></profile-view>` : this.page === 'archive' ? this.renderArchive() : this.page === 'about' ? this.renderAbout() : html`<section class="reading paper"><h1 tabindex="-1" data-page-heading>このページは見つかりませんでした。</h1><p>問いが更新されたか、記録が変更された可能性があります。</p><a class="button" href="#home">ホームへ戻る</a></section>`}
      </main>
      <footer class="site-footer"><p><span class="status-dot" aria-hidden="true"></span>${status.mode === 'persistent' ? '回答は、このブラウザの中に。' : '今の記録は、このページの中に。'}</p><a href="#about">このノートについて・データ管理</a></footer>
    </div>`;
  }
}
customElements.define('self-dialogue-app', SelfDialogueApp);
