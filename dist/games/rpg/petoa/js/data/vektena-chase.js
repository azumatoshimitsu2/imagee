import { CITY, MERCHANT_HALL, CITY_BUILDINGS, CITY_NPCS, CITY_BLOCKERS, canWalkCity } from './bazaar-city.js';

// The chase uses the exact same streets and merchant-hall doorway as Chapter 12.
export const TILE = 24;
export const MAP = { columns: CITY.width / TILE, rows: CITY.height / TILE, width: CITY.width, height: CITY.height };
export const at = (x, y) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE });
export const START = { x: MERCHANT_HALL.door.x, y: MERCHANT_HALL.door.y + 70 };
export const DISGUISE_WARDROBE = { x: 600, y: 300, reach: 72 };
export const PASS_DOCUMENT = { x: 541, y: 278, reach: 90 };
export const REFUGE_EXITS = [
  { id: 'back', x: 384, y: 112, reach: 60, back: true, label: '裏口：北の路地へ' },
  { id: 'front', x: 384, y: 500, reach: 60, back: false, label: '表口：店の前へ' },
];
export const REFUGE_BLOCKERS = [
  { left: 90, right: 183, top: 64, bottom: 164 },
  { left: 570, right: 663, top: 64, bottom: 164 },
  { left: 335, right: 433, top: 180, bottom: 260, place: 'cloth' },
  { left: 492, right: 590, top: 250, bottom: 330, place: 'archive' },
  { left: 360, right: 408, top: 275, bottom: 312 },
  { left: 560, right: 640, top: 220, bottom: 308, place: 'cloth' },
];
export const DEPARTURE_HALL = CITY_BUILDINGS.find(b => b.id === 'merchant-hall');
export const BUILDINGS = CITY_BLOCKERS.map(b => ({ x: b.left / TILE, y: b.top / TILE, w: (b.right - b.left) / TILE, h: (b.bottom - b.top) / TILE }));
const clothShop = CITY_BUILDINGS.find(b => b.texture === 'bazaar-shophouse-row' && b.x === 850 && b.y === 1000);
// The storefront image includes ground below its doors; its bottom is not the threshold.
const clothDoor = { x: clothShop.x, y: clothShop.y - clothShop.height * (144 / 1024) };
export const PLACES = [
  { id: 'cloth', name: 'バザールの布店', x: clothDoor.x, y: clothDoor.y + 60,
    marker: { x: clothDoor.x, y: clothDoor.y + 24 }, labelY: clothDoor.y - 12, back: { x: 850, y: 780 },
    text: '商人に助けを求め、店内右手のタンスを調べて変装用の上着を取る。裏口は北の路地へ通じている。' },
  { id: 'archive', name: '交易商の連絡所', x: 1770, y: 1000, back: { x: 1770, y: 650 },
    text: '商人がユアテアへ向かう通行証を預かっている。裏口から北へ抜けられる。' },
  // The 205px gate artwork extends from the northern map edge to its entrance.
  { id: 'gate', name: 'ユアテアへの通用門', x: 2424, y: 220, text: '通行証を示し、追手を振り切って三人で門を通る。' },
];
export const MARKETS = [
  { x: 260, y: 1020, w: 770, h: 580 },
  { x: 1620, y: 1000, w: 380, h: 240 },
];
export const FRAMES = [...new Set(CITY_NPCS.map(n => n.frame))];
export const CIVILIANS = CITY_NPCS.map((npc, i) => ({
  id: `citizen-${i}`, frame: npc.frame, x: npc.x, y: npc.y,
  route: [{ x: npc.x, y: npc.y }, ...[[0, 72], [72, 0], [0, -72]].map(([dx, dy]) => ({ x: npc.x + dx, y: npc.y + dy })).filter(p => canWalkCity(p.x, p.y))],
}));
export const AGENTS = [
  [1296, 1100, 'tail'], [1000, 1248, 'tail'], [2016, 1150, 'relay'], [2016, 700, 'block'],
  [1296, 1550, 'tail'], [1850, 1920, 'relay'], [2400, 1800, 'block'], [576, 800, 'tail'],
  [1560, 576, 'relay'], [2100, 576, 'block'],
  [576, 1248, 'tail'], [1000, 576, 'relay'], [1050, 1650, 'block'],
  [1296, 1920, 'tail'], [2016, 1920, 'relay'], [2016, 1450, 'block'],
  [2376, 220, 'gate'], [2472, 220, 'gate'],
].map(([x, y, role], i) => ({ id: `visitor-${i}`, frame: 'spy-down', x, y, role }));
export const INTRO = [
  { speaker: '', text: '商館の扉を出た途端、暗いフードのスパイが追ってきた。曇天の街を、三人で切り抜けよう。' },
  { speaker: 'マドス', text: 'ここでは連中も大っぴらには手を出せない。だが囲まれたら厄介だ。まずは西の布店で、商人の助けを借りよう。' },
  { speaker: 'イリア', text: '暗いフードと覆面がスパイの目印よ。町の人を避けながら、追手の位置を見て進みましょう。' },
  { speaker: 'マドス', text: '決めた役割で、俺たちが敵を見て自動で動く。盾役は敵を止め、囮役は引き離す。その間に逃げろ。Q・Eで追加の指示もできる。' },
  { speaker: 'イリア', text: '役目が終わったら合流するわ。私は動きと立て直しが速く、マドスは長く敵を抑えられる。二人の再使用時間も見てね。' },
  { speaker: 'イリア', text: '市場の人混みや建物は視線を遮れる。布店のタンスから上着を取ったら、人目を避けてRで着替えて。変装中も追手との距離には気をつけて。' },
];
