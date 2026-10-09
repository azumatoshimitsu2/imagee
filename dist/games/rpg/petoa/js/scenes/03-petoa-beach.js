import { BEACH_SHELLS } from '../data/beach-items.js';
import { drawRouteMarker } from "../ui/markers.js";

const BASE_WIDTH = 832;
const BASE_HEIGHT = 576;
const WORLD_HEIGHT = 960;
const PLAYER_SPEED = 150;
const PLAYER_SIZE = 72;
const PLAYER_HIT_RADIUS = 22;
const SHELL_HIT_RADIUS = 28;
const SIGN_READ_RADIUS = 42;
const SIGN_BLOCK = { halfW: 36, topOffset: -52, bottomOffset: 46 };
const FOREST_GATE = { x: 296, y: 76, w: 240, h: 76 };

const dom = {
  hint: document.querySelector("#hint"),
  chapter: document.querySelector(".chapter"),
  title: document.querySelector(".hud h1"),
  timeLabel: document.querySelector("#time-label"),
  stepLabel: document.querySelector("#step-label"),
  questList: document.querySelector("#quest-list"),
};

const directions = {
  down: { frame: 0, dx: 0, dy: 1 },
  left: { frame: 2, dx: -1, dy: 0 },
  right: { frame: 1, dx: 1, dy: 0 },
  up: { frame: 3, dx: 0, dy: -1 },
};

export class PetoaBeachScene extends Phaser.Scene {
  constructor() {
    super("PetoaBeachScene");
    this.keys = null;
    this.player = null;
    this.touchDirection = null;
    this.shells = [];
    this.savedShellIndices=new Set();
    this.shellCount = 0;
    this.drawnShellCount = 0;
    this.sign = null;
    this.prompt = null;
    this.promptButtons = [];
    this.selectedPromptIndex = 0;
    this.busy = false;
  }

