const WIDTH = 36;
const HEIGHT = 26;
const SOURCE_TILE_SIZE = 32;
import { drawRouteMarker } from "../ui/markers.js";

const TILE_SIZE = 48;
const WORLD_SCALE = TILE_SIZE / SOURCE_TILE_SIZE;
const PLAYER_SCALE = 1.125;
const SPRITE_Y_OFFSET = TILE_SIZE * 0.25;
const CHARACTER_DEPTH_BASE = 80;
const NPC_WANDER_RADIUS = 2;
const NPC_WANDER_STEP_MS = { min: 1400, max: 3200 };
const PLAYER_CHARACTER = {
  key: "chatoa",
  metaKey: "chatoaMeta",
  metaPath: "./assets/img/characters/chatoa-fisher-static.json",
  imagePath: "./assets/img/characters/chatoa-fisher-static-v2.png",
  frameWidth: 64,
  frameHeight: 64,
};
const NPC_CHARACTERS = {
  urishia: {
    key: "urishia",
    metaKey: "urishiaMeta",
    metaPath: "./assets/img/characters/urishia-walk.json",
    imagePath: "./assets/img/characters/urishia-static-v1.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  chiefUtopas: {
    key: "chiefUtopas",
    metaKey: "chiefUtopasMeta",
    metaPath: "./assets/img/characters/chief-utopas-walk.json",
    imagePath: "./assets/img/characters/chief-utopas-static-v1.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  father: {
    key: "father",
    metaKey: "fatherMeta",
    metaPath: "./assets/img/characters/father-static.json",
    imagePath: "./assets/img/characters/father-static-v3.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  fisher: {
    key: "fisher",
    metaKey: "fisherMeta",
    metaPath: "./assets/img/characters/fisher-static.json",
    imagePath: "./assets/img/characters/fisher-static-v1.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  child: {
    key: "child",
    metaKey: "childMeta",
    metaPath: "./assets/img/characters/child-static.json",
    imagePath: "./assets/img/characters/child-static-v1.png",
    frameWidth: 64,
    frameHeight: 64,
  },
};

const GROUND_FRAME = {
  grass: 0,
  grassAlt: 1,
  flowers: 2,
  rock: 3,
  tree: 4,
  water: 5,
  sand: 6,
  dock: 7,
  pathFull: 8,
  pathHorizontal: 9,
  pathVertical: 10,
  pathCross: 11,
  pathTUp: 12,
  pathTDown: 13,
  pathTRight: 14,
  pathTLeft: 15,
  pathCornerUpRight: 16,
  pathCornerUpLeft: 17,
  pathCornerDownRight: 18,
  pathCornerDownLeft: 19,
  pathEndUp: 20,
  pathEndRight: 21,
  pathEndDown: 22,
  pathEndLeft: 23,
  shoreGrass: 24,
  shoreTop: 25,
  shoreBottom: 26,
  dockHorizontal: 27,
  bush: 28,
  hedge: 29,
  fenceVertical: 30,
  fenceHorizontal: 31,
};

const INTERIOR_FRAME = {
  floor: 0,
  wall: 1,
  rug: 2,
  plank: 3,
  hearth: 4,
  window: 5,
  counter: 6,
  empty: 7,
};

const OUTSIDE_MAP = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW",
  "WGGRGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW",
  "WGGGGGGGGGGGGHHHGGPGGGGGGGGGGGGGRGGW",
  "WGGGHHHGGGGGGHHHGGPGGGGGGHHHHGGGGGGW",
  "WGGGHHHGGGGGGHHHPPPPPPGGGHHHHGGGGGGW",
  "WGGGHHHGGGGGGGPGGGPGGPGGGHHHHGGGGGGW",
  "WGGGGPGGGGGGGGPGFFPFFPGGGGGPGGGGGGGW",
  "WGGGGPGGGGGGGGPGFFPFFPGGGGGPGGGGGGGW",
  "WGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPPGGW",
  "WGGGGGGGPGGGGGGGFFPFFGGGGGGGPGGGGGGW",
  "WGGGGGGGPGGGGGGGFFPFFGGGGGGGPHHHGGGW",
  "WGGGGGGGPGGGGGGGGGPGGGGGGGGGPHHHGGGW",
  "WGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPGGGGW",
  "WGGGGHHHGGGGGGGGGGPGGGGHHHHGGGGGGGGW",
  "WGGGGHHHGGGGGGGGGGPGGGGHHHHGGGGGGGGW",
  "WGGGGGGGGGGGGGGGGGPGGGGHHHHGGGGGGGGW",
  "WGGGGGGGGGGGPPPPPPPPPPPPPGGGGGGGGGGW",
  "WGRGGGGGGGGGGGPGGGPGGGPGGGGGGGGGGRGW",
  "WSSSSSSSSSSSRSPSSSPSSSPSRSSSSSSSSSSW",
  "WSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSW",
  "WWWWWWWWWWWWWWWWDDDDDDWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWDDDDDDWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

const OUTSIDE_SOLID = new Set(["W", "T", "H", "R"]);
const INTERIOR_SOLID = new Set(["#"]);
const SCENE2_BOAT_TILE = { x: 19, y: 23 };

const quests = [
  { id: "petoa", label: "村でペトア島の話を聞く" },
  { id: "fishing", label: "漁村の暮らしを知る" },
  { id: "forest", label: "ペトア島の森の約束を知る" },
  { id: "chiefFather", label: "村長と父の話を聞く" },
];

