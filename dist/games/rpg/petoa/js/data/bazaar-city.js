// Upetoa is 36 × 26 tiles. 54 × 52 gives exactly three times its area.
export const CITY = { columns: 54, rows: 52, tileSize: 48, width: 2592, height: 2496 };
export const CITY_ENTRY = { x: 180, y: 1248 };
export const MERCHANT_HALL = {
  door: { x: 1296, y: 794 },
  width: 768, height: 576,
  exit: { x: 384, y: 510 },
  spawn: { x: 384, y: 420 },
  adba: { id: 'adba', x: 384, y: 230, key: 'bazaarAdba', name: 'アドバ', special: 'adba' },
};
export const TOPICS = [
  { id: 'bazaar', name: 'バザール', area: '西の市場', summary: 'ルミドノ崩壊後に生まれた商人の組織。国境を越える交易網を持ち、身元の保証や暮らしの支援も行っている。' },
  { id: 'world', name: '世界の状況', area: '北西の広場', summary: '大戦とルミドノの分裂で資源の流れが変わり、エネルギーをめぐる争いが続いている。街の暮らしにも物資不足が影を落としている。' },
  { id: 'ingas', name: 'インガス', area: '北東の交易地区', summary: '資源を持つ大国の一つ。支配層はリリアの陽光石研究を警戒している一方、豊かさは働く人々に十分届いていない。' },
  { id: 'jiat', name: 'ジアット', area: '南東の宿の右手・紫の服の旅人', summary: 'インガスとともに覇権を狙う国。陽光石による新しい技術が、今の資源をめぐる力関係を変えることを警戒している。' },
  { id: 'upachat', name: 'ウパチャット', area: '南西の学びの庭', summary: 'リリアの王。陽光石を探し、周辺国との交易や技術の協力を進めている。都ベクテーナにいる。' },
];
export const CITY_NPCS = [
  { id: 'market-merchant', x: 760, y: 1090, key: 'bazaarResidents', frame: 'market-merchant', height: 70, name: '布の商人', topic: 'bazaar', lines: ['日よけの下で見ていって。布は奥の店、果物は隣の屋台だよ。', 'この街の名にもなっているバザールは、商人の組織なんだ。ルミドノが分かれたあとに生まれた。', '国が違っても取引できるよう、商人の身元を保証してくれる。ここには、故郷を離れた仲間も大勢いる。', '人を探すなら、中央広場の北にある商館へ。アドバさんなら話を聞いてくれるよ。'] },
  { id: 'market-helper', x: 430, y: 1530, key: 'bazaarResidents', frame: 'market-helper', height: 70, name: '市場の手伝い', topic: 'bazaar', lines: ['お昼は、屋台の麺をここで食べるの。店の人も旅の人も、同じ食卓を囲むんだよ。', 'バザールは売り買いだけじゃなく、仕事や食事に困った人を助けることもあるの。', 'みんなが暮らしていけなければ、商売も続かないものね。'] },
  { id: 'old-traveler', x: 800, y: 570, key: 'bazaarResidents', frame: 'old-traveler', height: 70, name: '旅をしてきた老人', topic: 'world', lines: ['昔の大戦で、アドバースとクリシーアの広い土地が住めなくなった。ルミドノも、その後の混乱で幾つもの国に分かれた。', '資源を運ぶ道が変わり、燃料を奪い合うようになった。遠い昔の出来事が、今の暮らしにつながっておる。'] },
  { id: 'repairer', x: 350, y: 720, key: 'bazaarResidents', frame: 'repairer', height: 70, name: '修理屋', topic: 'world', lines: ['燃料も部品も高くなった。壊れた道具を捨てずに、直して使う人が増えたよ。', '国の争いで荷が止まると、こういう小さな店も困るんだ。'] },
  { id: 'ingas-worker', x: 2190, y: 600, key: 'bazaarResidents', frame: 'ingas-worker', height: 70, name: 'インガスから来た働き手', topic: 'ingas', lines: ['インガスには資源がある。でも、その豊かさが俺たちの暮らしまで届くとは限らない。', '重い仕事をしても明日の暮らしは不安だった。ここでは、まず腕前を見て雇ってくれる。'] },
  { id: 'trade-clerk', x: 1730, y: 1040, key: 'bazaarResidents', frame: 'trade-clerk', height: 70, name: '交易所の帳簿係', topic: 'ingas', lines: ['インガスの上層部は、リリアの陽光石研究を警戒しているそうです。新しいエネルギーが広まれば、資源の取引も変わりますから。', '国の思惑と、そこで暮らす人の願いは、同じとは限りませんね。'] },
  { id: 'jiat-traveler', x: 2290, y: 1920, key: 'bazaarResidents', frame: 'jiat-traveler', height: 70, name: 'ジアットから来た旅人', topic: 'jiat', lines: ['ジアットも、インガスと競うように力を広げようとしているの。', '陽光石の研究が進むと、今の資源の価値が変わる。国の偉い人たちは、それを恐れているらしいわ。'] },
  { id: 'caravan-driver', x: 1760, y: 2110, key: 'bazaarResidents', frame: 'caravan-driver', height: 70, name: '隊商の御者', topic: 'jiat', lines: ['ジアットを通って荷を運んできた。資源の豊かな国でも、働く人の暮らしが楽とは限らない。', '俺たちの仕事は、人と荷を無事に届けることさ。争いで道を閉ざされるのは困る。'] },
  { id: 'student', x: 800, y: 1900, key: 'bazaarResidents', frame: 'student', height: 62, name: '学びの庭の学生', topic: 'upachat', lines: ['この庭の木陰は涼しいでしょう。屋根つきの休憩所で、本を読んだり勉強したりするんです。', 'ウパチャット王は、リリアの国王です。物理学や経済にも詳しくて、陽光石を探しているそうです。', '新しい技術を形にするには、ほかの国の技術も必要なんです。王さまは周辺国との協力を進めています。'] },
  { id: 'garden-reader', x: 370, y: 2060, key: 'bazaarResidents', frame: 'garden-reader', height: 70, name: '庭で本を読む人', topic: 'upachat', lines: ['王さまがいる都はベクテーナだ。ここから先の旅は、事情を知る商人に相談するといい。', 'アドバはウトパスという島の村長とも知り合いだそうだよ。商館は中央広場の北にある。'] },
  { id: 'city-child', x: 1380, y: 1420, key: 'bazaarResidents', frame: 'city-child', height: 50, name: '広場の子', lines: ['西は市場、北東は交易所、南東は宿！　南西には静かな庭もあるよ。', 'どこから回ってもいいんだ。広場まで戻れば、また別の通りへ行けるから。'] },
  { id: 'innkeeper', x: 2140, y: 1900, key: 'bazaarResidents', frame: 'innkeeper', height: 70, name: '宿の主人', special: 'inn' },
];
export const CITY_BUILDINGS = [
  { id: 'merchant-hall', x: 1296, y: 770, frame: 'heritage-shophouse', width: 350, height: 330, name: '商館', description: ['バザールの商人たちが、取引や旅の相談を受ける商館。アドバはここで仕事をしている。'] },
  { id: 'inn', x: 2180, y: 1820, frame: 'heritage-shophouse', width: 320, height: 290, name: '宿', description: ['旅人や隊商が、食事をとり、体を休める宿。入口のそばに宿の主人がいる。', '泊まりたいときは、宿の主人に話しかけよう。', '宿の右手にいる紫の服の旅人は、ジアットから来たそうだ。国の話を聞いてみよう。'] },
  { id: 'learning-garden', x: 770, y: 1810, frame: 'temple-hall', width: 430, height: 380, name: '学びの庭', description: ['本を読んだり、学んだことを語り合ったりできる静かな庭。木陰や休憩所では、学生や街の人が思い思いに過ごしている。', '近くにいる人に、どんなことを学んでいるのか聞いてみよう。'] },
  { id: 'trade-office', x: 1770, y: 950, frame: 'modern-shophouse', width: 300, height: 275, name: '交易所', description: ['各地から届く荷物や取引の記録を扱う交易所。運ばれてきた品物が、ここから街の店へ渡っていく。', '入口のそばにいる帳簿係なら、交易の様子を教えてくれそうだ。'] },
  ...[390, 850].flatMap(x => [380, 1000, 1460, 2340].map(y => ({ x, y, texture: 'bazaar-shophouse-row', width: 430, height: 287 }))),
  ...[1770, 2220].flatMap(x => [380, 1460, 2340].map((y, i) => ({ x, y, frame: i % 2 ? 'modern-shophouse' : 'apartment', width: 250, height: 250 }))),
  { x: 2260, y: 940, texture: 'bazaar-shophouse-row', width: 430, height: 287 },
];
export const CITY_TREES = [[1080, 1030], [1512, 1030], [1080, 1480], [1512, 1480], [290, 1820], [960, 2180], [2360, 1080], [280, 460], [950, 460], [950, 1990]];
// A narrow neighborhood canal is crossed by three public bridges.
export const CITY_CANAL = { left: 96, right: 240, top: 96, bottom: 2400 };
export const CITY_BRIDGES = [576, 1248, 1920];
export function isCanalWater(x, y) {
  return x >= CITY_CANAL.left && x <= CITY_CANAL.right && y >= CITY_CANAL.top && y <= CITY_CANAL.bottom
    && !CITY_BRIDGES.some(bridge => Math.abs(y - bridge) <= 66);
}
export const CITY_STREET_PROPS = [
  // Stalls face the main market street, with room to browse in front of them.
  { frame: 'fruit-stall', x: 365, y: 1145, width: 112, height: 134 },
  { frame: 'noodle-cart', x: 550, y: 1145, width: 105, height: 127 },
  { frame: 'fruit-stall', x: 910, y: 1140, width: 112, height: 134 },
  { frame: 'tables', x: 340, y: 1580, width: 112, height: 125 },
  { frame: 'noodle-cart', x: 650, y: 1590, width: 108, height: 130 },
  { frame: 'tables', x: 850, y: 1590, width: 118, height: 132 },
  { frame: 'planters', x: 285, y: 1110, width: 60, height: 70 },
  { frame: 'planters', x: 1010, y: 1120, width: 64, height: 75 },
  // Everyday gathering spaces around the square and the inn.
  { frame: 'sala', x: 1500, y: 1300, width: 140, height: 205 },
  { frame: 'planters', x: 1120, y: 910, width: 74, height: 86 },
  { frame: 'planters', x: 1475, y: 910, width: 74, height: 86 },
  { frame: 'noodle-cart', x: 1900, y: 1720, width: 108, height: 130 },
  { frame: 'tables', x: 1890, y: 1870, width: 108, height: 123 },
  { frame: 'planters', x: 2350, y: 1900, width: 70, height: 82 },
  { frame: 'fruit-stall', x: 1650, y: 1140, width: 108, height: 130 },
  { frame: 'planters', x: 2330, y: 1110, width: 70, height: 82 },
  // The garden has a tiled entrance and a shaded reading pavilion.
  { frame: 'gate', x: 770, y: 2170, width: 190, height: 264 },
  { frame: 'sala', x: 400, y: 1900, width: 145, height: 220 },
  { frame: 'planters', x: 530, y: 2010, width: 78, height: 91 },
  { frame: 'planters', x: 980, y: 1830, width: 78, height: 91 },
  { frame: 'sala', x: 375, y: 610, width: 132, height: 198 },
  { frame: 'tables', x: 860, y: 710, width: 94, height: 105 },
];
const propBlockers = CITY_STREET_PROPS.flatMap(p => p.frame === 'gate'
  ? [-1, 1].map(side => ({ left: p.x + side * p.width * 0.4 - 14, right: p.x + side * p.width * 0.4 + 14, top: p.y - 35, bottom: p.y }))
  : [{ left: p.x - p.width * 0.36, right: p.x + p.width * 0.36, top: p.y - p.height * 0.34, bottom: p.y - 5 }]);