  preload() {
    this.load.image("seaWaterTile", "./assets/img/tiles/sea/sea-water-tile-v1.png");
    this.load.image("petoaSandTile", "./assets/img/tiles/beach/petoa-sand-tile-v1.png");
    this.load.image("petoaForestEdge", "./assets/img/tiles/sea/petoa-forest-edge-v1.png");
    this.load.image("sailboatSmall", "./assets/img/objects/sailboat-small-v1.png");
    this.load.image("beachShell", "./assets/img/items/beach-shell-v1.png");
    this.load.image("driftwood", "./assets/img/props/driftwood-v1.png");
    this.load.image("tidepool", "./assets/img/props/tidepool-v1.png");
    this.load.image("footprints", "./assets/img/props/footprints-v1.png");
    this.load.image("forbiddenSign", "./assets/img/props/forbidden-sign-v1.png");
    this.load.image("rockyShore", "./assets/img/props/rocky-shore-v1.png");
    this.load.spritesheet("chatoaBeach", "./assets/img/characters/chatoa-fisher-static-v2.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    this.shells = [];
    this.savedShellIndices=new Set();
    this.shellCount = 0;
    this.drawnShellCount = 0;
    this.sign = null;
    this.touchDirection = null;
    this.busy = false;
    this.prompt?.destroy();
    this.prompt = null;
    this.promptButtons = [];
    this.selectedPromptIndex = 0;

    this.cameras.main.setBounds(0, 0, BASE_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#d8c06e");

    this.drawBeach();
    this.createBeachProps();
    this.createShells();
    this.createPlayer();
    this.bindKeys();
    this.bindTouchControls();
    this.updateHud();
    this.updateMission(false);

    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    dom.hint.textContent = "砂浜を進み、森の入口を探そう。貝殻はSpace/Enterで拾える。";
  }

  update() {
    if (!this.player || this.busy) return;

    const direction = this.activeDirection();
    const velocity = new Phaser.Math.Vector2(direction.x, direction.y);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(PLAYER_SPEED);

    const delta = this.game.loop.delta / 1000;
    const nextX = Phaser.Math.Clamp(this.player.x + velocity.x * delta, 44, BASE_WIDTH - 44);
    const nextY = Phaser.Math.Clamp(this.player.y + velocity.y * delta, FOREST_GATE.y + 42, WORLD_HEIGHT - 52);

    if (this.canPlayerMoveTo(nextX, this.player.y)) this.player.x = nextX;
    if (this.canPlayerMoveTo(this.player.x, nextY)) this.player.y = nextY;
    this.updatePlayerFacing(direction);
    this.updateContextHint();
  }

  drawBeach() {
    const seaHeight = 156;
    this.add
      .tileSprite(0, WORLD_HEIGHT - seaHeight, BASE_WIDTH, seaHeight, "seaWaterTile")
      .setOrigin(0, 0)
      .setTileScale(1.5, 1.5)
      .setDepth(0);

    this.add
      .tileSprite(0, 0, BASE_WIDTH, WORLD_HEIGHT - seaHeight + 22, "petoaSandTile")
      .setOrigin(0, 0)
      .setTileScale(1.5, 1.5)
      .setDepth(1);

    const forestBack = this.add.graphics();
    forestBack.setDepth(2);
    forestBack.fillStyle(0x0b2f24, 1).fillRect(0, 0, BASE_WIDTH, 172);
    forestBack.fillStyle(0x163f2c, 1).fillRect(0, 132, BASE_WIDTH, 48);

    const rearForest = this.add
      .tileSprite(-48, -12, BASE_WIDTH + 96, 168, "petoaForestEdge")
      .setOrigin(0, 0)
      .setTileScale(0.72, 0.72)
      .setDepth(3);
    rearForest.tilePositionX = 248;
    rearForest.setTint(0x8fbf72);
    rearForest.setAlpha(0.88);

    this.add
      .tileSprite(-32, -4, BASE_WIDTH + 64, 166, "petoaForestEdge")
      .setOrigin(0, 0)
      .setTileScale(0.72, 0.72)
      .setDepth(4);

    const forestOpening = this.add.graphics();
    forestOpening.setDepth(5);
    forestOpening.fillStyle(0x0a241c, 0.72).fillEllipse(BASE_WIDTH / 2, FOREST_GATE.y + FOREST_GATE.h - 2, 96, 34);
    forestOpening.fillStyle(0x123a29, 0.86).fillEllipse(BASE_WIDTH / 2, FOREST_GATE.y + FOREST_GATE.h + 8, 70, 18);
    this.drawEntranceMark(BASE_WIDTH / 2, FOREST_GATE.y + FOREST_GATE.h + 16, 6);

    const boat = this.add.image(BASE_WIDTH / 2, WORLD_HEIGHT - 94, "sailboatSmall");
    boat.setDisplaySize(80, 80);
    boat.setRotation(Phaser.Math.DegToRad(180));
    boat.setDepth(8);
    boat.setAlpha(0.96);
  }

  drawEntranceMark(x, y, depth) {
    return drawRouteMarker(this, { x, y, depth });
  }

  createBeachProps() {
    [
      { x: 420, y: 742, w: 48, h: 84, angle: -8, alpha: 0.66 },
      { x: 410, y: 610, w: 42, h: 76, angle: 5, alpha: 0.52 },
      { x: 388, y: 486, w: 34, h: 64, angle: 13, alpha: 0.36 },
    ].forEach((entry) => {
      const footprints = this.add.image(entry.x, entry.y, "footprints");
      footprints.setDisplaySize(entry.w, entry.h);
      footprints.setAngle(entry.angle);
      footprints.setAlpha(entry.alpha);
      footprints.setDepth(3);
    });

    [
      { x: 92, y: 746, w: 168, h: 122, angle: 4, depth: 8 },
      { x: 166, y: 670, w: 146, h: 106, angle: -8, depth: 7 },
      { x: 78, y: 636, w: 104, h: 76, angle: 11, depth: 7 },
      { x: 226, y: 606, w: 82, h: 60, angle: -17, depth: 6 },
    ].forEach((entry) => {
      const rocks = this.add.image(entry.x, entry.y, "rockyShore");
      rocks.setDisplaySize(entry.w, entry.h);
      rocks.setAngle(entry.angle);
      rocks.setDepth(entry.depth);
    });

    const tidepool = this.add.image(168, 648, "tidepool");
    tidepool.setDisplaySize(122, 92);
    tidepool.setAngle(-6);
    tidepool.setDepth(9);

    const driftwood = this.add.image(654, 688, "driftwood");
    driftwood.setDisplaySize(122, 76);
    driftwood.setAngle(-12);
    driftwood.setDepth(9);

    const sign = this.add.image(354, 174, "forbiddenSign");
    sign.setDisplaySize(102, 116);
    sign.setDepth(12);
    this.add
      .text(sign.x, sign.y - 9, "入るな", {
        color: "#3b2214",
        fontFamily: "serif",
        fontSize: "12px",
        fontStyle: "bold",
        stroke: "#efd38b",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.sign = sign;

    [
      { x: 696, y: 292, w: 138, h: 100, angle: -8, depth: 7 },
      { x: 648, y: 358, w: 78, h: 56, angle: 15, depth: 6 },
      { x: 704, y: 218, w: 72, h: 52, angle: -18, depth: 6 },
      { x: 578, y: 694, w: 68, h: 50, angle: 19, depth: 6 },
    ].forEach((entry) => {
      const rocks = this.add.image(entry.x, entry.y, "rockyShore");
      rocks.setDisplaySize(entry.w, entry.h);
      rocks.setAngle(entry.angle);
      rocks.setDepth(entry.depth);
    });
  }

  createShells() {
    BEACH_SHELLS.forEach((entry) => this.createShell(entry));
  }

  createShell(entry) {
    const shell = this.add.image(entry.x, entry.y, "beachShell");
    shell.setDisplaySize(34, 34);
    shell.setAngle(entry.angle);
    shell.setDepth(9);
    shell.setData("collected", false);
    this.shells.push(shell);
    return shell;
  }

  createPlayer() {
    this.player = this.add.sprite(BASE_WIDTH / 2, WORLD_HEIGHT - 176, "chatoaBeach", directions.up.frame);
    this.player.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.player.setOrigin(0.5, 0.78);
    this.player.setDepth(20);
  }

  bindKeys() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.input.keyboard.on("keydown", (event) => {
      if (this.handlePromptKey(event)) return;
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        this.interact();
      }
    });
  }

  bindTouchControls() {
    document.querySelectorAll("[data-dir]").forEach((button) => {
      button.onpointerdown = () => {
        this.touchDirection = button.dataset.dir;
      };
      button.onpointerup = () => {
        if (this.touchDirection === button.dataset.dir) this.touchDirection = null;
      };
      button.onpointerleave = () => {
        if (this.touchDirection === button.dataset.dir) this.touchDirection = null;
      };
    });

    const action = document.querySelector("#touch-action");
    if (action) action.onclick = () => this.interact();

    const drawItem = document.querySelector("#draw-item");
    if (drawItem) drawItem.onclick = () => this.drawItemNearPlayer();
  }

  activeDirection() {
    const direction = { x: 0, y: 0 };
    if (this.keys.left.isDown || this.keys.a.isDown || this.touchDirection === "left") direction.x -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown || this.touchDirection === "right") direction.x += 1;
    if (this.keys.up.isDown || this.keys.w.isDown || this.touchDirection === "up") direction.y -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown || this.touchDirection === "down") direction.y += 1;
    return direction;
  }

