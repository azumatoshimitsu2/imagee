import test from 'node:test';
import assert from 'node:assert/strict';
import { debugInventory, seedDebugInventory } from '../js/data/debug-inventory.js';
import { BEACH_SHELLS } from '../js/data/beach-items.js';
import { CAVE_ITEMS, CAVE_SHARDS } from '../js/data/cave-map.js';
import { BARTER_ITEMS } from '../js/data/barter-shop.js';
import { exchangeItem } from '../js/data/barter-shop.js';

test('normal and invalid scene starts receive no debug inventory', () => {
  for (const value of [null, undefined, '', '0', '20', '13junk', '01']) assert.equal(debugInventory(value), null);
  for (const value of ['1', '2', '3']) assert.deepEqual(debugInventory(value), {});
});

test('all earlier collectibles are supplied, but the current scene is not completed', () => {
  for (let scene = 4; scene <= 15; scene++) {
    const state = debugInventory(String(scene));
    assert.equal(state.beachShells, BEACH_SHELLS.length);
    if (scene <= 6) assert.equal(state.caveCollectedItems, undefined);
    else for (const item of CAVE_ITEMS) assert.ok(state.caveCollectedItems.includes(item.id));
    if (scene <= 13) assert.equal(state.travelEquipment, undefined);
    else assert.deepEqual(state.travelEquipment, BARTER_ITEMS.map(item => item.id));
    assert.equal(state.vektenaStage, undefined);
    assert.equal(state.bazaarChapterComplete, undefined);
  }
});

test('story stones are accounted for exactly once through storage, handover and loss', () => {
  for (let scene = 7; scene <= 19; scene++) {
    const state = debugInventory(scene);
    const stones = [...state.caveCollectedItems, ...(state.homeStoredShards ?? []), state.chiefHeldShard, state.seaLostShard, state.adbaReceivedShard].filter(id => CAVE_SHARDS.some(item => item.id === id));
    assert.deepEqual(stones.sort(), CAVE_SHARDS.map(item => item.id).sort());
  }
});

test('scene 13 can exchange both goods and seeding never replenishes spent inventory', () => {
  const state = debugInventory('13');
  let inventory = {shells:state.beachShells,caveItems:state.caveCollectedItems};
  for (const item of BARTER_ITEMS) {inventory=exchangeItem(inventory,item.id);assert.ok(inventory.exchanged);}
  const registry = new Map([['beachShells', 0], ['caveCollectedItems', []], ['travelEquipment', []]]);
  seedDebugInventory(registry, '15');
  assert.equal(registry.get('beachShells'),0);
  assert.deepEqual(registry.get('caveCollectedItems'),[]);
  assert.deepEqual(registry.get('travelEquipment'),[]);
});


test('capital preview also carries the previous chase rewards', () => {
  const state = debugInventory('16');
  assert.deepEqual(state.travelEquipment, BARTER_ITEMS.map(item => item.id));
  assert.equal(state.vektenaStage, 2);
  assert.equal(state.vektenaComplete, true);
});


test('capital stealth preview receives the prior cloak, pass and travel equipment', () => {
  const state=debugInventory('17');
  assert.equal(state.vektenaStage,2);
  assert.ok(state.travelEquipment.includes('swift-shoes'));
  assert.ok(state.travelEquipment.includes('cloak-clasp'));
});
