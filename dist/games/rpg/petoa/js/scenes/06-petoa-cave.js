import { TILE_SIZE, CAVE_COLS, CAVE_ROWS, CAVE_START, CAVE_GOAL, CAVE_ITEMS, CAVE_SHARDS, CAVE_CHAMBER, createCaveMap, cellCenter, canWalkAt } from "../data/cave-map.js";

const BLUE_WALL_WIDTH = TILE_SIZE * 5;
const CAVE_ITEM_SIZES = { "animal-bone": 44, "bone-fragment": 32, "smooth-stone": 36, "old-fang": 38 };

export class PetoaCaveScene extends Phaser.Scene {
  constructor() {
    super("PetoaCaveScene");
  }

  preload() {
    this.load.image("blueShard", "./assets/img/items/cave/blue-shard-pixel-v1.png");
    for (const item of CAVE_ITEMS) {
      this.load.image(`caveItem-${item.id}`, `./assets/img/items/cave/${item.id}-pixel-v1.png`);
    }
    this.load.image("caveWallPixel", "./assets/img/tiles/cave/cave-wall-pixel-v1.png");
    this.load.image("blueBedrockPixel", "./assets/img/tiles/cave/blue-bedrock-pixel-v1.png");
    this.load.image("blackBedrockPixel", "./assets/img/tiles/cave/black-bedrock-pixel-v1.png");
    this.load.image("caveWallFooting", "./assets/img/tiles/cave/cave-wall-footing-v1.png");
    this.load.spritesheet("chatoaCave", "./assets/img/characters/chatoa-fisher-static-v2.png", { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    const debugBlueWall = new URLSearchParams(window.location.search).get("debug") === "blue-wall";
    this.cells = createCaveMap();
    this.collected = new Set(this.registry.get("caveCollectedItems") ?? []);
    this.isMorning = this.registry.get("caveMorning") ?? false;
    this.chapterTransition = false;
    this.exiting = false;
    this.blueEffects = [];
    this.blueEdges = [];
    this.reachedWall = debugBlueWall ? false : (this.registry.get("caveWallReached") ?? false);
    this.touchDirection = null;
    this.touchRunning = false;
    this.advanceStory = null;
    this.dom = Object.fromEntries(["dialog", "speaker", "message", "next-button", "hint", "step-label", "quest-list"].map(id => [id, document.getElementById(id)]));
    document.querySelector("#title-screen")?.classList.add("closed");
    document.querySelector(".chapter").textContent = this.isMorning ? "CHAPTER 4" : "CHAPTER 2";
    document.querySelector(".hud h1").textContent = "ペトア島の洞窟";
    document.querySelector("#time-label").textContent = this.isMorning ? "翌朝" : "夜";
    document.querySelector("#phaser-stage").setAttribute("aria-label", "ペトア島の洞窟探索");
    this.cameras.main.setBounds(0, 0, CAVE_COLS * TILE_SIZE, CAVE_ROWS * TILE_SIZE);
    this.cameras.main.setBackgroundColor("#10131b");
    this.drawCave();
    this.createBlueWall();
    this.items = [...CAVE_ITEMS, ...CAVE_SHARDS].map(item => this.createItem(item));
    const start = debugBlueWall || this.isMorning || this.hasAllShards()
      ? cellCenter({ col: CAVE_GOAL.col, row: CAVE_GOAL.row + 1 })
      : cellCenter(CAVE_START);
    this.player = this.add.sprite(start.x, start.y, "chatoaCave", 3).setDisplaySize(72, 72).setOrigin(0.5, 0.78).setDepth(10).setTint(0xb9c9df);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.fadeIn(650, 5, 8, 16);
    this.bindControls();
    if (this.isMorning) this.applyMorning();
    this.updateHud();
    if (this.isMorning) {
      this.showStory(["朝だ……。", "昨日まで青く光っていた岩壁が、黒くなっている。"]);
      return;
    }
    if (this.hasAllShards()) {
      this.beginChapter4();
      return;
    }
    if (debugBlueWall) {
      // The normal arrival check in update plays the event, including on revisits.
      this.updateHint();
      return;
    }
    this.showStory([
      "外の獣の声が、遠くなった。奥から冷たい空気が流れてくる。",
      "道がいくつも分かれている……。壁を確かめながら進もう。",
      "かすかに青い光が見える。どこから漏れているんだろう。",
    ]);
  }

  drawCave() {
    const texture = this.textures.get("caveWallPixel");
    const source = texture.getSourceImage();
    const frameWidth = Math.floor(source.width / 2);
    const frameHeight = Math.floor(source.height / 2);
    // Use consecutive quarters so the same rock texture continues across cells.
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const name = `wall-${col}-${row}`;
        if (!texture.has(name)) texture.add(name, 0, col * frameWidth, row * frameHeight, frameWidth, frameHeight);
      }
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const floor = this.add.graphics();
    for (let row = 0; row < CAVE_ROWS; row += 1) {
      for (let col = 0; col < CAVE_COLS; col += 1) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const seed = (col * 71 + row * 137) % 23;
        if (this.cells[row][col]) {
          floor.fillStyle(0x343945);
          floor.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          for (let i = 0; i < 7; i += 1) {
            floor.fillStyle(i % 2 ? 0x59606a : 0x252c36, 0.6);
            floor.fillRect(x + (seed * 7 + i * 23) % 86, y + (seed * 11 + i * 31) % 86, 4 + i % 3 * 3, 3);
          }
        } else {
          this.add.image(x, y, "caveWallPixel", `wall-${col % 2}-${row % 2}`)
            .setOrigin(0, 0)
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setDepth(0);
        }
      }
    }
    this.createWallFootings();
    const entrance = cellCenter(CAVE_START);
    floor.fillStyle(0x8995a0, 0.2);
    floor.fillEllipse(entrance.x, entrance.y + 15, 70, 110);
    // Faint mineral seams become more frequent near the deepest chamber.
    for (const [col, row] of [[19, 12], [19, 8], [14, 7], [13, 4], [18, 3]]) {
      const point = cellCenter({ col, row });
      floor.fillStyle(0x4a93ae, 0.5);
      floor.fillRect(point.x - 39, point.y - 14, 4, 22);
      floor.fillRect(point.x - 35, point.y - 20, 4, 10);
    }
  }

