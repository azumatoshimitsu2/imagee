import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/data/cave-map.js", import.meta.url), "utf8");
const mapUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { createCaveMap, cellCenter, canWalkAt, CAVE_START, CAVE_GOAL, CAVE_ITEMS, CAVE_SHARDS, TILE_SIZE } = await import(mapUrl);
const cells = createCaveMap();
const neighbors = (col, row) => [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]].filter(([x, y]) => cells[y]?.[x]);

test("all passages, pickups and the blue chamber are reachable with the player's collision size", () => {
  const queue = [[CAVE_START.col, CAVE_START.row]];
  const visited = new Set(queue.map(String));
  for (let i = 0; i < queue.length; i += 1) {
    const [col, row] = queue[i];
    const start = cellCenter({ col, row });
    for (const [x, y] of neighbors(col, row)) {
      const end = cellCenter({ col: x, row: y });
      for (let step = 0; step <= 12; step += 1) {
        assert.ok(canWalkAt(cells, start.x + (end.x - start.x) * step / 12, start.y + (end.y - start.y) * step / 12));
      }
      const key = String([x, y]);
      if (!visited.has(key)) { visited.add(key); queue.push([x, y]); }
    }
  }
  assert.equal(visited.size, cells.flat().filter(Boolean).length);
  for (const point of [CAVE_GOAL, ...CAVE_ITEMS, ...CAVE_SHARDS]) assert.ok(visited.has(String([point.col, point.row])));
});

test("wall interiors, map edges and passage sides block movement", () => {
  cells.forEach((row, y) => row.forEach((open, x) => {
    const center = cellCenter({ col: x, row: y });
    assert.equal(canWalkAt(cells, center.x, center.y), open);
  }));
  assert.equal(canWalkAt(cells, -1, -1), false);
  const start = cellCenter(CAVE_START);
  assert.equal(canWalkAt(cells, start.x - TILE_SIZE / 2 + 8, start.y), false);
});

test("there are both empty and item-bearing dead ends", () => {
  let empty = 0;
  let withItem = 0;
  cells.forEach((row, y) => row.forEach((open, x) => {
    if (!open || (x === CAVE_START.col && y === CAVE_START.row) || neighbors(x, y).length !== 1) return;
    if (CAVE_ITEMS.some(item => item.col === x && item.row === y)) withItem += 1;
    else empty += 1;
  }));
  assert.equal(withItem, 4);
  assert.ok(empty >= 3);
});

globalThis.Phaser = { Scene: class {}, Math: { Distance: { Between: (x, y, a, b) => Math.hypot(x - a, y - b) } } };
const sceneSource = (await readFile(new URL("../js/scenes/06-petoa-cave.js", import.meta.url), "utf8")).replace('"../data/cave-map.js"', JSON.stringify(mapUrl));
const { PetoaCaveScene } = await import(`data:text/javascript;base64,${Buffer.from(sceneSource).toString("base64")}`);

test("the luminous rock wall blocks movement while its approach remains accessible", () => {
  const scene = new PetoaCaveScene();
  scene.cells = cells;
  scene.goal = cellCenter(CAVE_GOAL);
  assert.equal(scene.canMoveTo(scene.goal.x, scene.goal.y - 30), false);
  assert.equal(scene.canMoveTo(scene.goal.x, scene.goal.y + 48), true);
  scene.player = { x: scene.goal.x, y: scene.goal.y + 48 };
  assert.equal(scene.nearGoal(), true);
});

test("a pickup is retained in scene registry and cannot be collected twice", () => {
  const scene = new PetoaCaveScene();
  const point = cellCenter(CAVE_ITEMS[0]);
  scene.player = point;
  scene.goal = cellCenter(CAVE_GOAL);
  scene.collected = new Set();
  let visible = true;
  scene.items = [{ ...CAVE_ITEMS[0], ...point, sprite: { setVisible: value => { visible = value; } } }];
  const saved = new Map();
  scene.registry = { set: (key, value) => saved.set(key, value) };
  scene.updateHud = () => {};
  scene.showStory = () => {};
  scene.interact();
  assert.equal(visible, false);
  assert.deepEqual(saved.get("caveCollectedItems"), [CAVE_ITEMS[0].id]);
  assert.equal(scene.nearbyItem(), undefined);
  scene.interact();
  assert.equal(scene.collected.size, 1);
});

test("forest arrival starts scene 6 only after its dialogue", async () => {
  const forestSource = (await readFile(new URL("../js/scenes/04-petoa-forest.js", import.meta.url), "utf8")).replace(/^import .*;\n/, "const drawRouteMarker = () => {};\n");
  globalThis.window = { location: { search: "" } };
  globalThis.document = { querySelector: () => ({}) };
  const { PetoaForestNightScene } = await import(`data:text/javascript;base64,${Buffer.from(forestSource).toString("base64")}`);
  const forest = new PetoaForestNightScene();
  let started = null;
  let story;
  forest.isInsideCaveArea = () => true;
  forest.updateMission = () => {};
  forest.player = {};
  forest.cameras = { main: { flash: () => {} } };
  forest.scene = { start: key => { started = key; } };
  forest.showStory = value => { story = value; };
  forest.checkCaveArrival();
  assert.equal(started, null);
  story.onComplete();
  assert.equal(started, "PetoaCaveScene");
});

