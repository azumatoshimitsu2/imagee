import { LitElement, html, nothing } from '../vendor/lit.js';
import { loadLandscapes, selectLandscape } from '../landscape-engine.js';
import { answerLabel, dateLabel } from './history-view.js';
import './plain-text.js';

class LandscapeView extends LitElement {
  static properties = {
    profile: { attribute: false }, catalog: { attribute: false }, state: { attribute: false },
    discoveries: { attribute: false }, definition: { state: true }, loadError: { state: true }, failedImage: { state: true },
  };
  constructor() {
    super();
    this.definition = null;
    this.loadError = false;
    this.failedImage = null;
  }
  createRenderRoot() { return this; }
  firstUpdated() { this.load(); }
  async load() {
    this.loadError = false;
    try { this.definition = await loadLandscapes({ axes: this.catalog.axes.axes }); }
    catch { this.loadError = true; }
  }
  render() {
    if (!this.profile) return nothing;
    if (!this.definition) return html`<section class="landscape-section" aria-label="心象風景">
      <h2>心象風景</h2>${this.loadError ? html`<p>風景を読み込めませんでした。回答の記録や地図は、そのまま使えます。</p><button class="text-button" @click=${() => this.load()}>風景をもう一度読み込む</button>` : html`<p role="status">風景を用意しています…</p>`}
    </section>`;
    const result = selectLandscape(this.definition, this.profile, this.discoveries ?? []);
    const landscape = result.landscape;
    const answers = result.evidenceAnswerIds.map(id => this.state.answers.find(a => a.id === id)).filter(Boolean);
    const imageURL = new URL(`../../${landscape.image}`, import.meta.url).href;
    return html`<section class="landscape-section" aria-labelledby="landscape-heading">
      <div class="landscape-intro"><p class="eyebrow">答えを、風景に重ねて</p><h2 id="landscape-heading">心象風景</h2><p class="small muted">${this.definition.copy.intro}</p></div>
      <figure class="paper landscape-figure">
        ${this.failedImage === imageURL ? html`<div class="landscape-image-unavailable" role="status"><p>画像を読み込めませんでした。風景の言葉と根拠は、下で読めます。</p><button class="text-button" @click=${() => { this.failedImage = null; }}>画像をもう一度読み込む</button></div>`
          : html`<img class="landscape-image" src=${imageURL} alt=${landscape.alt} width="1536" height="1024" loading="lazy" decoding="async" @error=${() => { this.failedImage = imageURL; }}>`}
        <figcaption class="landscape-caption"><h3>${landscape.name}</h3><p class="landscape-words">${landscape.resultText}</p>
          <p class="small muted">${this.definition.copy[result.status]}</p>
          ${result.provisional ? html`<p class="small muted">${this.definition.copy.provisional}</p>` : nothing}
          ${answers.length ? html`<details class="axis-details landscape-evidence"><summary>この風景につながった回答を読む（${answers.length}件）</summary>
            ${result.matchedAxes.length ? html`<p class="small muted">${result.matchedAxes.map(id => {
              const axis = this.catalog.axes.axes.find(a => a.id === id);
              return `${axis.negativeLabel} / ${axis.positiveLabel}`;
            }).join('、')}の現在の回答を手がかりにしています。</p>` : nothing}
            <ul class="map-evidence">${answers.map(answer => html`<li><a href=${`#answer?id=${encodeURIComponent(answer.id)}&stage=read`}>${answer.snapshot.title} <span aria-hidden="true">↗</span></a><p class="small muted"><time datetime=${answer.answeredAt}>${dateLabel(answer.answeredAt)}</time></p><p><plain-text .text=${answerLabel(answer)}></plain-text></p></li>`)}</ul>
            ${result.discoveryIds.map(id => html`<p><a class="text-link" href=${`#compare?id=${encodeURIComponent(id)}`}>条件と二つの答えを見比べる →</a></p>`)}
          </details>` : nothing}
          <details class="axis-details"><summary>風景の選び方について</summary><p class="small muted">${this.definition.copy.method}</p><p class="small muted">回答を選び直すと、風景も変わることがあります。変わることにも、変わらないことにも、良い・悪いはありません。</p></details>
        </figcaption>
      </figure>
    </section>`;
  }
}
customElements.define('landscape-view', LandscapeView);
