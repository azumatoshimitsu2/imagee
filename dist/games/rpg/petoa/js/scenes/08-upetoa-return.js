import { BaseForestScene } from './04-petoa-forest.js';
import { drawVillageExterior } from './01-upetoa-village.js';
import { drawRouteMarker } from '../ui/markers.js';
import { HOME_DOOR, HOME_BED, HOME_CHEST, RETURN_VILLAGERS, MOTHER_LINES, canStoreShards, depositShards } from '../data/return-home.js';

const $ = selector => document.querySelector(selector);
const ROOM_ROWS = Array.from({ length: 9 }, (_, row) => row === 0 ? '############' : row === 8 ? '#####.######' : '#..........#');

export class UpetoaVillageReturnScene extends BaseForestScene {
  constructor(config = { key: 'UpetoaVillageReturnScene', chapter: 'CHAPTER 5', title: 'ウペトア島・帰還', time: '朝' }) {
    super(config);
  }

  preload() {
    this.load.image('villageDockPixel', './assets/img/objects/village-dock-pixel-v1.png');
    this.load.spritesheet('villageGround', './assets/img/tiles/village/village-ground-retro-v2.png', { frameWidth: 32, frameHeight: 32 });
    this.load.atlas('villageObjects', './assets/img/tiles/village/fishing-village-objects-retro.png', './assets/img/tiles/village/fishing-village-objects.json');
    this.load.spritesheet('returnInterior', './assets/img/tiles/interior/interior-ground-retro.png', { frameWidth: 32, frameHeight: 32 });
    this.load.atlas('returnFurniture', './assets/img/tiles/interior/interior-objects-retro.png', './assets/img/tiles/interior/interior-objects.json');
    this.load.image('returnMother', './assets/img/characters/mother-standing-pixel-v1.png');
    for (const [key, file] of [['returnChatoa', 'chatoa-fisher-static-v2'], ['returnFather', 'father-static-v3'], ['returnFisher', 'fisher-static-v1'], ['returnUrishia', 'urishia-static-v1'], ['returnChief', 'chief-utopas-static-v1'], ['returnChild', 'child-static-v1']]) {
      this.load.spritesheet(key, `./assets/img/characters/${file}.png`, { frameWidth: 64, frameHeight: 64 });
    }
  }

  create() {
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.cinematic = false;
    this.transitioning = false;
    this.phase = this.registry.get('returnHomePhase') ?? 'arrived';
    // Forward progress from the former combined scene to the separate morning scene.
    if (['chiefMorning', 'chiefHeard'].includes(this.phase)) {
      this.scene.start('UpetoaChiefMorningScene');
      return;
    }
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.bindSceneControls();
    this.registry.set('returnedToVillage', true);
    if (this.phase === 'eventComplete' || this.phase === 'night') {
      this.renderOutside(true);
      this.startGathering(this.phase === 'eventComplete');
    } else if (this.phase === 'apologized' || this.phase === 'stored') {
      this.renderHome();
    } else {
      this.renderOutside();
      this.showStory({ lines: [
        { speaker: 'チャトアの父', text: '着いたぞ。ウペトアだ。母さんが家で待っている。顔を見せておいで。' },
        { speaker: 'チャトア', text: '……うん。ただいま。' },
      ] });
    }
    this.updateHud();
    this.cameras.main.fadeIn(650, 8, 12, 15);
  }

