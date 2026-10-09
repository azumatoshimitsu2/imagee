import { UpetoaHarborAttackScene } from './10-harbor-attack.js';
import { HARBOR_LANDING, preloadMainlandCoast, renderMainlandCoast } from './mainland-coast.js';

const $ = selector => document.querySelector(selector);
const CHASE_SECONDS = 36;
const STORY_PANELS = ['01-muzzle-v2', '02-impact-v3', '03-returning-light-v3', '04-empty-sea-v1'];
const LANES = [116, 201, 286, 371, 456];
const REEF_TILES = [
  { key: 'escapeReefLow', file: 'reef-low-v1', x: 108, y: 275, width: 1403, height: 454, displayWidth: 108 },
  { key: 'escapeReefRidge', file: 'reef-ridge-v1', x: 164, y: 144, width: 1533, height: 575, displayWidth: 116 },
];

export class PetoaSeaEscapeScene extends UpetoaHarborAttackScene {
  constructor() {
    super({ key: 'PetoaSeaEscapeScene', chapter: 'CHAPTER 9', title: '海上逃走', time: '朝' });
  }

  preload() {
    super.preload();
    preloadMainlandCoast(this);
    for (const file of STORY_PANELS) this.load.image(`story-${file}`, `./assets/img/story/chapter09/${file}.png`);
    for (const tile of REEF_TILES) this.load.image(tile.key, `./assets/img/tiles/sea/reefs/${tile.file}.png`);
  }

