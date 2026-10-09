import { drawRouteMarker } from "../ui/markers.js";

const BASE_WIDTH = 832;
const BASE_HEIGHT = 576;
const BOAT_SPEED = 150;
const BOAT_WIDTH = 72;
const BOAT_HEIGHT = 96;
const ARRIVAL_MARGIN = 118;
const START_Y = 82;
const WAVE_SIZE = 58;
const WAVE_HIT_RADIUS = 30;
const BOAT_HIT_RADIUS = 24;
const RESET_INVULNERABLE_MS = 900;
const BEAST_SIZE = 104;
const BEAST_HIT_RADIUS = 42;
const BEAST_CHASE_SPEED = 72;
const BEAST_CHARGE_SPEED = 245;
const BEAST_TRIGGER_DISTANCE = 230;
const BEAST_CHARGE_MS = 680;
const BEAST_DIVE_MS = 950;

const dom = {
  hint: document.querySelector("#hint"),
  chapter: document.querySelector(".chapter"),
  title: document.querySelector(".hud h1"),
  timeLabel: document.querySelector("#time-label"),
  stepLabel: document.querySelector("#step-label"),
  questList: document.querySelector("#quest-list"),
};

export class PetoaIslandScene extends Phaser.Scene {
  constructor() {
    super("PetoaIslandScene");
    this.keys = null;
    this.boat = null;
    this.boatSprite = null;
    this.worldWidth = BASE_WIDTH;
    this.worldHeight = BASE_HEIGHT * 1.5;
    this.arrived = false;
    this.touchDirection = null;
    this.waves = [];
    this.failureCount = 0;
    this.invulnerableUntil = 0;
    this.isResetting = false;
    this.seaBeast = null;
    this.beastRipple = null;
    this.beastState = "chase";
    this.beastStateUntil = 0;
    this.beastChargeDirection = new Phaser.Math.Vector2(0, 1);
  }

  preload() {
    this.load.image("sailboatSmall", "./assets/img/objects/sailboat-small-v1.png");
    this.load.image("seaWaterTile", "./assets/img/tiles/sea/sea-water-tile-v1.png");
    this.load.image("whiteWave", "./assets/img/tiles/sea/white-wave-tile-v1.png");
    this.load.image("petoaForestEdge", "./assets/img/tiles/sea/petoa-forest-edge-v1.png");
    this.load.spritesheet("seaTurtleBeast", "./assets/img/enemies/sea-turtle-beast-static-v1.png", {
      frameWidth: 96,
      frameHeight: 96,
    });
  }

  create() {
    this.worldWidth = Math.max(BASE_WIDTH, this.scale.width);
    this.worldHeight = Math.max(BASE_HEIGHT, this.scale.height) * 1.5;
    this.arrived = false;
    this.touchDirection = null;
    this.waves = [];
    this.failureCount = 0;
    this.invulnerableUntil = 0;
    this.isResetting = false;
    this.seaBeast = null;
    this.beastRipple = null;
    this.beastState = "chase";
    this.beastStateUntil = 0;
    this.beastChargeDirection = new Phaser.Math.Vector2(0, 1);

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBackgroundColor("#1d6f91");

    this.updateHud();
    this.updateMission(false);
    this.drawSea();
    this.drawCoasts();
    this.drawRouteMark();
    this.createWaves();
    this.createBoat();
    this.createSeaBeast();
    this.bindKeys();
    this.bindTouchControls();

    this.cameras.main.startFollow(this.boat, true, 0.12, 0.12);
    dom.hint.textContent = "白波を避け、海獣から逃げながらペトア島の浜を目指そう。";
  }

  update() {
    if (!this.boat || this.arrived) return;

    const deltaSeconds = this.game.loop.delta / 1000;
    this.updateWaves(deltaSeconds);
    if (this.isResetting) return;

    const direction = this.activeDirection();
    const velocity = new Phaser.Math.Vector2(direction.x, direction.y);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(BOAT_SPEED);
    this.updateBoatPose(direction);

    const bottomLimit = this.worldHeight - ARRIVAL_MARGIN;
    this.boat.x = Phaser.Math.Clamp(this.boat.x + velocity.x * deltaSeconds, 54, this.worldWidth - 54);
    this.boat.y = Phaser.Math.Clamp(this.boat.y + velocity.y * deltaSeconds, 58, bottomLimit);

    this.updateSeaBeast(deltaSeconds);
    if (this.checkWaveCollision()) return;
    if (this.checkSeaBeastCollision()) return;
    if (this.boat.y >= bottomLimit - 4) this.arrive();
  }