const npcs = [
  {
    id: "urishia",
    name: "ウリシア",
    x: 7,
    y: 11,
    character: "urishia",
    lines: [
      "チャトア、また港を見てたの？　手伝いが終わったら、貝殻を拾いに行こう。",
      "向こうに見える大きな島がペトア島。きれいだけど、森の奥へは入っちゃだめ。",
    ],
    fact: "urishia",
  },
  {
    id: "father",
    name: "チャトアの父",
    x: 16,
    y: 19,
    character: "father",
    lines: [
      "網をたたむ手つきが早くなったな。ここは漁で生きてきた村だ。",
      "海は道でもあるし、境でもある。ウペトアの子は、それを早く覚える。",
    ],
    fact: "fishing",
  },
  {
    id: "utopas",
    name: "村長ウトパス",
    x: 21,
    y: 7,
    character: "chiefUtopas",
    lines: [
      "チャトア、今日は村から遠くへ出るんじゃないぞ。",
      "ペトア島の森には、昔から人が踏み込まない場所がある。約束は守るためにある。",
    ],
    fact: "forest",
  },
  {
    id: "fisher",
    name: "漁師",
    x: 22,
    y: 19,
    character: "fisher",
    lines: [
      "沖の潮が変わった。ウリシアの家にも魚を届けておいてくれ。",
      "戦の話は酒場でするもんだ。子どもが背負うには、網より重い。",
    ],
    fact: "fishing",
  },
  {
    id: "child",
    name: "村の子",
    x: 30,
    y: 10,
    character: "child",
    lines: [
      "ペトア島まで競争したら、怒られるかな。",
      "やっぱり怒られるよね。向こうの森で変な鳴き声を聞いた人がいるんだって。",
    ],
    fact: "petoa",
  },
];

const postBridgeNpcLines = {
  urishia: [
    "チャトア……ごめんね。約束を破るつもりじゃなかったの。",
    "ひとりで行くなんて言わせたの、わたしのせいだよね。どうか無事で帰ってきて。",
  ],
  father: [
    "ひとりで舟を出す目をしているな。心配じゃないと言えば嘘になる。",
    "けれど、海を怖がるだけの子ではなくなったんだな。行くなら潮を見ろ。帰る道を忘れるな。",
  ],
};

const markers = [
  {
    id: "boat",
    name: "港の渡し場",
    x: 19,
    y: 22,
    lines: [
      "舟を出す場所だ。潮の匂いと、乾いた網の匂いがする。",
      "海の向こうにペトア島が見える。何度も渡ったはずなのに、今日は少し遠く見える。",
    ],
    fact: "petoa",
  },
  {
    id: "basket",
    name: "魚の籠",
    x: 23,
    y: 18,
    lines: ["朝に揚がった魚が並んでいる。ウペトア島の一日は、港から始まる。"],
    fact: "fishing",
  },
];

const decor = [
  { kind: "house", x: 4, y: 5, w: 3, h: 3 },
  { kind: "house", x: 13, y: 4, w: 3, h: 3 },
  { kind: "house", x: 25, y: 5, w: 4, h: 3 },
  { kind: "house", x: 5, y: 15, w: 3, h: 2 },
  { kind: "house", x: 23, y: 15, w: 4, h: 3 },
  { kind: "house", x: 29, y: 12, w: 3, h: 2 },
  { kind: "dock", x: 16, y: 22, w: 6, h: 2 },
  { kind: "crate", x: 20, y: 18, w: 1, h: 1 },
  { kind: "crate", x: 24, y: 19, w: 1, h: 1 },
  { kind: "barrel", x: 6, y: 9, w: 1, h: 1 },
  { kind: "barrel", x: 31, y: 11, w: 1, h: 1 },
];

const chatoaHouseMarkers = [
  {
    id: "fathers-net",
    name: "父の網",
    x: 2,
    y: 3,
    lines: [
      "何度も繕われた漁網だ。結び目には、父の手の癖が残っている。",
      "海で生きることは、毎日を少しずつ直しながら進むことなのかもしれない。",
    ],
    fact: "fishing",
    frame: "basket",
  },
  {
    id: "chatoa-bed",
    name: "チャトアの寝床",
    x: 2,
    y: 2,
    lines: ["小さな寝床。枕元には、拾った貝殻がひとつ置いてある。"],
    fact: "petoa",
    frame: "bed",
  },
];

const urishiaHouseMarkers = [
  {
    id: "shell-box",
    name: "貝殻の小箱",
    x: 7,
    y: 3,
    lines: [
      "色の違う貝殻がきれいに並べられている。",
      "ウリシアは、海辺で見つけたものを宝物みたいにしまっている。",
    ],
    fact: "urishia",
    frame: "chest",
  },
];

const chiefHouseMarkers = [
  {
    id: "village-ledger",
    name: "村長の記録帳",
    x: 7,
    y: 3,
    lines: [
      "古い記録帳だ。潮の満ち引き、漁の量、ペトア島へ渡ろうとした者の名前まで細かく記されている。",
      "村長ウトパスは、村の約束をただの言い伝えとして扱っていないようだ。",
    ],
    fact: "forest",
    frame: "chest",
  },
  {
    id: "chief-shelf",
    name: "村長の棚",
    x: 9,
    y: 2,
    lines: ["棚には、古い地図と貝殻で留められた書き付けが並んでいる。"],
    fact: "petoa",
    frame: "shelf",
  },
];

const interiorDecor = {
  chatoaHouse: [
    { kind: "bed", x: 1, y: 2, w: 3, h: 2 },
    { kind: "table", x: 5, y: 3, w: 2, h: 2 },
    { kind: "shelf", x: 9, y: 1, w: 2, h: 2 },
    { kind: "basket", x: 2, y: 4, w: 1, h: 1 },
    { kind: "rug", x: 4, y: 6, w: 2, h: 1 },
    { kind: "door", x: 5, y: 8, w: 1, h: 1 },
  ],
  urishiaHouse: [
    { kind: "bed", x: 1, y: 2, w: 3, h: 2 },
    { kind: "table", x: 5, y: 3, w: 2, h: 2 },
    { kind: "chest", x: 7, y: 3, w: 1, h: 1 },
    { kind: "shelf", x: 9, y: 1, w: 2, h: 2 },
    { kind: "rug", x: 4, y: 6, w: 2, h: 1 },
    { kind: "door", x: 5, y: 8, w: 1, h: 1 },
  ],
  chiefHouse: [
    { kind: "table", x: 4, y: 3, w: 2, h: 2 },
    { kind: "shelf", x: 1, y: 1, w: 2, h: 2 },
    { kind: "shelf", x: 9, y: 1, w: 2, h: 2 },
    { kind: "chest", x: 7, y: 3, w: 1, h: 1 },
    { kind: "rug", x: 4, y: 6, w: 2, h: 1 },
    { kind: "door", x: 5, y: 8, w: 1, h: 1 },
  ],
};