test("three distinct shards are reachable in front of the rock wall", () => {
  assert.equal(CAVE_SHARDS.length, 3);
  assert.equal(new Set(CAVE_SHARDS.map(item => item.id)).size, 3);
  const scene = new PetoaCaveScene();
  scene.cells = cells;
  scene.goal = cellCenter(CAVE_GOAL);
  for (const item of CAVE_SHARDS) {
    const point = cellCenter(item);
    assert.equal(scene.canMoveTo(point.x, point.y), true);
    assert.ok(Math.hypot(point.x - scene.goal.x, point.y - scene.goal.y) <= TILE_SIZE * 2);
  }
});

test("chapter 4 starts only after all three shards and the final pickup dialogue", () => {
  const scene = new PetoaCaveScene();
  scene.collected = new Set(CAVE_ITEMS.map(item => item.id));
  scene.items = CAVE_SHARDS.map(item => ({ ...item, ...cellCenter(item), sprite: { setVisible() {} } }));
  scene.registry = { set() {} };
  scene.updateHud = () => {};
  let onComplete;
  scene.showStory = (_lines, done) => { onComplete = done; };
  let starts = 0;
  scene.beginChapter4 = () => { starts++; };
  assert.equal(scene.hasAllShards(), false);
  for (let i = 0; i < scene.items.length; i++) {
    scene.player = scene.items[i];
    scene.interact();
    assert.equal(scene.shardCount(), i + 1);
    assert.equal(scene.items.filter(item => !scene.collected.has(item.id)).length, 2 - i);
    assert.equal(starts, 0);
    onComplete();
  }
  assert.equal(starts, 1);
});

test("sleep transition blocks interaction and cannot restart chapter 4", () => {
  const scene = new PetoaCaveScene();
  scene.chapterTransition = true;
  scene.nearbyItem = () => { throw new Error('interaction during sleep'); };
  scene.interact();
  scene.beginChapter4();
  scene.chapterTransition = false;
  scene.isMorning = true;
  scene.beginChapter4();
});

test("morning turns the wall black, stops every blue light, and persists the chapter", () => {
  const scene = new PetoaCaveScene();
  const saved = new Map();
  scene.registry = { set: (key, value) => saved.set(key, value) };
  let wallTexture;
  scene.goal = cellCenter(CAVE_GOAL);
  scene.wall = { setTexture(key) { wallTexture = key; return this; }, clearTint() { return this; }, setDisplaySize() {} };
  const hidden = [];
  const stopped = [];
  scene.blueEffects = [0, 1, 2].map(id => ({ setVisible: visible => hidden.push([id, visible]) }));
  scene.blueEdges = [{ setTint: tint => assert.equal(tint, 0x202020) }];
  scene.tweens = { killTweensOf: effect => stopped.push(effect) };
  scene.player = { setAngle() { return this; }, setFrame() { return this; }, clearTint() {} };
  scene.updateHud = () => {};
  scene.applyMorning();
  assert.equal(wallTexture, 'blackBedrockPixel');
  assert.equal(scene.isMorning, true);
  assert.equal(saved.get('caveMorning'), true);
  assert.equal(stopped.length, 3);
  assert.deepEqual(hidden, [[0, false], [1, false], [2, false]]);
});

test('the room exit skips the cave only in the morning and transitions once after fading', () => {
  for (const point of [cellCenter({ col: 18, row: 3 })]) {
    const scene = new PetoaCaveScene();
    scene.cells = cells;
    scene.goal = cellCenter(CAVE_GOAL);
    assert.equal(scene.canMoveTo(point.x, point.y), true);
    scene.player = point;
    scene.input = { keyboard: { resetKeys() {} } };
    scene.dom = { hint: {} };
    let onFade;
    let fades = 0;
    let started;
    scene.cameras = { main: { once: (_event, fn) => { onFade = fn; }, fadeOut: () => { fades++; } } };
    scene.scene = { start: key => { started = key; } };
    assert.equal(scene.checkMorningExit(), false);
    scene.isMorning = true;
    scene.chapterTransition = true;
    assert.equal(scene.checkMorningExit(), false);
    scene.chapterTransition = false;
    scene.advanceStory = () => {};
    assert.equal(scene.checkMorningExit(), false);
    scene.advanceStory = null;
    scene.player = cellCenter({ col: 19, row: 3 });
    assert.equal(scene.checkMorningExit(), false);
    scene.player = point;
    assert.equal(scene.checkMorningExit(), true);
    assert.equal(started, undefined);
    assert.equal(scene.checkMorningExit(), false);
    assert.equal(fades, 1);
    onFade();
    assert.equal(started, 'PetoaForestMorningScene');
  }
});