  updateHud() {
    dom.chapter.textContent = "CHAPTER 2";
    dom.title.textContent = "ペトア島への海路";
    dom.timeLabel.textContent = "朝";
    dom.stepLabel.textContent = `失敗 ${this.failureCount}`;
  }

  updateMission(done) {
    dom.questList.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = `${done ? "✓" : "□"} 海獣と波をさけてペトアを目指す`;
    li.className = done ? "done" : "";
    dom.questList.append(li);
  }

  drawSea() {
    this.add
      .tileSprite(0, 0, this.worldWidth, this.worldHeight, "seaWaterTile")
      .setOrigin(0, 0)
      .setTileScale(1.5, 1.5)
      .setDepth(0);

    const waves = this.add.graphics();
    waves.setDepth(1);
    waves.lineStyle(2, 0xbceaff, 0.16);
    for (let y = 54; y < this.worldHeight; y += 58) {
      for (let x = -40; x < this.worldWidth + 40; x += 92) {
        const offset = (y / 58) % 2 === 0 ? 0 : 36;
        waves.beginPath();
        waves.arc(x + offset, y, 28, 0.12, Math.PI - 0.12);
        waves.strokePath();
      }
    }

    const foam = this.add.graphics();
    foam.setDepth(1);
    foam.lineStyle(1, 0xffffff, 0.09);
    for (let y = 28; y < this.worldHeight; y += 86) {
      foam.lineBetween(0, y, this.worldWidth, y + 18);
    }
  }

  drawCoasts() {
    const g = this.add.graphics();

    g.fillStyle(0xd8c06e, 1);
    g.fillRect(0, -28, this.worldWidth, 54);
    g.fillStyle(0x2b8d4b, 1);
    g.fillRect(0, -42, this.worldWidth, 26);

    const islandY = this.worldHeight - 78;
    g.fillStyle(0xd8c06e, 1);
    g.fillRect(0, islandY, this.worldWidth, 100);
    g.fillStyle(0x2c8a45, 1);
    g.fillRect(0, islandY + 54, this.worldWidth, 70);

    this.add
      .tileSprite(0, islandY + 12, this.worldWidth, 118, "petoaForestEdge")
      .setOrigin(0, 0)
      .setTileScale(0.7, 0.7)
      .setDepth(2);
  }

  drawRouteMark() {
    const markY = this.worldHeight - ARRIVAL_MARGIN + 28;
    drawRouteMarker(this, { x: this.worldWidth / 2, y: markY, depth: 3 });
  }

  createWaves() {
    const topSafeArea = 210;
    const bottomSafeArea = 250;
    const laneCount = 3;
    const laneGap = (this.worldHeight - topSafeArea - bottomSafeArea) / (laneCount - 1);
    const laneConfigs = [
      { speed: 82, direction: 1, offset: 80 },
      { speed: 106, direction: -1, offset: 260 },
      { speed: 92, direction: 1, offset: 160 },
    ];

    laneConfigs.forEach((lane, laneIndex) => {
      const y = topSafeArea + laneGap * laneIndex;
      const spacing = 420;

      for (let x = lane.offset; x < this.worldWidth; x += spacing) {
        const wave = this.add.image(x, y, "whiteWave");
        wave.setDisplaySize(WAVE_SIZE, WAVE_SIZE);
        wave.setDepth(6);
        wave.setAlpha(0.94);
        wave.setData("speed", lane.speed * lane.direction);
        this.waves.push(wave);
      }
    });
  }

  updateWaves(deltaSeconds) {
    this.waves.forEach((wave) => {
      wave.x += wave.getData("speed") * deltaSeconds;
      wave.rotation += wave.getData("speed") * deltaSeconds * 0.004;

      if (wave.x < -WAVE_SIZE) wave.x = this.worldWidth + WAVE_SIZE;
      if (wave.x > this.worldWidth + WAVE_SIZE) wave.x = -WAVE_SIZE;
    });
  }

