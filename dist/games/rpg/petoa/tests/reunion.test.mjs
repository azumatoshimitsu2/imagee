import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
globalThis.Phaser = { Scene: class {} };
globalThis.window = { location: { search: '' } };
const elements = new Map();
globalThis.document = { querySelector: selector => { if (!elements.has(selector)) elements.set(selector, {}); return elements.get(selector); } };
const baseSource = (await readFile(new URL('../js/scenes/04-petoa-forest.js', import.meta.url), 'utf8')).replace(/^import .*;\n/, 'const drawRouteMarker = () => {};\n');
const baseUrl = dataUrl(baseSource);
const { BaseForestScene } = await import(baseUrl);
const source = (await readFile(new URL('../js/scenes/07-petoa-reunion.js', import.meta.url), 'utf8')).replace("'./04-petoa-forest.js'", JSON.stringify(baseUrl)).replace("import { drawRouteMarker } from '../ui/markers.js';", 'const drawRouteMarker = () => {};');
const { PetoaForestMorningScene, SEARCH_PARTY, REUNION_LINES } = await import(dataUrl(source));

test('reunion requires walking near the beach after hearing the voices', () => {
  const scene = new PetoaForestMorningScene();
  scene.player = { x: 1248, y: 198, setAlpha() { return this; }, setFrame() { return this; } };
  scene.partyMarker = { setVisible() {} };
  const saved = new Map();
  scene.registry = { set: (key, value) => saved.set(key, value) };
  scene.updateMission = () => {};
  scene.cameras = { main: { setBounds() {}, stopFollow() {}, pan() {} } };
  let story;
  scene.showStory = value => { story = value; };
  scene.checkForestGoal();
  assert.equal(story, undefined);
  scene.player.x = SEARCH_PARTY.x;
  scene.player.y = SEARCH_PARTY.y - 100;
  scene.storyBusy = true;
  scene.checkForestGoal();
  assert.equal(story, undefined);
  scene.storyBusy = false;
  scene.checkForestGoal();
  assert.equal(scene.reunited, true);
  assert.equal(saved.get('searchPartyReunited'), true);
  assert.equal(story.lines, REUNION_LINES);
  let fadeCompleted;
  let destination;
  scene.input = { keyboard: { resetKeys() {} } };
  scene.cameras = { main: { once: (_name, callback) => { fadeCompleted = callback; }, fadeOut() {} } };
  scene.scene = { start: key => { destination = key; } };
  scene.checkForestGoal();
  assert.equal(destination, undefined);
  story.onComplete();
  assert.equal(destination, undefined);
  fadeCompleted();
  assert.equal(destination, 'UpetoaVillageReturnScene');
});

test('multi-speaker dialogue shows every line before completing', () => {
  const scene = new BaseForestScene({ key: 'test' });
  let complete = false;
  scene.showStory({ lines: REUNION_LINES, onComplete: () => { complete = true; } });
  for (const line of REUNION_LINES) {
    assert.equal(elements.get('#speaker').textContent, line.speaker);
    assert.equal(elements.get('#message').textContent, line.text);
    assert.equal(complete, false);
    scene.advanceStory();
  }
  assert.equal(complete, true);
  assert.equal(scene.storyBusy, false);
});
