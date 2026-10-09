import { UpetoaVillageReturnScene } from './08-upetoa-return.js';
import { SHARD_IDS } from '../data/return-home.js';

const $ = selector => document.querySelector(selector);
const ROOM_ROWS = Array.from({ length: 9 }, (_, row) => row === 0 ? '############' : row === 8 ? '#####.######' : '#..........#');

export class UpetoaChiefMorningScene extends UpetoaVillageReturnScene {
  constructor() {
    super({ key: 'UpetoaChiefMorningScene', chapter: 'CHAPTER 6', title: '村長ウトパスの家', time: '朝' });
  }

  preload() {
    this.load.spritesheet('returnInterior', './assets/img/tiles/interior/interior-ground-retro.png', { frameWidth: 32, frameHeight: 32 });
    this.load.atlas('returnFurniture', './assets/img/tiles/interior/interior-objects-retro.png', './assets/img/tiles/interior/interior-objects.json');
    this.load.image('chiefSunstone', './assets/img/items/cave/blue-shard-pixel-v1.png');
    this.load.image('returnMother', './assets/img/characters/mother-standing-pixel-v1.png');
    for (const [key, file] of [['returnChatoa', 'chatoa-fisher-static-v2'], ['returnFather', 'father-static-v3'], ['returnChief', 'chief-utopas-static-v1']]) {
      this.load.spritesheet(key, `./assets/img/characters/${file}.png`, { frameWidth: 64, frameHeight: 64 });
    }
  }

  create() {
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.cinematic = false;
    this.transitioning = false;
    this.phase = this.registry.get('chiefHomePhase') ?? (this.registry.get('returnHomePhase') === 'chiefHeard' ? 'chiefHeard' : 'chiefMorning');
    // Direct previews start with the stones already stored at home.
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.registry.set('returnedToVillage', true);
    this.bindSceneControls();
    this.renderChiefHome();
    this.setPhase(this.phase);
    this.cameras.main.fadeIn(1000, 8, 12, 15);
    if (this.phase === 'chiefDeparted') {
      this.removeChief();
      return;
    }
    this.transitioning = true;
    const caption = this.add.text(this.scale.width / 2, this.scale.height / 2, '翌朝 — ウトパスの家', {
      fontSize: '22px', color: '#f6ecd3', backgroundColor: '#182329', padding: { x: 24, y: 16 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200);
    this.time.delayedCall(2200, () => {
      caption.destroy();
      this.transitioning = false;
      this.resumeChiefStory();
    });
  }

  setPhase(phase) {
    this.phase = phase;
    this.registry.set('chiefHomePhase', phase);
    this.updateHud();
  }

  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.cinematic || this.transitioning) return;
    if (this.phase === 'chiefDeparted' && this.near({ x: 264, y: 396 }, 52)) return this.leaveForPort();
    const chief = this.npcSprites.get('utopas');
    if (chief && this.near(chief, 100)) {
      this.resumeChiefStory();
    } else if (this.phase === 'chiefDeparted') {
      const mother = this.npcSprites.get('mother');
      const father = this.npcSprites.get('father');
      if (this.near(mother, 76)) {
        this.showStory({ speaker: 'チャトアの母', lines: ['残りの二つは、家の宝箱にしまってあるわ。今は、そっとしておきましょう。'] });
      } else if (this.near(father, 76)) {
        this.showStory({ speaker: 'チャトアの父', lines: ['村長は港へ向かった。見送りに行こう。'] });
      }
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.phase === 'chiefDeparted' && !this.storyBusy && !this.cinematic && !this.transitioning && this.player.y >= 380 && Math.abs(this.player.x - 264) < 22) this.leaveForPort();
  }

