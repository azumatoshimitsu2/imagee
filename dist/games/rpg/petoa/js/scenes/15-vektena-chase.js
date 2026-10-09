import { ESCORT_TEXTURE, ESCORT_ATLAS, createEscortSprite, syncEscortSprite } from '../ui/escort-sprites.js';
import { BazaarCityScene } from './13-bazaar-city.js';
import { TILE, MAP, BUILDINGS, DEPARTURE_HALL, START, PLACES, MARKETS, INTRO, DISGUISE_WARDROBE, PASS_DOCUMENT, REFUGE_EXITS } from '../data/vektena-chase.js';
import { createChase, assignRoles, stepChase, command, changeDisguise, nearbyPlace, enterPlace, leavePlace, retryChase, nearDisguiseWardrobe, collectDisguise, nearPassDocument, collectPass, nearbyRefugeExit } from '../systems/vektena-chase.js';
import { ROLE_NAMES, MEMBER_NAMES, ROLE_STATS } from '../data/chase-roles.js';
import { drawRouteMarker } from '../ui/markers.js';
import { createClothWardrobe, WARDROBE_HEIGHT } from '../ui/cloth-wardrobe.js';

const $ = selector => document.querySelector(selector);
export class VektenaChaseScene extends BazaarCityScene {
  constructor() { super({ key: 'VektenaChaseScene', chapter: 'CHAPTER 13', title: 'バザールの街・スパイから逃げろ', time: '昼' }); }
  preload() {
    super.preload();
    this.load.atlas(ESCORT_TEXTURE, `${ESCORT_ATLAS}.png`, `${ESCORT_ATLAS}.json`);
    this.load.atlas('vektenaSpies', './assets/img/enemies/vektena-spy-v1.png', './assets/img/enemies/vektena-spy-v1.json');
  }
  create() {
    this.storyBusy = false; this.transitioning = false; this.advanceStory = null; this.touchDirection = null;
    this.registry.set('bazaarEscortsJoined', true);
    this.registry.set('partyMembers', [...new Set([...(this.registry.get('partyMembers') ?? []), 'mados', 'iria'])]);
    this.sim = createChase({ stage: this.registry.get('vektenaStage'), complete: this.registry.get('vektenaComplete'), equipment: this.registry.get('travelEquipment') });
    this.bindSceneControls();
    this.commandKeys = this.input.keyboard.addKeys({ mados: 'Q', iria: 'E', disguise: 'R' });
    this.installTeamControls();
    this.events.once('shutdown', () => {
      this.teamPanel.remove();
    });
    this.renderStreet(); this.updateHud();
    if (!this.sim.complete) this.chooseRoles();
    this.cameras.main.fadeIn(250, 14, 25, 28);
  }
  chooseRoles() {
    this.touchDirection = null;
    const keyboard = this.input.keyboard, wasEnabled = keyboard.enabled;
    keyboard.resetKeys(); keyboard.enabled = false;
    const dialog = document.createElement('dialog'); dialog.className = 'chase-role-picker';
    dialog.setAttribute('aria-labelledby', 'chase-role-title');
    dialog.innerHTML = `<form><p class="quest-title">商館前・作戦会議</p><h2 id="chase-role-title">二人の役割を決めよう</h2><p>盾役を一人、囮役を一人選びます。二人は敵を見て自動で援護します。決定するまで時間は止まっています。</p><fieldset><legend>どちらの作戦で逃げる？</legend>
      <label><input type="radio" name="shield" value="mados" autofocus><strong>マドスが盾 ／ イリアが囮</strong><span>マドス：8秒間盾になり、敵1体を止める。粘り強いが、再使用まで20秒。</span><span>イリア：素早く動いて敵1体を6秒間引きつける。再使用は14秒と早いが、届く範囲は狭め。</span></label>
      <label><input type="radio" name="shield" value="iria"><strong>イリアが盾 ／ マドスが囮</strong><span>イリア：素早く駆けつけ、4秒間盾になり、敵1体を止める。再使用は12秒と早いが、止められる時間は短め。</span><span>マドス：遠くの敵1体を7秒間引きつける。届く範囲は広いが、動きと合流が遅く、再使用まで20秒。</span></label>
      </fieldset><p>矢印キーで役割を選び、Tabで開始ボタンへ移動し、Enterで決定できます。Spaceでも選択できます。</p><p>チャトアの移動に集中しよう。二人は自分で行動し、役目が終わると合流します。Q・Eで追加の指示もできます。</p><button type="submit" disabled>この役割で逃走を始める</button></form>`;
    // Phaser's global key capture still prevents browser defaults when the scene
    // keyboard plugin is disabled. Keep dialog keys away from that listener.
    const blockGameKeys = event => { if (dialog.open) event.stopImmediatePropagation(); };
    window.addEventListener('keydown', blockGameKeys, true);
    window.addEventListener('keyup', blockGameKeys, true);
    const cleanup = () => {
      window.removeEventListener('keydown', blockGameKeys, true);
      window.removeEventListener('keyup', blockGameKeys, true);
      keyboard.resetKeys(); keyboard.enabled = wasEnabled;
      dialog.remove(); this.roleDialog = null;
    };
    this.finishRoleChoice=cleanup;
    const form = dialog.querySelector('form'), start = dialog.querySelector('button');
    form.addEventListener('change', () => { start.disabled = !form.querySelector('input:checked'); });
    dialog.addEventListener('cancel', event => event.preventDefault());
    form.addEventListener('submit', event => {
      event.preventDefault();
      const selected = form.querySelector('input:checked');
      if (!selected || !this.scene.isActive() || !assignRoles(this.sim, selected.value)) return;
      this.touchDirection = null;
      dialog.close(); cleanup();
      this.updateHud();
    });
    this.roleDialog = dialog; document.body.append(dialog); dialog.showModal();
    this.events.once('shutdown', cleanup);
  }
  installTeamControls() {
    $('.game-panel').classList.add('chase-mode');
    const dialog = $('#dialog'), originalParent = dialog.parentNode, originalNext = dialog.nextSibling;
    $('#viewport').append(dialog);
    this.mobileCommands = document.createElement('div'); this.mobileCommands.className = 'chase-mobile-commands';
    for (const [id, label] of [['mados', 'マドス：囮'], ['iria', 'イリア：足止め'], ['disguise', '変装']]) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.mobileCommand = id; button.textContent = label;
      button.addEventListener('click', () => this.issueCommand(id)); this.mobileCommands.append(button);
    }
    $('.touch-controls').prepend(this.mobileCommands);
    this.events.once('shutdown', () => {
      $('.game-panel').classList.remove('chase-mode'); this.mobileCommands.remove();
      originalParent.insertBefore(dialog, originalNext);
    });
    this.teamPanel = document.createElement('section'); this.teamPanel.className = 'chase-team';
    this.teamPanel.setAttribute('aria-label', '仲間への指示と街の案内');
    this.teamPanel.innerHTML = `<p class="quest-title">二人は自動で援護</p><p class="chase-pressure-label">周囲の緊張 <span></span></p><meter min="0" max="100" value="0" aria-label="周囲の緊張"></meter><button type="button" data-command="mados"></button><button type="button" data-command="iria"></button><button type="button" data-command="disguise"></button><button type="button" data-command="back" hidden>裏口から出る</button><button type="button" data-command="front" hidden>表口から出る</button><button type="button" data-command="help">操作・作戦を確認</button><canvas width="250" height="241" aria-label="街の略図。青が現在地、金が目的地。人物の位置は表示しません。"></canvas><p class="chase-map-key">青：現在地 ／ 金：目的地</p><p class="chase-status" role="status" aria-live="polite"></p>`;
    $('.quest').append(this.teamPanel);
    this.teamPanel.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
      if (!this.scene.isActive() || this.storyBusy || this.transitioning || !this.sim.rolesReady) return;
      const id = button.dataset.command;
      if (id === 'help') return this.showStory({ lines: INTRO });
      if (id === 'back') return this.exitRefuge(true);
      if (id === 'front') return this.exitRefuge(false);
      this.issueCommand(id);
    }));
    this.lastNotice = '';
  }
  issueCommand(id) {
    if (this.storyBusy || this.transitioning || !this.scene.isActive() || !this.sim.rolesReady) return;
    if (id === 'disguise') changeDisguise(this.sim); else command(this.sim, id);
    this.syncActors(); this.updateHud();
  }
  residentSprite(actor) {
    const sprite = this.add.sprite(actor.x, actor.y, 'bazaarResidents', actor.frame).setOrigin(.5, .85);
    return sprite.setScale(70 / sprite.frame.realHeight).setDepth(actor.y);
  }
  // Keep the old hall marker from inviting the player straight back indoors.
  updateHallMarker() {}

  renderStreet() {
    super.renderCity(this.sim.player);
    this.indoorView = false; this.actorSprites = new Map(); this.roleLabels = new Map();
    for (const npc of this.npcs) npc.sprite.destroy();
    this.npcs = [];
    for (const place of PLACES) {
      if (place.id === 'gate') this.add.image(place.x, place.y - 15, 'bazaar-street-life', 'gate').setOrigin(.5, 1).setDisplaySize(200, 205).setDepth(place.y - 20);
      this.add.text(place.x, place.labelY ?? place.y - 47, place.name, { fontSize: '17px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 7, y: 4 } }).setOrigin(.5, 1).setDepth(8000);
    }
    const shutters = this.add.graphics();
    shutters.fillStyle(0x41474c).fillRect(320, 947, 125, 47);
    shutters.lineStyle(2, 0x252f37);
    for (let y = 953; y < 994; y += 8) shutters.lineBetween(320, y, 445, y);
    shutters.setDepth(1001);
    const goal = PLACES[Math.min(this.sim.stage, 2)];
    drawRouteMarker(this, { ...(goal.marker ?? { x: goal.x, y: goal.y - 12 }), depth: 8500 });
    for (const actor of this.sim.civilians) this.actorSprites.set(actor.id, this.residentSprite(actor));
    // Match the overcast street outside the hall in Chapter 12.
    for (const child of this.children.list) if (child.setTint && child !== this.player) child.setTint(0xa5adb8);
    this.add.rectangle(MAP.width / 2, MAP.height / 2, MAP.width, MAP.height, 0x172a41, .10).setDepth(9000);
    for (const actor of this.sim.agents) {
      this.actorSprites.set(actor.id, createEscortSprite(this, 'spy', actor.x, actor.y, 70, actor.dy < 0 ? 'up' : 'down', 'vektenaSpies'));
    }
    for (const member of this.sim.team) {
      const sprite = createEscortSprite(this, member.id, member.x, member.y, member.id === 'mados' ? 74 : 70);
      this.actorSprites.set(member.id, sprite);
      this.roleLabels.set(member.id, this.add.text(member.x, member.y - 76, '', { fontSize: '13px', color: '#fff8dc', backgroundColor: '#172a36', padding: { x: 5, y: 3 } }).setOrigin(.5, 1));
    }
    this.player.setFrame(0);
    this.cameras.main.startFollow(this.player, true, .15, .15).centerOn(this.player.x, this.player.y);
    this.syncActors();
  }
  renderRefuge() {
    this.clearWorld(); this.indoorView = true; this.actorSprites = new Map();
    this.cameras.main.setZoom(1).setBounds(0, 0, 768, 576).setBackgroundColor('#17262b');
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) this.add.image(x * 48 + 24, y * 48 + 24, 'returnInterior', x === 0 || y === 0 || x === 15 || y === 11 ? 1 : 0).setDisplaySize(48, 48);
    // Give the rear wall enough height to contain the whole door. Its lower
    // edge is also the northern limit of the walkable floor (y = 120).
    const northWallHeight = 120;
    for (let x = 0; x < 16; x++) this.add.image(x * 48 + 24, northWallHeight / 2, 'returnInterior', 1).setDisplaySize(48, northWallHeight);
    for (const x of [96, 576]) this.add.image(x, 70, 'returnFurniture', 'shelf').setOrigin(0).setScale(1.5);
    const desk = this.sim.indoor === 'archive' ? { x: 500, y: 250 } : { x: 343, y: 180 };
    this.add.image(desk.x, desk.y, 'returnFurniture', 'table').setOrigin(0).setScale(1.5).setDepth(desk.y + 72);
    this.wardrobeMarker = null; this.wardrobeLabel = null;
    this.passSprite = null; this.passLabel = null; this.passMarker = null;
    if (this.sim.indoor === 'archive') {
      const { x, y } = PASS_DOCUMENT;
      this.passSprite = this.add.graphics().setDepth(desk.y + 73);
      // Crisp stepped outline, warm parchment, folded corner and shaded wax seal.
      const pixels = [
        '....................',
        '..11111111111111....',
        '.1555555555555561...',
        '.15222222222226661..',
        '.15222222222226331..',
        '.15277777722222231..',
        '.15222222222222231..',
        '.15277777777222231..',
        '.15222222222442231..',
        '.15277772224894231..',
        '.15222222224444231..',
        '.15333333333443331..',
        '..111111111111111...',
        '...00000000000000...',
      ];
      const colors = { '0': 0x34251d, '1': 0x513421, '2': 0xefce92,
        '3': 0xbc8950, '4': 0x9b3d28, '5': 0xffedbb, '6': 0xd4a665,
        '7': 0x87603c, '8': 0xe78645, '9': 0xf4b566 };
      pixels.forEach((row, py) => [...row].forEach((pixel, px) => {
        if (pixel === '.') return;
        this.passSprite.fillStyle(colors[pixel], pixel === '0' ? .5 : 1)
          .fillRect(x - 20 + px * 2, y - 14 + py * 2, 2, 2);
      }));
      this.passMarker = drawRouteMarker(this, { x, y: desk.y + 90, depth: 500 });
      this.passLabel = this.add.text(x, y - 35, '机：通用門の通行証', { fontSize: '16px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(500);
      this.updatePassDocument();
    }
    if (this.sim.indoor === 'cloth') {
      const { x, y } = DISGUISE_WARDROBE;
      createClothWardrobe(this, x, y);
      this.wardrobeLabel = this.add.text(x, y - WARDROBE_HEIGHT - 10, '', { fontSize: '17px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(500);
      this.wardrobeMarker = drawRouteMarker(this, { x, y: y + 10, depth: 500 });
      this.updateWardrobe();
    }
    this.residentSprite({ ...{ x: 384, y: 300 }, frame: 'market-merchant' });
    this.player = this.character(384, 400, 'returnChatoa', 3);
    for (const [i, member] of this.sim.team.entries()) {
      createEscortSprite(this, member.id, 310 + i * 148, 420, member.id === 'mados' ? 74 : 70, 'up');
    }
    const back = REFUGE_EXITS.find(exit => exit.back), front = REFUGE_EXITS.find(exit => !exit.back);
    // A framed wooden service door in the north wall leads to the northern alley.
    const doors = this.add.graphics().setDepth(1);
    // Preserve the adjusted door position without drawing a sill underneath it.
    this.add.image(back.x, northWallHeight + 2, 'returnFurniture', 'door').setOrigin(.5, 1).setScale(1.5).setDepth(northWallHeight);
    this.add.text(back.x, 28, back.label, { fontSize: '16px', color: '#ffedc1', backgroundColor: '#38433c', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(500);
    drawRouteMarker(this, { x: back.x, y: northWallHeight + 12, direction: 'up', depth: 500 });
    // The wide open threshold at the bottom is the storefront we entered through.
    doors.fillStyle(0x725337).fillRect(front.x - 46, 516, 92, 44);
    doors.fillStyle(0xb99563).fillRect(front.x - 40, 520, 80, 36);
    doors.lineStyle(2, 0x65482e).lineBetween(front.x - 40, 538, front.x + 40, 538);
    drawRouteMarker(this, { x: front.x, y: front.y, direction: 'down', depth: 500 });
    this.add.text(front.x, 558, front.label, { fontSize: '16px', color: '#d7f3ff', backgroundColor: '#17262b', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(500);
    // Follow indoor movement too, so narrow screens can reach the wardrobe in view.
    this.cameras.main.startFollow(this.player, true, .15, .15).centerOn(this.player.x, this.player.y);
  }
  updatePassDocument() {
    this.passSprite?.setVisible(this.sim.stage < 2);
    this.passMarker?.setVisible(this.sim.stage < 2);
    this.passLabel?.setText(this.sim.stage >= 2 ? '机（通行証は取得済み）' : '机：通用門の通行証');
  }
  updateWardrobe() {
    this.wardrobeLabel?.setText(this.sim.hasDisguise ? 'タンス（上着は取得済み）' : 'タンス：変装用の上着');
    this.wardrobeMarker?.setVisible(!this.sim.hasDisguise);
  }
  syncActors() {
    if (this.indoorView) {
      const p = this.sim.refugePlayer;
      if (p) {
        this.player.setPosition(p.x, p.y).setDepth(p.y);
        this.player.setFrame(Math.abs(p.dx) > Math.abs(p.dy) ? p.dx > 0 ? 1 : 2 : p.dy > 0 ? 0 : 3);
      }
      if (this.sim.disguise) this.player.setTint(0xb6b7d9); else this.player.clearTint();
      return;
    }
    const p = this.sim.player;
    this.player.setPosition(p.x, p.y).setDepth(p.y);
    if (this.sim.moving) this.player.setFrame(Math.abs(p.dx) > Math.abs(p.dy) ? p.dx > 0 ? 1 : 2 : p.dy > 0 ? 0 : 3);
    if (this.sim.disguise) this.player.setTint(0xb6b7d9); else this.player.clearTint();
    for (const a of [...this.sim.civilians, ...this.sim.agents, ...this.sim.team]) {
      const sprite = this.actorSprites.get(a.id);
      if (sprite?.getData('escort')) syncEscortSprite(sprite, a.x, a.y);
      else sprite?.setPosition(a.x, a.y).setDepth(a.y);
      const label = this.roleLabels?.get(a.id);
      if (label) {
        label.setPosition(a.x, a.y - 66).setDepth(a.y + 1).setVisible(!!(a.active || a.returning));
        label.setText(a.returning ? '合流中' : a.role === 'shield' ? '盾・ブロック' : '囮・誘導中');
      }
      if (sprite?.getData('escort')) {
        if (a.active) sprite.setTint(a.role === 'shield' ? 0xa8e4ff : 0xffdc9d);
        else if (a.distracted) sprite.setTint(0xa8e4ff);
        else if (a.lured) sprite.setTint(0xffdc9d);
        else sprite.clearTint();
      }
    }
  }
  update(_time, delta) {
    if (!this.sim.rolesReady) return;
    const action = Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    // Consume command presses even in dialogue, preventing queued activation after it closes.
    const commands = ['mados', 'iria', 'disguise'].filter(id => Phaser.Input.Keyboard.JustDown(this.commandKeys[id]));
    if (this.storyBusy) { if (action) this.advanceStory?.(); return; }
    if (this.transitioning) return;
    if (action) { this.interact(); return; }
    for (const id of commands) this.issueCommand(id);
    const direction = this.activeDirection();
    stepChase(this.sim, direction, delta / 1000);
    this.syncActors();
    if (this.sim.complete) return this.finishChapter();
    if (this.sim.caught) {
      this.sim = retryChase(this.sim);
      this.renderStreet();
      this.updateHud();
      return;
    }
    this.hudWait = (this.hudWait ?? 0) - delta;
    if (this.hudWait <= 0) { this.hudWait = 100; this.updateHud(); }
  }
  interact() {
    if (this.storyBusy) return this.advanceStory?.();
    if (this.transitioning || this.sim.complete || !this.sim.rolesReady) return;
    if (this.sim.indoor) {
      if (nearPassDocument(this.sim)) {
        if (collectPass(this.sim)) {
          this.registry.set('vektenaStage', this.sim.stage);
          this.updatePassDocument(); this.updateHud();
          return this.showStory({ speaker: 'チャトア', lines: [this.sim.message] });
        }
        return this.showStory({ speaker: '机', lines: ['通行証は、もう持っている。北東の通用門へ向かおう。'] });
      }
      if (nearDisguiseWardrobe(this.sim)) {
        if (collectDisguise(this.sim)) {
          this.registry.set('vektenaStage', this.sim.stage);
          this.updateWardrobe(); this.updateHud();
          return this.showStory({ speaker: 'チャトア', lines: [
            'タンスを開けて、変装用の上着を手に取った。これなら街の人に紛れられそうだ。',
            'Rか「変装する」で着替えよう。使い方は図鑑の「持ち物」でも読み返せる。次は北東の交易商の連絡所だ。',
          ] });
        }
        return this.showStory({ speaker: 'タンス', lines: ['変装用の上着は、もう持っている。使い方は図鑑の「持ち物」で確認できる。'] });
      }
      const exit = nearbyRefugeExit(this.sim);
      if (exit) return this.exitRefuge(exit.back);
      this.updateHud();
      return;
    }
    if (Math.hypot(this.sim.player.x - START.x, this.sim.player.y - (DEPARTURE_HALL.y + 24)) < 100) {
      return this.showStory({ speaker: 'アドバの商館', lines: ['アドバと話し、マドスとイリアが仲間になった商館。', '追手が入口を見張っている。二人と協力して、布店へ逃げ込もう。'] });
    }
    const place = nearbyPlace(this.sim);
    if (place) {
      if (!enterPlace(this.sim, place.id)) { this.updateHud(); return; }
      this.registry.set('vektenaStage', this.sim.stage);
      if (this.sim.complete) return this.finishChapter();
      this.renderRefuge(); this.updateHud();
      this.showStory({ speaker: 'バザールの商人', lines: [this.sim.message, place.id === 'cloth'
        ? this.sim.hasDisguise
          ? '上着の使い方は図鑑の「持ち物」で確認できる。奥の木のドアが裏口だよ。机の横を通って北の路地へ出れば、表で待つ相手を避けられる。'
          : '右手のタンスに近づいて、Enterか「調べる」で上着を取っておいで。そのあと、机の横を通って奥の木のドアへ。裏口から北の路地に出られるよ。'
        : '机の上の通行証に近づいて、Enter・スペースか「調べる」で取得しよう。通用門にも追手がいる。囮役が引きつけ、盾役が残った敵を止めれば、通る隙ができる。最後は三人で合流して進むんだよ。'] });
      return;
    }
    const building = this.nearbyBuilding();
    if (building) return this.showStory({ speaker: building.name, lines: building.description });
    const person = [...this.sim.civilians, ...this.sim.agents].filter(a => Math.hypot(a.x - this.sim.player.x, a.y - this.sim.player.y) < 78)
      .sort((a, b) => Math.hypot(a.x - this.sim.player.x, a.y - this.sim.player.y) - Math.hypot(b.x - this.sim.player.x, b.y - this.sim.player.y))[0];
    if (person) {
      const spy = this.sim.agents.includes(person);
      this.showStory({ speaker: spy ? 'スパイ' : '通りの人', lines: [spy ? 'その石を持った子ども……逃がすな！' : 'この街は道が多いからね。店の看板と、広い通りを目印にするといい。'] });
    }
  }
  exitRefuge(back) {
    if (!this.sim.indoor || this.storyBusy) return;
    if (nearbyRefugeExit(this.sim)?.back !== back) return;
    leavePlace(this.sim, back); this.renderStreet(); this.updateHud();
  }
  finishChapter() {
    if (this.transitioning) return;
    this.registry.set('vektenaComplete', true);
    this.transitioning = true;
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VektenaCityScene'));
    this.cameras.main.fadeOut(350, 17, 34, 44);
  }
  updateHud() {
    if (!this.sim || !this.teamPanel) return;
    const state = this.sim, goal = PLACES[Math.min(state.stage, 2)];
    $('.chapter').textContent = 'CHAPTER 13'; $('.hud h1').textContent = 'バザールの街・スパイから逃げろ';
    $('#time-label').textContent = state.indoor ? '商人の店・退避中' : '曇天';
    $('#step-label').textContent = state.complete ? '包囲を突破' : !state.rolesReady ? '役割を選択中' : `三人で行動 · ${state.stage + 1}/3`;
    $('#phaser-stage').setAttribute('aria-label', state.indoor ? '商人の店。裏口から脱出・変装ができる' : '曇天の街。暗いフードのスパイを、仲間と協力して振り切る');
    const list = $('#quest-list'); list.replaceChildren();
    for (const [i, text] of ['西の布店のタンスから上着を取る', '北東の連絡所の机から通行証を取る', '北東の通用門を三人で突破'].entries()) {
      const done = i < state.stage || state.complete, li = document.createElement('li'); li.textContent = `${done ? '✓' : '□'} ${text}`; if (done) li.className = 'done'; list.append(li);
    }
    if (state.complete) $('#hint').textContent = 'CHAPTER 13 完了。マドスとイリアとともに、ユアテアへの道を開きました。';
    else if (state.indoor) $('#hint').textContent = nearPassDocument(state)
      ? state.stage >= 2 ? '通行証は取得済み。北東の通用門へ向かおう。' : 'Enter / スペース / 調べる：机の上の通行証を取る。'
      : nearbyRefugeExit(state)
      ? `Enter / 調べる：${nearbyRefugeExit(state).label}。`
      : nearDisguiseWardrobe(state)
      ? state.hasDisguise ? 'Enter / 調べる：タンスを確認。取得した上着は図鑑の「持ち物」から参照できます。' : 'Enter / 調べる：タンスから変装用の上着を取る。'
      : state.indoor === 'cloth' && !state.hasDisguise ? '右手のタンスに近づき、Enter / 調べるで上着を取ろう。矢印/WASD・方向ボタンで移動。'
        : '奥の木のドアが裏口（北の路地へ）、手前が表口（店の前へ）。机の横を通って出口に近づき、Enter / 調べる。';
    else {
      const place = nearbyPlace(state);
      $('#hint').textContent = place ? place.id === 'gate' ? '通用門を北へ通り抜けると、自動で次のシーンへ進みます。' : `Enter / 調べる：「${place.name}」に入る。`
        : `目的地：${goal.name}。矢印/WASDで移動。仲間は自動行動。R：変装。`;
    }
    const meter = this.teamPanel.querySelector('meter'); meter.value = state.alert;
    this.teamPanel.querySelector('.chase-pressure-label span').textContent = state.alert > 65 ? '逃げ道を探そう' : state.alert > 25 ? '視線を感じる' : '落ち着いている';
    for (const member of state.team) {
      const button = this.teamPanel.querySelector(`[data-command="${member.id}"]`);
      const label = `${member.id === 'mados' ? 'Q' : 'E'} ${MEMBER_NAMES[member.id]}：${ROLE_NAMES[member.role] ?? '役割未決定'}`;
      button.textContent = `${label}${member.active ? `（行動中 ${Math.ceil(member.active)}秒）` : member.returning ? '（合流中）' : member.cooldown > 0 ? `（準備 ${Math.ceil(member.cooldown)}秒）` : ''}`;
      button.disabled = !!(!state.rolesReady || this.storyBusy || state.indoor || state.complete || member.active || member.returning || member.cooldown);
      button.title = member.role ? `任意の追加指示（普段は自動行動）。効果 ${ROLE_STATS[member.id][member.role].duration}秒 ／ 再使用 ${ROLE_STATS[member.id][member.role].cooldown}秒` : '';
      const mobile = this.mobileCommands.querySelector(`[data-mobile-command="${member.id}"]`);
      mobile.disabled = button.disabled;
      mobile.textContent = `${MEMBER_NAMES[member.id]}：${member.role === 'shield' ? '盾' : member.role === 'lure' ? '囮' : '未決定'}${member.active ? '・行動中' : member.returning ? '・合流中' : member.cooldown ? ` ${Math.ceil(member.cooldown)}秒` : ''}`;
    }
    const disguise = this.teamPanel.querySelector('[data-command="disguise"]');
    disguise.textContent = state.disguise ? `変装中：あと${Math.ceil(state.disguise)}秒・走らない` : !state.hasDisguise ? 'R 変装：布店のタンスから上着を取る' : state.disguiseCooldown ? `R 変装：準備 ${Math.ceil(state.disguiseCooldown)}秒` : 'R 変装する（人目を避けて）';
    disguise.disabled = !!(this.storyBusy || !state.hasDisguise || state.disguiseCooldown || state.complete);
    this.mobileCommands.querySelector('[data-mobile-command="disguise"]').disabled = disguise.disabled;
    this.teamPanel.querySelector('[data-command="front"]').hidden = !state.indoor;
    this.teamPanel.querySelector('[data-command="back"]').hidden = !state.indoor;
    for (const exit of REFUGE_EXITS) {
      const button = this.teamPanel.querySelector(`[data-command="${exit.id}"]`);
      button.disabled = this.storyBusy || nearbyRefugeExit(state)?.id !== exit.id;
      button.title = `${exit.back ? '奥の木のドア' : '手前の表口'}に近づくと使えます`;
    }
    const notice = state.messageTime > 0 ? state.message : !state.rolesReady ? '商館のドア前で作戦会議。二人の役割を選ぼう。' : '二人は自動で援護します。盾役は近づく敵をブロック、囮役はチャトアから引き離します。Q・Eは任意の追加指示。';
    if (notice !== this.lastNotice) { this.teamPanel.querySelector('.chase-status').textContent = notice; this.lastNotice = notice; }
    this.drawMap();
  }
  drawMap() {
    const canvas = this.teamPanel.querySelector('canvas'), ctx = canvas.getContext('2d'), scale = canvas.width / MAP.width;
    ctx.fillStyle = '#9b987c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#344349'; for (const b of BUILDINGS) ctx.fillRect(b.x * TILE * scale, b.y * TILE * scale, b.w * TILE * scale, b.h * TILE * scale);
    ctx.fillStyle = '#778c5c'; for (const r of MARKETS) ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    for (const [i, p] of PLACES.entries()) { ctx.fillStyle = i === this.sim.stage ? '#ffe394' : '#d0c8ad'; ctx.beginPath(); ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#59dcff'; ctx.beginPath(); ctx.arc(this.sim.player.x * scale, this.sim.player.y * scale, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}
