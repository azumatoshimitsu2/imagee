import { UpetoaVillageReturnScene } from './08-upetoa-return.js';
import { drawVillageExterior } from './01-upetoa-village.js';
import { drawRouteMarker } from '../ui/markers.js';
import { SHARD_IDS } from '../data/return-home.js';

const $ = selector => document.querySelector(selector);
const PORT = { x: 936, y: 1080 };
// Frame bounds exclude transparent generator padding; source PNGs stay unmodified.
const HARBOR_SPRITES = [
  ['harborBoat', 'utopas-boat', 26, 208, 1622, 637],
  ['harborHelicopter', 'helicopter', 62, 158, 1664, 665],
  ['harborHelicopterShadow', 'helicopter-shadow', 68, 30, 1648, 827],
  ['harborSoldier', 'soldier', 132, 221, 833, 935],
  ['harborWarship', 'warship', 26, 59, 1891, 673],
];

// All cues are visual. Each event beat waits for player input and its animation to finish.
export class UpetoaHarborAttackScene extends UpetoaVillageReturnScene {
  constructor(config = { key: 'UpetoaHarborAttackScene', chapter: 'CHAPTER 7', title: '港に迫る影', time: '朝' }) {
    super(config);
  }

  preload() {
    super.preload();
    for (const [key, file] of HARBOR_SPRITES) this.load.image(key, `./assets/img/objects/harbor/${file}-pixel-v1.png`);
    this.load.image('attackSea', './assets/img/tiles/sea/sea-water-tile-v1.png');
    this.load.image('attackStone', './assets/img/items/cave/blue-shard-pixel-v1.png');
  }

