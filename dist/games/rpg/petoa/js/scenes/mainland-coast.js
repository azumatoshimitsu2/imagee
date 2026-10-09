// The voyage and landing share one working harbor and the same world coordinates.
export const MAINLAND_ROAD = { x: 2160, y: 410 };
export const HARBOR_LANDING = { boatX: 1130, boatY: 410, playerX: 1180, playerY: 402 };
export const HARBOR_BOUNDS = { left: 1455, right: 2360, top: 40, bottom: 728 };
const PIERS = [
  { left: 1104, right: 1440, top: 144, bottom: 240 },
  { left: 1152, right: 1440, top: 336, bottom: 480 },
  { left: 1104, right: 1440, top: 576, bottom: 672 },
];

export function canWalkHarbor(scene, x, y) {
  const onQuay = x >= HARBOR_BOUNDS.left && x <= HARBOR_BOUNDS.right && y >= HARBOR_BOUNDS.top && y <= HARBOR_BOUNDS.bottom;
  // Extend past the quay edge so the collision margins never leave a gap.
  const onPier = PIERS.some(p => x >= p.left + 18 && x <= HARBOR_BOUNDS.left + 18 && y >= p.top + 18 && y <= p.bottom - 18);
  return (onQuay || onPier) && !scene.blockers.some(b => x > b.left - 15 && x < b.right + 15 && y > b.top - 12 && y < b.bottom + 12);
}

export function preloadMainlandCoast(scene) {
  for (const [prefix, names] of [['bazaar', ['ground', 'buildings']], ['harbor', ['ground', 'props']]]) {
    for (const name of names) {
      const path = `./assets/img/tiles/${prefix}/${prefix}-${name}-v1`;
      scene.load.atlas(`${prefix}-${name}`, `${path}.png`, `${path}.json`);
    }
  }
}

export function renderMainlandCoast(scene) {
  scene.renderSea();
  scene.seaCut = false;
  scene.cameras.main.setZoom(1).setBounds(0, 0, 2400, 768);
  scene.seaSurface.setPosition(1200, 384).setSize(3100, 1600);
  scene.blockers = [];
  const tile = (x, y, key, frame, depth = 2) => scene.add.image(x + 24, y + 24, key, frame).setDisplaySize(48, 48).setDepth(depth);
  for (let y = 0; y < 768; y += 48) {
    tile(1392, y, 'harbor-ground', 'wall');
    for (let x = 1440; x < 2400; x += 48) {
      const isTown = x >= 2064;
      tile(x, y, isTown ? 'bazaar-ground' : 'harbor-ground', isTown ? (y >= 336 && y < 480 ? 'sidewalk' : 'heritage-brick') : x < 1584 ? 'quay' : 'yard');
    }
  }
  const shadows = scene.add.graphics().setDepth(3);
  const wood = scene.add.graphics().setDepth(5);
  for (const p of PIERS) {
    shadows.fillStyle(0x283d40, 0.45).fillRect(p.left - 6, p.top + 8, p.right - p.left, p.bottom - p.top + 8);
    for (let y = p.top; y < p.bottom; y += 48) {
      for (let x = p.left; x < p.right; x += 48) tile(x, y, 'harbor-ground', 'pier', 4);
    }
    // Posts frame the pier, leaving the center free for disembarking.
    for (let x = p.left + 18; x < p.right; x += 96) {
      for (const y of [p.top + 5, p.bottom - 5]) {
        wood.fillStyle(0x46372a).fillRect(x - 5, y - 3, 10, 16);
        wood.fillStyle(0xbda77a).fillRect(x - 6, y - 5, 12, 6);
      }
    }
  }
  const prop = (frame, x, y, width, height, footprint = true) => {
    scene.add.image(x, y, 'harbor-props', frame).setOrigin(0.5, 1).setDisplaySize(width, height).setDepth(y);
    if (footprint) scene.blockers.push({ left: x - width * 0.4, right: x + width * 0.4, top: y - height * 0.42, bottom: y - 6 });
  };
  prop('warehouse', 1770, 265, 300, 235);
  prop('shed', 1780, 710, 265, 204);
  prop('crates', 1598, 295, 88, 78);
  prop('crates', 1880, 305, 100, 89);
  prop('barrels', 1484, 155, 76, 65);
  prop('barrels', 1564, 600, 82, 70);
  prop('nets', 1250, 226, 96, 76);
  prop('nets', 1250, 657, 106, 84);
  prop('cart', 1850, 510, 86, 86);
  prop('crates', 1670, 685, 76, 68);
  // The shopping street starts beyond the warehouses, away from the water.
  for (const [x, y, frame] of [[2220, 260, 'heritage-shophouse'], [2240, 715, 'modern-shophouse']]) {
    scene.add.image(x, y, 'bazaar-buildings', frame).setOrigin(0.5, 1).setDisplaySize(250, 260).setDepth(y);
    scene.blockers.push({ left: x - 90, right: x + 90, top: y - 155, bottom: y - 20 });
  }
  const ropes = scene.add.graphics().setDepth(6).lineStyle(3, 0xbda67b, 0.9);
  for (const [x, y, scale] of [[1240, 108, 1.2], [1250, 710, 1.15], [1010, 250, 1.7]]) {
    scene.makeBoat(x, y).setScale(scale).setDepth(20);
    ropes.lineBetween(x + 45, y + 12, Math.max(1122, x + 70), y < 400 ? 150 : 665);
  }
  // Reuse the existing fisher sprites for dock workers, distinct from named NPCs.
  scene.harborWorkers = [
    { x: 1510, y: 285, frame: 2, speaker: '港の船員', lines: ['ここはバザールの港だ。船旅、ご苦労さん。', '街へ行くなら、荷揚げ場を抜けて東へ。倉庫の先に店が並んでいるよ。'] },
    { x: 1730, y: 485, frame: 1, speaker: '荷運びの人', lines: ['この荷を倉庫へ運んだら、次の船の荷下ろしだ。', '通りは空けてあるよ。街なら、この先だ。'] },
    { x: 1345, y: 630, frame: 2, speaker: '漁師', lines: ['網を干しているところさ。今日はいい魚が揚がったよ。'] },
  ];
  for (const worker of scene.harborWorkers) {
    worker.sprite = scene.character(worker.x, worker.y, 'returnFisher', worker.frame).setDepth(worker.y);
    scene.blockers.push({ left: worker.x - 12, right: worker.x + 12, top: worker.y - 8, bottom: worker.y + 8 });
  }
}
