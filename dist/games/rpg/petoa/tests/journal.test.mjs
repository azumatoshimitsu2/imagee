import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { JOURNAL_ENTRIES, SCENE_ENTRIES, createJournal, observeScene } from '../js/data/journal.js';

test('discoveries persist, deduplicate, and ignore unknown entries', () => {
  let data = '[]';
  const storage = { getItem: () => data, setItem: (_key, value) => { data = value; } };
  const journal = createJournal(storage);
  assert.equal(journal.discover('runner'), true);
  assert.equal(journal.discover('runner'), false);
  assert.equal(journal.discover('unknown'), false);
  assert.equal(createJournal(storage).has('runner'), true);
  assert.equal(journal.size, 1);
});

test('corrupt or unavailable storage does not block discovery', () => {
  for (const data of ['{', '{}', 'null', '["runner","runner","unknown",null]']) {
    const journal = createJournal({ getItem: () => data, setItem: () => { throw Error('unavailable'); } });
    assert.ok(journal.size <= 1);
    assert.equal(journal.discover('village'), true);
  }
  assert.equal(createJournal().discover('sea'), true);
});

test('new game clears discoveries in memory and storage, allowing rediscovery', () => {
  let data = '["runner","village"]';
  const storage = { getItem: () => data, setItem: (_key, value) => { data = value; } };
  const journal = createJournal(storage);
  journal.reset();
  assert.equal(journal.size, 0);
  assert.equal(createJournal(storage).size, 0);
  assert.equal(journal.discover('village'), true);
  assert.equal(journal.has('runner'), false);
  const unavailable = createJournal({ getItem: () => '["runner"]', setItem: () => { throw Error('unavailable'); } });
  unavailable.reset();
  assert.equal(unavailable.size, 0);
});

const makeScene = key => ({ sys: { settings: { key } }, player: { x: 0, y: 0 }, cameras: { main: { worldView: { contains: (x, y) => x >= 0 && y >= 0 } } } });
test('every scene records its own place without unlocking future scenes', () => {
  for (const [key, id] of Object.entries(SCENE_ENTRIES)) {
    const journal = createJournal();
    observeScene(makeScene(key), value => journal.discover(value));
    assert.equal(journal.has(id), true);
    assert.equal(journal.size, 1);
  }
});

test('enemies are recorded at safe observation range without combat, but not offscreen or submerged', () => {
  const journal = createJournal();
  const scene = makeScene('PetoaForestScene');
  scene.beasts = [
    { x: 250, y: 0, getData: () => 'runner' },
    { x: -40, y: 0, getData: () => 'watcher' },
    { x: 400, y: 0, getData: () => 'sniffer' },
  ];
  scene.seaBeast = { x: 10, y: 0, visible: false };
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('runner'), true);
  for (const id of ['watcher', 'sniffer', 'sea-beast']) assert.equal(journal.has(id), false);
  scene.seaBeast.visible = true;
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('sea-beast'), true);
});

test('pickups and cave wall record only after the corresponding discovery', () => {
  const scene = makeScene('PetoaCaveScene');
  const journal = createJournal();
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('old-fang'), false);
  assert.equal(journal.has('blue-wall'), false);
  scene.collected = new Set(['old-fang']);
  scene.reachedWall = true;
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('old-fang'), true);
  assert.equal(journal.has('blue-wall'), true);
});

test('entry IDs are unique and every illustration exists', async () => {
  assert.equal(new Set(JOURNAL_ENTRIES.map(entry => entry.id)).size, JOURNAL_ENTRIES.length);
  for (const entry of JOURNAL_ENTRIES) if (entry.image) await access(new URL(`../assets/img/${entry.image}`, import.meta.url));
});

test('a fresh scene preview keeps its own discoveries across scenes without changing the saved journey', () => {
  let saved = '["cave","old-fang"]';
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const preview = createJournal();
  observeScene(makeScene('PetoaBeachScene'), id => preview.discover(id));
  assert.equal(preview.has('beach'), true);
  assert.equal(preview.has('cave'), false);
  assert.equal(preview.has('old-fang'), false);
  observeScene(makeScene('PetoaCaveScene'), id => preview.discover(id));
  assert.equal(preview.has('beach'), true);
  assert.equal(preview.has('cave'), true);
  assert.equal(createJournal().has('cave'), false);
  assert.equal(saved, '["cave","old-fang"]');
  assert.equal(createJournal(storage).has('cave'), true);
});

test('blue shards share one entry and the black wall is revealed after waking', () => {
  const journal = createJournal();
  const scene = makeScene('PetoaCaveScene');
  scene.collected = new Set(['blue-shard-1', 'blue-shard-2', 'blue-shard-3']);
  scene.isMorning = true;
  scene.chapterTransition = true;
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('blue-shard'), true);
  assert.equal(journal.has('black-wall'), false);
  assert.equal(journal.size, 2);
  scene.chapterTransition = false;
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('black-wall'), true);
});

test('city knowledge and Adba unlock through completed conversations only', () => {
  const scene = makeScene('BazaarCityScene');
  const journal = createJournal();
  scene.learned = new Set();
  scene.registry = { get: () => false };
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('bazaar-city'), true);
  assert.equal(journal.has('bazaar-info-ingas'), false);
  assert.equal(journal.has('adba'), false);
  scene.learned.add('ingas');
  scene.registry = { get: key => key === 'bazaarMetAdba' };
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('bazaar-info-ingas'), true);
  assert.equal(journal.has('bazaar-info-jiat'), false);
  assert.equal(journal.has('adba'), true);
});

test('the two escorts enter the journal only after joining', () => {
  const scene = makeScene('BazaarUneaseScene');
  const journal = createJournal();
  scene.registry = new Map();
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('mados'), false);
  assert.equal(journal.has('iria'), false);
  scene.registry.set('bazaarEscortsJoined', true);
  observeScene(scene, id => journal.discover(id));
  assert.equal(journal.has('mados'), true);
  assert.equal(journal.has('iria'), true);
});


test('the disguise appears in the journal and picked-up items only after collection, and persists once discovered', () => {
  const scene = makeScene('VektenaChaseScene');
  scene.sim = { stage: 0, indoor: 'cloth', hasDisguise: false };
  scene.registry = new Map();
  let saved = '[]';
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const journal = createJournal(storage);
  const observe = () => observeScene(scene, id => journal.discover(id));
  observe(); assert.equal(journal.has('vektena-disguise'), false);
  scene.sim.hasDisguise = true; scene.sim.stage = 1;
  observe(); observe();
  assert.ok(journal.has('vektena-disguise'));
  assert.equal(JOURNAL_ENTRIES.filter(e => journal.has(e.id) && e.category === '持ち物' && e.id === 'vektena-disguise').length, 1);
  assert.ok(createJournal(storage).has('vektena-disguise'));
  const later = makeScene('BazaarCityScene'); later.registry = new Map([['vektenaStage', 1]]);
  const restored = createJournal(); observeScene(later, id => restored.discover(id));
  assert.ok(restored.has('vektena-disguise'));
});


test('exchanged equipment is recorded in the item category', () => {
  const scene = makeScene('BazaarCityScene'), journal = createJournal();
  scene.registry = { get: key => key === 'travelEquipment' ? ['swift-shoes', 'cloak-clasp'] : undefined };
  observeScene(scene, id => journal.discover(id));
  for (const id of ['swift-shoes', 'cloak-clasp']) {
    assert.ok(journal.has(id));
    assert.equal(JOURNAL_ENTRIES.find(item => item.id === id).category, '持ち物');
  }
});
