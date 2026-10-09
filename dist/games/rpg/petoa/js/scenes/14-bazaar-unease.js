import { ESCORT_TEXTURE, ESCORT_ATLAS, createEscortSprite, syncEscortSprite } from '../ui/escort-sprites.js';
import { BazaarCityScene } from './13-bazaar-city.js';
import { CITY, MERCHANT_HALL, TOPICS } from '../data/bazaar-city.js';
import { MESSENGER_DELAY, ESCORTS, UNEASY_LINES, RECRUIT_LINES, addEscorts, pointBehind } from '../data/bazaar-unease.js';

const $ = selector => document.querySelector(selector);

export class BazaarUneaseScene extends BazaarCityScene {
  constructor() {
    super({ key: 'BazaarUneaseScene', chapter: 'CHAPTER 12', title: '忍び寄る気配', time: '数日後' });
  }

  preload() {
    super.preload();
    this.load.atlas(ESCORT_TEXTURE, `${ESCORT_ATLAS}.png`, `${ESCORT_ATLAS}.json`);
  }

  create() {
    this.registry.set('bazaarCityVisited', true);
    this.registry.set('bazaarLearnedTopics', TOPICS.map(t => t.id));
    this.registry.set('bazaarMetAdba', true);
    this.registry.set('bazaarRested', true);
    this.registry.set('bazaarChapterComplete', true);
    this.waitElapsed = this.registry.get('bazaarUneaseWait') ?? 0;
    this.arrivalInProgress = false;
    this.followers = [];
    this.trail = [];
    super.create();
    this.phase = this.registry.get('bazaarEscortsJoined') ? 'complete' : 'waiting';
    this.updateHud();
    if (!this.registry.get('bazaarUneaseVisited')) {
      this.registry.set('bazaarUneaseVisited', true);
      this.showStory({ lines: [
        { speaker: '', text: '陽光石をアドバに渡してから、数日が過ぎた。いつもの街には、どこか違う空気が流れていた。' },
        { speaker: '', text: '早くも戸を閉めた店がある。立ち話の声は小さく、通りを振り返る人が目についた。' },
        { speaker: 'チャトア', text: '……何かあったのかな。少し、街を歩いてみよう。' },
      ] });
    }
  }

  isHallOpen() {
    return !!this.registry.get('bazaarMessengerDelivered');
  }

  renderCity(entry = { x: 2180, y: 1980 }) {
    super.renderCity(entry);
    this.followers = [];
    this.messenger = null;
    this.npcs = this.npcs.filter(npc => {
      if (!UNEASY_LINES[npc.id]) { npc.sprite.destroy(); return false; }
      npc.lines = UNEASY_LINES[npc.id];
      delete npc.topic;
      delete npc.special;
      return true;
    });
    // The familiar city stays navigable, but loses its warm midday colors.
    for (const child of this.children.list) if (child.setTint && child !== this.player) child.setTint(0xa5adb8);
    const shutters = this.add.graphics();
    shutters.fillStyle(0x41474c).fillRect(320, 947, 125, 47);
    shutters.lineStyle(2, 0x252f37);
    for (let y = 953; y < 994; y += 8) shutters.lineBetween(320, y, 445, y);
    shutters.setDepth(1001);
    this.add.rectangle(CITY.width / 2, CITY.height / 2, CITY.width, CITY.height, 0x172a41, 0.10).setDepth(9000);
    if (this.registry.get('bazaarEscortsJoined')) this.createFollowers();
    else this.trail = [{ x: this.player.x, y: this.player.y }];
  }

  inspectBuilding(building) {
    if (building.id === 'merchant-hall' && !this.isHallOpen()) {
      return this.showStory({ speaker: building.name, lines: [building.description[0], '入口は閉じられている。アドバは「準備ができたら使いを出す」と言っていた。街で待っていよう。'] });
    }
    if (building.id === 'inn') {
      return this.showStory({ speaker: building.name, lines: ['数日を過ごした宿。今日は、主人が入口から通りを気にしている。', '外の話し声も、いつもより小さい。'] });
    }
    super.inspectBuilding(building);
  }

  update(time, delta) {
    const wasBusy = this.storyBusy || this.transitioning;
    super.update(time, delta);
    if (wasBusy || this.storyBusy || this.transitioning) return;
    const last = this.trail.at(-1);
    if (!last || Math.hypot(this.player.x - last.x, this.player.y - last.y) >= 3) {
      this.trail.push({ x: this.player.x, y: this.player.y });
      if (this.trail.length > 160) this.trail.shift();
    }
    this.updateFollowers();
    if (this.area !== 'city' || this.isHallOpen() || this.arrivalInProgress) return;
    this.waitElapsed += Math.min(delta, 100);
    this.registry.set('bazaarUneaseWait', this.waitElapsed);
    if (this.waitElapsed >= MESSENGER_DELAY) this.arriveMessenger();
  }

  escortSprite(id, x, y, height = 70) {
    return createEscortSprite(this, id, x, y, height);
  }