  createWallFootings() {
    const texture = this.textures.get("caveWallFooting");
    const source = texture.getSourceImage();
    const width = Math.floor(source.width / 2);
    for (let i = 0; i < 2; i += 1) {
      if (!texture.has(`foot-${i}`)) texture.add(`foot-${i}`, 0, i * width, 0, width, source.height);
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (let row = 0; row < CAVE_ROWS; row += 1) {
      for (let col = 0; col < CAVE_COLS; col += 1) {
        if (!this.cells[row][col]) continue;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const frame = `foot-${(col + row) % 2}`;
        const blueWallTop = row === 1 && Math.abs(col - CAVE_GOAL.col) <= 2;
        if (!this.cells[row - 1]?.[col] && !blueWallTop) this.addWallFooting(x + 48, y, 0, frame);
        if (!this.cells[row + 1]?.[col]) this.addWallFooting(x + 48, y + TILE_SIZE, 180, frame);
        if (!this.cells[row]?.[col - 1]) this.addWallFooting(x, y + 48, -90, frame);
        if (!this.cells[row]?.[col + 1]) this.addWallFooting(x + TILE_SIZE, y + 48, 90, frame);
      }
    }
  }

  addWallFooting(x, y, angle, frame, blue = false) {
    const radians = angle * Math.PI / 180;
    this.add.image(x - Math.sin(radians) * 3, y + Math.cos(radians) * 3, "caveWallFooting", frame)
      .setOrigin(0.5, 0.6).setDisplaySize(TILE_SIZE, 64).setAngle(angle)
      .setTint(0x080f1b).setAlpha(0.3).setDepth(0.5);
    const edge = this.add.image(x, y, "caveWallFooting", frame)
      .setOrigin(0.5, 0.6).setDisplaySize(TILE_SIZE, 64).setAngle(angle).setDepth(4);
    if (blue) {
      edge.setTint(0x63cfff);
      this.blueEdges.push(edge);
      const shine = this.add.image(x, y, "caveWallFooting", frame)
        .setOrigin(0.5, 0.6).setDisplaySize(TILE_SIZE, 64).setAngle(angle).setDepth(4)
        .setTint(0x48bbff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
      this.tweens.add({ targets: shine, alpha: 0.55, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.blueEffects.push(shine);
    }
  }

  createBlueWall() {
    this.goal = cellCenter(CAVE_GOAL);
    const { x, y } = this.goal;
    const halo = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 24; i >= 1; i -= 1) {
      halo.fillStyle(0x369fe8, 0.018);
      halo.fillEllipse(x, y + 12, BLUE_WALL_WIDTH - 20 + i * 12, 40 + i * 12);
    }
    const texture = this.textures.get("blueBedrockPixel");
    const source = texture.getSourceImage();
    const height = y - 4;
    for (let i = 0; i < 5; i += 1) {
      this.addWallFooting(x - BLUE_WALL_WIDTH / 2 + (i + 0.5) * TILE_SIZE, height, 0, `foot-${i % 2}`, true);
    }
    // Crop to the wall's proportions instead of flattening the rounded rocks.
    const cropHeight = Math.min(source.height, Math.round(source.width * height / BLUE_WALL_WIDTH));
    if (!texture.has("wall-panel")) {
      texture.add("wall-panel", 0, 0, Math.floor((source.height - cropHeight) / 2), source.width, cropHeight);
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const blackTexture = this.textures.get("blackBedrockPixel");
    const blackSource = blackTexture.getSourceImage();
    const blackCropHeight = Math.min(blackSource.height, Math.round(blackSource.width * height / BLUE_WALL_WIDTH));
    if (!blackTexture.has("wall-panel")) {
      blackTexture.add("wall-panel", 0, 0, Math.floor((blackSource.height - blackCropHeight) / 2), blackSource.width, blackCropHeight);
    }
    blackTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.wall = this.add.image(x, 0, "blueBedrockPixel", "wall-panel")
      .setOrigin(0.5, 0)
      .setDisplaySize(BLUE_WALL_WIDTH, height)
      .setDepth(2);
    const glow = this.add.image(x, 0, "blueBedrockPixel", "wall-panel")
      .setOrigin(0.5, 0)
      .setDisplaySize(BLUE_WALL_WIDTH, height)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.38);
    this.tweens.add({ targets: glow, alpha: 0.7, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: halo, alpha: 0.7, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.blueEffects.push(glow, halo);
    for (let i = 0; i < 22; i += 1) {
      const px = x - BLUE_WALL_WIDTH / 2 + 12 + (i * 83) % (BLUE_WALL_WIDTH - 24);
      const py = 12 + (i * 37) % (height - 16);
      const glint = this.add.graphics({ x: px, y: py }).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
      glint.fillStyle(0x5edbff, 0.25);
      glint.fillRect(-4, -2, 10, 6);
      glint.fillStyle(0xd6faff, 0.85);
      glint.fillRect(0, 0, 2, 2);
      glint.setAlpha(0);
      this.blueEffects.push(glint);
      this.tweens.add({ targets: glint, alpha: 0.9, delay: i * 143, duration: 750 + i % 4 * 240, hold: 80, yoyo: true, repeat: -1, repeatDelay: 500 + i % 3 * 220, ease: "Sine.easeInOut" });
    }
  }

  createItem(spec) {
    const point = cellCenter(spec);
    const isShard = spec.kind === "blue-shard";
    // The generated shard's transparent canvas leaves room around its silhouette.
    const size = isShard ? 112 : CAVE_ITEM_SIZES[spec.id];
    const key = isShard ? "blueShard" : `caveItem-${spec.id}`;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const sprite = this.add.image(point.x, point.y, key)
      .setDisplaySize(size, size)
      .setAngle(spec.angle ?? 0)
      .setDepth(3);
    sprite.setVisible(!this.collected.has(spec.id));
    return { ...spec, ...point, sprite };
  }

  bindControls() {
    this.keys = this.input.keyboard.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,ENTER,SPACE");
    const cleanups = [];
    const bind = (target, name, handler) => {
      target.addEventListener(name, handler);
      cleanups.push(() => target.removeEventListener(name, handler));
    };
    document.querySelectorAll("[data-dir]").forEach(button => {
      button.onpointerdown = button.onpointerup = button.onpointerleave = null;
      bind(button, "pointerdown", event => { event.preventDefault(); this.touchDirection = button.dataset.dir; });
    });
    const release = () => { this.touchDirection = null; this.touchRunning = false; };
    bind(window, "pointerup", release);
    bind(window, "pointercancel", release);
    bind(window, "blur", release);
    const action = document.querySelector("#touch-action");
    action.onclick = null;
    bind(action, "click", () => this.interact());
    const draw = document.querySelector("#draw-item");
    const previousHidden = draw.hidden;
    draw.hidden = true;
    this.events.once("shutdown", () => {
      cleanups.forEach(cleanup => cleanup());
      draw.hidden = previousHidden;
      this.dom.dialog.hidden = true;
      this.dom["next-button"].onclick = null;
    });
  }

  update(_time, delta) {
    const actionPressed = Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.advanceStory) {
      if (actionPressed) this.advanceStory();
      return;
    }
    if (this.chapterTransition || this.exiting) return;
    const k = this.keys;
    const dx = Number(k.RIGHT.isDown || k.D.isDown || this.touchDirection === "right") - Number(k.LEFT.isDown || k.A.isDown || this.touchDirection === "left");
    const dy = Number(k.DOWN.isDown || k.S.isDown || this.touchDirection === "down") - Number(k.UP.isDown || k.W.isDown || this.touchDirection === "up");
    const length = Math.hypot(dx, dy) || 1;
    const distance = 145 * Math.min(delta, 50) / 1000;
    const nextX = this.player.x + dx / length * distance;
    const nextY = this.player.y + dy / length * distance;
    if (this.canMoveTo(nextX, this.player.y)) this.player.x = nextX;
    if (this.canMoveTo(this.player.x, nextY)) this.player.y = nextY;
    if (dx || dy) this.player.setFrame(dx ? (dx > 0 ? 1 : 2) : (dy > 0 ? 0 : 3));
    if (this.checkMorningExit()) return;
    if (!this.isMorning && !this.reachedWall && this.nearGoal()) {
      this.reachedWall = true;
      this.registry.set("caveWallReached", true);
      this.updateHud();
      this.showStory(["行き止まり……いや、壁そのものが光っている。", "青い光が、岩の中でゆっくり息をしているみたいだ。", "足もとに、青い石の破片が3つ落ちている。拾ってみよう。"]);
      return;
    }
    if (actionPressed) this.interact();
    if (!this.advanceStory) this.updateHint();
  }

  canMoveTo(x, y) {
    if (!canWalkAt(this.cells, x, y)) return false;
    const halfWidth = BLUE_WALL_WIDTH / 2 + 16;
    return !(x > this.goal.x - halfWidth && x < this.goal.x + halfWidth && y < this.goal.y + 16);
  }

  checkMorningExit() {
    if (!this.isMorning || this.chapterTransition || this.advanceStory || this.exiting) return false;
    const { x, y } = this.player;
    if (x >= CAVE_CHAMBER.left && x < CAVE_CHAMBER.right && y >= CAVE_CHAMBER.top && y < CAVE_CHAMBER.bottom) return false;
    this.exiting = true;
    this.touchDirection = null;
    this.touchRunning = false;
    this.input.keyboard.resetKeys();
    this.dom.hint.textContent = "洞窟の外へ……。";
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("PetoaForestMorningScene"));
    this.cameras.main.fadeOut(650, 8, 12, 15);
    return true;
  }

  nearbyItem() {
    return this.items.find(item => !this.collected.has(item.id) && Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < 62);
  }

  nearGoal() {
    const wallX = Math.max(this.goal.x - BLUE_WALL_WIDTH / 2, Math.min(this.player.x, this.goal.x + BLUE_WALL_WIDTH / 2));
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, wallX, this.goal.y) < 150;
  }

  interact() {
    if (this.advanceStory) return this.advanceStory();
    if (this.chapterTransition || this.exiting) return;
    const item = this.nearbyItem();
    if (item) {
      this.collected.add(item.id);
      this.registry.set("caveCollectedItems", [...this.collected]);
      item.sprite.setVisible(false);
      this.updateHud();
      const lines = [`${item.name}を拾った。`, item.text];
      if (item.kind === "blue-shard") lines.push(`青い石の破片：${this.shardCount()} / ${CAVE_SHARDS.length}`);
      this.showStory(lines, () => {
        if (this.hasAllShards() && !this.isMorning) this.beginChapter4();
      });
    } else if (this.nearGoal()) {
      this.showStory(this.isMorning
        ? ["岩は黒くなっている。昨夜の青い光は、もう見えない。", "同じ岩のはずなのに……。眠っている間に、何があったんだろう。"]
        : ["岩肌に青い筋が幾重にも走っている。灯りもないのに、足もとまで見える。", "奥へ続く道はない。光は、この岩壁から生まれているんだ。"]);
    } else {
      this.showStory(["冷たい岩肌と、小さな石ばかりだ。ここには拾えそうなものはない。"]);
    }
  }

  updateHint() {
    if (this.exiting) return;
    if (this.chapterTransition) {
      this.dom.hint.textContent = "チャトアは眠りについた……。";
      return;
    }
    if (this.isMorning) {
      this.dom.hint.textContent = "部屋の左側の通路へ進むと、洞窟の外へ出られる。";
      return;
    }
    const item = this.nearbyItem();
    this.dom.hint.textContent = item ? `${item.name}が落ちている。Enter / Space・「調べる」で拾う。`
      : this.nearGoal() ? (this.isMorning ? "岩壁の青い光が消えている。「調べる」で黒くなった岩壁を観察できる。" : `青い石の破片を3つ拾おう（${this.shardCount()} / 3）。「調べる」で拾える。`)
        : "分かれ道を探索しよう。矢印 / WASDで移動。行き止まりにも落とし物があるかもしれない。";
  }

  updateHud() {
    this.dom["step-label"].textContent = `青い石 ${this.shardCount()} / ${CAVE_SHARDS.length}`;
    const list = this.dom["quest-list"];
    list.replaceChildren();
    const mission = document.createElement("li");
    mission.textContent = this.isMorning ? "✓ 翌朝、岩壁が黒くなっている" : `${this.reachedWall ? "✓" : "□"} 青く光る岩壁を見つける`;
    mission.className = this.isMorning || this.reachedWall ? "done" : "";
    list.append(mission);
    if (this.isMorning) {
      const exit = document.createElement("li");
      exit.textContent = "□ 岩壁の部屋を出て、洞窟の外へ向かう";
      list.append(exit);
    }
    const shards = document.createElement("li");
    shards.textContent = `${this.hasAllShards() ? "✓" : "□"} 青い石の破片をすべて拾う（${this.shardCount()} / ${CAVE_SHARDS.length}）`;
    shards.className = this.hasAllShards() ? "done" : "";
    list.append(shards);
    for (const item of CAVE_ITEMS.filter(item => this.collected.has(item.id))) {
      const li = document.createElement("li");
      li.textContent = `所持品：${item.name}`;
      list.append(li);
    }
  }

  shardCount() {
    return CAVE_SHARDS.filter(item => this.collected.has(item.id)).length;
  }

  hasAllShards() {
    return this.shardCount() === CAVE_SHARDS.length;
  }

  beginChapter4() {
    if (this.chapterTransition || this.isMorning || !this.hasAllShards()) return;
    this.chapterTransition = true;
    this.touchDirection = null;
    this.touchRunning = false;
    this.input.keyboard.resetKeys();
    document.querySelector(".chapter").textContent = "CHAPTER 4";
    this.showStory(["3つとも拾った。……なんだか、眠くなってきた。", "チャトアは岩壁のそばで横になり、眠りについた。"], () => this.sleepUntilMorning());
  }

  sleepUntilMorning() {
    this.player.setFrame(0).setAngle(90);
    const shade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x05070b).setOrigin(0);
    const caption = this.add.text(0, 0, "チャトアは眠りについた。", { fontFamily: "sans-serif", fontSize: "18px", color: "#c5cad1" }).setOrigin(0.5);
    const overlay = this.add.container(0, 0, [shade, caption]).setDepth(1000).setScrollFactor(0).setAlpha(0);
    const layout = () => {
      shade.setSize(this.scale.width, this.scale.height);
      caption.setPosition(this.scale.width / 2, this.scale.height / 2);
    };
    layout();
    this.scale.on("resize", layout);
    const cleanup = () => { this.scale.off("resize", layout); overlay.destroy(); };
    this.events.once("shutdown", cleanup);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 900, onComplete: () => {
      this.time.delayedCall(1600, () => {
        this.applyMorning();
        caption.setText("翌朝。");
        this.time.delayedCall(1300, () => {
          this.tweens.add({ targets: overlay, alpha: 0, duration: 1100, onComplete: () => {
            this.events.off("shutdown", cleanup);
            cleanup();
            this.chapterTransition = false;
            this.updateHint();
            this.showStory(["……朝だ。", "岩は黒くなっている。", "昨日の青い光が、消えてしまった……。"]);
          } });
        });
      });
    } });
  }

  applyMorning() {
    this.isMorning = true;
    this.reachedWall = true;
    this.registry.set("caveMorning", true);
    this.registry.set("caveWallReached", true);
    this.wall.setTexture("blackBedrockPixel", "wall-panel").clearTint().setDisplaySize(BLUE_WALL_WIDTH, this.goal.y - 4);
    for (const effect of this.blueEffects) {
      this.tweens.killTweensOf(effect);
      effect.setVisible(false);
    }
    for (const edge of this.blueEdges) edge.setTint(0x202020);
    this.player.setAngle(0).setFrame(3).clearTint();
    document.querySelector(".chapter").textContent = "CHAPTER 4";
    document.querySelector("#time-label").textContent = "翌朝";
    this.updateHud();
  }

  showStory(lines, onComplete) {
    this.touchDirection = null;
    let index = 0;
    const render = () => {
      this.dom.dialog.hidden = false;
      this.dom.speaker.textContent = "チャトア";
      this.dom.message.textContent = lines[index];
      this.dom["next-button"].textContent = index === lines.length - 1 && !onComplete ? "閉じる" : "つづける";
    };
    this.advanceStory = () => {
      index += 1;
      if (index < lines.length) return render();
      this.dom.dialog.hidden = true;
      this.dom["next-button"].onclick = null;
      this.advanceStory = null;
      this.updateHint();
      onComplete?.();
    };
    this.dom["next-button"].onclick = this.advanceStory;
    render();
  }
}
