import { BaseForestScene } from './04-petoa-forest.js';
import { drawRouteMarker } from '../ui/markers.js';

export const SEARCH_PARTY = { x: 832, y: 1110, radius: 120 };
export const REUNION_LINES = [
  { speaker: 'チャトアの父', text: 'チャトア！　無事だったか！　みんなで探していたんだ。' },
  { speaker: '漁師', text: '昨夜は大丈夫だったのか？　けがはしていないか？' },
  { speaker: 'チャトア', text: 'うん、大丈夫。けがもしてない。心配かけて、ごめんなさい。' },
  { speaker: 'チャトアの父', text: 'いったい、どこにいたんだ？　一晩中、戻ってこないから……。' },
  { speaker: 'チャトア', text: '森で道が分からなくなって……。風の当たらないところで、朝になるのを待っていたんだ。' },
  { speaker: 'チャトア', text: '（青い石と洞窟のことは、まだ話さないでおこう。）' },
  { speaker: '漁師', text: 'そうか。無事に見つかってよかった。浜に舟をつけてある。' },
  { speaker: 'チャトアの父', text: 'さあ、村へ帰ろう。みんな、お前を待っている。' },
  { speaker: 'チャトア', text: '……うん。帰ろう。' },
];

export class PetoaForestMorningScene extends BaseForestScene {
  constructor() {
    super({
      key: 'PetoaForestMorningScene', chapter: 'CHAPTER 5', title: 'ペトア島・帰り道', time: '朝', hasCave: true,
      startHint: '砂浜の方から声がする。森を下へ進み、捜索隊を探そう。', mission: '砂浜の方へ進み、捜索隊と合流する',
      intro: { speaker: 'チャトア', lines: [
        { speaker: '遠くから聞こえる声', text: 'チャトアー！　どこにいるんだー！' },
        { speaker: 'チャトア', text: '……誰かが、ぼくを呼んでいる。' },
        { speaker: '遠くから聞こえる声', text: 'こっちの森も探してみよう！' },
        { speaker: 'チャトア', text: '砂浜の方だ。行ってみよう。' },
      ] },
    });
  }

  preload() {
    super.preload();
    this.load.image('returnSeaWater', './assets/img/tiles/sea/sea-water-tile-v1.png');
    this.load.spritesheet('searchFather', './assets/img/characters/father-static-v3.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('searchFisher', './assets/img/characters/fisher-static-v1.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.reunited = false;
    super.create();
    this.searchParty = [
      this.add.sprite(SEARCH_PARTY.x - 38, SEARCH_PARTY.y + 24, 'searchFather', 3),
      this.add.sprite(SEARCH_PARTY.x + 44, SEARCH_PARTY.y + 40, 'searchFisher', 3),
    ];
    for (const member of this.searchParty) member.setDisplaySize(72, 72).setOrigin(0.5, 0.78).setDepth(member.y);
    this.partyMarker = drawRouteMarker(this, { x: SEARCH_PARTY.x, y: SEARCH_PARTY.y - 64, direction: 'down', depth: 1200 });
    this.cameras.main.fadeIn(650, 8, 12, 15);
    this.events.once('shutdown', () => { document.querySelector('#dialog').hidden = true; document.querySelector('#next-button').onclick = null; });
  }

  createPlayer() {
    super.createPlayer();
    this.player.setPosition(1248, 198).setFrame(0).setDepth(198);
  }

  createBeachEntrance() {
    super.createBeachEntrance();
    this.add.tileSprite(0, 1184, 1664, 320, 'returnSeaWater').setOrigin(0).setTileScale(1.5).setDepth(0.5);
  }

  createBeasts() {}
  createTimeOverlay() {}
  updateHideState() {}

  checkForestGoal() {
    if (this.reunited || this.storyBusy || this.completed) return;
    if (Math.hypot(this.player.x - SEARCH_PARTY.x, this.player.y - SEARCH_PARTY.y) > SEARCH_PARTY.radius) return;
    this.reunited = true;
    this.completed = true;
    this.touchDirection = null;
    this.player.setAlpha(1).setFrame(0);
    this.partyMarker.setVisible(false);
    this.registry.set('searchPartyReunited', true);
    this.updateMission(true);
    document.querySelector('#hint').textContent = '捜索隊と合流した。話をして、一緒に村へ帰ろう。';
    this.cameras.main.setBounds(0, 0, 1664, 1504);
    this.cameras.main.stopFollow();
    this.cameras.main.pan(SEARCH_PARTY.x, SEARCH_PARTY.y + 140, 650, 'Sine.easeInOut');
    this.showStory({ lines: REUNION_LINES, onComplete: () => this.returnToVillage() });
  }

  returnToVillage() {
    this.input.keyboard.resetKeys();
    document.querySelector('#hint').textContent = '捜索隊と舟に乗り、ウペトア島へ帰る。';
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('UpetoaVillageReturnScene'));
    this.cameras.main.fadeOut(900, 8, 12, 15);
  }

  updateContextHint() {
    if (!this.completed) document.querySelector('#hint').textContent = this.forestConfig.startHint;
  }

  updateHud() {
    super.updateHud();
    document.querySelector('#step-label').textContent = '帰り道';
    document.querySelector('#phaser-stage').setAttribute('aria-label', '朝の森・捜索隊への帰り道');
  }
}
