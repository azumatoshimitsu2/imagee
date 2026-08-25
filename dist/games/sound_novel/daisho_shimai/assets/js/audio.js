
export class AudioManager {
  constructor(spec) {
    this.spec = spec;
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.muted = false;
  }

  async playBgm(id) {
    const item = this.spec.bgm?.[id];
    if (!item) return;
    if (this.bgm.dataset.id === id) return;
    this.bgm.pause();
    this.bgm = new Audio(item.file);
    this.bgm.loop = item.loop !== false;
    this.bgm.muted = this.muted;
    this.bgm.dataset.id = id;
    try { await this.bgm.play(); } catch (_) {}
  }

  stopBgm() {
    this.bgm.pause();
    this.bgm.removeAttribute("src");
    this.bgm.dataset.id = "";
  }

  playSe(id) {
    const item = this.spec.se?.[id];
    if (!item || this.muted) return;
    const audio = new Audio(item.file);
    audio.play().catch(() => {});
  }

  toggleMute() {
    this.muted = !this.muted;
    this.bgm.muted = this.muted;
    return this.muted;
  }
}
