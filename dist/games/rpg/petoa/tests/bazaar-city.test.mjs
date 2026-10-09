import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../js/data/bazaar-city.js', import.meta.url), 'utf8');
const { CITY, CITY_ENTRY, TOPICS, CITY_NPCS, canWalkCity, learnTopic, giveAdbaShard } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('city area is three times Upetoa, with matching tile scale', async () => {
  const village = await readFile(new URL('../js/scenes/01-upetoa-village.js', import.meta.url), 'utf8');
  const value = name => Number(village.match(new RegExp(`const ${name} = (\\d+);`))[1]);
  assert.equal(CITY.columns * CITY.rows, value('WIDTH') * value('HEIGHT') * 3);
  assert.equal(CITY.tileSize, value('TILE_SIZE'));
  assert.equal(CITY.width, CITY.columns * CITY.tileSize);
  assert.equal(CITY.height, CITY.rows * CITY.tileSize);
});

test('every conversation is reachable from the entrance without crossing buildings or NPCs', () => {
  const canWalk = (x, y) => canWalkCity(x, y) && !CITY_NPCS.some(npc => Math.hypot(x - npc.x, y - npc.y) < 25);
  const queue = [[CITY_ENTRY.x, CITY_ENTRY.y]], visited = new Set([queue[0].join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[24, 0], [-24, 0], [0, 24], [0, -24]]) {
      const nx = x + dx, ny = y + dy, id = `${nx},${ny}`;
      if (visited.has(id) || !canWalk(nx, ny) || !canWalk(x + dx / 2, y + dy / 2)) continue;
      visited.add(id); queue.push([nx, ny]);
    }
  }
  for (const npc of CITY_NPCS) assert.ok(queue.some(([x, y]) => Math.hypot(x - npc.x, y - npc.y) < 80), `${npc.name} is unreachable`);
});

test('information can be gathered in any order and repeated conversations do not inflate progress', () => {
  let learned = [];
  for (const topic of [...TOPICS].reverse()) {
    assert.ok(CITY_NPCS.filter(npc => npc.topic === topic.id).length >= 2);
    learned = learnTopic(learned, topic.id);
    assert.deepEqual(learnTopic(learned, topic.id), learned);
  }
  assert.equal(learned.length, 5);
  assert.deepEqual(learnTopic(learned, 'unknown'), learned);
});

test('Adba receives only one shard, preserving the remaining inventory on repeat interaction', () => {
  const inventory = ['shell', 'blue-shard-2', 'blue-shard-3'];
  const result = giveAdbaShard(inventory, false);
  assert.equal(result.given, 'blue-shard-2');
  assert.deepEqual(result.inventory, ['shell', 'blue-shard-3']);
  assert.equal(inventory.length, 3);
  assert.deepEqual(giveAdbaShard(result.inventory, true), { inventory: result.inventory, given: null });
  assert.deepEqual(giveAdbaShard(['shell'], false), { inventory: ['shell'], given: null });
});

// Run the real interaction methods with rendering/DOM adapters replaced.
const sceneSource = await readFile(new URL('../js/scenes/13-bazaar-city.js', import.meta.url), 'utf8');
const sceneModule = sceneSource.replace(/^import .*;\n/gm, '')
  .replace('const $ = selector => document.querySelector(selector);', '');
