import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../js/data/return-home.js', import.meta.url), 'utf8');
const { canStoreShards, depositShards, SHARD_IDS, RETURN_VILLAGERS, MOTHER_LINES } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('stones can be stored only after the apology and only once', () => {
  for (const phase of ['arrived', 'stored', 'night', 'eventComplete']) assert.equal(canStoreShards(phase, SHARD_IDS), false);
  assert.equal(canStoreShards('apologized', SHARD_IDS.slice(0, 2)), false);
  assert.equal(canStoreShards('apologized', SHARD_IDS), true);
});
test('deposit moves all blue stones into the chest and preserves other inventory', () => {
  const inventory = ['old-fang', ...SHARD_IDS, 'animal-bone'];
  const result = depositShards(inventory);
  assert.deepEqual(result.stored, SHARD_IDS);
  assert.deepEqual(result.carried, ['old-fang', 'animal-bone']);
  assert.equal(inventory.length, 5);
  assert.equal(canStoreShards('apologized', result.carried), false);
});
test('the returning villagers have individual dialogue and mother receives an apology', () => {
  assert.equal(new Set(RETURN_VILLAGERS.map(npc => npc.id)).size, 5);
  for (const npc of RETURN_VILLAGERS) assert.ok(npc.lines.length > 0 && npc.gather.x && npc.gather.y);
  assert.ok(MOTHER_LINES.some(line => line.speaker === 'チャトア' && line.text.includes('ごめんなさい')));
});
