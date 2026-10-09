import test from 'node:test';
import assert from 'node:assert/strict';
import { BARTER_SHOP, exchangeItem, travelSpeed, disguiseDuration } from '../js/data/barter-shop.js';
import { canWalkCity, TOPICS } from '../js/data/bazaar-city.js';
import { createChase, retryChase, stepChase, changeDisguise } from '../js/systems/vektena-chase.js';

test('shell exchange spends exactly one shell and cannot buy a duplicate', () => {
  const original = { shells: 2, caveItems: ['blue-shard-3'], equipment: [] };
  const result = exchangeItem(original, 'swift-shoes');
  assert.ok(result.exchanged); assert.equal(result.shells, 1);
  assert.deepEqual(result.caveItems, ['blue-shard-3']);
  assert.deepEqual(original.equipment, []); assert.equal(original.shells, 2);
  const duplicate = exchangeItem(result, 'swift-shoes');
  assert.equal(duplicate.exchanged, false); assert.equal(duplicate.shells, 1);
});

test('either bone can pay for the clasp; progression shards are never payment', () => {
  for (const bone of ['animal-bone', 'bone-fragment']) {
    const result = exchangeItem({ caveItems: [bone, 'blue-shard-3'] }, 'cloak-clasp');
    assert.ok(result.exchanged); assert.deepEqual(result.caveItems, ['blue-shard-3']);
  }
  for (const id of ['swift-shoes', 'cloak-clasp', 'invalid']) {
    const result = exchangeItem({ caveItems: ['blue-shard-3'] }, id);
    assert.equal(result.exchanged, false); assert.deepEqual(result.caveItems, ['blue-shard-3']);
  }
});

test('shop approach is accessible and adds no required information topic', () => {
  assert.ok(canWalkCity(BARTER_SHOP.x, BARTER_SHOP.y + 48));
  assert.equal(TOPICS.length, 5);
});

test('equipment improves movement and disguise and survives capture', () => {
  assert.equal(travelSpeed(100), 100); assert.equal(travelSpeed(100, ['swift-shoes']), 125);
  assert.equal(disguiseDuration(), 22); assert.equal(disguiseDuration(['cloak-clasp']), 32);
  const create = equipment => {
    const s = createChase({stage: 1, equipment, roles: {mados:'shield', iria:'lure'}, autonomous:false});
    s.agents = []; return s;
  };
  const normal = create([]), equipped = create(['swift-shoes', 'cloak-clasp']);
  const start = normal.player.x;
  stepChase(normal, {x:1}, .05); stepChase(equipped, {x:1}, .05);
  assert.ok(Math.abs((equipped.player.x-start)/(normal.player.x-start)-1.25)<.001);
  assert.ok(changeDisguise(equipped)); assert.equal(equipped.disguise, 32);
  assert.deepEqual(retryChase(equipped).equipment, equipped.equipment);
});