  checkWaveCollision() {
    if (this.time.now < this.invulnerableUntil) return false;

    const hitDistance = WAVE_HIT_RADIUS + BOAT_HIT_RADIUS;
    const hitDistanceSq = hitDistance * hitDistance;
    const boatHitY = this.boat.y + 12;

    const hitWave = this.waves.find((wave) => {
      const dx = wave.x - this.boat.x;
      const dy = wave.y - boatHitY;
      return dx * dx + dy * dy <= hitDistanceSq;
    });

    if (!hitWave) return false;

    this.resetBoatFromWave(hitWave);
    return true;
  }

  createBoat() {
    this.boat = this.add.container(this.worldWidth / 2, START_Y);
    this.boat.setSize(BOAT_WIDTH, BOAT_HEIGHT);
    this.boatSprite = this.add.image(0, 0, "sailboatSmall");
    this.boatSprite.setDisplaySize(BOAT_WIDTH, BOAT_HEIGHT);
    this.boat.add(this.boatSprite);
    this.boat.setDepth(10);
  }

  createSeaBeast() {
    const startX = this.worldWidth * 0.28;
    const startY = this.worldHeight * 0.52;
    this.beastRipple = this.add.graphics();
    this.beastRipple.setDepth(7);
    this.seaBeast = this.add.sprite(startX, startY, "seaTurtleBeast", 0);
    this.seaBeast.setDisplaySize(BEAST_SIZE, BEAST_SIZE);
    this.seaBeast.setDepth(8);
    this.seaBeast.setAlpha(0.92);
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
  }

