import { BARTER_SHOP, travelSpeed } from '../data/barter-shop.js';
import { openBarterShop } from '../ui/barter-shop.js';
import { UpetoaVillageReturnScene } from './08-upetoa-return.js';
import { CITY, CITY_ENTRY, MERCHANT_HALL, TOPICS, CITY_NPCS, CITY_BUILDINGS, CITY_TREES, CITY_CANAL, CITY_BRIDGES, CITY_STREET_PROPS, canWalkCity, learnTopic, giveAdbaShard, cityDistrict } from '../data/bazaar-city.js';

import { drawRouteMarker } from '../ui/markers.js';

const $ = selector => document.querySelector(selector);

export class BazaarCityScene extends UpetoaVillageReturnScene {
  constructor(config = { key: 'BazaarCityScene', chapter: 'CHAPTER 11', title: 'バザールの街', time: '昼' }) {
    super(config);
  }

  preload() {
    super.preload();
    for (const name of ['ground', 'buildings', 'street-life']) {
      const path = `./assets/img/tiles/bazaar/bazaar-${name}-v1`;
      this.load.atlas(`bazaar-${name}`, `${path}.png`, `${path}.json`);
    }
    this.load.image('bazaar-shophouse-row', './assets/img/tiles/bazaar/bazaar-shophouse-row-v1.png');
    this.load.atlas('city-harbor-ground', './assets/img/tiles/harbor/harbor-ground-v1.png', './assets/img/tiles/harbor/harbor-ground-v1.json');
    this.load.spritesheet('bazaarAdba', './assets/img/characters/adba-static-v1.png', { frameWidth: 543, frameHeight: 724 });
    this.load.atlas('bazaarResidents', './assets/img/characters/bazaar-residents-v1.png', './assets/img/characters/bazaar-residents-v1.json');
    this.load.image('cityTree', './assets/img/tiles/forest/trees/jungle-tree-short-v1.png');
  }

  create() {
    this.storyBusy = false;
    this.advanceStory = null;
    this.touchDirection = null;
    this.transitioning = false;
    this.cinematic = false;
    this.phase = this.registry.get('bazaarChapterComplete') ? 'complete' : 'explore';
    this.learned = new Set((this.registry.get('bazaarLearnedTopics') ?? []).filter(id => TOPICS.some(t => t.id === id)));
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.bindSceneControls();
    this.renderCity();
    this.updateHud();
    this.cameras.main.fadeIn(500, 14, 25, 28);
    if (!this.registry.get('bazaarCityVisited')) {
      this.registry.set('bazaarCityVisited', true);
      this.showStory({ lines: [
        { speaker: '', text: '運河の橋を渡ると、日よけの下に果物や布が並んでいた。屋台から温かな湯気が上がり、木のバルコニーには鉢植えが揺れている。' },
        { speaker: 'チャトア', text: 'まずは、街の人に話を聞こう。バザールのことも、島の外で何が起きているのかも、知りたい。' },
        { speaker: '通りの商人', text: '広場から道が四方へ延びているよ。市場も宿も、好きに見ていくといい。アドバさんの商館は、広場の北だ。' },
      ] });
    }
  }