  bindSceneControls() {
    $('#title-screen')?.classList.add('closed');
    this.bindKeys();
    this.bindTouchControls();
    $('#touch-action').onclick = () => this.interact();
    const release = () => { this.touchDirection = null; };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    const draw = $('#draw-item');
    const wasHidden = draw.hidden;
    draw.hidden = true;
    this.events.once('shutdown', () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      draw.hidden = wasHidden;
      $('#touch-action').onclick = null;
      $('#dialog').hidden = true;
      $('#next-button').onclick = null;
    });
  }

  clearWorld() {
    this.tweens.killAll();
    for (const child of [...this.children.list]) child.destroy();
    this.npcs = [];
    this.npcSprites = new Map();
    this.furnitureBlocks = [];
    this.homeMarker = null;
    this.cameras.main.stopFollow();
  }

  character(x, y, key, frame = 0) {
    return this.add.sprite(x, y, key, frame).setDisplaySize(72, 72).setOrigin(0.5, 0.78).setDepth(80 + y / 48);
  }

  renderOutside(night = false) {
    this.clearWorld();
    this.area = 'village';
    this.village = drawVillageExterior(this);
    const { rows, tileSize } = this.village;
    this.add.tileSprite(0, rows.length * tileSize, rows[0].length * tileSize, 240, 'villageGround', 5).setOrigin(0).setTileScale(1.5);
    this.cameras.main.setBounds(0, 0, rows[0].length * tileSize, rows.length * tileSize + 240);
    this.cameras.main.setBackgroundColor('#142c32');
    this.player = this.character(936, 1032, 'returnChatoa', 3);
    for (const spec of RETURN_VILLAGERS) {
      const sprite = this.character(spec.x, spec.y, spec.key);
      this.npcs.push({ ...spec, sprite });
      this.npcSprites.set(spec.id, sprite);
    }
    this.homeMarker = drawRouteMarker(this, { x: HOME_DOOR.x, y: HOME_DOOR.y, depth: 94 });
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16, 0, -80);
    if (night) {
      this.player.setVisible(false);
      this.homeMarker.setVisible(false);
      this.add.rectangle(0, 0, rows[0].length * 48, rows.length * 48 + 240, 0x020817, 0.68).setOrigin(0).setDepth(900);
      this.cameras.main.stopFollow();
      this.cameras.main.centerOn(336, 864);
      this.lightHouse();
    }
  }

  renderHome() {
    this.clearWorld();
    this.area = 'home';
    this.village = { rows: ROOM_ROWS, solid: new Set(['#']), tileSize: 48 };
    ROOM_ROWS.forEach((row, y) => [...row].forEach((cell, x) => {
      this.add.image(x * 48 + 24, y * 48 + 24, 'returnInterior', cell === '#' ? 1 : 0).setDisplaySize(48, 48).setDepth(0);
    }));
    const furniture = (frame, x, y, blocking = true) => {
      const image = this.add.image(x, y, 'returnFurniture', frame).setOrigin(0).setScale(1.5).setDepth(2);
      if (blocking) this.furnitureBlocks.push({ x, y, w: image.displayWidth, h: image.displayHeight });
      return image;
    };
    furniture('rug', 192, 288, false);
    furniture('door', 240, 360, false);
    this.bed = furniture('bed', 48, 96);
    this.chest = furniture('chest', 192, 120);
    furniture('table', 288, 168);
    furniture('shelf', 432, 48);
    furniture('basket', 432, 288);
    this.mother = this.add.image(336, 300, 'returnMother').setDisplaySize(64, 88).setOrigin(0.5, 0.88).setDepth(86);
    this.npcSprites.set('mother', this.mother);
    this.player = this.character(264, 348, 'returnChatoa', 3);
    this.cameras.main.setBounds(0, 0, 576, 432);
    this.cameras.main.setBackgroundColor('#101c24');
    this.cameras.main.centerOn(288, 216);
    this.updateHud();
  }

  showStory(story) {
    this.touchDirection = null;
    super.showStory(story);
  }

  setPhase(phase) {
    this.phase = phase;
    this.registry.set('returnHomePhase', phase);
    this.updateHud();
  }

  update(_time, delta) {
    const action = Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (this.storyBusy) {
      if (action) this.advanceStory?.();
      return;
    }
    if (this.cinematic || this.transitioning) return;
    const direction = this.activeDirection();
    const length = Math.hypot(direction.x, direction.y) || 1;
    const distance = 145 * Math.min(delta, 50) / 1000;
    const x = this.player.x + direction.x / length * distance;
    const y = this.player.y + direction.y / length * distance;
    if (this.canWalk(x, this.player.y)) this.player.x = x;
    if (this.canWalk(this.player.x, y)) this.player.y = y;
    this.updatePlayerFacing(direction);
    this.player.setDepth(80 + this.player.y / 48);
    if (action) this.interact();
    if (!this.storyBusy) this.updateHint();
  }

  canWalk(x, y) {
    const { rows, solid, tileSize } = this.village;
    if (! [[-10, -8], [10, -8], [-10, 8], [10, 8]].every(([dx, dy]) => {
      const cell = rows[Math.floor((y + dy) / tileSize)]?.[Math.floor((x + dx) / tileSize)];
      return cell !== undefined && !solid.has(cell);
    })) return false;
    if (this.furnitureBlocks.some(b => x + 10 > b.x && x - 10 < b.x + b.w && y + 8 > b.y && y - 8 < b.y + b.h)) return false;
    if (this.area === 'home' && Math.hypot(x - this.mother.x, y - this.mother.y) < 22) return false;
    return !this.npcs.some(npc => Math.hypot(x - npc.sprite.x, y - npc.sprite.y) < 22);
  }

  near(point, radius = 72) {
    return Math.hypot(this.player.x - point.x, this.player.y - point.y) < radius;
  }

  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.cinematic || this.transitioning) return;
    if (this.area === 'village') {
      if (this.near(HOME_DOOR, 80)) return this.enterHome();
      const npc = this.npcs.find(n => this.near(n.sprite, 76));
      if (npc) this.showStory({ speaker: npc.name, lines: npc.lines });
      return;
    }
    if (this.near(this.mother, 76)) {
      this.showStory({ speaker: 'チャトアの母', lines: ['もう大丈夫。今日は、ゆっくり休むのよ。'] });
    } else if (this.near(HOME_CHEST, 76)) {
      this.storeStones();
    } else if (this.near(HOME_BED, 82)) {
      this.restInBed();
    } else if (this.near({ x: 264, y: 396 }, 52)) {
      this.showStory({ speaker: 'チャトア', lines: ['今日はもう、家で休もう。'] });
    }
  }

  enterHome() {
    this.transitioning = true;
    this.touchDirection = null;
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.renderHome();
      this.cameras.main.fadeIn(500, 8, 12, 15);
      this.transitioning = false;
      if (this.phase === 'arrived') {
        this.showStory({ lines: MOTHER_LINES, onComplete: () => this.setPhase('apologized') });
      }
    });
    this.cameras.main.fadeOut(400, 8, 12, 15);
  }

  storeStones() {
    if (this.phase === 'stored') return this.showStory({ speaker: 'チャトア', lines: ['青い石は、宝箱の中にしまってある。ベッドで少し休もう。'] });
    const inventory = this.registry.get('caveCollectedItems') ?? [];
    if (!canStoreShards(this.phase, inventory)) return;
    this.showStory({ speaker: 'チャトア', lines: ['ベッドのそばの宝箱を開けた。', '拾ってきた青い石を3つ、そっと中にしまった。'], onComplete: () => {
      const { carried, stored } = depositShards(inventory);
      this.registry.set('caveCollectedItems', carried);
      this.registry.set('homeStoredShards', stored);
      this.collected = new Set(carried);
      this.setPhase('stored');
    } });
  }

  restInBed() {
    if (this.phase !== 'stored') return this.showStory({ speaker: 'チャトア', lines: ['眠る前に、青い石をベッドのそばの宝箱にしまっておこう。'] });
    this.cinematic = true;
    this.player.setPosition(108, 140).setFrame(0).setAngle(90);
    this.showStory({ speaker: 'チャトア', lines: ['やっと、自分のベッドだ……。', '少しだけ横になるつもりが、いつの間にか眠っていた。'], onComplete: () => this.sleepToNight() });
  }

  sleepToNight() {
    const screen = this.add.container(0, 0).setScrollFactor(0).setDepth(1200).setAlpha(0);
    const shade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x030712).setOrigin(0);
    const caption = this.add.text(0, 0, '気づくと、夜になっていた。', { fontSize: '18px', color: '#e2eafa' }).setOrigin(0.5);
    screen.add([shade, caption]);
    const layout = () => { shade.setSize(this.scale.width, this.scale.height); caption.setPosition(this.scale.width / 2, this.scale.height / 2); };
    layout(); this.scale.on('resize', layout);
    const cleanup = () => this.scale.off('resize', layout);
    this.events.once('shutdown', cleanup);
    this.tweens.add({ targets: screen, alpha: 1, duration: 900, onComplete: () => {
      this.time.delayedCall(1700, () => {
        cleanup(); this.events.off('shutdown', cleanup);
        this.setPhase('night');
        this.renderOutside(true);
        this.cameras.main.fadeIn(900, 3, 7, 18);
        this.showStory({ lines: [
          { speaker: 'チャトアの母', text: '……何、この光？　宝箱の方から……！' },
          { speaker: '', text: '青白い光が窓と戸口からあふれ、家全体を包み込んだ。' },
        ], onComplete: () => this.startGathering() });
      });
    } });
  }

  lightHouse() {
    const glowKey = 'returnHouseSoftGlow';
    if (!this.textures.exists(glowKey)) {
      const texture = this.textures.createCanvas(glowKey, 512, 384);
      const context = texture.getContext();
      // Draw at world resolution with transparent padding so the light has no hard edge.
      const glow = (x, y, radiusX, radiusY, color, alpha) => {
        context.save();
        context.translate(x - 54, y - 600);
        context.scale(radiusX, radiusY);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
        gradient.addColorStop(0.35, `rgba(${color}, ${alpha * 0.7})`);
        gradient.addColorStop(0.7, `rgba(${color}, ${alpha * 0.2})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = gradient;
        context.fillRect(-1, -1, 2, 2);
        context.restore();
      };
      glow(310, 792, 232, 160, '129, 207, 255', 0.45);
      glow(308, 776, 88, 65, '215, 246, 255', 0.55);
      glow(276, 789, 22, 30, '232, 251, 255', 0.9);
      glow(332, 776, 27, 22, '232, 251, 255', 0.9);
      texture.refresh();
    }
    const light = this.add.image(54, 600, glowKey).setOrigin(0).setDepth(901).setBlendMode(Phaser.BlendModes.ADD);
    const house = this.add.image(240, 720, 'villageObjects', 'shed').setOrigin(0).setScale(1.5).setTint(0xa8e6ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(902).setAlpha(0.55);
    this.tweens.add({ targets: [light, house], alpha: 0.85, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  startGathering(restored = false) {
    this.cinematic = true;
    const finish = () => {
      this.setPhase('eventComplete');
      this.showStory({ lines: [
        { speaker: '漁師', text: 'おい、チャトアの家を見ろ！　青白く光っているぞ！' },
        { speaker: 'ウリシア', text: 'チャトア！　おばさん！　中にいるの？' },
        { speaker: 'チャトアの父', text: '火じゃない……。この光は、いったい何なんだ？' },
        { speaker: '村長ウトパス', text: 'みんな、落ち着きなさい。まずは、中の様子を確かめよう。' },
        { speaker: '', text: '家全体を包む青白い光に、村人たちは息をのんだ。' },
      ], onComplete: () => this.stepOutsideWithMother() });
    };
    if (restored) {
      for (const npc of this.npcs) npc.sprite.setPosition(npc.gather.x, npc.gather.y).setFrame(3).setDepth(920);
      finish();
      return;
    }
    // Start on the open paths beside the house, then gather in front of it.
    this.npcs.forEach((npc, index) => {
      npc.sprite.setPosition(index % 2 ? 570 + index * 22 : 90 - index * 12, 888 + index % 3 * 24).setDepth(920).setFrame(index % 2 ? 2 : 1);
      this.tweens.add({ targets: npc.sprite, x: npc.gather.x, y: npc.gather.y, delay: index * 260, duration: 1600, onComplete: () => npc.sprite.setFrame(3) });
    });
    this.time.delayedCall(2900, finish);
  }

  stepOutsideWithMother() {
    this.mother = this.add.image(HOME_DOOR.x + 30, HOME_DOOR.y, 'returnMother')
      .setDisplaySize(64, 88).setOrigin(0.5, 0.88).setDepth(921).setAlpha(0);
    this.npcSprites.set('mother', this.mother);
    this.player.setPosition(HOME_DOOR.x, HOME_DOOR.y).setAngle(0).setFrame(0).setDepth(922).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: [this.mother, this.player], alpha: 1, duration: 700 });
    this.tweens.add({ targets: this.mother, y: HOME_DOOR.y + 12, duration: 900 });
    this.time.delayedCall(1100, () => this.showStory({ lines: [
      { speaker: '', text: '母親とチャトアが戸口に現れると、村人たちのざわめきが静まった。' },
      { speaker: 'チャトアの母', text: '大丈夫。みんなに、話してごらん。' },
    ], onComplete: () => {
      this.tweens.add({ targets: this.player, y: HOME_DOOR.y + 32, duration: 650, ease: 'Sine.easeInOut', onComplete: () => {
        this.showStory({ lines: [
          { speaker: '', text: '母にそっと背中を押されて、チャトアは一歩前に出た。' },
          { speaker: 'チャトア', text: '……島で、青い石を拾ったんだ。' },
          { speaker: 'チャトア', text: '暗い洞窟の中で、青い岩が光ってて……。朝、そのそばに落ちていた石を持って帰ってきた。' },
          { speaker: 'チャトア', text: 'でも、こんなふうに光るなんて、ぼくも……。' },
        ], onComplete: () => this.spreadHouseLight() });
      } });
    } }));
  }

  spreadHouseLight() {
    const key = 'returnVillageLightPulse';
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 256, 256);
      const context = texture.getContext();
      const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(205, 244, 255, 0.65)');
      gradient.addColorStop(0.45, 'rgba(160, 220, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(129, 207, 255, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
      texture.refresh();
    }
    const light = this.add.image(300, 852, key).setDepth(923).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: light, scaleX: 2.8, scaleY: 1.5, alpha: 0.8, duration: 2400, ease: 'Sine.easeOut', onComplete: () => {
      this.tweens.add({ targets: light, alpha: 0, duration: 2200, onComplete: () => light.destroy() });
      this.showStory({ lines: [
        { speaker: '', text: '戸口から淡い光がにじみ、村人たちの足元へ広がった。青白い明かりが、一人ひとりの顔をやさしく照らす。' },
        { speaker: '村の子', text: '……あったかい。' },
        { speaker: 'ウリシア', text: '……ほんとだ。なんだか、ほっとする。' },
        { speaker: '', text: 'こわばっていた村人たちの表情が、少しずつゆるんでいった。' },
        { speaker: 'チャトアの父', text: 'もう遅い。詳しい話は、明日の朝にしよう。' },
        { speaker: '', text: '翌朝、チャトアは両親とともに、村長の家を訪ねることになった。' },
      ], onComplete: () => this.nightToChiefMorning() });
    } });
  }

  nightToChiefMorning() {
    this.transitioning = true;
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('UpetoaChiefMorningScene'));
    this.cameras.main.fadeOut(1200, 8, 12, 15);
  }

  updateHint() {
    if (this.storyBusy || this.transitioning) return;
    $('#hint').textContent = this.phase === 'eventComplete' || this.phase === 'night' ? '青白い光に包まれた家の前に、村人たちが集まっている。'
      : this.area === 'village' ? '矢印 / WASDで移動。Enter / Space・「調べる」で人に話しかける。左下の自分の家へ帰ろう。'
      : this.phase === 'stored' ? 'ベッドのそばで「調べる」と、横になって休める。' : 'ベッド横の宝箱のそばで「調べる」と、青い石をしまえる。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 5';
    $('.hud h1').textContent = this.area === 'home' ? 'チャトアの家' : 'ウペトア島・帰還';
    $('#time-label').textContent = ['night', 'eventComplete'].includes(this.phase) ? '夜' : '朝';
    $('#step-label').textContent = ['stored', 'night', 'eventComplete'].includes(this.phase) ? '青い石：宝箱の中' : '村へ帰還';
    $('#phaser-stage').setAttribute('aria-label', this.area === 'home' ? 'チャトアの家・母親と宝箱とベッド' : '帰還後の村');
    const goals = [
      ['arrived', '家へ帰り、母親に謝る'], ['apologized', 'ベッド横の宝箱に青い石をしまう'], ['stored', '自分のベッドで休む'], ['night', '家からあふれる青白い光'], ['eventComplete', '村人たちが集まってきた'],
    ];
    const index = goals.findIndex(([phase]) => phase === this.phase);
    const list = $('#quest-list'); list.replaceChildren();
    goals.slice(0, index + 1).forEach(([, label], i) => { const li = document.createElement('li'); const done = i < index || this.phase === 'eventComplete'; li.textContent = `${done ? '✓' : '□'} ${label}`; if (done) li.className = 'done'; list.append(li); });
    this.updateHint();
  }
}
