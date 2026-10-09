import { drawRouteMarker } from "../ui/markers.js";

const BASE_WIDTH = 832;
const WORLD_WIDTH = BASE_WIDTH * 2;
const WORLD_HEIGHT = 1184;
const PLAYER_SPEED = 138;
const PLAYER_SIZE = 72;
const PLAYER_HIT_RADIUS = 20;
const PLAYER_OBSTACLE_RADIUS = 12;
const CAVE_AREA = { x: 1158, y: 48, w: 180, h: 96 };
const CAVE_TILE = { width: 192, height: 128, yOffset: 18 };
const DEBUG_COLLISION = new URLSearchParams(window.location.search).get("debug") === "collision";
const DEEP_FOREST_Y = 120;
const DEEP_FOREST_MARKER = { x: WORLD_WIDTH / 2, y: 82 };

const TREE_TYPES = {
  short: { key: "jungleTreeShort", w: 118, h: 118, yOffset: 34, hitW: 34, hitH: 22 },
  broad: { key: "jungleTreeBroad", w: 158, h: 162, yOffset: 40, hitW: 42, hitH: 26 },
  palm: { key: "jungleTreeTall", w: 118, h: 182, yOffset: 44, hitW: 30, hitH: 24 },
};

const ROCK_TYPES = {
  small: { key: "jungleRockSmall", w: 74, h: 58, hitW: 54, hitH: 34 },
  flat: { key: "jungleRockFlat", w: 112, h: 76, hitW: 88, hitH: 42 },
  large: { key: "jungleRockLarge", w: 118, h: 96, hitW: 92, hitH: 62 },
};

const GRASS_TYPES = {
  wide: { key: "jungleGrassWide", w: 137, h: 92 },
  round: { key: "jungleGrassRound", w: 132, h: 89 },
  long: { key: "jungleGrassLong", w: 184, h: 66 },
};

const BEAST_TYPES = {
  runner: {
    name: "走り獣",
    assetKey: "beastRunner",
    behavior: "runner",
    tint: 0xfff0a6,
    size: 76,
    hitRadius: 24,
    sightRange: 126,
    sightWidth: 44,
    speedScale: 1.42,
    burstScale: 1.85,
    burstInterval: 1.8,
    burstDuration: 0.55,
    coneColor: 0xe0a04f,
  },
  watcher: {
    name: "見張り獣",
    assetKey: "beastWatcher",
    behavior: "watcher",
    tint: 0xc8e8ff,
    size: 92,
    hitRadius: 32,
    sightRange: 218,
    sightWidth: 48,
    speedScale: 0.74,
    waitAtWaypoint: 2.4,
    scanSpeed: 1.35,
    coneColor: 0x78b9df,
  },
  sniffer: {
    name: "嗅ぎ獣",
    assetKey: "beastSniffer",
    behavior: "sniffer",
    tint: 0xd4ffa6,
    size: 84,
    hitRadius: 30,
    sightRange: 150,
    sightWidth: 82,
    speedScale: 0.92,
    smellRange: 210,
    investigateScale: 1.18,
    sniffPause: 0.55,
    scanSpeed: 2.8,
    hiddenSenseRadius: 54,
    coneColor: 0xa8c66e,
  },
  plant: {
    name: "食人植物",
    assetKey: "beastCarnivorousPlant",
    behavior: "stationary",
    tint: 0xffffff,
    size: 96,
    hitRadius: 38,
    sightRange: 0,
    sightWidth: 0,
    speedScale: 0,
    coneColor: 0xff3d2e,
  },
};

const dom = {
  dialog: document.querySelector("#dialog"),
  speaker: document.querySelector("#speaker"),
  message: document.querySelector("#message"),
  nextButton: document.querySelector("#next-button"),
  hint: document.querySelector("#hint"),
  chapter: document.querySelector(".chapter"),
  title: document.querySelector(".hud h1"),
  timeLabel: document.querySelector("#time-label"),
  stepLabel: document.querySelector("#step-label"),
  questList: document.querySelector("#quest-list"),
};

const directions = {
  down: { frame: 0 },
  left: { frame: 2 },
  right: { frame: 1 },
  up: { frame: 3 },
};

const FOREST_SCENES = {
  dusk: {
    key: "PetoaForestScene",
    chapter: "CHAPTER 2",
    title: "ペトア島の森",
    time: "夕方",
    hasCave: false,
    startHint: "日が傾いてきた。獣を避けながら、森の奥へ進もう。",
    mission: "森の奥へ進む",
    intro: {
      speaker: "チャトア",
      lines: [
        "思ったより、森の中は深い。",
        "戻る道は、木の影に飲まれて見えなくなっていた。",
        "夕方の光が、枝のすきまから細く差している。",
      ],
    },
  },
  night: {
    key: "PetoaForestNightScene",
    chapter: "CHAPTER 2",
    title: "ペトア島の森",
    time: "夜",
    hasCave: true,
    startHint: "夜になった。獣を避け、光の漏れる洞窟へ避難しよう。",
    mission: "洞窟に避難する",
    intro: {
      speaker: "チャトア",
      lines: [
        "……同じ場所を、何度も歩いている気がする。",
        "もう夜だ。浜へ戻る道も分からない。",
        "どこか、朝まで身を隠せる場所を探さないと。",
      ],
    },
  },
};