const INTERIOR_MAP = [
  "############",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#...RRR....#",
  "#..........#",
  "#####D######",
];

const MAPS = {
  outside: {
    id: "outside",
    type: "outside",
    rows: OUTSIDE_MAP,
    solid: OUTSIDE_SOLID,
    npcs,
    markers,
    decor,
    background: "#2b774a",
    exits: [
      { x: 5, y: 16, to: "chatoaHouse", enterX: 5, enterY: 7, facing: "up" },
      { x: 5, y: 7, to: "urishiaHouse", enterX: 5, enterY: 7, facing: "up" },
      { x: 14, y: 6, to: "chiefHouse", enterX: 5, enterY: 7, facing: "up" },
    ],
  },
  chatoaHouse: {
    id: "chatoaHouse",
    type: "interior",
    rows: INTERIOR_MAP,
    solid: INTERIOR_SOLID,
    npcs: [],
    markers: chatoaHouseMarkers,
    decor: interiorDecor.chatoaHouse,
    background: "#2c2018",
    exits: [{ x: 5, y: 8, to: "outside", enterX: 5, enterY: 17, facing: "down" }],
  },
  urishiaHouse: {
    id: "urishiaHouse",
    type: "interior",
    rows: INTERIOR_MAP,
    solid: INTERIOR_SOLID,
    npcs: [],
    markers: urishiaHouseMarkers,
    decor: interiorDecor.urishiaHouse,
    background: "#2c2018",
    exits: [{ x: 5, y: 8, to: "outside", enterX: 5, enterY: 8, facing: "down" }],
  },
  chiefHouse: {
    id: "chiefHouse",
    type: "interior",
    rows: INTERIOR_MAP,
    solid: INTERIOR_SOLID,
    npcs: [],
    markers: chiefHouseMarkers,
    decor: interiorDecor.chiefHouse,
    background: "#2c2018",
    exits: [{ x: 5, y: 8, to: "outside", enterX: 14, enterY: 7, facing: "down" }],
  },
};

const dom = {
  dialog: document.querySelector("#dialog"),
  speaker: document.querySelector("#speaker"),
  message: document.querySelector("#message"),
  nextButton: document.querySelector("#next-button"),
  questList: document.querySelector("#quest-list"),
  stepLabel: document.querySelector("#step-label"),
  timeLabel: document.querySelector("#time-label"),
  hint: document.querySelector("#hint"),
  titleScreen: document.querySelector("#title-screen"),
  startButton: document.querySelector("#start-button"),
  touchRun: document.querySelector("#touch-run"),
  touchAction: document.querySelector("#touch-action"),
};

const createInitialState = () => ({
  mapId: "outside",
  x: 18,
  y: 19,
  facing: "up",
  steps: 0,
  running: false,
  touchRunning: false,
  busy: false,
  moving: false,
  cleared: false,
  bridgeStarted: false,
  scene2BoatAvailable: false,
  scene2Started: false,
  facts: new Set(),
  talked: new Set(),
  activeDialog: null,
  dialogIndex: 0,
  scene: null,
});
const state = createInitialState();

function tileCenter(value) {
  return value * TILE_SIZE + TILE_SIZE / 2;
}

function currentMap() {
  return MAPS[state.mapId];
}

function mapWidth(map = currentMap()) {
  return map.rows[0].length;
}

function mapHeight(map = currentMap()) {
  return map.rows.length;
}

function mapCell(x, y) {
  const map = currentMap();
  if (x < 0 || y < 0 || x >= mapWidth(map) || y >= mapHeight(map)) return "";
  return map.rows[y][x];
}

function baseGroundFrame(cell, x, y) {
  if (cell === "G" || cell === "H") return (x * 3 + y * 5) % 11 === 0 ? GROUND_FRAME.grassAlt : GROUND_FRAME.grass;
  if (cell === "S") return GROUND_FRAME.sand;
  if (cell === "W") return GROUND_FRAME.water;
  if (cell === "T") return GROUND_FRAME.tree;
  if (cell === "D") return GROUND_FRAME.water; // The complete dock sprite covers these walkable cells.
  if (cell === "R") return GROUND_FRAME.rock;
  if (cell === "F") return GROUND_FRAME.flowers;
  return GROUND_FRAME.grass;
}

function pathGroundFrame(x, y, cellAt = mapCell) {
  const up = cellAt(x, y - 1) === "P";
  const right = cellAt(x + 1, y) === "P";
  const down = cellAt(x, y + 1) === "P";
  const left = cellAt(x - 1, y) === "P";
  const count = [up, right, down, left].filter(Boolean).length;

  if (count >= 4) return GROUND_FRAME.pathCross;
  if (up && right && left) return GROUND_FRAME.pathTUp;
  if (right && down && left) return GROUND_FRAME.pathTDown;
  if (up && right && down) return GROUND_FRAME.pathTRight;
  if (up && down && left) return GROUND_FRAME.pathTLeft;
  if (up && down) return GROUND_FRAME.pathVertical;
  if (left && right) return GROUND_FRAME.pathHorizontal;
  if (up && right) return GROUND_FRAME.pathCornerUpRight;
  if (up && left) return GROUND_FRAME.pathCornerUpLeft;
  if (down && right) return GROUND_FRAME.pathCornerDownRight;
  if (down && left) return GROUND_FRAME.pathCornerDownLeft;
  if (up) return GROUND_FRAME.pathEndUp;
  if (right) return GROUND_FRAME.pathEndRight;
  if (down) return GROUND_FRAME.pathEndDown;
  if (left) return GROUND_FRAME.pathEndLeft;
  return GROUND_FRAME.pathFull;
}