const { BazaarCityScene } = await import(`data:text/javascript;base64,${Buffer.from(`
  class UpetoaVillageReturnScene {}
  const drawRouteMarker = (_scene, options) => ({ ...options });
  ${source}
  ${sceneModule}
`).toString('base64')}`);
const { MERCHANT_HALL, CITY_BUILDINGS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function conversationScene(learned = []) {
  const scene = new BazaarCityScene();
  Object.assign(scene, {
    area: 'city', learned: new Set(learned), registry: new Map(), npcs: CITY_NPCS,
    player: { ...CITY_ENTRY }, updateHud() {}, updateHint() {}, showStory(story) { this.story = story; },
  });
  return scene;
}

test('the final topic speaker announces opening; entry and marker unlock only after the whole conversation', () => {
  for (const lastTopic of TOPICS) {
    for (const npc of CITY_NPCS.filter(n => n.topic === lastTopic.id)) {
      const scene = conversationScene(TOPICS.filter(t => t !== lastTopic).map(t => t.id));
      scene.player = { x: npc.x, y: npc.y + 40 };
      scene.interact();
      assert.equal(scene.story.speaker, npc.name);
      assert.match(scene.story.lines.at(-1), /商館が開いた/);
      assert.equal(scene.isHallOpen(), false);
      assert.equal(scene.hallMarker, undefined);
      scene.story.onComplete();
      assert.equal(scene.isHallOpen(), true);
      assert.equal(scene.registry.get('bazaarInformationComplete'), true);
      assert.equal(scene.hallMarker.x, MERCHANT_HALL.door.x);
      const marker = scene.hallMarker;
      scene.interact();
      assert.deepEqual(scene.story.lines, npc.lines);
      scene.story.onComplete();
      assert.equal(scene.hallMarker, marker);
    }
  }
});

test('repeated topics do not open the hall and early entry is blocked', () => {
  const scene = conversationScene(['bazaar']);
  const npc = CITY_NPCS.find(n => n.topic === 'bazaar');
  scene.player = { x: npc.x, y: npc.y + 40 };
  scene.interact(); scene.story.onComplete();
  assert.equal(scene.isHallOpen(), false);
  assert.equal(scene.hallMarker, undefined);
  scene.player = { ...MERCHANT_HALL.door };
  scene.interact();
  assert.match(scene.story.lines.at(-1), /まだ開いていない/);
  scene.enterHall();
  assert.equal(scene.area, 'city');
});

test('Adba is indoors and the entrance and return position are walkable', () => {
  assert.equal(CITY_NPCS.some(n => n.special === 'adba'), false);
  assert.equal(MERCHANT_HALL.adba.special, 'adba');
  assert.ok(canWalkCity(MERCHANT_HALL.door.x, MERCHANT_HALL.door.y));
  assert.ok(canWalkCity(MERCHANT_HALL.door.x, MERCHANT_HALL.door.y + 70));
  const scene = conversationScene(TOPICS.map(t => t.id));
  scene.updateHallMarker();
  assert.ok(scene.hallMarker);
  scene.area = 'hall';
  scene.player = { ...MERCHANT_HALL.spawn };
  assert.equal(scene.nearHallDoor(), false);
  scene.player = { ...MERCHANT_HALL.exit };
  assert.equal(scene.nearHallDoor(), true);
});


test('every named building has a reachable description without granting conversation topics', () => {
  for (const building of CITY_BUILDINGS.filter(b => b.name)) {
    const scene = conversationScene();
    scene.player = { x: building.x, y: building.y + 24 };
    assert.ok(scene.canWalk(scene.player.x, scene.player.y), building.name);
    scene.interact();
    assert.equal(scene.story.speaker, building.name);
    assert.ok(scene.story.lines[0].length > 0);
    scene.story.onComplete();
    assert.equal(scene.learned.size, 0);
    assert.equal(scene.area, 'city');
  }
});

test('nearby residents keep their conversations rather than repeating a building description', () => {
  for (const id of ['innkeeper', 'student', 'trade-clerk']) {
    const scene = conversationScene();
    const npc = CITY_NPCS.find(n => n.id === id);
    scene.player = { x: npc.x, y: npc.y + 30 };
    assert.equal(scene.nearbyBuilding(), undefined);
    scene.interact();
    assert.equal(scene.story.speaker, npc.name);
  }
});

test('the open hall displays its description before entering, while other buildings stay outside', () => {
  const scene = conversationScene(TOPICS.map(t => t.id));
  scene.player = { ...MERCHANT_HALL.door };
  let entered = false;
  scene.enterHall = () => { entered = true; };
  scene.interact();
  assert.equal(scene.story.speaker, '商館');
  assert.match(scene.story.lines.at(-1), /中に入って/);
  assert.equal(entered, false);
  scene.story.onComplete();
  assert.equal(entered, true);
});

test('Jiat traveler stands visibly beside the inn and can be spoken to from the street', () => {
  const traveler = CITY_NPCS.find(n => n.id === 'jiat-traveler');
  const inn = CITY_BUILDINGS.find(b => b.id === 'inn');
  assert.ok(traveler.x > inn.x);
  assert.ok(traveler.y > inn.y);
  assert.ok(canWalkCity(traveler.x, traveler.y), 'traveler must not stand inside a building');
  const scene = conversationScene();
  scene.player = { x: traveler.x, y: traveler.y + 40 };
  assert.ok(scene.canWalk(scene.player.x, scene.player.y));
  scene.interact();
  assert.equal(scene.story.speaker, traveler.name);
  scene.story.onComplete();
  assert.ok(scene.learned.has('jiat'));
});

test('leaving the completed Chapter 11 hall starts the separate Chapter 12 scene once', () => {
  const scene = conversationScene();
  scene.area = 'hall';
  scene.sys = { settings: { key: 'BazaarCityScene' } };
  scene.registry.set('bazaarChapterComplete', true);
  let destination;
  scene.scene = { start(key) { destination = key; } };
  scene.leaveHall();
  assert.equal(destination, 'BazaarUneaseScene');
  assert.equal(scene.transitioning, true);
});