export const CITY_BLOCKERS = [
  ...CITY_BUILDINGS.map(b => ({ left: b.x - b.width * (b.texture ? 0.44 : 0.36), right: b.x + b.width * (b.texture ? 0.44 : 0.36), top: b.y - b.height * 0.62, bottom: b.y - 14 })),
  ...CITY_TREES.map(([x, y]) => ({ left: x - 15, right: x + 15, top: y - 15, bottom: y + 8 })),
  ...propBlockers,
];
export function canWalkCity(x, y) {
  return x >= 72 && x <= CITY.width - 72 && y >= 72 && y <= CITY.height - 72 && !isCanalWater(x, y)
    && !CITY_BLOCKERS.some(b => x > b.left - 15 && x < b.right + 15 && y > b.top - 12 && y < b.bottom + 12);
}
export function learnTopic(learned, topic) {
  return [...new Set([...learned, topic])].filter(id => TOPICS.some(t => t.id === id));
}
export function giveAdbaShard(inventory, alreadyGiven) {
  if (alreadyGiven) return { inventory: [...inventory], given: null };
  const given = inventory.find(id => /^blue-shard-[123]$/.test(id));
  if (!given) return { inventory: [...inventory], given: null };
  return { inventory: inventory.filter(id => id !== given), given };
}
export function cityDistrict(x, y) {
  if (Math.abs(x - 1296) < 260) return y < 1000 ? '中央商館' : '中央広場';
  if (x < 1100) return y < 800 ? '西の広場' : y < 1550 ? '市場' : '学びの庭';
  return y < 1250 ? '交易地区' : '宿場・住宅地区';
}