function directionFromKey(code) {
  return {
    ArrowUp: { dx: 0, dy: -1, facing: "up" },
    KeyW: { dx: 0, dy: -1, facing: "up" },
    ArrowDown: { dx: 0, dy: 1, facing: "down" },
    KeyS: { dx: 0, dy: 1, facing: "down" },
    ArrowLeft: { dx: -1, dy: 0, facing: "left" },
    KeyA: { dx: -1, dy: 0, facing: "left" },
    ArrowRight: { dx: 1, dy: 0, facing: "right" },
    KeyD: { dx: 1, dy: 0, facing: "right" },
  }[code];
}

function activeDirection(scene) {
  if (scene.keys.left.isDown || scene.keys.a.isDown) return { dx: -1, dy: 0, facing: "left" };
  if (scene.keys.right.isDown || scene.keys.d.isDown) return { dx: 1, dy: 0, facing: "right" };
  if (scene.keys.up.isDown || scene.keys.w.isDown) return { dx: 0, dy: -1, facing: "up" };
  if (scene.keys.down.isDown || scene.keys.s.isDown) return { dx: 0, dy: 1, facing: "down" };
  return null;
}

const MOVE_DIRECTIONS = [
  { dx: 0, dy: -1, facing: "up" },
  { dx: 0, dy: 1, facing: "down" },
  { dx: -1, dy: 0, facing: "left" },
  { dx: 1, dy: 0, facing: "right" },
];

function isHorizontal(facing) {
  return facing === "left" || facing === "right";
}

function moveDuration(facing) {
  if (isHorizontal(facing)) return state.running ? 250 : 390;
  return state.running ? 190 : 320;
}

function targetTile() {
  const delta = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  }[state.facing];
  return { x: state.x + delta[0], y: state.y + delta[1] };
}

function isScene2BoatTile(x, y) {
  return state.scene2BoatAvailable && state.mapId === "outside" && x === SCENE2_BOAT_TILE.x && y === SCENE2_BOAT_TILE.y;
}

function characterDepth(y) {
  return CHARACTER_DEPTH_BASE + y;
}

function oppositeFacing(facing) {
  return {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  }[facing] ?? "down";
}

function directionBetween(fromX, fromY, toX, toY) {
  if (toX > fromX) return "right";
  if (toX < fromX) return "left";
  if (toY > fromY) return "down";
  if (toY < fromY) return "up";
  return "down";
}

function adjacentTiles(x, y) {
  return [
    { x: x + 1, y, facing: "right" },
    { x: x - 1, y, facing: "left" },
    { x, y: y + 1, facing: "down" },
    { x, y: y - 1, facing: "up" },
  ];
}

function isBlocked(x, y) {
  const map = currentMap();
  if (x < 0 || y < 0 || x >= mapWidth(map) || y >= mapHeight(map)) return true;
  if (map.solid.has(map.rows[y][x])) return true;
  const blockedByNpc = map.npcs.some((npc) => npc.x === x && npc.y === y || npc.fromX === x && npc.fromY === y);
  const blockedByDecor = map.decor.some((entry) => {
    if (entry.kind === "door" || entry.kind === "rug" || entry.kind === "dock") return false;
    return x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h;
  });
  return blockedByNpc || blockedByDecor;
}

function isNpcMoveBlocked(map, npc, x, y) {
  if (x < 0 || y < 0 || x >= mapWidth(map) || y >= mapHeight(map)) return true;
  if (map.solid.has(map.rows[y][x])) return true;
  if (state.mapId === map.id && state.x === x && state.y === y) return true;
  if (map.npcs.some((other) => other !== npc && (other.x === x && other.y === y || other.fromX === x && other.fromY === y))) return true;
  return map.decor.some((entry) => {
    if (entry.kind === "door" || entry.kind === "rug" || entry.kind === "dock") return false;
    return x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h;
  });
}

function canNpcWander(npc, map) {
  return map.type === "outside" && npc.id !== "father" && npc.id !== "utopas";
}

function randomBetween(min, max) {
  return Phaser.Math.Between(min, max);
}

function startScene2Transition() {
  if (state.scene2Started) return;
  state.scene2Started = true;
  openDialog({
    name: "チャトア",
    lines: [
      "小さな舟が、朝の波に軽く揺れている。",
      "チャトアは櫂を握りしめ、ウペトア島の港を振り返らずに漕ぎ出した。",
      "SCENE 2：ペトア島へ",
    ],
    fact: "scene2",
    onComplete: () => {
      state.scene?.scene.start("PetoaIslandScene");
    },
  });
  dom.hint.textContent = "チャトアはペトア島へ向かった。";
}

function renderQuests() {
  dom.questList.innerHTML = "";
  quests.forEach((quest) => {
    const li = document.createElement("li");
    li.textContent = `${state.facts.has(quest.id) ? "✓" : "□"} ${quest.label}`;
    li.className = state.facts.has(quest.id) ? "done" : "";
    dom.questList.append(li);
  });
}

function updateHud() {
  dom.stepLabel.textContent = `${state.steps}歩`;
  dom.timeLabel.textContent = state.steps > 70 ? "昼前" : "朝";
}

function updateStoryFacts(source) {
  if (source.id === "father" || source.id === "utopas") state.talked.add(source.id);
  if (state.talked.has("father") && state.talked.has("utopas")) state.facts.add("chiefFather");
}

function dialogSourceForNpc(npc) {
  if (state.scene2BoatAvailable && postBridgeNpcLines[npc.id]) {
    return {
      ...npc,
      lines: postBridgeNpcLines[npc.id],
      fact: null,
    };
  }
  return npc;
}