  activeDirection() {
    const direction = { x: 0, y: 0 };
    if (this.keys.left.isDown || this.keys.a.isDown || this.touchDirection === "left") direction.x -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown || this.touchDirection === "right") direction.x += 1;
    if (this.keys.up.isDown || this.keys.w.isDown || this.touchDirection === "up") direction.y -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown || this.touchDirection === "down") direction.y += 1;
    return direction;
  }

  updateBoatPose(direction) {
    this.boat.rotation = Phaser.Math.Linear(this.boat.rotation, Phaser.Math.DegToRad(direction.x * 8), 0.12);
    this.boatSprite.y = Math.sin(this.time.now / 260) * 2;
  }

  updateSeaBeast(deltaSeconds) {
    if (!this.seaBeast) return;

    this.drawBeastRipple();

    if (this.beastState === "dive") {
      if (this.time.now >= this.beastStateUntil) this.emergeSeaBeast();
      return;
    }

    if (this.beastState === "charge") {
      this.seaBeast.x += this.beastChargeDirection.x * BEAST_CHARGE_SPEED * deltaSeconds;
      this.seaBeast.y += this.beastChargeDirection.y * BEAST_CHARGE_SPEED * deltaSeconds;
      this.keepSeaBeastInSea();

      if (this.time.now >= this.beastStateUntil) this.diveSeaBeast();
      return;
    }

    const toBoat = new Phaser.Math.Vector2(this.boat.x - this.seaBeast.x, this.boat.y - this.seaBeast.y);
    const distance = toBoat.length();
    if (distance > 0) {
      toBoat.normalize();
      this.seaBeast.x += toBoat.x * BEAST_CHASE_SPEED * deltaSeconds;
      this.seaBeast.y += toBoat.y * BEAST_CHASE_SPEED * deltaSeconds;
      this.setBeastDirection(toBoat.x, toBoat.y);
      this.keepSeaBeastInSea();
    }

    if (distance < BEAST_TRIGGER_DISTANCE && this.time.now >= this.beastStateUntil) {
      this.startSeaBeastCharge(toBoat);
    }
  }

  startSeaBeastCharge(direction) {
    this.beastState = "charge";
    this.beastStateUntil = this.time.now + BEAST_CHARGE_MS;
    this.beastChargeDirection = direction.clone();
    this.seaBeast.setTint(0xd8ffff);
    this.tweens.add({
      targets: this.seaBeast,
      alpha: 1,
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
    dom.hint.textContent = "海獣が突っ込んでくる。進路を外そう。";
  }

  diveSeaBeast() {
    this.beastState = "dive";
    this.beastStateUntil = this.time.now + BEAST_DIVE_MS;
    this.seaBeast.clearTint();
    this.seaBeast.setAlpha(0.18);
    this.seaBeast.setVisible(false);
    this.beastRipple.clear();
  }

  emergeSeaBeast() {
    const side = this.boat.x > this.worldWidth / 2 ? -1 : 1;
    this.seaBeast.x = Phaser.Math.Clamp(this.boat.x + side * Phaser.Math.Between(170, 240), 72, this.worldWidth - 72);
    this.seaBeast.y = Phaser.Math.Clamp(this.boat.y + Phaser.Math.Between(-130, 120), 190, this.worldHeight - 220);
    this.seaBeast.setVisible(true);
    this.seaBeast.setAlpha(0.92);
    this.beastState = "chase";
    this.beastStateUntil = this.time.now + 900;
    dom.hint.textContent = "海獣がまた浮かんできた。距離をとろう。";
  }

  keepSeaBeastInSea() {
    this.seaBeast.x = Phaser.Math.Clamp(this.seaBeast.x, 56, this.worldWidth - 56);
    this.seaBeast.y = Phaser.Math.Clamp(this.seaBeast.y, 150, this.worldHeight - 170);
  }

  setBeastDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.seaBeast.setFrame(dx > 0 ? 2 : 1);
    } else {
      this.seaBeast.setFrame(dy > 0 ? 0 : 3);
    }
  }

  drawBeastRipple() {
    if (!this.beastRipple || !this.seaBeast || !this.seaBeast.visible) return;

    this.beastRipple.clear();
    this.beastRipple.lineStyle(2, 0xc9f7ff, this.beastState === "charge" ? 0.45 : 0.26);
    this.beastRipple.strokeEllipse(this.seaBeast.x, this.seaBeast.y + 12, BEAST_SIZE * 0.9, BEAST_SIZE * 0.42);
    this.beastRipple.lineStyle(1, 0xffffff, 0.18);
    this.beastRipple.strokeEllipse(this.seaBeast.x, this.seaBeast.y + 14, BEAST_SIZE * 1.14, BEAST_SIZE * 0.55);
  }

  checkSeaBeastCollision() {
    if (!this.seaBeast || !this.seaBeast.visible || this.time.now < this.invulnerableUntil) return false;

    const hitDistance = BEAST_HIT_RADIUS + BOAT_HIT_RADIUS;
    const dx = this.seaBeast.x - this.boat.x;
    const dy = this.seaBeast.y - (this.boat.y + 12);
    if (dx * dx + dy * dy > hitDistance * hitDistance) return false;

    this.resetBoatFromSeaBeast();
    return true;
  }

  resetBoatFromWave(hitWave) {
    this.failureCount += 1;
    this.invulnerableUntil = this.time.now + RESET_INVULNERABLE_MS;
    this.isResetting = true;
    this.touchDirection = null;
    this.updateHud();
    dom.hint.textContent = "白波に流された。もう一度、浜を目指そう。";

    this.tweens.killTweensOf(this.boat);
    this.tweens.add({
      targets: this.boat,
      x: this.worldWidth / 2,
      y: START_Y,
      rotation: Phaser.Math.DegToRad(hitWave.getData("speed") > 0 ? 16 : -16),
      alpha: 0.45,
      duration: 420,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.boat.setAlpha(1);
        this.boat.setRotation(0);
        this.isResetting = false;
      },
    });
  }

  resetBoatFromSeaBeast() {
    this.failureCount += 1;
    this.invulnerableUntil = this.time.now + RESET_INVULNERABLE_MS;
    this.isResetting = true;
    this.touchDirection = null;
    this.updateHud();
    dom.hint.textContent = "海獣に押し流された。落ち着いてもう一度進もう。";
    this.diveSeaBeast();

    this.tweens.killTweensOf(this.boat);
    this.tweens.add({
      targets: this.boat,
      x: this.worldWidth / 2,
      y: START_Y,
      rotation: Phaser.Math.DegToRad(22),
      alpha: 0.42,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.boat.setAlpha(1);
        this.boat.setRotation(0);
        this.isResetting = false;
      },
    });
  }

  arrive() {
    this.arrived = true;
    dom.hint.textContent = `ペトア島に着いた。失敗 ${this.failureCount} 回で渡りきった。`;
    this.updateHud();
    this.updateMission(true);
    this.add
      .text(this.boat.x, this.boat.y - 92, `ペトア島の浜が近づいてきた。\n失敗 ${this.failureCount}`, {
        color: "#f6efd6",
        fontFamily: "sans-serif",
        fontSize: "20px",
        align: "center",
        stroke: "#12323a",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.time.delayedCall(1600, () => {
      this.scene.start("PetoaBeachScene");
    });
  }
}
