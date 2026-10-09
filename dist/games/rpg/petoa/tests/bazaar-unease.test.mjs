import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const data = await readFile(new URL('../js/data/bazaar-unease.js', import.meta.url), 'utf8');
const { addEscorts, pointBehind, ESCORTS } = await import(`data:text/javascript;base64,${Buffer.from(data).toString('base64')}`);
const source = await readFile(new URL('../js/scenes/14-bazaar-unease.js', import.meta.url), 'utf8');
const { BazaarUneaseScene } = await import(`data:text/javascript;base64,${Buffer.from(`
class BazaarCityScene { update() {} leaveHall() { this.returnedToCity = true; } }
${data}
${source.replace(/^import .*;\n/gm, '')}
`).toString('base64')}`);

test('escort recruitment is idempotent and preserves existing party members', () => {
  const members = ['chatoa'];
  const result = addEscorts(members);
  assert.deepEqual(result, ['chatoa', 'mados', 'iria']);
  assert.deepEqual(addEscorts(result), result);
  assert.deepEqual(members, ['chatoa']);
});

test('followers trace corners along the walked route', () => {
  const trail = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  assert.deepEqual(pointBehind(trail, 50), { x: 100, y: 50 });
  assert.deepEqual(pointBehind(trail, 150), { x: 50, y: 0 });
  assert.deepEqual(pointBehind(trail, 300), trail[0]);
});

function waitingScene() {
  const scene = new BazaarUneaseScene();
  Object.assign(scene, { registry: new Map(), area: 'city', waitElapsed: 0,
    trail: [{ x: 0, y: 0 }], player: { x: 0, y: 0 }, updateFollowers() {},
    arriveMessenger() { this.arrivalInProgress = true; this.arrivals = (this.arrivals ?? 0) + 1; },
  });
  return scene;
}

test('messenger waits for 15 seconds of free exploration and does not interrupt conversations', () => {
  const scene = waitingScene();
  scene.storyBusy = true;
  for (let i = 0; i < 200; i++) scene.update(0, 100);
  assert.equal(scene.waitElapsed, 0);
  scene.storyBusy = false;
  for (let i = 0; i < 149; i++) scene.update(0, 100);
  assert.equal(scene.arrivals, undefined);
  scene.update(0, 100);
  assert.equal(scene.arrivals, 1);
  for (let i = 0; i < 200; i++) scene.update(0, 100);
  assert.equal(scene.arrivals, 1);
});

test('completed summons never repeat', () => {
  const scene = waitingScene();
  scene.registry.set('bazaarMessengerDelivered', true);
  for (let i = 0; i < 200; i++) scene.update(0, 100);
  assert.equal(scene.arrivals, undefined);
});

test('recruitment records companions only when the introduction finishes', () => {
  const scene = waitingScene();
  Object.assign(scene, { npcs: [], showStory(story) { this.story = story; }, createFollowers() {}, updateHud() {} });
  scene.talkAdba();
  assert.equal(scene.registry.get('bazaarEscortsJoined'), undefined);
  for (const escort of ESCORTS) assert.ok(scene.story.lines.some(line => line.speaker === escort.name));
  scene.story.onComplete();
  assert.equal(scene.registry.get('bazaarEscortsJoined'), true);
  assert.deepEqual(scene.registry.get('partyMembers'), ['mados', 'iria']);
  scene.talkAdba();
  assert.equal(scene.story.speaker, 'アドバ');
  assert.equal(scene.story.onComplete, undefined);
});

test('leaving the hall after recruitment starts the chase immediately and only once', () => {
  const scene = waitingScene(), starts = [];
  Object.assign(scene, { area: 'hall', scene: { start(key) { starts.push(key); } } });
  scene.leaveHall();
  assert.equal(scene.returnedToCity, true);
  assert.deepEqual(starts, []);
  scene.registry.set('bazaarEscortsJoined', true);
  scene.storyBusy = true;
  scene.leaveHall();
  assert.deepEqual(starts, []);
  scene.storyBusy = false;
  scene.leaveHall();
  scene.leaveHall();
  assert.deepEqual(starts, ['VektenaChaseScene']);
  assert.equal(scene.transitioning, true);
});