function openDialog(source) {
  state.busy = true;
  state.activeDialog = source;
  state.dialogIndex = 0;
  state.scene?.player?.anims.stop();
  if (state.scene?.player) state.scene.setCharacterDirection(state.scene.player, PLAYER_CHARACTER, state.facing);
  dom.dialog.hidden = false;
  dom.speaker.textContent = source.name;
  dom.message.textContent = source.lines[0];
  dom.nextButton.textContent = source.lines.length > 1 ? "つづける" : "閉じる";
}

function closeDialog() {
  state.busy = false;
  state.activeDialog = null;
  state.dialogIndex = 0;
  dom.dialog.hidden = true;
}

function checkClear() {
  if (state.bridgeStarted) return;
  const complete = quests.every((quest) => state.facts.has(quest.id));
  if (!complete) return;
  state.bridgeStarted = true;
  const bridgeDialog = {
    name: "チャトアとウリシア",
    lines: [
      "ウリシア「ごめん、チャトア。今日は父さんの網を手伝わないといけなくなったの。」",
      "チャトア「約束したじゃないか。ペトア島へ行くって。」",
      "ウリシア「行きたいよ。でも、潮が変わって、家の仕事を放っておけないの。」",
      "チャトア「じゃあ、ぼくひとりで行く。父さんの小舟なら港に出せる。」",
      "ウリシア「待って、ひとりでは危ないよ！」",
      "チャトア「少し見に行くだけだよ。いつもの浜までなら、ぼくだって何度も行ってる。」",
    ],
    fact: "chapter1",
    onComplete: () => {
      state.cleared = true;
      state.scene2BoatAvailable = true;
      state.scene?.refreshCurrentMap();
      dom.hint.textContent = "港に小さな舟が出ている。入口の印へ向かおう。";
    },
  };
  dom.hint.textContent = "ウリシアが港へ向かってきた。";
  state.scene?.playUrishiaBridgeIntro(bridgeDialog);
}

function advanceDialog() {
  if (!state.scene?.sys.isActive() || !state.activeDialog) return;
  const source = state.activeDialog;
  state.dialogIndex += 1;
  if (state.dialogIndex < source.lines.length) {
    dom.message.textContent = source.lines[state.dialogIndex];
    dom.nextButton.textContent = state.dialogIndex === source.lines.length - 1 ? "閉じる" : "つづける";
    return;
  }

  if (source.fact) state.facts.add(source.fact);
  updateStoryFacts(source);
  closeDialog();
  source.onComplete?.();
  renderQuests();
  checkClear();
}

function interact() {
  if (!state.scene?.sys.isActive()) return;
  if (state.activeDialog) {
    advanceDialog();
    return;
  }

  const target = targetTile();
  const map = currentMap();
  const npc = map.npcs.find((entry) => entry.x === target.x && entry.y === target.y);
  if (npc) {
    npc.facing = oppositeFacing(state.facing);
    state.scene?.setNpcDirection(npc, npc.facing);
    openDialog(dialogSourceForNpc(npc));
    return;
  }

  const marker = map.markers.find((entry) => entry.x === target.x && entry.y === target.y);
  if (marker) {
    if (marker.id === "boat" && state.scene2BoatAvailable) {
      startScene2Transition();
      return;
    }
    openDialog(marker);
    return;
  }

  dom.hint.textContent = "目の前には、特に調べられるものはない。";
}

export class UpetoaVillageScene extends Phaser.Scene {
  constructor() {
    super("UpetoaVillageScene");
    this.player = null;
    this.keys = null;
    this.queuedDirection = null;
    this.mapSprites = [];
    this.npcSprites = new Map();
    this.npcWanderTimers = [];
  }

  init() {
    Object.assign(state, createInitialState());
    this.player = null;
    this.keys = null;
    this.queuedDirection = null;
    this.mapSprites = [];
    this.npcSprites = new Map();
    this.npcWanderTimers = [];
  }

  preload() {
    this.load.image("sailboatSmall", "./assets/img/objects/sailboat-small-v1.png");
    this.load.image("villageDockPixel", "./assets/img/objects/village-dock-pixel-v1.png");
    this.load.spritesheet("villageGround", "./assets/img/tiles/village/village-ground-retro-v2.png", {
      frameWidth: SOURCE_TILE_SIZE,
      frameHeight: SOURCE_TILE_SIZE,
    });
    this.load.atlas(
      "villageObjects",
      "./assets/img/tiles/village/fishing-village-objects-retro.png",
      "./assets/img/tiles/village/fishing-village-objects.json",
    );
    this.load.spritesheet("interiorGround", "./assets/img/tiles/interior/interior-ground-retro.png", {
      frameWidth: SOURCE_TILE_SIZE,
      frameHeight: SOURCE_TILE_SIZE,
    });
    this.load.atlas(
      "interiorObjects",
      "./assets/img/tiles/interior/interior-objects-retro.png",
      "./assets/img/tiles/interior/interior-objects.json",
    );
    this.load.json(PLAYER_CHARACTER.metaKey, PLAYER_CHARACTER.metaPath);
    this.load.spritesheet(PLAYER_CHARACTER.key, PLAYER_CHARACTER.imagePath, {
      frameWidth: PLAYER_CHARACTER.frameWidth,
      frameHeight: PLAYER_CHARACTER.frameHeight,
    });
    Object.values(NPC_CHARACTERS).forEach((character) => {
      this.load.json(character.metaKey, character.metaPath);
      this.load.spritesheet(character.key, character.imagePath, {
        frameWidth: character.frameWidth,
        frameHeight: character.frameHeight,
      });
    });
  }

