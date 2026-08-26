
export class UI {
  constructor({characters, backgrounds, evidence}) {
    this.characters = characters;
    this.backgrounds = backgrounds;
    this.evidence = evidence;
    this.bg = document.querySelector("#bg");
    this.speaker = document.querySelector("#speaker");
    this.text = document.querySelector("#text");
    this.messageBox = document.querySelector("#message-box");
    this.choiceBox = document.querySelector("#choice-box");
    this.deductionBox = document.querySelector("#deduction-box");
    this.chapterTitle = document.querySelector("#chapter-title");
    this.fade = document.querySelector("#fade");
    this.evidenceLayer = document.querySelector("#evidence-layer");
    this.evidenceImage = document.querySelector("#evidence-image");
    this.evidencePlaceholder = document.querySelector("#evidence-placeholder");
    this.logDialog = document.querySelector("#log-dialog");
    this.logContent = document.querySelector("#log-content");
    this.portraits = {
      left: document.querySelector("#portrait-left"),
      center: document.querySelector("#portrait-center"),
      right: document.querySelector("#portrait-right")
    };

    document.querySelector("#evidence-close").onclick = () => this.hideEvidence();
    document.querySelector("#log-close").onclick = () => this.logDialog.close();
  }

  setBackground(id) {
    const item = this.backgrounds[id];
    const el = this.bg;
    if (!item) {
      el.style.backgroundImage = "none";
      el.innerHTML = `<div class="placeholder">背景未定義: ${id}</div>`;
      return;
    }
    el.innerHTML = "";
    const img = new Image();
    img.onload = () => { el.style.backgroundImage = `url("${item.file}")`; };
    img.onerror = () => {
      el.style.backgroundImage = "none";
      el.innerHTML = `<div class="placeholder">背景画像プレースホルダー\n${item.name}\n${item.file}</div>`;
    };
    img.src = item.file;
  }

  setCharacters(items = []) {
    Object.values(this.portraits).forEach(el => { el.style.backgroundImage = ""; el.innerHTML = ""; });
    for (const item of items) this.setCharacter(item.id, item.expression ?? "normal", item.position ?? "center");
  }

  setCharacter(id, expression="normal", position="center") {
    const char = this.characters[id];
    const el = this.portraits[position];
    if (!char || !el) return;
    const path = char.portraits?.[expression] || char.portraits?.normal;
    if (!path) {
      el.innerHTML = `<div class="placeholder">${char.short_name ?? char.name}</div>`;
      return;
    }
    const img = new Image();
    img.onload = () => { el.innerHTML=""; el.style.backgroundImage=`url("${path}")`; };
    img.onerror = () => { el.style.backgroundImage=""; el.innerHTML=`<div class="placeholder">${char.short_name ?? char.name}\n${expression}</div>`; };
    img.src = path;
  }

  hideCharacter(position) {
    const el = this.portraits[position];
    if (el) { el.style.backgroundImage=""; el.innerHTML=""; }
  }

  showText(speaker, text) {
    this.speaker.textContent = speaker || "";
    this.text.textContent = text || "";
    this.choiceBox.classList.add("hidden");
  }

  showChoices(prompt, options, onChoose) {
    this.choiceBox.innerHTML = `<h3>${prompt ?? "選択してください"}</h3>`;
    for (const option of options) {
      const btn = document.createElement("button");
      btn.textContent = option.text;
      btn.onclick = () => {
        this.choiceBox.classList.add("hidden");
        onChoose(option);
      };
      this.choiceBox.appendChild(btn);
    }
    this.choiceBox.classList.remove("hidden");
  }

  showDeduction(event, onSolved) {
    const box = this.deductionBox;
    const candidates = event.candidates ?? [];
    box.innerHTML = `<h3>${event.prompt ?? "推理してください"}</h3>`;
    const selects = [];
    for (const slot of (event.slots ?? [])) {
      const row = document.createElement("div");
      row.className = "deduction-row";
      const label = document.createElement("label");
      label.textContent = slot.label;
      const select = document.createElement("select");
      select.dataset.answer = slot.answer;
      select.innerHTML = `<option value="">選択</option>` + candidates.map(c => `<option value="${c}">${c}</option>`).join("");
      row.append(label, select); box.appendChild(row); selects.push(select);
    }
    const feedback = document.createElement("p");
    const btn = document.createElement("button"); btn.textContent = "推理する";
    btn.onclick = () => {
      if (!selects.every(s => s.value)) { feedback.textContent="三つすべてを選んでください。"; return; }
      if (!selects.every(s => s.value === s.dataset.answer)) { feedback.textContent="まだ何かが噛み合わない。もう一度整理しよう。"; return; }
      box.classList.add("hidden"); onSolved();
    };
    box.append(feedback,btn); box.classList.remove("hidden");
  }

  showEvidence(id) {
    const item = this.evidence[id];
    this.evidenceImage.hidden = true;
    this.evidencePlaceholder.hidden = true;
    if (!item) {
      this.evidencePlaceholder.textContent = `証拠画像未定義: ${id}`;
      this.evidencePlaceholder.hidden = false;
      this.evidenceLayer.classList.remove("hidden");
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.evidenceImage.src = item.file;
      this.evidenceImage.alt = item.name;
      this.evidenceImage.hidden = false;
    };
    img.onerror = () => {
      this.evidencePlaceholder.textContent = `証拠画像プレースホルダー\n${item.name}\n${item.file}`;
      this.evidencePlaceholder.hidden = false;
    };
    img.src = item.file;
    this.evidenceLayer.classList.remove("hidden");
  }

  hideEvidence() { this.evidenceLayer.classList.add("hidden"); }

  async effect(name, duration=600) {
    if (name === "fade_black") {
      this.fade.style.opacity = "1";
      await new Promise(r => setTimeout(r, duration));
      this.fade.style.opacity = "0";
    }
  }

  showTitle(text) {
    this.chapterTitle.textContent = text;
    this.chapterTitle.classList.remove("hidden");
  }

  hideTitle() {
    this.chapterTitle.classList.add("hidden");
  }

  showLog(items) {
    this.logContent.innerHTML = items.map(item =>
      `<div class="log-item"><div class="log-speaker">${item.speaker ?? ""}</div><div>${item.text}</div></div>`
    ).join("");
    this.logDialog.showModal();
  }
}
