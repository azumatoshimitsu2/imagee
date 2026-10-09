import { BEACH_SHELLS } from './beach-items.js';
import { CAVE_ITEMS, CAVE_SHARDS } from './cave-map.js';
import { BARTER_ITEMS } from './barter-shop.js';

// Direct scene links represent collecting every optional item in earlier scenes.
// Story stones remain in the custody required by that scene's events.
export function debugInventory(scene) {
  if (!/^(?:[1-9]|1[0-9])$/.test(String(scene))) return null;
  const number = Number(scene), state = {};
  if (number > 3) state.beachShells = BEACH_SHELLS.length;
  if (number > 6) {
    const shards = CAVE_SHARDS.map(item => item.id);
    state.caveCollectedItems = CAVE_ITEMS.map(item => item.id);
    if (number <= 8) state.caveCollectedItems.push(...shards);
    else if (number === 9) state.homeStoredShards = shards;
    else if (number === 10) {
      state.chiefHeldShard = shards[0]; state.homeStoredShards = shards.slice(1);
    } else {
      state.seaLostShard = shards[0]; state.homeStoredShards = [];
      if (number >= 14) {
        state.adbaReceivedShard = shards[1]; state.caveCollectedItems.push(...shards.slice(2));
      } else state.caveCollectedItems.push(...shards.slice(1));
    }
  }
  if (number > 13) state.travelEquipment = BARTER_ITEMS.map(item => item.id);
  if (number > 15) { state.vektenaStage = 2; state.vektenaComplete = true; }
  return state;
}

// Call once when booting a preview, never on scene transitions or retries.
export function seedDebugInventory(registry, scene) {
  const state = debugInventory(scene);
  if (!state) return;
  for (const [key, value] of Object.entries(state)) if (!registry.has(key)) registry.set(key, value);
}
