import { UpetoaHarborAttackScene } from './10-harbor-attack.js';
import { MAINLAND_ROAD as ROAD, HARBOR_LANDING, canWalkHarbor, preloadMainlandCoast, renderMainlandCoast } from './mainland-coast.js';

const $ = selector => document.querySelector(selector);

export class MainlandLandingScene extends UpetoaHarborAttackScene {
  constructor() {
    super({ key: 'MainlandLandingScene', chapter: 'CHAPTER 10', title: 'バザールの港', time: '朝' });
  }

  preload() {
    super.preload();
    preloadMainlandCoast(this);
  }

  create(data = {}) {
    this.registerHarborSprites();
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.transitioning = false;
    this.cinematic = false;
    this.phase = 'shore';
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.bindSceneControls();
    this.events.once('shutdown', () => {
      this.hideCaption();
    });
    this.renderMainland(data);
    this.registry.set('mainlandLanded', true);
    this.updateHud();
    this.showStory({ lines: [
      { speaker: '', text: '小型艇を桟橋に寄せ、チャトアは潮に湿った板の上へ上がった。ここは、バザールの街の港だった。' },
      { speaker: 'チャトア', text: '……着いた。本土だ。まだ、足が揺れてるみたい。' },
      { speaker: '', text: '石の包みは胸元にある。船の間に網が干され、岸壁では船員たちが荷を運んでいる。倉庫の向こうには街の屋根が見えた。' },
      { speaker: 'チャトア', text: 'この街で、ベクテーナへの行き方を聞こう。島で起きたことを、知らせなきゃ。' },
    ] });
  }

  renderMainland(data) {
    renderMainlandCoast(this);
    const boatY = data.boatY ?? HARBOR_LANDING.boatY;
    this.beachedBoat = this.makeBoat(HARBOR_LANDING.boatX, boatY).setScale(0.85).setDepth(180);
    this.player = this.character(HARBOR_LANDING.playerX, HARBOR_LANDING.playerY, 'returnChatoa', 1);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    if (Number.isFinite(data.cameraX) && Number.isFinite(data.cameraY)) {
      this.cameras.main.setScroll(data.cameraX, data.cameraY);
    } else {
      this.cameras.main.centerOn(this.player.x, this.player.y);
    }
  }

  update(_time, delta) {
    const action = Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (this.storyBusy) { if (action) this.advanceStory?.(); return; }
    if (action) this.interact();
    if (this.storyBusy || !['shore', 'complete'].includes(this.phase)) return;
    const direction = this.activeDirection();
    const length = Math.hypot(direction.x, direction.y) || 1;
    const speed = 175;
    const step = speed * Math.min(delta, 50) / 1000;
    const x = this.player.x + direction.x / length * step;
    const y = this.player.y + direction.y / length * step;
    const allowed = (px, py) => canWalkHarbor(this, px, py);
    if (allowed(x, this.player.y)) this.player.x = x;
    if (allowed(this.player.x, y)) this.player.y = y;
    if (direction.x || direction.y) this.player.setFrame(direction.x ? direction.x > 0 ? 1 : 2 : direction.y > 0 ? 0 : 3);
    this.player.setDepth(this.player.y);
    if (this.phase === 'shore' && !this.storyBusy && this.near(ROAD, 85)) this.reachRoad();
  }

  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.phase !== 'shore' && this.phase !== 'complete') return;
    const worker = this.harborWorkers.find(npc => this.near(npc, 90));
    if (worker) return this.showStory({ speaker: worker.speaker, lines: worker.lines });
    if (this.near(this.beachedBoat, 130)) return this.showStory({ speaker: 'チャトア', lines: ['ここまで運んでくれて、ありがとう。ここからは歩いていく。'] });
    if (this.near(ROAD, 110)) {
      if (this.phase === 'shore') this.reachRoad();
      else this.showStory({ speaker: 'チャトア', lines: ['バザールの街で、ベクテーナへの道を探そう。'] });
    }
  }

  reachRoad() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.phase = 'road';
    this.touchDirection = null;
    this.registry.set('mainlandLandingComplete', true);
    this.registry.set('bazaarHarborReached', true);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('BazaarCityScene'));
    this.cameras.main.fadeOut(450, 14, 25, 28);
  }

  updateHint() {
    if (this.storyBusy) return;
    $('#hint').textContent = this.phase === 'shore' ? '矢印 / WASD・方向ボタンで移動。桟橋を渡り、荷揚げ場から東の街へ。Enter / Spaceで船員と話せる。'
      : this.phase === 'complete' ? 'CHAPTER 10 完了 — バザールの街に到着。'
      : 'Enter / Space・つづける・調べるで次へ。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 10';
    $('.hud h1').textContent = 'バザールの港';
    $('#time-label').textContent = '朝';
    $('#step-label').textContent = this.phase === 'complete' ? 'バザールの街へ' : 'バザールの街の港';
    $('#phaser-stage').setAttribute('aria-label', 'バザールの街の港と商店街');
    const list = $('#quest-list'); list.replaceChildren();
    for (const [done, text] of [[this.registry.get('mainlandLanded'), '小型艇でバザールの港に上陸する'], [this.phase === 'complete', '港からバザールの街へ進む']]) {
      const li = document.createElement('li'); li.textContent = `${done ? '✓' : '□'} ${text}`;
      if (done) li.className = 'done'; list.append(li);
    }
    this.updateHint();
  }
}