  renderCity(entry = CITY_ENTRY) {
    this.clearWorld();
    this.area = 'city';
    this.hallMarker = null;
    this.district = cityDistrict(entry.x, entry.y);
    this.cameras.main.setZoom(1).setBounds(0, 0, CITY.width, CITY.height).setBackgroundColor('#788578');
    const pave = (x, y, width, height, key, frame, scale = 0.22, depth = 0) =>
      this.add.tileSprite(x, y, width, height, key, frame).setOrigin(0).setTileScale(scale).setDepth(depth);
    pave(0, 0, CITY.width, CITY.height, 'bazaar-ground', 'heritage-brick');
    // Larger texture repeats make the paving readable at the character scale.
    for (const [x, y, width, height] of [[260, 420, 800, 410], [265, 1620, 790, 640]]) {
      pave(x, y, width, height, 'villageGround', 0, 1.5, 0.2);
    }
    for (const x of [576, 1296, 2016]) {
      pave(x - 96, 48, 192, CITY.height - 96, 'bazaar-ground', 'sidewalk', 0.2, 1);
      if (x === 2016) pave(x - 42, 48, 84, CITY.height - 96, 'bazaar-ground', 'asphalt', 0.22, 1.1);
    }
    for (const y of [576, 1248, 1920]) {
      pave(48, y - 96, CITY.width - 96, 192, 'bazaar-ground', 'sidewalk', 0.2, 1);
    }
    // A pale courtyard and terracotta border distinguish the central gathering place.
    pave(1056, 1008, 480, 480, 'bazaar-ground', 'sidewalk', 0.24, 1.2);
    pave(580, 1660, 450, 510, 'bazaar-ground', 'sidewalk', 0.26, 1.2);
    const trim = this.add.graphics().setDepth(1.4);
    trim.lineStyle(8, 0x997253, 0.8).strokeRect(1060, 1012, 472, 472);
    trim.lineStyle(3, 0xcab489, 0.9).strokeRect(1072, 1024, 448, 448);
    // The canal and bridge crossings remain part of the explorable map.
    pave(CITY_CANAL.left, CITY_CANAL.top, CITY_CANAL.right - CITY_CANAL.left, CITY_CANAL.bottom - CITY_CANAL.top, 'bazaar-ground', 'canal', 0.3, 2);
    const banks = this.add.graphics().setDepth(2.1);
    banks.fillStyle(0x777967).fillRect(CITY_CANAL.left - 9, CITY_CANAL.top, 9, CITY_CANAL.bottom - CITY_CANAL.top);
    banks.fillRect(CITY_CANAL.right, CITY_CANAL.top, 9, CITY_CANAL.bottom - CITY_CANAL.top);
    for (const y of CITY_BRIDGES) {
      pave(CITY_CANAL.left - 12, y - 72, 168, 144, 'city-harbor-ground', 'pier', 0.2, 3);
      banks.lineStyle(5, 0xd1b996).lineBetween(84, y - 77, 252, y - 77).lineBetween(84, y + 77, 252, y + 77);
    }
    for (const building of CITY_BUILDINGS) {
      this.add.image(building.x, building.y, building.texture ?? 'bazaar-buildings', building.frame)
        .setOrigin(0.5, 1).setDisplaySize(building.width, building.height).setDepth(building.y - 14);
      if (building.name) this.add.text(building.x, building.y - 30, building.name, {
        fontSize: '15px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 8, y: 3 },
      }).setOrigin(0.5).setDepth(building.y);
    }
    // Trees and low planters along the square leave a clear crossing through its center.
    for (const [x, y] of CITY_TREES) {
      this.add.image(x, y, 'cityTree').setOrigin(0.5, 0.9).setDisplaySize(110, 132).setDepth(y);
    }
    for (const prop of CITY_STREET_PROPS) {
      this.add.image(prop.x, prop.y, 'bazaar-street-life', prop.frame)
        .setOrigin(0.5, 1).setDisplaySize(prop.width, prop.height).setDepth(prop.y);
    }
    // White garden walls stop short of the gate and side paths.
    const gardenWall = this.add.graphics().setDepth(3);
    for (const [x, width] of [[550, 120], [870, 160]]) {
      gardenWall.fillStyle(0xc5bca4).fillRect(x, 2140, width, 14);
      gardenWall.fillStyle(0xf0e6cd).fillRect(x, 2135, width, 8);
    }
    this.npcs = CITY_NPCS.map(npc => {
      const sprite = this.character(npc.x, npc.y, npc.key, npc.frame ?? 0).setDepth(npc.y);
      if (npc.key === 'bazaarResidents') {
        // Atlas frames tightly enclose each person: preserve their distinct silhouettes.
        sprite.setScale(npc.height / sprite.frame.realHeight).setOrigin(0.5, 0.85);
      }
      return { ...npc, sprite };
    });
    if (this.sys.settings.key === 'BazaarCityScene') {
      const shop = BARTER_SHOP;
      this.add.image(shop.x, shop.y + 36, 'bazaar-street-life', 'tables').setOrigin(.5, 1).setDisplaySize(92, 74).setDepth(shop.y + 36);
      const sprite = this.character(shop.x, shop.y, 'bazaarResidents', 'market-merchant').setOrigin(.5, .85).setDepth(shop.y);
      sprite.setScale(70 / sprite.frame.realHeight);
      this.add.text(shop.x, shop.y - 76, shop.name, { fontSize: '15px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(shop.y + 40);
      this.npcs.push({ ...shop, id: 'barter-merchant', special: 'barter', sprite });
    }
    this.player = this.character(entry.x, entry.y, 'returnChatoa', 1).setDepth(entry.y);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.updateHallMarker();
  }

  isHallOpen() {
    return TOPICS.every(topic => this.learned.has(topic.id));
  }

  updateHallMarker() {
    if (this.area !== 'city' || this.hallMarker || !this.isHallOpen()) return;
    this.hallMarker = drawRouteMarker(this, { ...MERCHANT_HALL.door, depth: 10000 });
  }

  nearHallDoor() {
    const door = this.area === 'hall' ? MERCHANT_HALL.exit : MERCHANT_HALL.door;
    return Math.hypot(this.player.x - door.x, this.player.y - door.y) < 64;
  }

  enterHall() {
    if (this.area !== 'city' || !this.isHallOpen() || this.storyBusy) return;
    this.clearWorld();
    this.hallMarker = null;
    this.area = 'hall';
    this.district = '商館・応接室';
    const { width, height, adba, spawn, exit } = MERCHANT_HALL;
    for (let y = 0; y < height; y += 48) {
      for (let x = 0; x < width; x += 48) {
        const wall = x === 0 || x === width - 48 || y === 0 || y === height - 48;
        this.add.image(x + 24, y + 24, 'returnInterior', wall ? 1 : 0).setDisplaySize(48, 48).setDepth(0);
      }
    }
    const furniture = (frame, x, y, blocking = true) => {
      const image = this.add.image(x, y, 'returnFurniture', frame).setOrigin(0).setScale(1.5).setDepth(blocking ? y + 55 : 1);
      if (blocking) this.furnitureBlocks.push({ x, y, w: image.displayWidth, h: image.displayHeight });
    };
    furniture('rug', 339, 290, false);
    furniture('table', 343, 120);
    furniture('shelf', 96, 48);
    furniture('shelf', 576, 48);
    furniture('chest', 96, 192);
    furniture('basket', 624, 192);
    furniture('door', exit.x - 29, exit.y - 15, false);
    const sprite = this.character(adba.x, adba.y, adba.key).setDisplaySize(84, 112).setOrigin(0.5, 0.88).setDepth(adba.y);
    this.npcs = [{ ...adba, sprite }];
    this.player = this.character(spawn.x, spawn.y, 'returnChatoa', 3).setDepth(spawn.y);
    drawRouteMarker(this, { ...exit, direction: 'down', depth: 10000 });
    this.cameras.main.setZoom(1).setBounds(0, 0, width, height).setBackgroundColor('#101c24');
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.centerOn(width / 2, height / 2);
    this.cameras.main.fadeIn(250, 14, 25, 28);
    this.updateHud();
  }

  leaveHall() {
    if (this.area !== 'hall' || this.storyBusy || this.transitioning) return;
    if (this.sys.settings.key === 'BazaarCityScene' && this.registry.get('bazaarChapterComplete')) {
      this.transitioning = true;
      this.scene.start('BazaarUneaseScene');
      return;
    }
    this.renderCity({ x: MERCHANT_HALL.door.x, y: MERCHANT_HALL.door.y + 70 });
    this.cameras.main.fadeIn(250, 14, 25, 28);
    this.updateHud();
  }

  canWalk(x, y) {
    const walkable = this.area === 'hall'
      ? x >= 64 && x <= MERCHANT_HALL.width - 64 && y >= 96 && y <= MERCHANT_HALL.height - 64
        && !this.furnitureBlocks.some(b => x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 12 && y < b.y + b.h + 12)
      : canWalkCity(x, y);
    return walkable && !this.npcs.some(npc => Math.hypot(x - npc.x, y - npc.y) < 25);
  }

  update(_time, delta) {
    const action = Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (this.storyBusy) { if (action) this.advanceStory?.(); return; }
    if (this.transitioning) return;
    if (action) { this.interact(); return; }
    if (this.storyBusy || this.transitioning) return;
    const direction = this.activeDirection();
    const length = Math.hypot(direction.x, direction.y) || 1;
    const step = travelSpeed(185, this.registry.get('travelEquipment')) * Math.min(delta, 50) / 1000;
    const x = this.player.x + direction.x / length * step;
    const y = this.player.y + direction.y / length * step;
    if (this.canWalk(x, this.player.y)) this.player.x = x;
    if (this.canWalk(this.player.x, y)) this.player.y = y;
    if (direction.x || direction.y) this.player.setFrame(direction.x ? direction.x > 0 ? 1 : 2 : direction.y > 0 ? 0 : 3);
    this.player.setDepth(this.player.y);
    const district = this.area === 'hall' ? '商館・応接室' : cityDistrict(this.player.x, this.player.y);
    if (district !== this.district) { this.district = district; this.updateHud(); }
    this.updateHint();
  }

  nearbyNpc() {
    return this.npcs.filter(npc => Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < 95)
      .sort((a, b) => Math.hypot(this.player.x - a.x, this.player.y - a.y) - Math.hypot(this.player.x - b.x, this.player.y - b.y))[0];
  }

  nearbyBuilding() {
    if (this.area !== 'city') return null;
    const distance = building => Math.hypot(this.player.x - building.x, this.player.y - (building.y + 24));
    const building = CITY_BUILDINGS.filter(b => b.name && distance(b) < 64)
      .sort((a, b) => distance(a) - distance(b))[0];
    const npc = this.nearbyNpc();
    // Use the same closest target for the hint and action so residents remain reachable.
    if (npc && building && Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < distance(building)) return null;
    return building;
  }

  inspectBuilding(building) {
    const lines = [...building.description];
    const hall = building.id === 'merchant-hall';
    if (hall) lines.push(this.isHallOpen()
      ? '商館は開いている。中に入って、アドバを訪ねよう。'
      : '商館はまだ開いていない。街の人たちに話を聞いてから、また来よう。');
    this.showStory({ speaker: building.name, lines, onComplete: () => {
      if (hall && this.isHallOpen()) this.enterHall();
      else this.updateHint();
    } });
  }

  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.transitioning) return;
    if (this.area === 'hall' && this.nearHallDoor()) return this.leaveHall();
    const building = this.nearbyBuilding();
    if (building) return this.inspectBuilding(building);
    const npc = this.nearbyNpc();
    if (!npc) return;
    if (npc.special === 'adba') return this.talkAdba();
    if (npc.special === 'barter') return openBarterShop(this);
    if (npc.special === 'inn') return this.talkInn();
    const completesInformation = !this.isHallOpen() && npc.topic
      && learnTopic([...this.learned], npc.topic).length === TOPICS.length;
    const lines = completesInformation
      ? [...npc.lines, 'そうそう、中央広場の北にある商館が開いたよ。アドバさんは中にいる。入口の青い矢印を目印に、訪ねてごらん。']
      : npc.lines;
    this.showStory({ speaker: npc.name, lines, onComplete: () => {
      if (npc.topic) {
        this.learned = new Set(learnTopic([...this.learned], npc.topic));
        this.registry.set('bazaarLearnedTopics', [...this.learned]);
        this.registry.set('bazaarInformationComplete', this.learned.size === TOPICS.length);
        this.updateHallMarker();
      }
      this.updateHud();
    } });
  }