export class BaseForestScene extends Phaser.Scene {
  constructor(config) {
    super(config.key);
    this.forestConfig = config;
    this.keys = null;
    this.player = null;
    this.touchDirection = null;
    this.obstacles = [];
    this.hideSpots = [];
    this.beasts = [];
    this.caughtCount = 0;
    this.hidden = false;
    this.completed = false;
    this.storyBusy = false;
    this.advanceStory = null;
    this.duskOverlay = null;
    this.nightOverlay = null;
  }

  preload() {
    this.load.image("jungleGroundTile", "./assets/img/tiles/forest/jungle-ground-tile-v1.png");
    this.load.image("jungleTreeShort", "./assets/img/tiles/forest/trees/jungle-tree-short-v1.png");
    this.load.image("jungleTreeBroad", "./assets/img/tiles/forest/trees/jungle-tree-broad-v1.png");
    this.load.image("jungleTreeTall", "./assets/img/tiles/forest/trees/jungle-tree-tall-v1.png");
    this.load.image("jungleRockSmall", "./assets/img/tiles/forest/rocks/jungle-rock-small-v1.png");
    this.load.image("jungleRockFlat", "./assets/img/tiles/forest/rocks/jungle-rock-flat-v1.png");
    this.load.image("jungleRockLarge", "./assets/img/tiles/forest/rocks/jungle-rock-large-v1.png");
    this.load.image("jungleGrassWide", "./assets/img/tiles/forest/bushes/jungle-grass-wide-v1.png");
    this.load.image("jungleGrassRound", "./assets/img/tiles/forest/bushes/jungle-grass-round-v1.png");
    this.load.image("jungleGrassLong", "./assets/img/tiles/forest/bushes/jungle-grass-long-v1.png");
    this.load.image("rockyCaveEntranceTile", "./assets/img/tiles/forest/rocky-cave-entrance-tile-v1.png");
    this.load.image("petoaSandTile", "./assets/img/tiles/beach/petoa-sand-tile-v1.png");
    this.load.image("beastRunner", "./assets/img/enemies/jungle-beast-runner-v1.png");
    this.load.image("beastWatcher", "./assets/img/enemies/jungle-beast-watcher-v1.png");
    this.load.image("beastSniffer", "./assets/img/enemies/jungle-beast-sniffer-v1.png");
    this.load.image("beastCarnivorousPlant", "./assets/img/enemies/jungle-beast-carnivorous-plant-v1.png");
    this.load.spritesheet("chatoaForest", "./assets/img/characters/chatoa-fisher-static-v2.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    this.obstacles = [];
    this.hideSpots = [];
    this.beasts = [];
    this.touchDirection = null;
    this.caughtCount = 0;
    this.hidden = false;
    this.completed = false;
    this.storyBusy = false;
    this.advanceStory = null;
    this.duskOverlay = null;
    this.nightOverlay = null;

    document.querySelector("#title-screen")?.classList.add("closed");
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#0d251c");

    this.drawForest();
    this.createPlayer();
    this.createBeasts();
    this.bindKeys();
    this.bindTouchControls();
    this.updateHud();
    this.updateMission(false);
    this.createTimeOverlay();

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    dom.hint.textContent = this.forestConfig.startHint;
    this.showStory(this.forestConfig.intro);
  }

  update() {
    if (this.storyBusy) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.action) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.advanceStory?.();
      }
      return;
    }
    if (!this.player || this.completed || this.storyBusy) return;

    const delta = this.game.loop.delta / 1000;
    const direction = this.activeDirection();
    const velocity = new Phaser.Math.Vector2(direction.x, direction.y);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(PLAYER_SPEED);

    const nextX = Phaser.Math.Clamp(this.player.x + velocity.x * delta, 38, WORLD_WIDTH - 38);
    const nextY = Phaser.Math.Clamp(this.player.y + velocity.y * delta, 46, WORLD_HEIGHT - 46);

    if (this.canPlayerMoveTo(nextX, this.player.y)) this.player.x = nextX;
    if (this.canPlayerMoveTo(this.player.x, nextY)) this.player.y = nextY;

    this.updatePlayerFacing(direction);
    this.updateHideState();
    this.updateBeasts(delta);
    this.checkBeastDetection();
    this.checkForestGoal();
    this.updateTimeOverlay();
    this.updateContextHint();
  }

  drawForest() {
    this.createJungleGround();
    this.createBeachEntrance();

    const shadow = this.add.graphics().setDepth(1);
    shadow.fillStyle(0x07130f, 0.34);
    shadow.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createForestFloor();

    if (this.forestConfig.hasCave) {
      this.createCave();
    } else {
      this.createDeepForestMarker();
    }
    this.createHidingThickets();
    this.createObstacles();
  }

  createTimeOverlay() {
    this.duskOverlay = this.add.graphics().setScrollFactor(0).setDepth(900);
    this.duskOverlay.fillStyle(0x7b3a22, this.forestConfig.hasCave ? 0.08 : 0.2);
    this.duskOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    this.nightOverlay = this.add.graphics().setScrollFactor(0).setDepth(901);
    this.updateTimeOverlay();
  }

  updateTimeOverlay() {
    if (!this.nightOverlay) return;
    const progress = Phaser.Math.Clamp((WORLD_HEIGHT - this.player.y) / (WORLD_HEIGHT - DEEP_FOREST_Y), 0, 1);
    const baseAlpha = this.forestConfig.hasCave ? 0.5 : 0.08;
    const darkAlpha = this.forestConfig.hasCave ? baseAlpha + progress * 0.18 : baseAlpha + progress * 0.42;
    this.nightOverlay.clear();
    this.nightOverlay.fillStyle(0x030712, darkAlpha);
    this.nightOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  createJungleGround() {
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "jungleGroundTile")
      .setOrigin(0, 0)
      .setTileScale(1, 1)
      .setDepth(0);

    const ground = this.add.graphics().setDepth(0.2);
    for (let i = 0; i < 180; i += 1) {
      const x = (i * 137) % WORLD_WIDTH;
      const y = (i * 211) % WORLD_HEIGHT;
      const color = i % 3 === 0 ? 0x72582f : i % 3 === 1 ? 0x243f23 : 0x6b4d29;
      ground.fillStyle(color, 0.18);
      ground.fillRect(x, y, 12 + (i % 3) * 4, 4 + (i % 2) * 4);
    }
  }

  createBeachEntrance() {
    this.add
      .tileSprite(0, WORLD_HEIGHT - 86, WORLD_WIDTH, 86, "petoaSandTile")
      .setOrigin(0, 0)
      .setTileScale(1.5, 1.5)
      .setTint(0x9b8751)
      .setDepth(0.5);
  }

  createForestFloor() {
    const floor = this.add.graphics().setDepth(2);
    [
      { x: 178, y: 998, w: 190, h: 118, color: 0x587143 },
      { x: 450, y: 1092, w: 210, h: 94, color: 0x6a6740 },
      { x: 824, y: 1008, w: 250, h: 124, color: 0x4f6d3e },
      { x: 1218, y: 1072, w: 220, h: 104, color: 0x5c7544 },
      { x: 1482, y: 900, w: 210, h: 110, color: 0x6c6543 },
      { x: 266, y: 760, w: 230, h: 104, color: 0x4c653b },
      { x: 688, y: 726, w: 220, h: 120, color: 0x687044 },
      { x: 1092, y: 752, w: 250, h: 120, color: 0x506f42 },
      { x: 1428, y: 612, w: 190, h: 100, color: 0x5f6940 },
      { x: 178, y: 476, w: 210, h: 108, color: 0x5b7341 },
      { x: 558, y: 436, w: 240, h: 118, color: 0x6f6844 },
      { x: 976, y: 422, w: 230, h: 112, color: 0x557044 },
      { x: 1340, y: 320, w: 210, h: 104, color: 0x4b633b },
      { x: 304, y: 188, w: 220, h: 96, color: 0x536a3d },
      { x: 738, y: 212, w: 250, h: 112, color: 0x6a6241 },
      { x: 1188, y: 166, w: 220, h: 98, color: 0x587446 },
    ].forEach((patch) => {
      this.drawPixelPatch(floor, patch.x, patch.y, patch.w, patch.h, patch.color);
    });
  }

  drawPixelPatch(graphics, centerX, centerY, width, height, color) {
    const cols = Math.ceil(width / 16);
    const rows = Math.ceil(height / 16);
    const startX = centerX - cols * 8;
    const startY = centerY - rows * 8;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const edgeX = Math.abs(col - cols / 2) / (cols / 2);
        const edgeY = Math.abs(row - rows / 2) / (rows / 2);
        if (edgeX * edgeX + edgeY * edgeY > 1) continue;
        if ((row * 5 + col * 7) % 9 === 0) continue;
        graphics.fillStyle(color, 0.18 + ((row + col) % 3) * 0.05);
        graphics.fillRect(startX + col * 16, startY + row * 16, 16, 16);
      }
    }
  }

  createCave() {
    const caveX = CAVE_AREA.x + CAVE_AREA.w / 2;
    const caveY = CAVE_AREA.y + CAVE_TILE.height / 2 - CAVE_TILE.yOffset;
    this.add
      .image(caveX, caveY, "rockyCaveEntranceTile")
      .setDisplaySize(CAVE_TILE.width, CAVE_TILE.height)
      .setDepth(8);

    if (this.forestConfig.time === "朝") return;

    const left = caveX - CAVE_TILE.width / 2;
    const top = caveY - CAVE_TILE.height / 2;
    // Light the existing PNG inside the opening, preserving its rock detail.
    const opening = [[98, 38], [109, 40], [114, 51], [122, 58], [127, 74], [125, 85], [115, 92], [93, 94], [79, 85], [77, 70], [84, 55], [92, 48]];
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillPoints(opening.map(([x, y]) => ({
      x: left + x * CAVE_TILE.width / 192,
      y: top + y * CAVE_TILE.height / 128,
    })), true);
    const mask = maskShape.createGeometryMask();
    const litOpening = this.add.image(caveX, caveY, "rockyCaveEntranceTile")
      .setDisplaySize(CAVE_TILE.width, CAVE_TILE.height)
      .setMask(mask)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(902)
      .setAlpha(0.55);

    // Emission sits above the night overlay so darkness doesn't extinguish it.
    const caveGlow = this.add.graphics().setDepth(903).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 20; i >= 1; i -= 1) {
      caveGlow.fillStyle(0x299edb, 0.009);
      caveGlow.fillEllipse(caveX + 5, caveY + 5, 22 + i * 1.7, 34 + i * 1.9);
    }
    const groundLight = this.add.graphics().setDepth(902).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 22; i >= 1; i -= 1) {
      groundLight.fillStyle(0x279bd3, 0.009);
      groundLight.fillEllipse(caveX + 5, caveY + 36, 32 + i * 3.8, 12 + i * 1.4);
    }
    this.tweens.add({ targets: litOpening, alpha: 0.9, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: [caveGlow, groundLight], alpha: 0.65, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    [[87, 75], [98, 86], [115, 78], [107, 61], [104, 91]].forEach(([x, y], index) => {
      const glint = this.add.graphics({ x: left + x, y: top + y })
        .setDepth(904).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      glint.fillStyle(0x57cfff, 0.25);
      glint.fillRect(-2, -2, 6, 6);
      glint.fillStyle(0xcaf5ff, 0.85);
      glint.fillRect(0, 0, 2, 2);
      this.tweens.add({ targets: glint, alpha: 0.8, delay: index * 370, duration: 850, yoyo: true, repeat: -1, repeatDelay: 1000 + index * 150, ease: "Sine.easeInOut" });
    });
    this.events.once("shutdown", () => {
      litOpening.clearMask();
      mask.destroy();
      maskShape.destroy();
    });
  }

  createDeepForestMarker() {
    const marker = drawRouteMarker(this, {
      x: DEEP_FOREST_MARKER.x,
      y: DEEP_FOREST_MARKER.y,
      depth: 899,
      scale: 1.2,
    });

    this.tweens.add({
      targets: marker,
      alpha: 0.48,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createHidingThickets() {
    [
      { x: 214, y: 1014, w: 150, h: 88, kind: "wide", angle: -4 },
      { x: 626, y: 962, w: 126, h: 84, kind: "round", angle: 3 },
      { x: 1048, y: 1012, w: 170, h: 72, kind: "long", angle: -2 },
      { x: 1436, y: 930, w: 146, h: 86, kind: "wide", angle: 5 },
      { x: 380, y: 796, w: 132, h: 88, kind: "round", angle: -5 },
      { x: 790, y: 748, w: 156, h: 88, kind: "wide", angle: 2 },
      { x: 1266, y: 754, w: 166, h: 66, kind: "long", angle: 4 },
      { x: 170, y: 586, w: 144, h: 84, kind: "wide", angle: 4 },
      { x: 580, y: 540, w: 126, h: 86, kind: "round", angle: -3 },
      { x: 1138, y: 548, w: 176, h: 70, kind: "long", angle: -4 },
      { x: 1508, y: 474, w: 128, h: 84, kind: "round", angle: 2 },
      { x: 354, y: 338, w: 152, h: 86, kind: "wide", angle: -2 },
      { x: 740, y: 320, w: 172, h: 68, kind: "long", angle: 3 },
      { x: 1198, y: 286, w: 130, h: 86, kind: "round", angle: -4 },
    ].forEach((spot) => {
      this.drawHidingGrass(spot);
      this.hideSpots.push({ ...spot, radiusX: spot.w / 2, radiusY: spot.h / 2 });
    });
  }

  drawHidingGrass(spot) {
    const type = GRASS_TYPES[spot.kind] ?? GRASS_TYPES.wide;
    const shadow = this.add.graphics().setDepth(spot.y + 6);
    shadow.fillStyle(0x06100c, 0.24);
    shadow.fillEllipse(spot.x, spot.y + spot.h * 0.22, spot.w * 0.84, spot.h * 0.26);

    this.add
      .image(spot.x, spot.y + spot.h * 0.18, type.key)
      .setOrigin(0.5, 0.72)
      .setDisplaySize(spot.w, spot.h)
      .setAngle(spot.angle ?? 0)
      .setDepth(spot.y + 18);
  }

  createObstacles() {
    [
      { x: 92, y: 1090, r: 54, kind: "broad" },
      { x: 338, y: 1098, r: 48, kind: "short" },
      { x: 714, y: 1080, r: 58, kind: "palm" },
      { x: 948, y: 1110, r: 52, kind: "broad" },
      { x: 1306, y: 1066, r: 62, kind: "palm" },
      { x: 1562, y: 1044, r: 56, kind: "short" },
      { x: 132, y: 862, r: 58, kind: "palm" },
      { x: 516, y: 872, r: 50, kind: "short" },
      { x: 934, y: 858, r: 58, kind: "broad" },
      { x: 1188, y: 888, r: 46, kind: "short" },
      { x: 1510, y: 812, r: 60, kind: "broad" },
      { x: 288, y: 694, r: 46, kind: "short" },
      { x: 662, y: 666, r: 58, kind: "palm" },
      { x: 1050, y: 666, r: 52, kind: "broad" },
      { x: 1400, y: 668, r: 56, kind: "palm" },
      { x: 92, y: 426, r: 64, kind: "broad" },
      { x: 448, y: 482, r: 52, kind: "palm" },
      { x: 850, y: 474, r: 48, kind: "short" },
      { x: 1304, y: 432, r: 60, kind: "broad" },
      { x: 1586, y: 366, r: 54, kind: "palm" },
      { x: 194, y: 238, r: 54, kind: "short" },
      { x: 556, y: 244, r: 48, kind: "broad" },
      { x: 1068, y: 214, r: 52, kind: "palm" },
      { x: 1452, y: 180, r: 56, kind: "broad" },
    ].forEach((tree) => {
      const hitArea = this.drawJungleTree(tree);
      this.obstacles.push(hitArea);
      this.drawObstacleHitArea(hitArea);
    });

    [
      { x: 530, y: 1044, w: 88, h: 58, angle: 7, kind: "flat" },
      { x: 1114, y: 1028, w: 84, h: 56, angle: -12, kind: "small" },
      { x: 244, y: 914, w: 74, h: 50, angle: -9, kind: "small" },
      { x: 778, y: 806, w: 96, h: 66, angle: -18, kind: "flat" },
      { x: 1348, y: 794, w: 110, h: 86, angle: 18, kind: "large" },
      { x: 214, y: 516, w: 80, h: 56, angle: 11, kind: "small" },
      { x: 706, y: 446, w: 104, h: 72, angle: -14, kind: "flat" },
      { x: 1172, y: 382, w: 118, h: 92, angle: 8, kind: "large" },
      { x: 944, y: 238, w: 86, h: 60, angle: 13, kind: "small" },
    ].forEach((rock) => {
      const hitArea = this.drawJungleRock(rock);
      this.obstacles.push(hitArea);
      this.drawObstacleHitArea(hitArea);
    });
  }

  drawJungleTree(tree) {
    const type = TREE_TYPES[tree.kind] ?? TREE_TYPES.broad;
    const scale = Phaser.Math.Clamp(tree.r / 54, 0.84, 1.18);
    const baseY = tree.y + type.yOffset;
    const shadow = this.add.graphics().setDepth(baseY - 2);
    shadow.fillStyle(0x06100c, 0.34);
    shadow.fillEllipse(tree.x, baseY - 12, type.w * scale * 0.52, 26 * scale);

    this.add
      .image(tree.x, baseY, type.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(type.w * scale, type.h * scale)
      .setDepth(baseY);

    return {
      shape: "ellipse",
      x: tree.x,
      y: baseY - 14 * scale,
      rx: (type.hitW * scale) / 2,
      ry: (type.hitH * scale) / 2,
    };
  }

  drawJungleRock(rock) {
    const type = ROCK_TYPES[rock.kind] ?? ROCK_TYPES.flat;
    const scale = Phaser.Math.Clamp(rock.w / type.w, 0.82, 1.18);
    const hitW = rock.hitW ?? type.hitW * scale;
    const hitH = rock.hitH ?? type.hitH * scale;
    const hitY = rock.y - rock.h * 0.14;
    const shadow = this.add.graphics().setDepth(rock.y - 1);
    shadow.fillStyle(0x06100c, 0.28);
    shadow.fillEllipse(rock.x, rock.y + 10, rock.w * 0.86, 22 * scale);

    this.add
      .image(rock.x, rock.y, type.key)
      .setOrigin(0.5, 0.72)
      .setDisplaySize(type.w * scale, type.h * scale)
      .setAngle(rock.angle)
      .setDepth(rock.y);

    return {
      shape: "ellipse",
      x: rock.x,
      y: hitY,
      rx: hitW / 2,
      ry: hitH / 2,
    };
  }

  createPlayer() {
    this.player = this.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 86, "chatoaForest", directions.up.frame);
    this.player.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.player.setOrigin(0.5, 0.78);
    this.player.setDepth(this.player.y);
  }

  createBeasts() {
    [
      { type: "runner", route: [{ x: 154, y: 934 }, { x: 530, y: 846 }, { x: 926, y: 938 }, { x: 1354, y: 842 }], speed: 58 },
      { type: "runner", route: [{ x: 1484, y: 1030 }, { x: 1080, y: 930 }, { x: 714, y: 996 }, { x: 386, y: 900 }], speed: 64 },
      { type: "sniffer", route: [{ x: 1390, y: 684 }, { x: 1058, y: 566 }, { x: 620, y: 662 }, { x: 274, y: 552 }], speed: 68 },
      { type: "sniffer", route: [{ x: 1032, y: 300 }, { x: 1336, y: 482 }, { x: 1520, y: 640 }, { x: 1200, y: 720 }], speed: 62 },
      { type: "watcher", route: [{ x: 266, y: 334 }, { x: 650, y: 246 }, { x: 1012, y: 356 }, { x: 1392, y: 260 }], speed: 58 },
      { type: "watcher", route: [{ x: 146, y: 680 }, { x: 438, y: 610 }, { x: 726, y: 704 }], speed: 52 },
      { type: "plant", route: [{ x: 468, y: 388 }], speed: 0 },
      { type: "plant", route: [{ x: 818, y: 536 }], speed: 0 },
      { type: "plant", route: [{ x: 1228, y: 884 }], speed: 0 },
      { type: "plant", route: [{ x: 1506, y: 342 }], speed: 0 },
    ].forEach((entry) => {
      const type = BEAST_TYPES[entry.type];
      const beast = this.add.image(entry.route[0].x, entry.route[0].y, type.assetKey);
      const sightCone = this.add.graphics().setDepth(4);
      beast.setDisplaySize(type.size, type.size);
      beast.setTint(type.tint);
      beast.setDepth(beast.y);
      beast.setData("typeId", entry.type);
      beast.setData("type", type);
      beast.setData("route", entry.route);
      beast.setData("target", 1);
      beast.setData("speed", entry.speed);
      beast.setData("facing", new Phaser.Math.Vector2(1, 0));
      beast.setData("waitTimer", 0);
      beast.setData("scanAngle", 0);
      beast.setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2));
      beast.setData("sightCone", sightCone);
      this.beasts.push(beast);
    });
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
      action: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
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
    document.querySelector("#touch-action").onclick = () => {
      if (this.storyBusy) this.advanceStory?.();
    };
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

  updateHideState() {
    const wasHidden = this.hidden;
    this.hidden = this.hideSpots.some((spot) => {
      const dx = (this.player.x - spot.x) / spot.radiusX;
      const dy = ((this.player.y - 18) - spot.y) / spot.radiusY;
      return dx * dx + dy * dy <= 1;
    });
    this.player.setAlpha(this.hidden ? 0.58 : 1);
    if (this.hidden && !wasHidden) dom.hint.textContent = "茂みに身をひそめた。獣の視線をやりすごせる。";
  }

  updateBeasts(delta) {
    this.beasts.forEach((beast) => {
      const type = beast.getData("type");
      if (type.behavior === "runner") {
        this.updateRunnerBeast(beast, type, delta);
      } else if (type.behavior === "watcher") {
        this.updateWatcherBeast(beast, type, delta);
      } else if (type.behavior === "stationary") {
        this.updateStationaryBeast(beast, type, delta);
      } else {
        this.updateSnifferBeast(beast, type, delta);
      }
      this.updateBeastSightCone(beast);
    });
  }

  updateRunnerBeast(beast, type, delta) {
    this.moveBeastAlongRoute(beast, type, delta, this.runnerSpeedScale(beast, type));
    const phase = beast.getData("phase") + delta * 8;
    beast.setData("phase", phase);
    beast.setAngle(Math.sin(phase) * 3);
  }

  runnerSpeedScale(beast, type) {
    const phase = beast.getData("phase") % type.burstInterval;
    return phase < type.burstDuration ? type.speedScale * type.burstScale : type.speedScale * 0.72;
  }

  updateWatcherBeast(beast, type, delta) {
    if (this.updateBeastWait(beast, type, delta)) return;
    this.moveBeastAlongRoute(beast, type, delta, type.speedScale);
    beast.setAngle(0);
  }

  updateSnifferBeast(beast, type, delta) {
    if (this.updateBeastWait(beast, type, delta)) return;

    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y - 18);
    const toPlayer = playerPos.clone().subtract(new Phaser.Math.Vector2(beast.x, beast.y));
    const distanceToPlayer = toPlayer.length();

    if (distanceToPlayer < type.smellRange) {
      const direction = toPlayer.normalize();
      this.moveBeast(beast, direction, type, delta, type.speedScale * type.investigateScale);
      const phase = beast.getData("phase") + delta * 10;
      beast.setData("phase", phase);
      beast.setAngle(Math.sin(phase) * 5);
      if (distanceToPlayer < type.hiddenSenseRadius + 18) beast.setData("waitTimer", type.sniffPause);
      return;
    }

    this.moveBeastAlongRoute(beast, type, delta, type.speedScale * 0.78);
    const phase = beast.getData("phase") + delta * 4;
    beast.setData("phase", phase);
    beast.setAngle(Math.sin(phase) * 2);
  }

  updateStationaryBeast(beast, type, delta) {
    const phase = beast.getData("phase") + delta * 2.4;
    beast.setData("phase", phase);
    beast.setScale(1 + Math.sin(phase) * 0.025);
    beast.setDepth(Math.floor(beast.y));
    beast.setData("facing", new Phaser.Math.Vector2(0, 1));
  }

  moveBeastAlongRoute(beast, type, delta, speedScale) {
    const route = beast.getData("route");
    const targetIndex = beast.getData("target");
    const target = route[targetIndex];

    const toTarget = new Phaser.Math.Vector2(target.x - beast.x, target.y - beast.y);
    const distance = toTarget.length();

    if (distance < 4) {
      beast.setData("target", (targetIndex + 1) % route.length);
      if (type.waitAtWaypoint) beast.setData("waitTimer", type.waitAtWaypoint);
      return;
    }

    this.moveBeast(beast, toTarget.normalize(), type, delta, speedScale);
  }

  moveBeast(beast, direction, type, delta, speedScale) {
    beast.x += direction.x * beast.getData("speed") * speedScale * delta;
    beast.y += direction.y * beast.getData("speed") * speedScale * delta;
    beast.setDepth(Math.floor(beast.y));
    beast.setData("facing", direction.clone());
    beast.flipX = direction.x < 0;
  }

  updateBeastWait(beast, type, delta) {
    const waitTimer = beast.getData("waitTimer");
    if (waitTimer <= 0) return false;

    const scanAngle = beast.getData("scanAngle") + (type.scanSpeed ?? 1) * delta;
    const route = beast.getData("route");
    const target = route[beast.getData("target")];
    const baseFacing = new Phaser.Math.Vector2(target.x - beast.x, target.y - beast.y).normalize();
    const sweep = Math.sin(scanAngle) * 0.85;
    const cos = Math.cos(sweep);
    const sin = Math.sin(sweep);
    const facing = new Phaser.Math.Vector2(
      baseFacing.x * cos - baseFacing.y * sin,
      baseFacing.x * sin + baseFacing.y * cos
    );

    beast.setData("scanAngle", scanAngle);
    beast.setData("waitTimer", Math.max(0, waitTimer - delta));
    beast.setData("facing", facing);
    return true;
  }

  updateBeastSightCone(beast) {
    const type = beast.getData("type");
    const sightCone = beast.getData("sightCone");
    if (type.sightRange <= 0) {
      sightCone.clear();
      return;
    }

    const facing = beast.getData("facing");
    const normal = new Phaser.Math.Vector2(-facing.y, facing.x);
    const nose = new Phaser.Math.Vector2(beast.x, beast.y - 8);
    const far = nose.clone().add(facing.clone().scale(type.sightRange));
    const left = far.clone().add(normal.clone().scale(type.sightWidth));
    const right = far.clone().add(normal.clone().scale(-type.sightWidth));

    sightCone.clear();
    sightCone.fillStyle(type.coneColor, 0.14);
    sightCone.fillTriangle(nose.x, nose.y, left.x, left.y, right.x, right.y);
  }

  checkBeastDetection() {
    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y - 18);

    const spotted = this.beasts.some((beast) => {
      const type = beast.getData("type");
      const facing = beast.getData("facing");
      const toPlayer = playerPos.clone().subtract(new Phaser.Math.Vector2(beast.x, beast.y));
      const distance = toPlayer.length();
      if (distance < type.hitRadius + PLAYER_HIT_RADIUS) return true;
      if (this.hidden) return type.hiddenSenseRadius ? distance < type.hiddenSenseRadius : false;
      const forwardDistance = toPlayer.dot(facing);
      if (forwardDistance < 0 || forwardDistance > type.sightRange) return false;
      const sideDistance = Math.abs(toPlayer.x * facing.y - toPlayer.y * facing.x);
      if (sideDistance > type.sightWidth) return false;
      return distance < type.sightRange;
    });

    if (spotted) this.resetAfterCaught();
  }

  checkForestGoal() {
    if (this.forestConfig.hasCave) {
      this.checkCaveArrival();
      return;
    }
    this.checkLostInForest();
  }

  checkLostInForest() {
    if (this.player.y > DEEP_FOREST_Y) return;

    this.completed = true;
    this.updateMission(true);
    dom.hint.textContent = "チャトアは森の奥で道を見失った。";
    this.cameras.main.fadeOut(900, 5, 7, 18);
    this.showStory({
      speaker: "チャトア",
      lines: [
        "ここ、さっきも通った……？",
        "鳥の声が消えて、葉っぱの音だけが近くなってきた。",
        "日が沈む。まずい、完全に迷った。",
      ],
      onComplete: () => {
        this.scene.start("PetoaForestNightScene");
      },
    });
  }

  checkCaveArrival() {
    if (!this.isInsideCaveArea()) return;

    this.completed = true;
    this.updateMission(true);
    dom.hint.textContent = "チャトアは岩山の洞窟へ避難した。";
    this.player.setVelocity?.(0, 0);
    this.cameras.main.flash(420, 116, 198, 231);
    this.showStory({
      speaker: "チャトア",
      lines: [
        "岩の奥から、青い光が漏れている。",
        "ここなら、少なくとも獣の視線は届かない。",
        "朝になるまで、この洞窟で身を隠そう。",
      ],
      onComplete: () => this.scene.start("PetoaCaveScene"),
    });
  }

  isInsideCaveArea() {
    return (
      this.player.x >= CAVE_AREA.x &&
      this.player.x <= CAVE_AREA.x + CAVE_AREA.w &&
      this.player.y >= CAVE_AREA.y &&
      this.player.y <= CAVE_AREA.y + CAVE_AREA.h
    );
  }

  resetAfterCaught() {
    this.caughtCount += 1;
    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT - 86);
    this.player.setAlpha(1);
    this.hidden = false;
    this.cameras.main.shake(220, 0.006);
    this.updateHud();
    dom.hint.textContent = "獣に見つかった。入口まで逃げ戻った。茂みに隠れてやり過ごそう。";
  }

  canPlayerMoveTo(x, y) {
    const playerBody = { x, y: y - 18 };
    return !this.obstacles.some((obstacle) => this.isPointBlockedByObstacle(playerBody, obstacle));
  }

  isPointBlockedByObstacle(point, obstacle) {
    if (obstacle.shape === "ellipse") {
      const rx = obstacle.rx + PLAYER_OBSTACLE_RADIUS;
      const ry = obstacle.ry + PLAYER_OBSTACLE_RADIUS;
      const dx = (point.x - obstacle.x) / rx;
      const dy = (point.y - obstacle.y) / ry;
      return dx * dx + dy * dy < 1;
    }

    const dx = point.x - obstacle.x;
    const dy = point.y - obstacle.y;
    return dx * dx + dy * dy < (obstacle.radius + PLAYER_OBSTACLE_RADIUS) ** 2;
  }

  drawObstacleHitArea(obstacle) {
    if (!DEBUG_COLLISION) return;

    const debug = this.add.graphics().setDepth(2000);
    debug.lineStyle(2, 0xff4f7b, 0.92);
    debug.fillStyle(0xff4f7b, 0.16);
    if (obstacle.shape === "ellipse") {
      debug.strokeEllipse(obstacle.x, obstacle.y, obstacle.rx * 2, obstacle.ry * 2);
      debug.fillEllipse(obstacle.x, obstacle.y, obstacle.rx * 2, obstacle.ry * 2);
      return;
    }
    debug.strokeCircle(obstacle.x, obstacle.y, obstacle.radius);
    debug.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
  }

  updateContextHint() {
    if (this.completed) return;
    if (this.hidden) return;
    const beast = this.nearestBeast();
    if (beast) {
      const type = beast.getData("type");
      dom.hint.textContent = type.behavior === "stationary"
        ? `${type.name}が根を張っている。近づきすぎないようにしよう。`
        : `${type.name}が近い。視線の色と向きに注意しよう。`;
      return;
    }
    if (this.forestConfig.hasCave && this.isNearCave()) {
      dom.hint.textContent = "岩陰の奥に洞窟が見える。もう少し近づこう。";
      return;
    }
    if (!this.forestConfig.hasCave && this.isNearDeepForestMarker()) {
      dom.hint.textContent = "森の奥へ続く目印だ。ここ以外からでも、最上部まで進めば奥へ入れる。";
      return;
    }
    if (this.isNearHideSpot()) {
      dom.hint.textContent = "濃い茂みだ。中に入ると身を隠せる。";
      return;
    }
    dom.hint.textContent = this.forestConfig.hasCave
      ? "獣の視線を避け、森の奥の洞窟を探そう。"
      : "奥へ進むほど、森の影が濃くなっていく。";
  }

  nearestBeast() {
    return this.beasts.find((beast) => {
      return Phaser.Math.Distance.Between(beast.x, beast.y, this.player.x, this.player.y - 18) < 132;
    });
  }

  isNearHideSpot() {
    return this.hideSpots.some((spot) => {
      const dx = this.player.x - spot.x;
      const dy = (this.player.y - 18) - spot.y;
      return dx * dx + dy * dy < 92 ** 2;
    });
  }

  isNearCave() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, CAVE_AREA.x + CAVE_AREA.w / 2, 118) < 190;
  }

  isNearDeepForestMarker() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, DEEP_FOREST_MARKER.x, DEEP_FOREST_MARKER.y) < 150;
  }

  updateHud() {
    dom.chapter.textContent = this.forestConfig.chapter;
    dom.title.textContent = this.forestConfig.title;
    dom.timeLabel.textContent = this.forestConfig.time;
    dom.stepLabel.textContent = `発見 ${this.caughtCount}`;
  }

  updateMission(done) {
    dom.questList.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = `${done ? "✓" : "□"} ${this.forestConfig.mission}`;
    li.className = done ? "done" : "";
    dom.questList.append(li);
  }

  showStory(story) {
    if (!story?.lines?.length || !dom.dialog) {
      story?.onComplete?.();
      return;
    }

    this.storyBusy = true;
    let index = 0;
    const renderLine = () => {
      dom.dialog.hidden = false;
      const line = story.lines[index];
      dom.speaker.textContent = typeof line === "string" ? story.speaker : line.speaker;
      dom.message.textContent = typeof line === "string" ? line : line.text;
      dom.nextButton.textContent = index === story.lines.length - 1 ? "閉じる" : "つづける";
    };

    this.advanceStory = () => {
      index += 1;
      if (index < story.lines.length) {
        renderLine();
        return;
      }
      dom.dialog.hidden = true;
      dom.nextButton.onclick = null;
      this.storyBusy = false;
      this.advanceStory = null;
      story.onComplete?.();
    };
    dom.nextButton.onclick = this.advanceStory;

    renderLine();
  }
}

export class PetoaForestScene extends BaseForestScene {
  constructor() {
    super(FOREST_SCENES.dusk);
  }
}

export class PetoaForestNightScene extends BaseForestScene {
  constructor() {
    super(FOREST_SCENES.night);
  }
}
