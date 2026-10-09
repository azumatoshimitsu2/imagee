export const BARTER_SHOP = { x: 1120, y: 1180, name: '旅道具の交換屋' };
export const BARTER_ITEMS = [
  { id: 'swift-shoes', name: '早駆けの靴', cost: '浜辺の貝殻 ×1', description: '履くだけで移動速度が25%上がる。街歩きと逃走中に有効。', materials: ['shell'] },
  { id: 'cloak-clasp', name: '上着留め', cost: '動物の骨 または 骨のかけら ×1', description: '変装用の上着を留める道具。逃走中の変装が22秒から32秒に延びる。', materials: ['animal-bone', 'bone-fragment'] },
];
export const travelSpeed = (speed, equipment = []) => speed * (equipment.includes('swift-shoes') ? 1.25 : 1);
export const disguiseDuration = (equipment = []) => equipment.includes('cloak-clasp') ? 32 : 22;
export function exchangeItem(inventory, id) {
  const item = BARTER_ITEMS.find(item => item.id === id);
  const next = { shells: inventory.shells ?? 0, caveItems: [...(inventory.caveItems ?? [])], equipment: [...(inventory.equipment ?? [])] };
  if (!item || next.equipment.includes(id)) return { ...next, exchanged: false };
  const material = item.materials.find(material => material === 'shell' ? next.shells >= 1 : next.caveItems.includes(material));
  if (!material) return { ...next, exchanged: false };
  if (material === 'shell') next.shells--;
  else next.caveItems.splice(next.caveItems.indexOf(material), 1);
  next.equipment.push(id);
  return { ...next, exchanged: true };
}
export const shopInventory = registry => ({ shells: registry.get('beachShells') ?? 0, caveItems: registry.get('caveCollectedItems') ?? [], equipment: registry.get('travelEquipment') ?? [] });