  leaveForPort() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.touchDirection = null;
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('UpetoaHarborAttackScene'));
    this.cameras.main.fadeOut(500, 8, 12, 15);
  }

  resumeChiefStory() {
    if (this.phase === 'chiefStoneReceived') return this.departForCapital();
    if (this.phase === 'chiefExplained') return this.handoverStone();
    if (this.phase === 'chiefHeard') return this.explainSunstone();
    if (this.phase !== 'chiefDeparted') this.showChiefWelcome();
  }

  renderChiefHome() {
    this.clearWorld();
    this.area = 'chiefHome';
    this.cinematic = false;
    this.village = { rows: ROOM_ROWS, solid: new Set(['#']), tileSize: 48 };
    ROOM_ROWS.forEach((row, y) => [...row].forEach((cell, x) => {
      this.add.image(x * 48 + 24, y * 48 + 24, 'returnInterior', cell === '#' ? 1 : 0).setDisplaySize(48, 48).setDepth(0);
    }));
    const furniture = (frame, x, y, blocking = true) => {
      const image = this.add.image(x, y, 'returnFurniture', frame).setOrigin(0).setScale(1.5).setDepth(2);
      if (blocking) this.furnitureBlocks.push({ x, y, w: image.displayWidth, h: image.displayHeight });
    };
    furniture('rug', 240, 240, false);
    furniture('door', 240, 360, false);
    furniture('shelf', 72, 48);
    furniture('shelf', 408, 48);
    furniture('table', 96, 192);
    furniture('basket', 432, 288);
    const chief = this.character(288, 168, 'returnChief', 0);
    const father = this.character(360, 300, 'returnFather', 3);
    this.mother = this.add.image(216, 300, 'returnMother').setDisplaySize(64, 88).setOrigin(0.5, 0.88).setDepth(86);
    this.npcs = [{ sprite: chief }, { sprite: father }, { sprite: this.mother }];
    this.npcSprites.set('utopas', chief);
    this.npcSprites.set('father', father);
    this.npcSprites.set('mother', this.mother);
    this.player = this.character(288, 252, 'returnChatoa', 3);
    this.cameras.main.setBounds(0, 0, 576, 432);
    this.cameras.main.setBackgroundColor('#232c30');
    this.cameras.main.centerOn(288, 216);
    this.updateHud();
  }

  showChiefWelcome() {
    this.cinematic = true;
    this.showStory({ lines: [
      { speaker: '', text: '朝の静かな村長の家で、ウトパスはチャトアと目を合わせた。' },
      { speaker: '村長ウトパス', text: 'よく来たね、チャトア。昨夜は、みんな驚いてしまったが……。' },
      { speaker: '村長ウトパス', text: 'あの光のことも、お前が島で見たことも、ちゃんと聞きたいと思っている。' },
      { speaker: '村長ウトパス', text: '何があったのか、聞かせてくれるか。急がなくていい。お前の言葉で。' },
      { speaker: 'チャトア', text: '……うん。あの島に着いてからのこと、順番に話すね。' },
    ], onComplete: () => {
      this.setPhase('chiefHeard');
      this.explainSunstone();
    } });
  }

  explainSunstone() {
    this.cinematic = true;
    this.showStory({ lines: [
      { speaker: '', text: 'チャトアは島での出来事と、持ち帰った三つの石について話した。ウトパスは静かに耳を傾けた。' },
      { speaker: '村長ウトパス', text: '……それは「陽光石」かもしれない。わしらの国、リリアの王ウパチャット様が探しておられる石だ。' },
      { speaker: 'チャトア', text: '陽光石……。あの光は、石の中から出ていたの？' },
      { speaker: '村長ウトパス', text: 'ああ。昼の光を蓄え、夜になると放つ。島から持ち帰る間に日を浴びて、昨夜はあれほど輝いたのだろう。' },
      { speaker: '村長ウトパス', text: '小さなかけらにも、途方もない力をためこめる。昔、その仕組みを調べた学者たちがいた。' },
      { speaker: 'チャトア', text: '王さまは、その力を何に使うの？' },
      { speaker: '村長ウトパス', text: '百年ほど前の大戦で、世界は多くの土地と資源を失った。今も、灯りや機械を動かす燃料を、国どうしで奪い合っている。' },
      { speaker: '村長ウトパス', text: '太陽の力を十分に蓄え、使えるようになれば、暮らしを支える新しい力になる。王はその可能性を調べておられる。' },
      { speaker: 'チャトア', text: 'この石があれば、もう奪い合わなくてすむのかな。' },
      { speaker: '村長ウトパス', text: 'そうなってほしい。だが、石があるだけでは足りん。安全に使うには、知恵も技術も必要なのだ。' },
      { speaker: '村長ウトパス', text: '蓄えた力が一度に解き放たれれば、とても危険だ。強い衝撃を与えたり、試しに光らせようとしたりしてはいかん。' },
      { speaker: 'チャトア', text: '……うん。きれいなだけの石じゃ、ないんだね。' },
    ], onComplete: () => {
      this.setPhase('chiefExplained');
      this.handoverStone();
    } });
  }

  handoverStone() {
    this.cinematic = true;
    this.showStory({ lines: [
      { speaker: '村長ウトパス', text: '一つ、わしに預けてくれるか。都のベクテーナへ行き、ウパチャット様にお届けしよう。本当に陽光石なのか、確かめていただきたい。' },
      { speaker: 'チャトア', text: 'うん。お願いします、村長さん。' },
      { speaker: 'チャトアの父', text: '私が家から一つ取ってこよう。残りの二つは、宝箱にしまっておく。' },
      { speaker: '', text: 'しばらくして、父が布に包んだ石を一つ持って戻ってきた。チャトアはそれを受け取り、ウトパスへそっと差し出した。' },
    ], onComplete: () => {
      // Record the transfer once, including when resuming this scene.
      if (!this.registry.has('chiefHeldShard')) {
        const stored = this.registry.get('homeStoredShards') ?? [];
        const shard = stored.find(id => SHARD_IDS.includes(id));
        if (!shard) {
          this.cinematic = false;
          this.showStory({ speaker: 'チャトアの父', lines: ['家の宝箱に石があるか、確かめてこよう。'] });
          return;
        }
        this.registry.set('homeStoredShards', stored.filter(id => id !== shard));
        this.registry.set('chiefHeldShard', shard);
      }
      this.setPhase('chiefStoneReceived');
      const stone = this.add.image(288, 222, 'chiefSunstone').setDisplaySize(24, 24).setDepth(100);
      this.tweens.add({ targets: stone, y: 154, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => {
        stone.destroy();
        this.showStory({ lines: [
          { speaker: '', text: 'ウトパスは石を受け取り、布の包みを大切にしまった。' },
          { speaker: '村長ウトパス', text: '確かに預かった。残った石も、むやみに触らずにおくのだよ。' },
        ], onComplete: () => this.departForCapital() });
      } });
    } });
  }

  departForCapital() {
    this.cinematic = true;
    this.showStory({ lines: [
      { speaker: '村長ウトパス', text: 'では、港へ向かう。船の支度ができ次第、都へ出発しよう。' },
      { speaker: 'チャトア', text: '村長さん……気をつけてね。' },
      { speaker: '村長ウトパス', text: 'ああ。話してくれて、ありがとう、チャトア。' },
    ], onComplete: () => {
      const chief = this.npcSprites.get('utopas');
      chief.setFrame(1);
      // Pass beside Chatoa and his parents on the way to the doorway.
      this.tweens.add({ targets: chief, x: 408, duration: 650, onComplete: () => {
        chief.setFrame(0);
        this.tweens.add({ targets: chief, y: 348, duration: 1200, onComplete: () => {
          chief.setFrame(2);
          this.tweens.add({ targets: chief, x: 264, duration: 850, onComplete: () => {
            chief.setFrame(0);
            this.tweens.add({ targets: chief, y: 396, alpha: 0, duration: 550, onComplete: () => {
              this.removeChief();
              this.setPhase('chiefDeparted');
              this.showStory({ lines: [
                { speaker: '', text: 'ウトパスは陽光石を一つ携え、船の待つ港へ向かった。' },
                { speaker: 'チャトアの父', text: 'さあ、私たちも見送りに行こう。' },
              ], onComplete: () => { this.cinematic = false; this.updateHud(); } });
            } });
          } });
        } });
      } });
    } });
  }

  removeChief() {
    const chief = this.npcSprites.get('utopas');
    if (!chief) return;
    this.npcs = this.npcs.filter(npc => npc.sprite !== chief);
    this.npcSprites.delete('utopas');
    chief.destroy();
  }

  updateHint() {
    if (this.storyBusy || this.transitioning) return;
    $('#hint').textContent = this.phase === 'chiefDeparted'
      ? 'ウトパスは港へ向かった。家の下側の出口から、見送りに行こう。'
      : '村長ウトパスから、青い石について話を聞こう。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 6';
    $('.hud h1').textContent = '村長ウトパスの家';
    $('#time-label').textContent = '朝';
    const remaining = (this.registry.get('homeStoredShards') ?? []).length;
    $('#step-label').textContent = this.registry.has('chiefHeldShard')
      ? `陽光石：ウトパスに1つ／家に${remaining}つ` : `青い石：家の宝箱に${remaining}つ`;
    $('#phaser-stage').setAttribute('aria-label', this.phase === 'chiefDeparted'
      ? 'ウトパスが出発したあとの家・チャトアと両親' : '翌朝のウトパスの家・村長とチャトアと両親');
    const list = $('#quest-list');
    list.replaceChildren();
    const phases = ['chiefMorning', 'chiefHeard', 'chiefExplained', 'chiefStoneReceived', 'chiefDeparted'];
    const progress = phases.indexOf(this.phase);
    for (const [phase, text] of [['chiefExplained', '陽光石について話を聞く'], ['chiefStoneReceived', '石を一つ、ウトパスに預ける'], ['chiefDeparted', 'ウトパスが港へ向かう']]) {
      const goal = document.createElement('li');
      const done = progress >= phases.indexOf(phase);
      goal.textContent = `${done ? '✓' : '□'} ${text}`;
      if (done) goal.className = 'done';
      list.append(goal);
    }
    this.updateHint();
  }
}
