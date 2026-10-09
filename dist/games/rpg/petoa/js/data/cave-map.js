export const TILE_SIZE = 96;
export const CAVE_COLS = 25;
export const CAVE_ROWS = 33;
export const CAVE_START = { col: 3, row: 31 };
export const CAVE_GOAL = { col: 21, row: 1 };
export const CAVE_CHAMBER = { left: 19 * TILE_SIZE, right: 24 * TILE_SIZE, top: TILE_SIZE, bottom: 6 * TILE_SIZE };

// Each line carves a continuous passage; the upper chamber holds the blue wall.
const routes = [
  [[3, 31], [3, 25], [13, 25], [13, 19], [7, 19], [7, 13], [19, 13], [19, 7], [13, 7], [13, 3], [21, 3]],
  [[3, 28], [9, 28]],
  [[13, 23], [21, 23], [21, 29]],
  [[10, 19], [10, 16]],
  [[7, 17], [3, 17], [3, 11]],
  [[15, 13], [15, 10]],
  [[19, 10], [23, 10]],
  [[16, 7], [16, 5], [13, 5]],
  [[13, 7], [7, 7], [7, 3]],
];

export const CAVE_ITEMS = [
  { id: "animal-bone", name: "動物の骨", col: 21, row: 29, kind: "bone", text: "小さな動物の骨だ。長い間、ここにあったらしい。" },
  { id: "bone-fragment", name: "骨のかけら", col: 3, row: 11, kind: "bone", text: "岩のすきまに、白い骨のかけらが落ちていた。" },
  { id: "smooth-stone", name: "丸い小石", col: 7, row: 3, kind: "stone", text: "水に削られたような、なめらかな小石だ。" },
  { id: "old-fang", name: "古い牙", col: 23, row: 10, kind: "fang", text: "先の欠けた牙だ。この洞窟に動物がいたのだろうか。" },
];

export const CAVE_SHARDS = [
  { id: "blue-shard-1", name: "青い石の破片", col: 20, row: 2, kind: "blue-shard", angle: -12, text: "割れた石の中にも、青い筋が光っている。" },
  { id: "blue-shard-2", name: "青い石の破片", col: 21, row: 3, kind: "blue-shard", angle: 15, text: "小さな破片だ。手のひらに青い光が映る。" },
  { id: "blue-shard-3", name: "青い石の破片", col: 22, row: 2, kind: "blue-shard", angle: 32, text: "岩壁と同じ色の光を宿している。" },
];

export function createCaveMap() {
  const cells = Array.from({ length: CAVE_ROWS }, () => Array(CAVE_COLS).fill(false));
  for (const route of routes) {
    for (let i = 1; i < route.length; i += 1) {
      let [x, y] = route[i - 1];
      const [endX, endY] = route[i];
      const dx = Math.sign(endX - x);
      const dy = Math.sign(endY - y);
      cells[y][x] = true;
      while (x !== endX || y !== endY) {
        x += dx;
        y += dy;
        cells[y][x] = true;
      }
    }
  }
  for (let row = 1; row <= 5; row += 1) {
    for (let col = 19; col <= 23; col += 1) cells[row][col] = true;
  }
  return cells;
}

export function cellCenter({ col, row }) {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

export function canWalkAt(cells, x, y, radius = 16) {
  // Check all tiles touched by the player's feet, including corners.
  for (let row = Math.floor((y - radius) / TILE_SIZE); row <= Math.floor((y + radius) / TILE_SIZE); row += 1) {
    for (let col = Math.floor((x - radius) / TILE_SIZE); col <= Math.floor((x + radius) / TILE_SIZE); col += 1) {
      if (!cells[row]?.[col]) return false;
    }
  }
  return true;
}