  registerHarborSprites() {
    for (const [key, , x, y, width, height] of HARBOR_SPRITES) {
      const texture = this.textures.get(key);
      if (!texture.has('sprite')) texture.add('sprite', 0, x, y, width, height);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  create() {
    this.registerHarborSprites();
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.cinematic = false;
    this.transitioning = false;
    this.phase = 'toPort';
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.bindSceneControls();
    this.events.once('shutdown', () => { $('#next-button').hidden = false; $('#dialog').classList.remove('harbor-caption'); });
    const resize = () => { if (this.seaCut) this.fitSeaCamera(); };
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.renderHarbor(true);
    this.updateHud();
    this.cameras.main.fadeIn(600, 8, 12, 15);
    this.showStory({ speaker: 'チャトアの父', lines: ['村長が出るぞ。港へ見送りに行こう。'] });
  }

  renderHarbor(walking = false) {
    this.clearWorld();
    this.seaCut = false;
    this.area = 'harbor';
    this.village = drawVillageExterior(this);
    this.add.tileSprite(0, 1248, 1728, 720, 'villageGround', 5).setOrigin(0).setTileScale(1.5);
    this.cameras.main.setZoom(1).setBounds(0, 0, 1728, 1968).setBackgroundColor('#245867');
    this.player = this.character(walking ? 696 : 900, walking ? 360 : 1110, 'returnChatoa', 0);
    this.father = this.character(walking ? 756 : 840, walking ? 408 : 1092, 'returnFather', 0);
    this.npcs = [{ sprite: this.father }];
    this.npcSprites.set('father', this.father);
    if (walking) {
      this.portMarker = drawRouteMarker(this, { ...PORT, depth: 110 });
      this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
      this.chiefBoat = this.makeBoat(1008, 1200, 'returnChief');
    } else {
      this.cameras.main.centerOn(936, 1150);
    }
  }

  update(time, delta) {
    if (this.storyBusy) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space)) this.advanceStory?.();
      return;
    }
    if (this.phase === 'escaped') {
      const direction = this.activeDirection();
      const step = 100 * Math.min(delta, 50) / 1000;
      this.escapeBoat.x = Phaser.Math.Clamp(this.escapeBoat.x + direction.x * step, 90, 742);
      this.escapeBoat.y = Phaser.Math.Clamp(this.escapeBoat.y + direction.y * step, 240, 460);
      return;
    }
    if (this.phase !== 'toPort') return;
    super.update(time, delta);
    if (!this.storyBusy && this.near(PORT, 76)) this.startDeparture();
  }

  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.cinematic || this.transitioning || this.phase !== 'toPort') return;
    if (this.near(PORT, 100)) return this.startDeparture();
    if (this.near(this.father, 90)) this.showStory({ speaker: 'チャトアの父', lines: ['村の南の桟橋だ。村長を見送ろう。'] });
  }

  // Animation time is a minimum, never a deadline for reading the caption.
  playEvent(steps) {
    const sequence = this.eventSequence = (this.eventSequence ?? 0) + 1;
    const run = index => {
      if (sequence !== this.eventSequence || index >= steps.length) return;
      this.hideCaption();
      const { action, duration = 0 } = steps[index];
      let ready = duration === 0;
      let acknowledged = false;
      let advanced = false;
      const next = () => {
        if (!ready || !acknowledged || advanced || sequence !== this.eventSequence) return;
        advanced = true;
        run(index + 1);
      };
      this.eventContinue = () => {
        acknowledged = true;
        this.advanceStory = null;
        $('#next-button').onclick = null;
        $('#next-button').textContent = ready ? 'つづける' : '…';
        next();
      };
      action();
      if (duration > 0 && sequence === this.eventSequence) {
        this.later(duration, () => { ready = true; next(); });
      }
    };
    run(0);
  }

  caption(text, speaker = '') {
    this.storyBusy = true;
    this.touchDirection = null;
    this.advanceStory = this.eventContinue;
    $('#dialog').classList.add('harbor-caption');
    $('#dialog').hidden = false;
    $('#speaker').textContent = speaker;
    $('#message').textContent = text;
    $('#next-button').hidden = false;
    $('#next-button').textContent = 'つづける';
    $('#next-button').onclick = () => this.advanceStory?.();
    $('#hint').textContent = 'Enter / Space・つづける・調べるで次へ。';
  }

  hideCaption() {
    this.storyBusy = false;
    this.advanceStory = null;
    $('#next-button').onclick = null;
    $('#dialog').classList.remove('harbor-caption');
    $('#dialog').hidden = true;
    $('#next-button').hidden = false;
  }

  later(delay, callback) { this.time.delayedCall(delay, callback); }

  makeBoat(x, y, passengerKey) {
    const boat = this.add.container(x, y).setDepth(140);
    const hull = this.add.image(0, 10, 'harborBoat', 'sprite').setDisplaySize(164, 64);
    boat.add(hull);
    if (passengerKey) {
      const passenger = this.add.sprite(-10, -8, passengerKey, 0).setDisplaySize(64, 64).setOrigin(0.5, 0.78);
      boat.add(passenger);
      boat.passenger = passenger;
    }
    return boat;
  }

  startDeparture() {
    if (this.phase !== 'toPort') return;
    this.phase = 'departure';
    this.cinematic = true;
    this.touchDirection = null;
    this.portMarker.destroy();
    this.player.setPosition(900, 1110).setFrame(0);
    this.father.setPosition(840, 1092).setFrame(0);
    this.cameras.main.stopFollow().pan(936, 1170, 1000, 'Sine.easeInOut');
    this.playEvent([
      { duration: 1000, action: () => {
        this.caption('では、行ってくる。留守を頼んだぞ。', '村長ウトパス');
      } },
      { duration: 4500, action: () => {
        this.caption('ウトパスの舟が、ゆっくりと桟橋を離れていく。');
        this.tweens.add({ targets: this.chiefBoat, y: 1390, x: 1050, duration: 4500, ease: 'Sine.easeInOut' });
      } },
      { duration: 1800, action: () => {
        const shadow = this.makeHelicopterShadow(640, 1080);
        this.tweens.add({ targets: shadow, x: 1280, y: 1380, duration: 1800 });
        this.caption('……父さん、あの影……！', 'チャトア');
      } },
      { duration: 0, action: () => {
        this.cutToSea();
      } }
    ]);
  }

  fitSeaCamera() {
    this.cameras.main.setZoom(Math.min(this.scale.width / 832, this.scale.height / 576));
    this.cameras.main.centerOn(416, 288);
  }

  renderSea() {
    this.clearWorld();
    this.seaCut = true;
    this.cameras.main.panEffect.reset();
    this.cameras.main.removeBounds().setBackgroundColor('#1c5262');
    this.fitSeaCamera();
    this.seaSurface = this.add.tileSprite(416, 288, 2200, 1600, 'attackSea').setTileScale(1.5).setDepth(0);
    const waves = this.add.graphics().setDepth(1);
    waves.lineStyle(2, 0xa2d6d4, 0.22);
    for (let i = 0; i < 32; i++) {
      const x = (i * 127) % 832;
      const y = 100 + (i * 71) % 440;
      waves.lineBetween(x, y, x + 16 + i % 4 * 8, y);
    }
    this.tweens.add({ targets: waves, x: 8, alpha: 0.35, duration: 1800, yoyo: true, repeat: -1 });
  }

  makeWarship(x, y, scale) {
    return this.add.image(x, y + 22, 'harborWarship', 'sprite')
      .setOrigin(0.5, 1).setDisplaySize(210 * scale, 75 * scale).setDepth(4);
  }

  makeHelicopter(x, y) {
    const helicopter = this.add.container(x, y).setDepth(180);
    const body = this.add.image(44, 5, 'harborHelicopter', 'sprite').setDisplaySize(224, 90);
    // Animate the main rotor on a shallow plane, with its hub on the sprite's mast.
    const blades = this.add.container(0, 0, [
      this.add.rectangle(0, 0, 216, 6, 0x89958c),
      this.add.rectangle(0, 0, 6, 216, 0x62736c),
    ]);
    const rotor = this.add.container(14, -39, [blades]).setScale(1, 0.24);
    helicopter.add([body, rotor]);
    this.tweens.add({ targets: blades, angle: 360, duration: 280, repeat: -1 });
    return helicopter;
  }

  makeHelicopterShadow(x, y) {
    return this.add.image(x, y, 'harborHelicopterShadow', 'sprite')
      .setDisplaySize(290, 116).setAlpha(0.4).setDepth(150);
  }

  makeSoldier(x, y) {
    // Anchor at the boots; the rifle extends left toward Utopas.
    return this.add.container(x, y).setDepth(165).add(
      this.add.image(-8, 10, 'harborSoldier', 'sprite').setOrigin(0.5, 1).setDisplaySize(60, 67)
    );
  }

  cutToSea() {
    this.phase = 'boarding';
    this.renderSea();
    this.updateHud();
    [[138, 97, 0.65], [392, 68, 0.8], [678, 108, 0.7]].forEach(([x, y, scale]) => this.makeWarship(x, y, scale));
    this.chiefBoat = this.makeBoat(410, 325, 'returnChief').setScale(1.35);
    this.playEvent([
      { duration: 2600, action: () => {
        this.caption('沖には、軍艦が何隻も並んでいた。');
        this.helicopter = this.makeHelicopter(920, 160);
        this.tweens.add({ targets: this.helicopter, x: 445, duration: 2600, ease: 'Sine.easeOut' });
      } },
      { duration: 3700, action: () => {
        this.caption('ヘリが舟の真上で止まり、兵士たちがロープを下ろした。');
        this.rope = this.add.rectangle(459, 185, 3, 140, 0xc1ba97).setOrigin(0.5, 0).setDepth(155);
        this.soldier = this.makeSoldier(459, 210);
        this.tweens.add({ targets: this.soldier, y: 321, duration: 2100 });
        this.secondSoldier = this.makeSoldier(493, 180).setScale(0.9);
        this.tweens.add({ targets: this.secondSoldier, y: 303, delay: 1600, duration: 2100 });
      } },
      { duration: 0, action: () => {
        this.caption('動くな。その包みを渡せ。', '兵士');
      } },
      { duration: 0, action: () => {
        this.throwStone();
      } }
    ]);
  }

  throwStone() {
    this.phase = 'stoneThrown';
    const chief = this.chiefBoat.passenger;
    chief.setFrame(2).setAngle(-15);
    this.playEvent([
      { duration: 3600, action: () => {
        this.caption('ウトパスは身をひねり、青いかけらを海へ投げた。');
        const stone = this.add.image(382, 293, 'attackStone').setDisplaySize(22, 22).setDepth(170);
        const flight = { t: 0 };
        this.tweens.add({ targets: flight, t: 1, duration: 1300, onUpdate: () => {
          stone.setPosition(382 - 145 * flight.t, 293 + 87 * flight.t - Math.sin(Math.PI * flight.t) * 80);
          stone.angle = flight.t * 270;
        }, onComplete: () => {
          const splash = this.add.graphics().setDepth(170).setPosition(237, 380);
          splash.lineStyle(3, 0xc4eff4, 0.9).strokeEllipse(0, 0, 32, 12);
          splash.lineBetween(-12, -5, -18, -16).lineBetween(10, -5, 16, -18);
          this.tweens.add({ targets: splash, scaleX: 2, scaleY: 1.5, alpha: 0, duration: 850, onComplete: () => splash.destroy() });
          this.tweens.add({ targets: stone, y: 425, alpha: 0, duration: 2300, onComplete: () => stone.destroy() });
          const shard = this.registry.get('chiefHeldShard');
          if (shard) {
            this.registry.set('seaLostShard', shard);
            this.registry.remove('chiefHeldShard');
          }
        } });
      } },
      { duration: 110, action: () => {
        const flash = this.add.graphics().setPosition(this.soldier.x - 38, this.soldier.y - 28).setDepth(190);
        flash.fillStyle(0xffedaa).fillTriangle(-16, 0, 0, -8, 0, 8).fillRect(-5, -3, 10, 6);
        this.later(110, () => flash.destroy());
        chief.setTint(0xe0c5b4).setAngle(-27).setY(5).setScale(chief.scaleX, chief.scaleY * 0.72);
        this.registry.set('chiefWounded', true);
        this.caption('銃口がひらめいた。肩を撃たれたウトパスが、舟の中で膝をつく。');
      } },
      { duration: 0, action: () => {
        this.caption('青い光が水の底へ沈んでいく。かけらは、兵士の手には渡らなかった。');
      } },
      { duration: 0, action: () => {
        this.returnToChatoa();
      } }
    ]);
  }

  returnToChatoa() {
    this.phase = 'rescue';
    this.renderHarbor();
    this.playEvent([
      { duration: 600, action: () => {
        this.caption('村長さん！', 'チャトア');
        this.tweens.add({ targets: this.player, y: 1140, duration: 550 });
        this.tweens.add({ targets: this.father, x: 906, y: 1148, duration: 600 });
        this.escapeBoat = this.makeBoat(1020, 1210);
      } },
      { duration: 2200, action: () => {
        const shadow = this.makeHelicopterShadow(670, 1030).setDepth(160);
        this.tweens.add({ targets: shadow, x: 1120, y: 1130, duration: 2200 });
        this.caption('チャトア、舟に乗れ。今すぐだ！', 'チャトアの父');
        this.player.setFrame(1);
        this.tweens.add({ targets: this.player, x: 1020, y: 1140, duration: 1100 });
        this.tweens.add({ targets: this.father, x: 978, y: 1135, duration: 1100 });
      } },
      { duration: 550, action: () => {
        this.tweens.add({ targets: this.player, y: 1192, duration: 550, onComplete: () => {
          this.player.destroy();
          const passenger = this.add.sprite(-10, -8, 'returnChatoa', 3).setDisplaySize(64, 64).setOrigin(0.5, 0.78);
          this.escapeBoat.add(passenger);
          this.player = passenger;
        } });
        this.caption('父さんは？　母さんは……！', 'チャトア');
      } },
      { duration: 0, action: () => {
        const stored = this.registry.get('homeStoredShards') ?? [];
        const stones = stored.filter(id => SHARD_IDS.includes(id));
        this.registry.set('caveCollectedItems', [...new Set([...(this.registry.get('caveCollectedItems') ?? []), ...stones])]);
        this.registry.set('homeStoredShards', stored.filter(id => !stones.includes(id)));
        this.caption('父は、母が届けた布包みを舟に積んだ。中には、宝箱に残していた二つの石があった。');
      } },
      { duration: 4050, action: () => {
        this.caption('母さんは父さんが連れていく。振り返るな、まず島から離れろ！', 'チャトアの父');
        this.father.setFrame(0);
        this.tweens.add({ targets: this.father, x: 1008, y: 1147, duration: 450 });
        this.tweens.add({ targets: this.escapeBoat, x: 1110, y: 1440, delay: 450, duration: 3600, ease: 'Sine.easeIn' });
        this.cameras.main.pan(1050, 1300, 3600, 'Sine.easeInOut');
      } },
      { duration: 0, action: () => {
        this.cameras.main.once('camerafadeoutcomplete', () => this.finishEscape());
        this.cameras.main.fadeOut(900, 10, 30, 40);
      } }
    ]);
  }

  finishEscape() {
    this.registry.set('harborAttackComplete', true);
    this.hideCaption();
    this.scene.start('PetoaSeaEscapeScene');
  }

  updateHint() {
    if (this.storyBusy) return;
    $('#hint').textContent = this.phase === 'escaped' ? '矢印 / WASDで舟を動かす。島の姿が、少しずつ遠ざかっていく。'
      : '村の南の港へ向かい、ウトパスを見送ろう。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 7';
    $('.hud h1').textContent = this.phase === 'escaped' ? '島を離れて' : '港に迫る影';
    $('#time-label').textContent = '朝';
    $('#step-label').textContent = this.phase === 'escaped' ? '父に逃がされた舟' : this.phase === 'toPort' ? 'ウトパスを見送る' : '沖合に軍艦の影';
    $('#phaser-stage').setAttribute('aria-label', this.phase === 'escaped' ? '襲撃された島から離れるチャトアの舟' : 'ウペトア島の港と沖合の襲撃');
    const list = $('#quest-list'); list.replaceChildren();
    const goal = document.createElement('li');
    goal.textContent = this.phase === 'escaped' ? '✓ 父の舟で島を離れた' : this.phase === 'toPort' ? '□ 港へ見送りに行く' : '海上の異変を見守っている';
    if (this.phase === 'escaped') goal.className = 'done';
    list.append(goal);
    this.updateHint();
  }
}