  updatePlayerFacing(direction) {
    if (direction.x === 0 && direction.y === 0) return;
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      this.player.setFrame(direction.x > 0 ? directions.right.frame : directions.left.frame);
    } else {
      this.player.setFrame(direction.y > 0 ? directions.down.frame : directions.up.frame);
    }
    this.player.setDepth(Math.floor(this.player.y));
  }

  updateContextHint() {
    if (this.nearestShell()) {
      dom.hint.textContent = "足もとに貝殻がある。Space/Enterで拾う。";
      return;
    }
    if (this.nearSign()) {
      dom.hint.textContent = "立て札がある。Space/Enterで読む。";
      return;
    }
    if (this.isAtForestGate()) {
      dom.hint.textContent = "森の入口だ。禁じられた場所へ入るか、Space/Enterで選ぶ。";
      return;
    }
    dom.hint.textContent = "砂浜を進み、森の入口を探そう。";
  }

  interact() {
    if (this.busy) return;

    const shell = this.nearestShell();
    if (shell) {
      this.collectShell(shell);
      return;
    }
    if (this.nearSign()) {
      this.openSignPrompt();
      return;
    }
    if (this.isAtForestGate()) this.openForestPrompt();
  }

  handlePromptKey(event) {
    if (!this.busy || this.promptButtons.length === 0) return false;

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      this.selectPromptButton(this.selectedPromptIndex - 1);
      return true;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      this.selectPromptButton(this.selectedPromptIndex + 1);
      return true;
    }
    if (event.code === "Escape") {
      event.preventDefault();
      const cancel = this.promptButtons.find((button) => button.role === "cancel") ?? this.promptButtons[this.promptButtons.length - 1];
      cancel.onClick();
      return true;
    }
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      this.promptButtons[this.selectedPromptIndex]?.onClick();
      return true;
    }

    return false;
  }

  nearestShell() {
    const hitDistanceSq = (SHELL_HIT_RADIUS + PLAYER_HIT_RADIUS) ** 2;
    return this.shells.find((shell) => {
      if (shell.getData("collected")) return false;
      const dx = shell.x - this.player.x;
      const dy = shell.y - (this.player.y - 12);
      return dx * dx + dy * dy < hitDistanceSq;
    });
  }

  nearSign() {
    if (!this.sign) return false;
    const hitDistanceSq = (SIGN_READ_RADIUS + PLAYER_HIT_RADIUS) ** 2;
    const dx = this.sign.x - this.player.x;
    const dy = this.sign.y - (this.player.y - 18);
    return dx * dx + dy * dy < hitDistanceSq;
  }

  canPlayerMoveTo(x, y) {
    return !this.isBlockedBySign(x, y);
  }

  isBlockedBySign(x, y) {
    if (!this.sign) return false;

    const playerBodyY = y - 18;
    const left = this.sign.x - SIGN_BLOCK.halfW;
    const right = this.sign.x + SIGN_BLOCK.halfW;
    const top = this.sign.y + SIGN_BLOCK.topOffset;
    const bottom = this.sign.y + SIGN_BLOCK.bottomOffset;
    const closestX = Phaser.Math.Clamp(x, left, right);
    const closestY = Phaser.Math.Clamp(playerBodyY, top, bottom);
    const dx = x - closestX;
    const dy = playerBodyY - closestY;

    return dx * dx + dy * dy < PLAYER_HIT_RADIUS ** 2;
  }

  collectShell(shell) {
    if (shell.getData("collected")) return;
    shell.setData("collected", true);
    this.savedShellIndices.add(this.shells.indexOf(shell));
    this.registry.set("beachShells", (this.registry.get("beachShells") ?? 0) + 1);
    this.shellCount += 1;
    this.updateHud();
    dom.hint.textContent = "白い貝殻を拾った。潮の匂いがする。";
    this.tweens.add({
      targets: shell,
      y: shell.y - 18,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 260,
      ease: "Sine.easeInOut",
      onComplete: () => shell.destroy(),
    });
  }

  drawItemNearPlayer() {
    if (!this.player || this.busy) return;

    const offsets = [
      { x: -46, y: 18, angle: -18 },
      { x: 42, y: 24, angle: 24 },
      { x: -28, y: -34, angle: 8 },
      { x: 36, y: -30, angle: -28 },
      { x: 0, y: 48, angle: 16 },
    ];
    const offset = offsets[this.drawnShellCount % offsets.length];
    const shell = this.createShell({
      x: Phaser.Math.Clamp(this.player.x + offset.x, 44, BASE_WIDTH - 44),
      y: Phaser.Math.Clamp(this.player.y + offset.y, FOREST_GATE.y + 54, WORLD_HEIGHT - 62),
      angle: offset.angle + this.drawnShellCount * 7,
    });
    shell.setAlpha(0);
    shell.setScale(0.76);

    this.drawnShellCount += 1;
    dom.hint.textContent = "砂の上に貝殻を描いた。近づくと拾える。";
    this.tweens.add({
      targets: shell,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: "Sine.easeOut",
    });
  }

  isAtForestGate() {
    return this.player.x >= FOREST_GATE.x && this.player.x <= FOREST_GATE.x + FOREST_GATE.w && this.player.y <= FOREST_GATE.y + FOREST_GATE.h + 42;
  }

  openSignPrompt() {
    this.busy = true;
    this.touchDirection = null;
    dom.hint.textContent = "古びた立て札を読んでいる。";

    const container = this.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2).setDepth(100);
    const panel = this.add.graphics();
    panel.fillStyle(0x14282b, 0.96).fillRoundedRect(-184, -78, 368, 156, 8);
    panel.lineStyle(2, 0xd6bd75, 1).strokeRoundedRect(-184, -78, 368, 156, 8);
    const title = this.add
      .text(0, -42, "立て札", { color: "#f2d47a", fontFamily: "sans-serif", fontSize: "18px", fontStyle: "bold" })
      .setOrigin(0.5);
    const message = this.add
      .text(0, -6, "この先、禁じられた森。\n島の子は近づくべからず。", {
        color: "#f6efd6",
        fontFamily: "sans-serif",
        fontSize: "15px",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    const closeButton = this.createPromptButton(0, 48, "閉じる", () => this.closeSignPrompt(), { role: "cancel" });
    container.add([panel, title, message, closeButton]);
    container.setScrollFactor(0);
    this.prompt = container;
    this.setPromptButtons([closeButton]);
  }

  openForestPrompt() {
    this.busy = true;
    this.touchDirection = null;
    dom.hint.textContent = "森に入るか決めよう。";

    const container = this.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2).setDepth(100);
    const panel = this.add.graphics();
    panel.fillStyle(0x14282b, 0.96).fillRoundedRect(-188, -86, 376, 172, 8);
    panel.lineStyle(2, 0xd6bd75, 1).strokeRoundedRect(-188, -86, 376, 172, 8);
    const title = this.add
      .text(0, -48, "森の入口", { color: "#86d7f0", fontFamily: "sans-serif", fontSize: "18px", fontStyle: "bold" })
      .setOrigin(0.5);
    const message = this.add
      .text(0, -12, "この先は入ることを禁じられている。\nそれでも森へ入りますか？", {
        color: "#f6efd6",
        fontFamily: "sans-serif",
        fontSize: "15px",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    const enterButton = this.createPromptButton(-76, 52, "入る", () => this.enterForest(), { role: "confirm" });
    const cancelButton = this.createPromptButton(76, 52, "やめる", () => this.closeForestPrompt(), { role: "cancel" });
    container.add([panel, title, message, enterButton, cancelButton]);
    container.setScrollFactor(0);
    this.prompt = container;
    this.setPromptButtons([enterButton, cancelButton], 1);
  }

  createPromptButton(x, y, label, onClick, options = {}) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x203d3d, 1).fillRoundedRect(-52, -18, 104, 36, 6);
    bg.lineStyle(2, 0xd6bd75, 1).strokeRoundedRect(-52, -18, 104, 36, 6);
    const text = this.add.text(0, 0, label, { color: "#fff8df", fontFamily: "sans-serif", fontSize: "15px", fontStyle: "bold" }).setOrigin(0.5);
    container.add([bg, text]);
    container.bg = bg;
    container.label = text;
    container.role = options.role ?? "button";
    container.onClick = onClick;
    container.setSize(104, 36);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    return container;
  }

  setPromptButtons(buttons, selectedIndex = 0) {
    this.promptButtons = buttons;
    this.selectedPromptIndex = Phaser.Math.Wrap(selectedIndex, 0, buttons.length);
    this.updatePromptButtonFocus();
  }

  selectPromptButton(index) {
    this.selectedPromptIndex = Phaser.Math.Wrap(index, 0, this.promptButtons.length);
    this.updatePromptButtonFocus();
  }

  updatePromptButtonFocus() {
    this.promptButtons.forEach((button, index) => {
      button.bg.clear();
      button.bg.fillStyle(index === this.selectedPromptIndex ? 0x2f5b5b : 0x203d3d, 1).fillRoundedRect(-52, -18, 104, 36, 6);
      button.bg.lineStyle(index === this.selectedPromptIndex ? 3 : 2, index === this.selectedPromptIndex ? 0xffe38a : 0xd6bd75, 1).strokeRoundedRect(-52, -18, 104, 36, 6);
      button.label.setColor(index === this.selectedPromptIndex ? "#fff2a8" : "#fff8df");
    });
  }

  closeForestPrompt() {
    this.prompt?.destroy();
    this.prompt = null;
    this.promptButtons = [];
    this.busy = false;
    dom.hint.textContent = "チャトアは森の入口から少し離れた。";
  }

  closeSignPrompt() {
    this.prompt?.destroy();
    this.prompt = null;
    this.promptButtons = [];
    this.busy = false;
    dom.hint.textContent = "立て札には、森へ近づくなと書かれている。";
  }

  enterForest() {
    this.updateMission(true);
    dom.hint.textContent = "チャトアは禁じられた森へ入った。";
    this.scene.start("PetoaForestScene");
  }

  updateHud() {
    dom.chapter.textContent = "CHAPTER 2";
    dom.title.textContent = "ペトア島の砂浜";
    dom.timeLabel.textContent = "昼前";
    dom.stepLabel.textContent = `アイテム 貝殻 ${this.shellCount}`;
  }

  updateMission(done) {
    dom.questList.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = `${done ? "✓" : "□"} 森の入口へ向かう`;
    li.className = done ? "done" : "";
    dom.questList.append(li);
  }
}