  arriveMessenger() {
    if (this.arrivalInProgress || this.isHallOpen()) return;
    // Choose a clear straight approach; retry next frame if the player is in a tight spot.
    let approach;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      if ([35, 55, 75, 95, 115].every(d => this.canWalk(this.player.x + dx * d, this.player.y + dy * d))) {
        approach = { dx, dy }; break;
      }
    }
    if (!approach) return;
    this.arrivalInProgress = true;
    this.storyBusy = true;
    this.touchDirection = null;
    const { dx, dy } = approach;
    const x = this.player.x + dx * 42, y = this.player.y + dy * 42;
    this.messenger = this.escortSprite('messenger', this.player.x + dx * 115, this.player.y + dy * 115);
    this.tweens.add({ targets: this.messenger, x, y, duration: 850,
      onUpdate: () => syncEscortSprite(this.messenger),
      onComplete: () => this.showStory({ lines: [
        { speaker: 'アドバの使い', text: 'チャトアさんですね。アドバさんがお呼びです。北の商館まで、お越しください。' },
        { speaker: 'チャトア', text: '王さまに会う準備が、できたんですか？' },
        { speaker: 'アドバの使い', text: '詳しいお話は中で。道中は、人通りのある道を通ってください。お待ちしています。' },
      ], onComplete: () => {
        this.registry.set('bazaarMessengerDelivered', true);
        this.arrivalInProgress = false;
        this.npcs.push({ id: 'messenger', name: 'アドバの使い', x, y, sprite: this.messenger,
          lines: ['中央広場の北、青い矢印のある商館へどうぞ。アドバさんがお待ちです。'] });
        this.updateHallMarker();
        this.updateHud();
      } }),
    });
  }

  enterHall() {
    if (!this.isHallOpen() || this.storyBusy || this.area !== 'city') return;
    super.enterHall();
    this.followers = [];
    this.trail = [];
    if (this.registry.get('bazaarEscortsJoined')) { this.createFollowers(); return; }
    for (const escort of ESCORTS) {
      const sprite = this.escortSprite(escort.id, escort.x, escort.y, escort.height);
      this.npcs.push({ ...escort, sprite, lines: ['アドバさんから、話を聞こう。'] });
    }
    this.talkAdba();
  }

  talkAdba() {
    if (this.registry.get('bazaarEscortsJoined')) {
      return this.showStory({ speaker: 'アドバ', lines: ['マドスとイリアがついている。二人と離れずに行くんだよ。'] });
    }
    this.showStory({ lines: RECRUIT_LINES, onComplete: () => {
      this.registry.set('partyMembers', addEscorts(this.registry.get('partyMembers') ?? []));
      this.registry.set('bazaarEscortsJoined', true);
      this.registry.set('bazaarUneaseComplete', true);
      this.phase = 'complete';
      for (const npc of this.npcs.filter(n => ESCORTS.some(e => e.id === n.id))) npc.sprite.destroy();
      this.npcs = this.npcs.filter(n => !ESCORTS.some(e => e.id === n.id));
      this.createFollowers();
      this.updateHud();
    } });
  }

  departForVektena() {
    if (this.storyBusy || this.transitioning || !this.registry.get('bazaarEscortsJoined')) return;
    this.transitioning = true;
    this.scene.start('VektenaChaseScene');
  }

  leaveHall() {
    if (this.area !== 'hall' || this.storyBusy || this.transitioning) return;
    if (this.registry.get('bazaarEscortsJoined')) return this.departForVektena();
    super.leaveHall();
  }

  createFollowers() {
    this.trail = [{ x: this.player.x, y: this.player.y }];
    this.followers = ESCORTS.map((escort, i) => {
      const x = this.player.x + (i ? 34 : -34), y = this.player.y + 28;
      return this.escortSprite(escort.id, x, y, escort.height);
    });
  }

  updateFollowers() {
    if (!this.followers?.length || this.trail.length < 2) return;
    this.followers.forEach((sprite, i) => {
      const target = pointBehind(this.trail, (i + 1) * 46);
      syncEscortSprite(sprite, target.x, target.y);
    });
  }

  updateHint() {
    if (this.storyBusy || this.transitioning) return;
    super.updateHint();
    if (this.nearbyNpc() || this.nearbyBuilding() || (this.area === 'hall' && this.nearHallDoor())) return;
    $('#hint').textContent = this.registry.get('bazaarEscortsJoined')
      ? 'マドスとイリアが同行しています。商館の出口から三人で出発しよう。'
      : this.isHallOpen() ? 'アドバに呼ばれています。中央広場の北、青い矢印のある商館へ。'
      : '街の様子がいつもと違う。周りを歩き、住民の話を聞いてみよう。';
  }

  updateHud() {
    $('.chapter').textContent = 'CHAPTER 12';
    $('.hud h1').textContent = this.area === 'hall' ? '商館・二人の護衛' : 'バザールの街・忍び寄る気配';
    $('#time-label').textContent = '数日後・曇天';
    const joined = !!this.registry.get('bazaarEscortsJoined');
    $('#step-label').textContent = joined ? '仲間：マドス・イリア' : this.isHallOpen() ? 'アドバからの呼び出し' : '街に流れる不穏な空気';
    $('#phaser-stage').setAttribute('aria-label', this.area === 'hall' ? '商館でアドバと護衛に会う' : '数日後のバザールの街。住民たちが周囲を警戒している');
    const quests = [[this.isHallOpen(), '街を歩き、アドバからの知らせを待つ']];
    if (this.isHallOpen()) quests.push([joined, '北の商館へ行き、アドバの話を聞く']);
    if (joined) quests.push([true, 'マドスとイリアが仲間になった']);
    const list = $('#quest-list'); list.replaceChildren();
    for (const [done, text] of quests) {
      const li = document.createElement('li'); li.textContent = `${done ? '✓' : '□'} ${text}`;
      if (done) li.className = 'done'; list.append(li);
    }
    if (joined) {
      const departure = document.createElement('button'); departure.type = 'button';
      departure.className = 'chapter-departure'; departure.textContent = '三人で商館を出る（CHAPTER 13）';
      departure.addEventListener('click', () => { if (this.scene.isActive()) this.departForVektena(); });
      list.append(departure);
    }
    this.updateHint();
  }
}