  create() {
    state.scene = this;
    this.createPlayerAnimations();
    this.renderCurrentMap();
    this.player = this.add.sprite(tileCenter(state.x), tileCenter(state.y) + SPRITE_Y_OFFSET, PLAYER_CHARACTER.key, 0);
    this.applyCharacterDisplay(this.player);
    this.player.setDepth(characterDepth(state.y));
    this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);

    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);

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

    this.input.keyboard.on("keydown", (event) => {
      const direction = directionFromKey(event.code);
      if (direction) {
        event.preventDefault();
        this.queuedDirection = direction;
        this.tryStartMove(direction);
      }
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        interact();
      }
    });

    updateHud();
    renderQuests();
  }

  isSaveBusy(){return state.busy||state.moving||!!state.activeDialog;}
  getSaveProgress(){
    return {mapId:state.mapId,x:state.x,y:state.y,facing:state.facing,steps:state.steps,cleared:state.cleared,bridgeStarted:state.bridgeStarted,scene2BoatAvailable:state.scene2BoatAvailable,scene2Started:state.scene2Started,facts:state.facts,talked:state.talked};
  }
  restoreSaveProgress(saved){
    if(!MAPS[saved.mapId])return;
    for(const key of ['mapId','x','y','facing','steps','cleared','bridgeStarted','scene2BoatAvailable','scene2Started','facts','talked'])if(saved[key]!==undefined)state[key]=saved[key];
    state.busy=false;state.moving=false;state.activeDialog=null;state.running=false;state.touchRunning=false;
    this.queuedDirection=null;this.refreshCurrentMap();
    this.player.setPosition(tileCenter(state.x),tileCenter(state.y)+SPRITE_Y_OFFSET);this.setCharacterDirection(this.player,PLAYER_CHARACTER,state.facing);updateHud();renderQuests();
  }

  track(sprite) {
    if (sprite) this.mapSprites.push(sprite);
    return sprite;
  }

  clearCurrentMap() {
    this.npcWanderTimers.forEach((timer) => timer.remove(false));
    this.npcWanderTimers = [];
    this.npcSprites.clear();
    this.mapSprites.forEach((sprite) => sprite.destroy());
    this.mapSprites = [];
  }

  renderCurrentMap() {
    const map = currentMap();
    this.cameras.main.setBounds(0, 0, mapWidth(map) * TILE_SIZE, mapHeight(map) * TILE_SIZE);
    this.cameras.main.setBackgroundColor(map.background);

    map.rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        const frame = map.type === "outside" ? this.outsideGroundFrame(cell, x, y) : this.interiorGroundFrame(cell, x, y);
        const key = map.type === "outside" ? "villageGround" : "interiorGround";
        const tile = this.add.image(tileCenter(x), tileCenter(y), key, frame);
        tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
        tile.setDepth(y);
        this.track(tile);
      });
    });

    map.decor.forEach((entry) => this.track(map.type === "outside" ? this.addDecor(entry) : this.addInteriorDecor(entry)));
    if (map.type === "outside") map.exits.forEach((entry) => this.track(this.addExitHint(entry)));
    map.markers.forEach((entry) => this.track(map.type === "outside" ? this.addMarker(entry) : this.addInteriorMarker(entry)));
    if (map.type === "outside" && state.scene2BoatAvailable) {
      this.track(this.addScene2Boat());
      this.track(this.addExitHint(SCENE2_BOAT_TILE));
    }

    map.npcs.forEach((npc) => {
      const character = this.npcCharacter(npc);
      const sprite = this.add.sprite(tileCenter(npc.x), tileCenter(npc.y) + SPRITE_Y_OFFSET, character.key, 0);
      this.applyCharacterDisplay(sprite, this.characterMeta(character));
      this.setCharacterDirection(sprite, character, npc.facing ?? "down");
      if (npc.tint) sprite.setTint(npc.tint);
      sprite.setDepth(characterDepth(npc.y));
      this.npcSprites.set(npc.id, sprite);
      this.track(sprite);
      if (canNpcWander(npc, map)) this.scheduleNpcWander(npc);
    });
  }

  changeMap(exit) {
    if (state.moving || state.busy) return;
    state.mapId = exit.to;
    state.x = exit.enterX;
    state.y = exit.enterY;
    state.facing = exit.facing;
    this.clearCurrentMap();
    this.renderCurrentMap();
    this.player.setPosition(tileCenter(state.x), tileCenter(state.y) + SPRITE_Y_OFFSET);
    this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
    this.player.setDepth(characterDepth(state.y));
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    dom.hint.textContent = state.mapId === "outside" ? "外へ出た。" : "家の中に入った。気になるものは調べられる。";
  }

  refreshCurrentMap() {
    this.clearCurrentMap();
    this.renderCurrentMap();
    this.player.setDepth(characterDepth(state.y));
  }

  playUrishiaBridgeIntro(dialog) {
    if (state.mapId !== "outside") {
      state.mapId = "outside";
      state.x = 18;
      state.y = 19;
      state.facing = "up";
      this.clearCurrentMap();
      this.renderCurrentMap();
      this.player.setPosition(tileCenter(state.x), tileCenter(state.y) + SPRITE_Y_OFFSET);
      this.player.setDepth(characterDepth(state.y));
      this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    }

    state.busy = true;
    state.moving = false;
    state.running = false;
    this.queuedDirection = null;
    this.player.anims.stop();

    const npc = npcs.find((entry) => entry.id === "urishia");
    const sprite = this.npcSprites.get("urishia");
    if (!npc || !sprite) {
      openDialog(dialog);
      return;
    }

    const target = adjacentTiles(state.x, state.y).find((entry) => !isNpcMoveBlocked(currentMap(), npc, entry.x, entry.y));
    if (!target) {
      openDialog(dialog);
      return;
    }

    const fromX = npc.x;
    const fromY = npc.y;
    npc.moving = true;
    delete npc.fromX;
    delete npc.fromY;
    npc.x = target.x;
    npc.y = target.y;
    npc.facing = oppositeFacing(target.facing);
    state.facing = target.facing;
    this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
    this.setNpcDirection(npc, directionBetween(fromX, fromY, target.x, target.y));
    sprite.setDepth(characterDepth(target.y));
    this.cameras.main.pan(tileCenter(state.x), tileCenter(state.y), 320, "Sine.easeInOut", true);

    this.tweens.add({
      targets: sprite,
      x: tileCenter(target.x),
      y: tileCenter(target.y) + SPRITE_Y_OFFSET,
      duration: 620,
      ease: "Sine.easeInOut",
      onComplete: () => {
        npc.moving = false;
        this.setNpcDirection(npc, npc.facing);
        openDialog(dialog);
      },
    });
  }

  outsideGroundFrame(cell, x, y) {
    return cell === "P" ? pathGroundFrame(x, y) : baseGroundFrame(cell, x, y);
  }

  interiorGroundFrame(cell, x, y) {
    if (cell === "#") return INTERIOR_FRAME.wall;
    if (cell === "R") return INTERIOR_FRAME.rug;
    if (cell === "D") return INTERIOR_FRAME.floor;
    return (x + y) % 7 === 0 ? INTERIOR_FRAME.plank : INTERIOR_FRAME.floor;
  }

  update() {
    state.running = false;
    if (!state.moving && !state.busy) {
      this.tryStartMove(this.queuedDirection ?? activeDirection(this));
    }
    if (!activeDirection(this)) this.queuedDirection = null;
  }

  scheduleNpcWander(npc) {
    const timer = this.time.delayedCall(randomBetween(NPC_WANDER_STEP_MS.min, NPC_WANDER_STEP_MS.max), () => {
      this.tryMoveNpc(npc);
      if (state.mapId === "outside" && this.npcSprites.has(npc.id)) this.scheduleNpcWander(npc);
    });
    this.npcWanderTimers.push(timer);
  }

  tryMoveNpc(npc) {
    if (state.busy || state.mapId !== "outside") return;
    if (npc.moving) return;

    npc.homeX ??= npc.x;
    npc.homeY ??= npc.y;
    const candidates = Phaser.Utils.Array.Shuffle([...MOVE_DIRECTIONS, null]);
    const direction = candidates.find((entry) => {
      if (!entry) return true;
      const nx = npc.x + entry.dx;
      const ny = npc.y + entry.dy;
      if (Math.abs(nx - npc.homeX) > NPC_WANDER_RADIUS || Math.abs(ny - npc.homeY) > NPC_WANDER_RADIUS) return false;
      return !isNpcMoveBlocked(currentMap(), npc, nx, ny);
    });

    if (!direction) return;
    if (direction === null) {
      const idleFacing = npc.facing ?? MOVE_DIRECTIONS[randomBetween(0, MOVE_DIRECTIONS.length - 1)].facing;
      this.setNpcDirection(npc, idleFacing);
      return;
    }

    const sprite = this.npcSprites.get(npc.id);
    if (!sprite) return;

    npc.moving = true;
    npc.facing = direction.facing;
    const nx = npc.x + direction.dx;
    const ny = npc.y + direction.dy;
    npc.fromX = npc.x;
    npc.fromY = npc.y;
    npc.x = nx;
    npc.y = ny;
    this.setNpcDirection(npc, direction.facing);
    sprite.setDepth(characterDepth(ny));

    this.tweens.add({
      targets: sprite,
      x: tileCenter(nx),
      y: tileCenter(ny) + SPRITE_Y_OFFSET,
      duration: 520,
      ease: "Linear",
      onComplete: () => {
        npc.moving = false;
        delete npc.fromX;
        delete npc.fromY;
      },
    });
  }

  addDecor(entry) {
    const x = entry.x * TILE_SIZE;
    const y = entry.y * TILE_SIZE;
    if (entry.kind === "house") {
      const frame = entry.w >= 4 ? "house-shop" : entry.h <= 2 ? "shed" : "house-blue";
      const sprite = this.add.image(x, y, "villageObjects", frame);
      sprite.setOrigin(0, 0);
      sprite.setScale(WORLD_SCALE);
      sprite.setDepth(40 + entry.y);
      return sprite;
    }
    if (entry.kind === "dock") {
      // Overhang lets the posts sit at the edges and joins the deck to the shore.
      this.textures.get("villageDockPixel").setFilter(Phaser.Textures.FilterMode.NEAREST);
      return this.add.image(x - 6, y - 12, "villageDockPixel")
        .setOrigin(0, 0)
        .setDisplaySize(entry.w * TILE_SIZE + 12, entry.h * TILE_SIZE + 20)
        .setDepth(40 + entry.y);
    }
    if (entry.kind === "lamp") {
      const sprite = this.add.image(x, y - TILE_SIZE, "villageObjects", "lamp");
      sprite.setOrigin(0, 0);
      sprite.setScale(WORLD_SCALE);
      sprite.setDepth(40 + entry.y);
      return sprite;
    }
    if (entry.kind === "barrel") {
      const sprite = this.add.image(x, y, "villageObjects", "barrel");
      sprite.setOrigin(0, 0);
      sprite.setScale(WORLD_SCALE);
      sprite.setDepth(40 + entry.y);
      return sprite;
    }
    const sprite = this.add.image(x, y, "villageObjects", "crate");
    sprite.setOrigin(0, 0);
    sprite.setScale(WORLD_SCALE);
    sprite.setDepth(40 + entry.y);
    return sprite;
  }

  addMarker(entry) {
    const x = entry.x * TILE_SIZE;
    const y = entry.y * TILE_SIZE;
    if (entry.id === "boat") {
      return null;
    }
    const sprite = this.add.image(x, y, "villageObjects", "basket");
    sprite.setOrigin(0, 0);
    sprite.setScale(WORLD_SCALE);
    sprite.setDepth(70);
    return sprite;
  }

  addScene2Boat() {
    // Use the same sprite and display size as the sea-crossing scene.
    const x = tileCenter(SCENE2_BOAT_TILE.x);
    const y = (SCENE2_BOAT_TILE.y + 1) * TILE_SIZE + 36;
    return this.add.image(x, y, "sailboatSmall")
      .setDisplaySize(72, 96)
      .setDepth(77 + SCENE2_BOAT_TILE.y);
  }

  addExitHint(entry) {
    const x = entry.x * TILE_SIZE;
    const y = entry.y * TILE_SIZE;
    return drawRouteMarker(this, { x: x + 24, y: y + 28, depth: 78 + entry.y, scale: 0.42 });
  }

  addInteriorDecor(entry) {
    const x = entry.x * TILE_SIZE;
    const y = entry.y * TILE_SIZE;
    const frame = {
      bed: "bed",
      table: "table",
      shelf: "shelf",
      chest: "chest",
      rug: "rug",
      door: "door",
      basket: "basket",
    }[entry.kind];
    const sprite = this.add.image(x, y, "interiorObjects", frame);
    sprite.setOrigin(0, 0);
    sprite.setScale(WORLD_SCALE);
    sprite.setDepth(40 + entry.y);
    return sprite;
  }

  addInteriorMarker(entry) {
    const sprite = this.add.image(entry.x * TILE_SIZE, entry.y * TILE_SIZE, "interiorObjects", entry.frame ?? "chest");
    sprite.setOrigin(0, 0);
    sprite.setScale(WORLD_SCALE);
    sprite.setAlpha(0.01);
    sprite.setDepth(70);
    return sprite;
  }

  characterMeta(character = PLAYER_CHARACTER) {
    return this.cache.json.get(character.metaKey);
  }

  npcCharacter(npc) {
    return NPC_CHARACTERS[npc.character] ?? PLAYER_CHARACTER;
  }

  applyCharacterDisplay(sprite, meta = this.characterMeta(), character = PLAYER_CHARACTER) {
    sprite.setDisplaySize(meta.displayWidth ?? character.frameWidth * PLAYER_SCALE, meta.displayHeight ?? character.frameHeight * PLAYER_SCALE);
    sprite.setOrigin(0.5, 0.78);
  }

  setNpcDirection(npc, facing) {
    const sprite = this.npcSprites.get(npc.id);
    if (!sprite) return;
    this.setCharacterDirection(sprite, this.npcCharacter(npc), facing);
  }

  setCharacterDirection(sprite, character, facing) {
    const meta = this.characterMeta(character);
    const frame = meta.frames?.[facing]?.[0] ?? directionFrame(meta, facing).column;
    sprite.setFrame(frameIndex(meta, facing, frame));
  }

  createPlayerAnimations() {
    const meta = this.characterMeta();
    Object.keys(meta.directions ?? { down: 0, left: 1, right: 2, up: 3 }).forEach((direction) => {
      const idleFrame = directionFrame(meta, direction);
      this.textures.get(PLAYER_CHARACTER.key).add(
        `${direction}-idle`,
        0,
        idleFrame.column * meta.frameWidth,
        idleFrame.row * meta.frameHeight,
        meta.frameWidth,
        meta.frameHeight,
      );
      const columns = meta.frames?.[direction] ?? [0, 1, 2, 3];
      this.anims.create({
        key: `walk-${direction}`,
        frames: columns.map((column) => ({ key: PLAYER_CHARACTER.key, frame: frameIndex(meta, direction, column) })),
        frameRate: meta.animation?.frameRate?.[direction] ?? (isHorizontal(direction) ? 8 : 12),
        repeat: -1,
      });
    });
  }

  tryStartMove(direction) {
    if (!this.sys.isActive()) return;
    if (!direction || state.busy || state.moving) return;
    const nx = state.x + direction.dx;
    const ny = state.y + direction.dy;
    state.facing = direction.facing;
    if (isScene2BoatTile(nx, ny)) {
      this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
      startScene2Transition();
      return;
    }
    const exit = currentMap().exits.find((entry) => entry.x === nx && entry.y === ny);
    if (exit) {
      this.changeMap(exit);
      return;
    }

    if (isBlocked(nx, ny)) {
      this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
      dom.hint.textContent = "そこは通れない。近くにいる人や物は調べられる。";
      return;
    }

    state.moving = true;
    state.steps += state.running ? 2 : 1;
    updateHud();
    if (state.running) dom.hint.textContent = "足音が少し大きい。今はまだ平和な朝だ。";
    this.player.anims.stop();
    this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
    this.player.setDepth(characterDepth(ny));

    this.tweens.add({
      targets: this.player,
      x: tileCenter(nx),
      y: tileCenter(ny) + SPRITE_Y_OFFSET,
      duration: moveDuration(state.facing),
      ease: "Linear",
      onComplete: () => {
        state.x = nx;
        state.y = ny;
        state.moving = false;
        this.player.anims.stop();
        this.setCharacterDirection(this.player, PLAYER_CHARACTER, state.facing);
        this.tryStartMove(activeDirection(this));
      },
    });
  }
}