  talkAdba() {
    if (!this.registry.get('bazaarMetAdba')) {
      this.showStory({ lines: [
        { speaker: 'チャトア', text: 'ウトパス村長の知り合いの、アドバさんですか？　ぼくはウペトア島のチャトアです。島に、兵隊が……。' },
        { speaker: 'アドバ', text: 'よく来たね。ウトパスのことは知っている。島の異変も、商人たちから聞いているよ。まずは落ち着いて、話してごらん。' },
        { speaker: '', text: 'チャトアは島で起きたことと、海の上で陽光石が放った光について話した。' },
        { speaker: 'アドバ', text: 'ベクテーナで王に会えるよう、手筈を整えよう。南東の宿にも話しておく。食事をして、ゆっくり休みなさい。' },
        { speaker: 'アドバ', text: 'それと、持っている陽光石を一つ、譲ってもらえないだろうか。今すぐでなくていい。街を見て、考えておくれ。' },
        { speaker: 'チャトア', text: '……あの光を見たから、まだ怖くて。少し、考えさせてください。' },
      ], onComplete: () => { this.registry.set('bazaarMetAdba', true); this.updateHud(); } });
      return;
    }
    if (this.registry.get('adbaReceivedShard')) return this.showStory({ speaker: 'アドバ', lines: ['石は大切に預かるよ。王に会う準備を進めている。', 'それまでは、街で自由に過ごしておくれ。'], onComplete: () => this.updateHud() });
    if (!this.registry.get('bazaarRested') || this.learned.size < TOPICS.length) {
      return this.showStory({ speaker: 'アドバ', lines: ['この街には、いろいろな国から来た人がいる。人々の話を聞けば、島の外のことも少しずつ分かるだろう。', '疲れたら南東の宿へ。陽光石のことは、休んでから考えてくれていい。'] });
    }
    const inventory = this.registry.get('caveCollectedItems') ?? [];
    if (!giveAdbaShard(inventory, false).given) return this.showStory({ speaker: 'アドバ', lines: ['手元に石がないなら、無理に探さなくていい。王に伝える話を整理しておこう。'] });
    this.showStory({ lines: [
      { speaker: '', text: '街を歩き、人々と話し、宿で体を休めた。何日か過ごすうちに、張りつめていた気持ちが少しずつほどけていった。' },
      { speaker: 'チャトア', text: 'アドバさん、食事も、泊まるところも、ありがとうございます。……陽光石を一つ、渡します。でも、気をつけてください。' },
      { speaker: 'アドバ', text: 'ありがとう、チャトア。君が見たことを忘れず、大切に扱うと約束する。' },
      { speaker: '', text: 'チャトアは布包みから陽光石を一つ取り出した。残る石を包み直し、アドバに手渡した。' },
      { speaker: 'アドバ', text: '王に会う手筈が整ったら、使いを出すよ。それまでは街で休んでおいで。' },
    ], onComplete: () => {
      const result = giveAdbaShard(this.registry.get('caveCollectedItems') ?? [], this.registry.get('adbaReceivedShard'));
      if (result.given) {
        this.registry.set('caveCollectedItems', result.inventory);
        this.collected = new Set(result.inventory);
        this.registry.set('adbaReceivedShard', result.given);
        this.registry.set('bazaarChapterComplete', true);
        this.phase = 'complete';
      }
      this.updateHud();
    } });
  }