  create() {
    this.registerHarborSprites();
    this.events.once('shutdown', () => this.hideStoryPanel());
    for (const tile of REEF_TILES) {
      const texture = this.textures.get(tile.key);
      if (!texture.has('reef')) texture.add('reef', 0, tile.x, tile.y, tile.width, tile.height);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.cinematic = true;
    this.transitioning = false;
    this.phase = 'intro';
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.bindSceneControls();
    this.events.once('shutdown', () => { $('#next-button').hidden = false; $('#dialog').classList.remove('harbor-caption'); });
    this.renderSea();
    this.boat = this.makeBoat(500, 286, 'returnChatoa');
    this.boat.passenger.setFrame(1);
    this.player = this.boat;
    this.stone = this.add.image(28, -4, 'attackStone').setDisplaySize(20, 20).setVisible(false);
    this.boat.add(this.stone);
    this.damage = this.add.graphics();
    this.boat.add(this.damage);
    this.enemyBoat = this.makeBoat(240, 346);
    this.enemyBoat.getAt(0).setTint(0x809596);
    this.gunner = this.makeSoldier(0, 0);
    this.enemyBoat.add(this.gunner);
    this.obstacles = [];
    this.gates = [];
    this.chargeWarning = this.add.rectangle(416, 286, 800, 86, 0xf4b35c, 0.16).setDepth(90).setVisible(false);
    this.actionCue = this.add.text(416, 65, '', { fontSize: '18px', color: '#fff1be', stroke: '#132f3c', strokeThickness: 5 }).setOrigin(0.5).setDepth(240);
    const layout = () => { if (this.seaCut) this.fitSeaCamera(); };
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));
    this.updateHud();
    this.cameras.main.fadeIn(900, 10, 30, 40);
    this.showStory({ lines: [
      { speaker: '', text: '父に押し出された舟は島から遠ざかる。チャトアの足元には、母が持たせた二つの石の包みがあった。' },
      { speaker: 'チャトア', text: '王さまのいる都……ベクテーナへ行こう。誰かに、島のことを知らせなきゃ。' },
      { speaker: '', text: '背後の水面に、長い白い航跡が伸びた。兵士を乗せた追跡艇が迫ってくる。' },
      { speaker: 'チャトア', text: '追ってくる……！　同じ進路では追いつかれる。岩礁の切れ目を抜けて、突進をかわさなきゃ……！' },
    ], onComplete: () => this.startChase() });
  }

  makeSoldier(x, y) {
    const soldier = super.makeSoldier(x, y);
    soldier.getAt(0).setFlipX(true).setX(8);
    return soldier;
  }

  startChase() {
    this.phase = 'chase';
    this.cinematic = false;
    this.touchDirection = null;
    this.elapsed = 0;
    this.gap = 100;
    this.spawnIn = 0.9;
    this.spawnIndex = 0;
    this.reefIndex = 0;
    this.gateIndex = 0;
    this.invulnerable = 0;
    this.chargeState = 'follow';
    this.chargeIn = 4.5;
    this.chargeClock = 0;
    this.chargeWarning.setVisible(false);
    this.actionCue.setText('');
    this.noticeUntil = 0;
    this.notice = '';
    for (const gate of this.gates) gate.marker.destroy();
    this.gates = [];
    this.boat.setPosition(500, 286).setAlpha(1).setAngle(0);
    this.enemyBoat.setPosition(240, 346).setVisible(true);
    for (const obstacle of this.obstacles) obstacle.destroy();
    this.obstacles = [];
    this.updateHud();
  }

  update(_time, delta) {
    if (this.storyBusy) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space)) this.advanceStory?.();
      return;
    }
    if (this.phase === 'voyage') {
      const direction = this.activeDirection();
      const length = Math.hypot(direction.x, direction.y) || 1;
      const step = 195 * Math.min(delta, 50) / 1000;
      this.player.setPosition(
        Phaser.Math.Clamp(this.player.x + direction.x / length * step, 120, 1100),
        Phaser.Math.Clamp(this.player.y + direction.y / length * step, 100, 668),
      );
      if (this.player.x >= 1060 && Math.abs(this.player.y - 410) < 95) this.land();
      return;
    }
    if (this.phase !== 'chase') return;
    const dt = Math.min(delta, 50) / 1000;
    const direction = this.activeDirection().y;
    this.boat.y = Phaser.Math.Clamp(this.boat.y + direction * 235 * dt, 106, 456);
    this.boat.angle = Phaser.Math.Linear(this.boat.angle, direction * 5, 0.12);
    const difficulty = Math.min(1, this.elapsed / CHASE_SECONDS);
    const reefSpeed = 190 + 55 * difficulty;
    this.seaSurface.tilePositionX += reefSpeed * dt;
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.boat.alpha = this.invulnerable > 0 ? 0.5 + Math.sin(this.elapsed * 24) * 0.2 : 1;
    // Keeping a different lane is no longer an unlimited source of distance.
    this.gap = Math.max(0, this.gap - (3.2 + difficulty * 1.8) * dt);
    this.updatePursuit(dt);
    this.spawnIn -= dt;
    // Leave a clear dodge window for charges; never create a reef wall mid-charge.
    if (this.spawnIn <= 0 && this.chargeState === 'follow' && this.chargeIn > 0) {
      const index = this.spawnIndex++;
      if (index % 2 === 1) {
        const openings = [1, 3, 1, 2, 3, 1, 3, 2];
        this.spawnReefGate(openings[this.gateIndex++ % openings.length]);
        this.spawnIn = 2.8 - difficulty * 0.3;
      } else {
        // Aim isolated reefs at the current course to discourage staying still.
        const lane = LANES.reduce((best, y) => Math.abs(y - this.boat.y) < Math.abs(best - this.boat.y) ? y : best);
        this.spawnReef(900, lane);
        this.spawnIn = 2.1 - difficulty * 0.25;
      }
    }
    for (const obstacle of this.obstacles) {
      obstacle.x -= reefSpeed * dt;
      const hit = Math.abs(obstacle.x - this.boat.x) < 116 && Math.abs(obstacle.y - (this.boat.y + 10)) < 43;
      if (hit) {
        obstacle.hit = true;
        if (obstacle.gate) obstacle.gate.hit = true;
      }
      if (!obstacle.gate && !obstacle.passed && obstacle.x < this.boat.x - 116) {
        obstacle.passed = true;
        if (!obstacle.hit) this.gap = Math.min(160, this.gap + 10);
      }
      if (hit && this.invulnerable === 0) {
        this.gap = Math.max(0, this.gap - 36);
        this.invulnerable = 1.2;
        this.showActionCue('岩礁に接触！　追跡艇が近づく');
      }
    }
    this.obstacles = this.obstacles.filter(obstacle => { if (obstacle.x > -100) return true; obstacle.destroy(); return false; });
    for (const gate of this.gates) {
      gate.marker.x -= reefSpeed * dt;
      if (!gate.passed && gate.marker.x < this.boat.x - 116) {
        gate.passed = true;
        if (!gate.hit) {
          this.gap = Math.min(160, this.gap + 18);
          this.showActionCue('岩礁の切れ目を抜けた！　追跡艇を引き離した');
        }
      }
    }
    this.gates = this.gates.filter(gate => { if (gate.marker.x > -100) return true; gate.marker.destroy(); return false; });
    if (this.gap <= 0) return this.retryChase();
    if (this.elapsed >= CHASE_SECONDS) return this.beginGunfire();
    this.updateHud();
  }

  spawnReef(x, y, gate = null) {
    const reef = this.add.container(x, y).setDepth(100);
    const index = this.reefIndex++;
    const tile = REEF_TILES[index % REEF_TILES.length];
    const width = tile.displayWidth + (index % 3 - 1) * 5;
    // Foam and submerged edges belong to the irregular sprite, not an enclosing ring.
    const rocks = this.add.image(0, -4, tile.key, 'reef')
      .setDisplaySize(width, width * tile.height / tile.width)
      .setFlipX(Math.floor(index / 2) % 2 === 1);
    reef.add(rocks);
    reef.gate = gate;
    this.obstacles.push(reef);
    return reef;
  }

  spawnReefGate(openLane) {
    const marker = this.add.graphics().setPosition(900, LANES[openLane]).setDepth(92);
    marker.lineStyle(3, 0xb5ffe5, 0.85);
    for (const x of [-20, 0, 20]) marker.lineBetween(x - 8, -9, x + 2, 0).lineBetween(x + 2, 0, x - 8, 9);
    const gate = { marker, hit: false, passed: false };
    this.gates.push(gate);
    LANES.forEach((y, index) => { if (index !== openLane) this.spawnReef(900, y, gate); });
    this.showActionCue('岩礁帯！　緑の印の切れ目を抜けよう');
  }

  showActionCue(text, duration = 2.2) {
    this.notice = text;
    this.noticeUntil = this.elapsed + duration;
    this.actionCue.setText(text);
  }

  updatePursuit(dt) {
    const followX = this.boat.x - 170 - this.gap * 0.8;
    if (this.chargeState === 'follow') {
      this.enemyBoat.y += Phaser.Math.Clamp(this.boat.y - this.enemyBoat.y, -65 * dt, 65 * dt);
      this.enemyBoat.x = followX;
      this.chargeIn -= dt;
      // Do not force a dodge while a narrow reef passage is approaching.
      if (this.chargeIn <= 0 && !this.obstacles.some(reef => reef.x > this.boat.x - 130 && reef.x < 940) && this.elapsed < CHASE_SECONDS - 4) {
        this.chargeState = 'warning';
        this.chargeClock = 1.2 - 0.2 * Math.min(1, this.elapsed / CHASE_SECONDS);
        this.chargeY = this.boat.y;
        this.chargeStartX = this.enemyBoat.x;
        this.chargeHit = false;
        this.chargeWarning.setY(this.chargeY).setVisible(true);
      }
    } else if (this.chargeState === 'warning') {
      this.chargeClock -= dt;
      this.enemyBoat.y += Phaser.Math.Clamp(this.chargeY - this.enemyBoat.y, -220 * dt, 220 * dt);
      this.chargeWarning.setAlpha(0.12 + (Math.sin(this.elapsed * 18) + 1) * 0.08);
      if (this.chargeClock <= 0) { this.chargeState = 'dash'; this.chargeClock = 0; }
    } else if (this.chargeState === 'dash') {
      this.chargeClock += dt;
      this.enemyBoat.x = Phaser.Math.Linear(this.chargeStartX, this.boat.x + 145, Math.min(1, this.chargeClock / 0.95));
      this.enemyBoat.y = this.chargeY;
      if (!this.chargeHit && Math.abs(this.enemyBoat.x - this.boat.x) < 140 && Math.abs(this.chargeY - this.boat.y) < 47) {
        this.chargeHit = true;
        if (this.invulnerable === 0) { this.gap = Math.max(0, this.gap - 42); this.invulnerable = 1.2; }
      }
      if (this.chargeClock >= 0.95) {
        this.chargeState = 'recover'; this.chargeClock = 1.4;
        this.chargeWarning.setVisible(false);
        if (!this.chargeHit) this.gap = Math.min(160, this.gap + 18);
        this.showActionCue(this.chargeHit ? '追跡艇に押された！　立て直そう' : '突進をかわした！　追跡艇が行き過ぎた');
      }
    } else {
      this.chargeClock -= dt;
      this.enemyBoat.x += (followX - this.enemyBoat.x) * Math.min(1, dt * 4);
      if (this.chargeClock <= 0) { this.chargeState = 'follow'; this.chargeIn = 4.5 - Math.min(1, this.elapsed / CHASE_SECONDS); }
    }
    if (this.chargeState === 'warning' || this.chargeState === 'dash') this.actionCue.setText('追跡艇が突進！　上下へ移動して避けよう');
    else this.actionCue.setText(this.elapsed < this.noticeUntil ? this.notice : '');
  }

  interact() {
    if (this.storyBusy) this.advanceStory?.();
  }

  retryChase() {
    this.phase = 'retry';
    this.chargeWarning.setVisible(false);
    this.actionCue.setText('');
    this.cinematic = true;
    this.boat.setAlpha(1);
    this.showStory({ speaker: '', lines: ['岩礁や追跡艇に進路を阻まれ、追跡艇が近づきすぎた。もう一度、上下に進路を変えて距離を取ろう。'], onComplete: () => this.startChase() });
  }

  caption(text, speaker = '') {
    super.caption(text, speaker);
    $('#hint').textContent = 'Enter / Space・つづける・調べるで次へ。';
  }

  showStoryPanel(file, description) {
    this.hideStoryPanel();
    const image = document.createElement('img');
    image.className = 'sea-story-panel';
    image.src = `./assets/img/story/chapter09/${file}.png`;
    image.alt = description;
    $('#viewport').append(image);
    $('#viewport').classList.add('showing-story-panel');
    $('#dialog').classList.add('story-panel-caption');
    $('#viewport').append($('#dialog'));
    document.body.classList.add('viewing-sea-story');
    this.storyPanel = image;
  }

  hideStoryPanel() {
    this.storyPanel?.remove();
    this.storyPanel = null;
    $('#viewport').classList.remove('showing-story-panel');
    $('#dialog').classList.remove('story-panel-caption');
    if ($('#dialog').parentElement === $('#viewport')) $('#viewport').after($('#dialog'));
    document.body.classList.remove('viewing-sea-story');
  }

  hideCaption() {
    this.hideStoryPanel();
    super.hideCaption();
  }

  beginGunfire() {
    if (this.phase === 'voyage') {
      const direction = this.activeDirection();
      const length = Math.hypot(direction.x, direction.y) || 1;
      const step = 195 * Math.min(delta, 50) / 1000;
      this.player.setPosition(
        Phaser.Math.Clamp(this.player.x + direction.x / length * step, 120, 1100),
        Phaser.Math.Clamp(this.player.y + direction.y / length * step, 100, 668),
      );
      if (this.player.x >= 1060 && Math.abs(this.player.y - 410) < 95) this.land();
      return;
    }
    if (this.phase !== 'chase') return;
    this.phase = 'gunfire';
    this.chargeWarning.setVisible(false);
    this.actionCue.setText('');
    for (const gate of this.gates) gate.marker.destroy();
    this.gates = [];
    this.cinematic = true;
    this.touchDirection = null;
    this.boat.setAngle(0).setAlpha(1);
    for (const obstacle of this.obstacles) obstacle.destroy();
    this.obstacles = [];
    this.updateHud();
    this.tweens.add({ targets: this.boat, x: 500, y: 270, duration: 900 });
    this.tweens.add({ targets: this.enemyBoat, x: 260, y: 340, duration: 1000 });
    this.playEvent([
      { duration: 1000, action: () => {
        this.caption('止まれ！　その舟を止めろ！', '追跡艇の兵士');
      } },
      { duration: 300, action: () => {
        this.caption('銃口が、チャトアを捉えた。次の瞬間、引き金が引かれた。');
        this.showStoryPanel('01-muzzle-v2', '追跡艇の兵士が、チャトアの舟へ銃を向けて引き金を引く。');
      } },
      { duration: 0, action: () => {
        this.caption('胸元に抱えた陽光石に、弾丸が当たった。手の中のかけらに亀裂が走り、青白い光が噴き出す。');
        this.showStoryPanel('02-impact-v3', 'チャトアが両手で胸元に抱えた小さな陽光石へ、銃弾が当たる瞬間。');
      } },
      { duration: 0, action: () => {
        this.caption('砕けた石から、閃光が走った。弾が来た方へ――兵士も、追跡艇も、まばゆい光にのみ込まれた。');
        this.showStoryPanel('03-returning-light-v3', '小さな陽光石の破片から走った光が、撃った兵士と追跡艇をのみ込む。');
        this.enemyBoat.setVisible(false);
        this.stone.setVisible(false);
        this.registry.set('sunstoneFirstReaction', true);
      } },
      { duration: 0, action: () => {
        this.caption('光が消えた。そこにいた兵士も、船も、もういない。ただ波だけが、何事もなかったように揺れていた。');
        this.showStoryPanel('04-empty-sea-v1', '追跡艇がいた場所には波だけが残り、チャトアが小さな舟から背を向けて見つめている。');
      } },
      { duration: 0, action: () => {
        this.caption('……船ごと、消えた……？　この石が……？', 'チャトア');
        this.showStoryPanel('04-empty-sea-v1', '何もない海を見つめるチャトアの小さな後ろ姿。');
      } },
      { duration: 0, action: () => {
        this.beginBoarding();
      } }
    ]);
  }

  fireAtBoat(x, y) {
    const targetX = this.boat.x + 20;
    const targetY = this.boat.y - 7;
    const angle = Math.atan2(targetY - y, targetX - x);
    const flash = this.add.graphics().setPosition(x, y).setRotation(angle).setDepth(210);
    flash.fillStyle(0xffedaa).fillTriangle(14, 0, -4, -7, -4, 7);
    const bullet = this.add.rectangle(x, y, 13, 3, 0xffeabb).setRotation(angle).setDepth(209);
    this.later(100, () => flash.destroy());
    this.tweens.add({ targets: bullet, x: targetX, y: targetY, duration: 300, onComplete: () => bullet.destroy() });
  }

  beginBoarding() {
    this.phase = 'boarding';
    this.playEvent([
      { duration: 2000, action: () => {
        this.caption('撃つな！　近づいて乗り込め！', '別の兵士');
        this.boardingBoat = this.makeBoat(-90, 315);
        this.boardingBoat.getAt(0).setTint(0x809596);
        this.tweens.add({ targets: this.boardingBoat, x: 365, duration: 2000 });
        this.boarders = [this.makeSoldier(-108, 300), this.makeSoldier(-72, 305)];
        this.boarders.forEach((soldier, i) => this.tweens.add({ targets: soldier, x: 350 + i * 30, duration: 2000 }));
      } },
      { duration: 1500, action: () => {
        this.caption('兵士たちが舷側をつかみ、チャトアの舟へ足をかけた。');
        this.boarders.forEach((soldier, i) => this.tweens.add({ targets: soldier, x: 470 + i * 35, y: 272 + i * 10, duration: 1500 }));
      } },
      { duration: 1600, action: () => {
        this.helicopter = this.makeHelicopter(-130, 105).setScale(-1, 1);
        this.tweens.add({ targets: this.helicopter, x: 365, duration: 1600 });
        this.caption('そこへ、ヘリが再び迫る。開いた扉の奥で、狙撃手が銃を構えた。');
        this.sniper = this.makeSoldier(-145, 125).setScale(0.7).setDepth(185);
        this.tweens.add({ targets: this.sniper, x: 351, duration: 1600 });
      } },
      { duration: 2100, action: () => {
        this.fireAtBoat(378, 105);
        this.caption('制止を無視した一発に、陽光石が激しく反応した。');
        this.later(330, () => this.overloadStone());
      } },
      { duration: 0, action: () => {
        this.caption('海面を覆った光が消える。乗り込んだ兵士も、上空のヘリも、もう見えなかった。');
      } },
      { duration: 0, action: () => {
        this.finishChapter();
      } }
    ]);
  }

  overloadStone() {
    const pulse = this.add.circle(this.boat.x + 28, this.boat.y - 4, 24, 0xb4eeff, 0.85).setDepth(230);
    this.tweens.add({ targets: pulse, scale: 28, alpha: 0, duration: 1700, ease: 'Sine.easeOut', onComplete: () => pulse.destroy() });
    this.tweens.add({ targets: [...this.boarders, this.helicopter, this.sniper], alpha: 0, duration: 400 });
    this.damage.fillStyle(0x15252d).fillRect(30, 20, 14, 7).fillRect(48, 12, 6, 10);
    this.boat.setAngle(-5);
    this.registry.set('sunstoneOverloaded', true);
    this.registry.set('escapeBoatDamaged', true);
  }

  finishChapter() {
    this.hideCaption();
    this.phase = 'aftermath';
    this.stone.setVisible(false);
    this.showStory({ lines: [
      { speaker: 'チャトア', text: '……ぼくが、やったの？　そんなつもりじゃ……。' },
      { speaker: '', text: '舟底へ水がしみこんでくる。チャトアは二つの石を包み直し、胸元へ抱えた。' },
      { speaker: 'チャトア', text: 'この舟は、もうもたない……。あそこに、小さな艇が残ってる。' },
      { speaker: '', text: 'チャトアは、誰もいなくなった小型艇へ目を向けた。都へ向かうには、この舟を離れなければならない。' },
    ], onComplete: () => {
      this.phase = 'transfer';
      this.cameras.main.once('camerafadeoutcomplete', () => this.beginTransfer());
      this.cameras.main.fadeOut(650, 10, 30, 40);
    } });
  }

  beginTransfer() {
    this.phase = 'transfer';
    this.cinematic = true;
    this.renderSea();
    this.oldBoat = this.makeBoat(440, 340, 'returnChatoa').setAngle(-7);
    const leaks = this.add.graphics().fillStyle(0x112c37).fillRect(-35, 20, 16, 7).fillRect(28, 18, 12, 8);
    this.oldBoat.add(leaks);
    this.smallBoat = this.makeBoat(270, 310).setScale(0.85);
    this.smallBoat.getAt(0).setTint(0x9ba8a1);
    this.player = this.oldBoat.passenger;
    this.cameras.main.fadeIn(600, 10, 30, 40);
    this.updateHud();
    this.playEvent([
      { action: () => this.caption('舟底にたまった水が、足首に触れた。板の隙間から、まだ水が入り続けている。') },
      { action: () => this.caption('父さんの舟……。でも、ここにいたら沈んじゃう。', 'チャトア') },
      { duration: 900, action: () => {
        this.caption('石の包みを抱え直し、誰もいない小型艇へ手を伸ばす。揺れる舷側をつかみ、体を乗り移らせた。');
        const from = this.oldBoat.getWorldTransformMatrix().transformPoint(-10, -8);
        this.player.destroy();
        const child = this.character(from.x, from.y, 'returnChatoa', 2).setDepth(180);
        this.tweens.add({ targets: child, x: 262, y: 303, duration: 850, onComplete: () => {
          child.destroy();
          this.player = this.add.sprite(-10, -8, 'returnChatoa', 1).setDisplaySize(64, 64).setOrigin(0.5, 0.78);
          this.smallBoat.add(this.player);
          this.registry.set('abandonedEscapeBoat', true);
        } });
      } },
      { duration: 1600, action: () => {
        this.caption('ごめん、父さん。……ぼく、行くよ。', 'チャトア');
        this.tweens.add({ targets: this.oldBoat, x: 580, y: 410, alpha: 0.3, duration: 1500 });
      } },
      { action: () => this.beginVoyage() },
    ]);
  }

  beginVoyage() {
    this.phase = 'voyage';
    this.cinematic = false;
    renderMainlandCoast(this);
    this.smallBoat = this.makeBoat(220, 410, 'returnChatoa').setScale(0.85);
    this.smallBoat.passenger.setFrame(1);
    this.player = this.smallBoat;
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.updateHud();
    this.showStory({ speaker: 'チャトア', lines: ['街が見える……！　あの港なら、舟をつけられそうだ。', 'まずは港へ。あの街で、ベクテーナへの道を探そう。'] });
  }

  land() {
    if (this.phase !== 'voyage') return;
    this.phase = 'landing';
    this.touchDirection = null;
    this.tweens.add({ targets: this.smallBoat, x: HARBOR_LANDING.boatX, y: HARBOR_LANDING.boatY, duration: 450, onComplete: () => {
      this.smallBoat.passenger.destroy();
      this.player = this.character(1120, this.smallBoat.y - 8, 'returnChatoa', 1);
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
      this.tweens.add({ targets: this.player, x: HARBOR_LANDING.playerX, y: HARBOR_LANDING.playerY, duration: 450, onComplete: () => {
        this.registry.set('seaEscapeComplete', true);
        this.scene.start('MainlandLandingScene', {
          boatY: this.smallBoat.y,
          cameraX: this.cameras.main.scrollX,
          cameraY: this.cameras.main.scrollY,
        });
      } });
    } });
  }

  updateHint() {
    if (this.storyBusy) return;
    $('#hint').textContent = this.phase === 'chase' ? '↑ ↓ / W・S、または上下ボタンで操船。距離は徐々に縮まる。岩礁と突進をかわして回復し、36秒間逃げ切ろう。'
      : this.phase === 'voyage' ? '矢印 / WASD・方向ボタンで操船。右の港の中央にある桟橋へ向かおう。'
      : this.phase === 'transfer' ? 'Enter / Space・つづける・調べるで次へ。'
      : this.phase === 'complete' ? '舟には水が入り始めた。そばには、無人の小型艇が残っている。' : '陽光石を抱えたまま、都へ向かう海路。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 9';
    $('.hud h1').textContent = '海上逃走';
    $('#time-label').textContent = '朝';
    $('#step-label').textContent = this.phase === 'chase' ? `追跡艇との距離 ${Math.ceil(this.gap)} ／ あと${Math.ceil(CHASE_SECONDS - this.elapsed)}秒`
      : this.phase === 'transfer' ? '小型艇へ乗り移る' : this.phase === 'voyage' || this.phase === 'landing' ? 'バザールの街の港へ'
      : this.phase === 'complete' ? '陽光石の暴発・舟が損傷' : '陽光石：手元に2つ';
    $('#phaser-stage').setAttribute('aria-label', 'チャトアの海上逃走・障害物と追跡艇、陽光石の反応');
    const list = $('#quest-list'); list.replaceChildren();
    const li = document.createElement('li');
    li.textContent = ['transfer', 'voyage', 'landing'].includes(this.phase) ? '□ 小型艇で本土に上陸する' : this.phase === 'complete' ? '✓ 追跡を切り抜けた' : this.phase === 'chase' || this.phase === 'intro' ? '□ 岩礁を抜け、追跡艇をかわす' : this.phase === 'gunfire' ? '陽光石に異変が起きている' : '追跡艇が接近している';
    if (this.phase === 'complete') li.className = 'done';
    list.append(li);
    this.updateHint();
  }
}