function directionFrame(meta, direction) {
  const value = meta.directions?.[direction] ?? 0;
  return meta.rows === 1 ? { row: 0, column: value } : { row: value, column: 0 };
}

function frameIndex(meta, direction, column) {
  return meta.rows === 1 ? column : (meta.directions?.[direction] ?? 0) * meta.columns + column;
}

function bindTouchControls() {
  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      const moves = {
        up: { dx: 0, dy: -1, facing: "up" },
        down: { dx: 0, dy: 1, facing: "down" },
        left: { dx: -1, dy: 0, facing: "left" },
        right: { dx: 1, dy: 0, facing: "right" },
      };
      state.scene?.tryStartMove(moves[button.dataset.dir]);
    });
  });

  dom.touchAction.addEventListener("click", interact);

}

dom.nextButton.addEventListener("click", advanceDialog);
bindTouchControls();

// Reuse the village artwork without starting chapter 1's story or mutating its state.
export function drawVillageExterior(scene) {
  OUTSIDE_MAP.forEach((row, y) => [...row].forEach((cell, x) => {
    const frame = cell === 'P' ? pathGroundFrame(x, y, (col, row) => OUTSIDE_MAP[row]?.[col]) : baseGroundFrame(cell, x, y);
    scene.add.image(tileCenter(x), tileCenter(y), 'villageGround', frame).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(y);
  }));
  for (const item of decor) UpetoaVillageScene.prototype.addDecor.call(scene, item);
  return { rows: OUTSIDE_MAP, solid: OUTSIDE_SOLID, tileSize: TILE_SIZE };
}