  talkInn() {
    if (!this.registry.get('bazaarMetAdba')) return this.showStory({ speaker: '宿の主人', lines: ['旅の子かい。困っているなら、中央広場の北にある商館のアドバさんに相談してごらん。', this.isHallOpen() ? '商館は開いているよ。アドバさんは中で待っている。' : '今はまだ商館が閉まっているから、まずは街の人たちに話を聞いておいで。'] });
    if (this.registry.get('bazaarRested')) return this.showStory({ speaker: '宿の主人', lines: ['よく眠れたかい。食事も用意してあるから、遠慮なくおいで。', '街の話を聞いて回るなら、広場を目印にすると迷いにくいよ。'] });
    this.showStory({ speaker: '宿の主人', lines: ['アドバさんから聞いているよ。食事も寝床も、心配しなくていい。', '今日はゆっくりお休み。'], onComplete: () => {
      this.transitioning = true;
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.registry.set('bazaarRested', true);
        this.transitioning = false;
        this.cameras.main.fadeIn(600, 12, 20, 30);
        this.updateHud();
        this.showStory({ lines: [
          { speaker: '', text: '温かな食事をとり、用意された部屋で眠った。翌朝、窓の向こうから街の音が聞こえた。' },
          { speaker: 'チャトア', text: '……少し、落ち着いた。商館のアドバさんに、もう一度会いに行こう。' },
        ] });
      });
      this.cameras.main.fadeOut(500, 12, 20, 30);
    } });
  }

  updateHint() {
    if (this.storyBusy || this.transitioning) return;
    if (this.area === 'hall' && this.nearHallDoor()) {
      $('#hint').textContent = 'Enter / Space・調べるで街へ戻る。';
      return;
    }
    const building = this.nearbyBuilding();
    if (building) {
      $('#hint').textContent = `Enter / Space・調べるで「${building.name}」の説明を読む。`
        + (building.id === 'merchant-hall' && this.isHallOpen() ? '読み終えると中へ入ります。' : '');
      return;
    }
    const npc = this.nearbyNpc();
    $('#hint').textContent = npc ? `Enter / Space・調べるで「${npc.name}」と話す。`
      : this.area === 'hall' ? 'アドバに近づいて話しかけよう。南の青い矢印から街へ戻れる。'
      : this.isHallOpen() && !this.registry.get('bazaarMetAdba') ? '中央広場の北の商館が開いている。入口の青い矢印から中へ入ろう。'
      : '矢印 / WASDで自由探索。住民に話しかけ、聞いた話は図鑑で読み返せる。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 11';
    $('.hud h1').textContent = this.area === 'hall' ? 'バザールの街・商館' : 'バザールの街';
    $('#time-label').textContent = this.registry.get('bazaarRested') ? '翌朝' : '昼';
    $('#step-label').textContent = `${this.district ?? '港からの大通り'} · 情報 ${this.learned.size}/${TOPICS.length}`;
    $('#phaser-stage').setAttribute('aria-label', this.area === 'hall' ? '商館の応接室。アドバと話し、南の出口から街へ戻る' : 'バザールの街。市場・広場・交易地区・宿場・学びの庭を自由に探索する');
    const quests = TOPICS.map(topic => [this.learned.has(topic.id), `${topic.name}を知る（${topic.area}）`]);
    if (this.isHallOpen()) quests.push([this.registry.get('bazaarMetAdba'), '北の商館に入り、アドバと会う']);
    if (this.registry.get('bazaarMetAdba')) quests.push([this.registry.get('bazaarRested'), '南東の宿で休む']);
    if (this.registry.get('bazaarRested') && this.learned.size === TOPICS.length) quests.push([this.registry.get('adbaReceivedShard'), 'アドバに陽光石を一つ渡す']);
    const list = $('#quest-list'); list.replaceChildren();
    for (const [done, text] of quests) {
      const li = document.createElement('li'); li.textContent = `${done ? '✓' : '□'} ${text}`;
      if (done) li.className = 'done'; list.append(li);
    }
    if (this.phase === 'complete') {
      const li = document.createElement('li'); li.textContent = 'CHAPTER 11 完了 — 商館を出ると、数日後の街へ進みます。'; li.className = 'done'; list.append(li);
    }
    this.updateHint();
  }
}
