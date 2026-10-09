export const CAPITAL = { width: 4320, height: 3600 };
export const CAPITAL_ENTRY = { x: 1800, y: 3336 };
export const CAPITAL_ROAD_WIDTH = 144;
export const CAPITAL_SIDEWALK = 80;
export const CAPITAL_GRID_X = [720, 1920, 3240, 4080];
export const CAPITAL_GRID_Y = [900, 1800, 2700];
export const CAPITAL_ROADS = [
 ...CAPITAL_GRID_X.map(x=>({axis:'vertical',width:CAPITAL_ROAD_WIDTH,points:[[x,0],[x,CAPITAL.height]]})),
 ...CAPITAL_GRID_Y.map(y=>({axis:'horizontal',width:CAPITAL_ROAD_WIDTH,points:[[0,y],[CAPITAL.width,y]]})),
];
export const CAPITAL_CROSSWALKS = CAPITAL_GRID_X.flatMap(x=>CAPITAL_GRID_Y.flatMap(y=>[
 {x:x-148,y:y-72,width:56,height:144,axis:'horizontal'},
 {x:x+92,y:y-72,width:56,height:144,axis:'horizontal'},
 {x:x-72,y:y-148,width:144,height:56,axis:'vertical'},
 {x:x-72,y:y+92,width:144,height:56,axis:'vertical'},
]));
export function onCapitalRoad(x,y,radius=0) {
 return CAPITAL_GRID_X.some(v=>Math.abs(x-v)<72+radius) || CAPITAL_GRID_Y.some(v=>Math.abs(y-v)<72+radius);
}
export function onCapitalCrosswalk(x,y,radius=16) {
 return CAPITAL_CROSSWALKS.some(b=>x>=b.x-(b.axis==='vertical'?radius:0)&&x<=b.x+b.width+(b.axis==='vertical'?radius:0)&&y>=b.y-(b.axis==='horizontal'?radius:0)&&y<=b.y+b.height+(b.axis==='horizontal'?radius:0));
}
export function pedestrianCapital(x,y,radius=16) {
 return !onCapitalRoad(x,y,radius) || onCapitalCrosswalk(x,y,radius);
}
export const CAPITAL_PARK = {x:2000,y:1950,width:490,height:560};
export const CAPITAL_POND = { x: 2157, y: 2063, width: 204, height: 169 };
export const CAPITAL_PROPS = [
  { frame:'bus', x:1500,y:3190,width:205,height:172 },
  { frame:'bus', x:2110,y:3340,width:186,height:156 },
  { frame:'food-cart', x:1510,y:3345,width:125,height:112 },
  { frame:'scooters', x:2050,y:3100,width:135,height:125 },
  { frame:'produce', x:1260,y:2240,width:135,height:124 },
  { frame:'food-cart', x:900,y:2320,width:125,height:112 },
  { frame:'scooters', x:970,y:2570,width:118,height:108 },
  { frame:'produce', x:1470,y:1740,width:130,height:120 },
  { frame:'food-cart', x:2040,y:1760,width:118,height:108 },
  { frame:'scooters', x:3400,y:1760,width:130,height:120 },
  { frame:'produce', x:2870,y:2870,width:120,height:110 },
  { frame:'food-cart', x:640,y:1210,width:120,height:110 },
  ...[[1550,3470],[1960,3210],[1570,2990],[1680,1830],[1960,1480],[2750,2210],[3080,1790],[1610,540],[2070,490]].map(([x,y])=>({frame:'palm',x,y,width:132,height:160})),
];
export const CAPITAL_PLACES = [
  { id: 'terminal', name: '南交通ターミナル', x: 1800, y: 3140, color: 0xe8b963, lines: ['長距離の乗合車が行き交う、ベクテーナ南の玄関口。案内板には各地へ向かう便が並んでいる。', '三人はここから、リリアの都へ足を踏み入れた。'] },
  { id: 'shopping', name: '西商業街', x: 1080, y: 2340, color: 0x70caca, lines: ['ガラス張りの店先に、服や道具、遠い国から届いた品物が並んでいる。', 'バザールの屋台とは違い、建物の何階にも店が入っている。'] },
  { id: 'square', name: '中央広場', x: 1800, y: 1650, color: 0xe8b963, lines: ['広い大通りが交わる、都の中心。高い時計塔を目印に、人々が待ち合わせている。', '北へ進むとユアテア前広場。東は研究地区、西は商業街だ。'] },
  { id: 'research', name: '東研究地区', x: 3120, y: 1620, color: 0x8bd6eb, lines: ['白い外壁と青い窓が並ぶ研究棟。運び込まれる装置の箱に、技術者たちが目を配っている。', '陽光石をめぐる新しい技術も、こうした人々の仕事につながっているのだろう。'] },
  { id: 'park', name: '中央公園', x: 2520, y: 2340, color: 0x91bd82, lines: ['高層住宅の間に広がる緑の公園。池を囲む遊歩道では、昼休みの人々が足を休めている。', '車の音が少し遠のいた。木陰の風は、島で感じたものと同じだ。'] },
  { id: 'yuatea', name: 'ユアテア前広場', x: 1800, y: 520, color: 0xe8b963, lines: ['リリアの王がいるユアテア。その正面には、白い石で舗装された広場が広がっている。', 'マドス「着いたな。まずは街の様子を見ておこう。王への取り次ぎは、そのあとだ」', '広場には人々の話し声が響いている。門の向こうへ運ぶ石を、チャトアはそっと確かめた。'] },
];
export const CAPITAL_RESIDENTS = [
  { x: 1650, y: 3080, facing: 'right', frame: 'transit-attendant', name: '交通案内係', lines: ['ベクテーナへようこそ。ここは南交通ターミナルです。', '中央大通りを北へ進むとユアテア前広場へ着きます。案内板と地図をご利用ください。'] },
  { x: 1190, y: 2340, facing: 'left', frame: 'shop-assistant', name: '店のスタッフ', lines: ['お店を探しているの？　このあたりは商業街よ。', '見上げてみて。上の階にもお店があるから、看板がこんなに多いの。'] },
  { x: 2040, y: 1620, facing: 'left', frame: 'elder-resident', name: '広場の年配の住民', lines: ['この都へ来るのは初めてかね。バザールより、ずっと広いだろう。', '迷ったら中央大通りへ戻るといい。北にはユアテア、南にはターミナルがある。'] },
  { x: 3360, y: 1500, facing: 'left', frame: 'researcher', name: '研究所の技術者', lines: ['装置の点検から戻ったところだよ。街が大きいと、動かすためのエネルギーもたくさん要る。', '新しい技術で暮らしを変えたい。そのために、毎日少しずつ試しているんだ。'] },
  { x: 2440, y: 2390, facing: 'right', frame: 'student', name: '公園の学生', lines: ['ここで休んでいかない？　建物の間にも、静かな場所はあるんだ。', '島から来たの？　わたしは、建物のない水平線をいつか見てみたいな。'] },
  { x: 2040, y: 560, facing: 'right', frame: 'transit-attendant', name: '広場の係員', lines: ['こちらはユアテア前広場です。入口の前では立ち止まらず、広場でお待ちください。', '旅の方ですね。まずはゆっくり、都をご覧になってください。'] },
];



const intersects = (a,b,pad=0) => a.x-pad < b.x+b.width && a.x+a.width+pad > b.x && a.y-pad < b.y+b.height && a.y+a.height+pad > b.y;
export function distanceToRoad(x,y,road) {
  let nearest=Infinity;
  for(let i=1;i<road.points.length;i++) {
    const [ax,ay]=road.points[i-1],[bx,by]=road.points[i],dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    nearest=Math.min(nearest,Math.hypot(x-ax-dx*t,y-ay-dy*t));
  }
  return nearest;
}
export const capitalPropBlock = p => p.frame === 'bus'
  ? {x:p.x-p.width/2,y:p.y-p.height,width:p.width,height:p.height}
  : ({x:p.x-p.width*.32,y:p.y-p.height*.22,width:p.width*.64,height:p.height*.22});
for (const prop of CAPITAL_PROPS) {
 const margin = prop.frame === 'bus' ? prop.width / 2 + 90 : prop.width * .32 + 92;
 for (const x of CAPITAL_GRID_X) if (Math.abs(prop.x-x)<margin) prop.x=x+(prop.x<x?-margin:margin);
 for (const y of CAPITAL_GRID_Y) if (Math.abs(prop.y-y)<prop.height+90 && prop.y>y-90) prop.y=y-100;
}
// Cross-block passages join the sidewalks. Their full visual width stays clear.
export const CAPITAL_ALLEYS=[
 {x:840,y:1250,width:960,height:140},
 {x:2040,y:1250,width:1080,height:140},
 {x:3360,y:1250,width:600,height:140},
 {x:840,y:2210,width:960,height:140},
 {x:3360,y:2210,width:600,height:140},
 {x:2040,y:2990,width:1080,height:140},
 {x:3360,y:2990,width:600,height:140},
 {x:1030,y:1020,width:140,height:1560},
];
for(const prop of CAPITAL_PROPS){
 for(const alley of CAPITAL_ALLEYS){
  if(intersects(capitalPropBlock(prop),alley,24))prop.y=alley.y-100;
 }
}
const reserved = [
  ...CAPITAL_ALLEYS,
  ...[[1630,3270],[2054,2930],[1800,1870]].map(([x,y])=>({x:x-45,y:y-45,width:90,height:90})),
  ...CAPITAL_PLACES.map(p=>({x:p.x-145,y:p.y-160,width:290,height:300})),
  ...CAPITAL_RESIDENTS.map(p=>({x:p.x-65,y:p.y-65,width:130,height:130})),
  ...CAPITAL_PROPS.map(p=>({x:p.x-p.width/2,y:p.y-p.height,width:p.width,height:p.height})),
  {x:2040,y:1930,width:480,height:490},
];
export const CAPITAL_BUILDINGS = [
  {x:1230,y:2810,width:360,height:250,frame:'terminal'},
  {x:1480,y:80,width:640,height:300,frame:'terminal',texture:'capitalYuatea'},
];
let seed=16043;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
// Deterministic packing mixes frontage sizes and setbacks without obstructing roads.
for(let n=0;n<8000 && CAPITAL_BUILDINGS.length<76;n++) {
  const frame=['shophouses','corner','apartments','tower','research'][n%5];
  const width=frame==='tower'?160+random()*60:150+random()*105;
  const height=frame==='tower'?260+random()*90:frame==='corner'?width*.88:width*1.04;
  const b={x:100+random()*(CAPITAL.width-width-200),y:140+random()*(CAPITAL.height-height-280),width:Math.round(width),height:Math.round(height),frame};
  b.x=Math.round(b.x);b.y=Math.round(b.y);
  if(reserved.some(r=>intersects(b,r,16)) || CAPITAL_BUILDINGS.some(r=>intersects(b,r,80)))continue;
  let touchesRoad=false;
  for(let x=b.x;x<=b.x+b.width+30;x+=30)for(let y=b.y;y<=b.y+b.height+30;y+=30) {
    if(CAPITAL_ROADS.some(road=>distanceToRoad(x,y,road)<road.width/2+CAPITAL_SIDEWALK+24))touchesRoad=true;
  }
  if(!touchesRoad)CAPITAL_BUILDINGS.push(b);
}
const blockers=[...CAPITAL_BUILDINGS,CAPITAL_POND,...CAPITAL_PROPS.map(capitalPropBlock)];
export function canWalkCapital(x,y,radius=16) {
  if(x<80||y<80||x>CAPITAL.width-80||y>CAPITAL.height-80)return false;
  return !blockers.some(b=>x>b.x-radius&&x<b.x+b.width+radius&&y>b.y-radius&&y<b.y+b.height+radius);
}
const variants = [
 {frame:'office-worker',name:'通勤中の人',lines:['近道なら商店の裏の路地だよ。大通りは乗合車が多いからね。']},
 {frame:'shopper',name:'買い物帰りの人',lines:['屋台で昼ごはんを買ってきたの。ここの路地は、角を曲がるたびに違うお店があるわ。']},
 {frame:'student',name:'都の学生',lines:['新しいビルの隣にも、昔からのお店が残っているんだ。放課後はよく寄っていくよ。']},
 {frame:'casual-youth',name:'散歩中の若者',lines:['この先の公園で、よく音楽を聴いているんだ。ビルの間にも落ち着ける場所があるよ。']},
];
for(let i=0;i<24;i++) {
 const x=CAPITAL_GRID_X[i%CAPITAL_GRID_X.length]+(i%2?-120:120);
 const y=420+Math.floor(i/4)*480;
 if(!onCapitalRoad(x,y,16)&&canWalkCapital(x,y)&&!CAPITAL_RESIDENTS.some(p=>Math.hypot(p.x-x,p.y-y)<110)&&!CAPITAL_PLACES.some(p=>Math.hypot(p.x-x,p.y-y)<115)) CAPITAL_RESIDENTS.push({x,y,...variants[i%variants.length],facing:CAPITAL_RESIDENTS.length%2?'right':'left'});
}
// Additional front-facing residents reflect different livelihoods across the city.
export const CAPITAL_FRONT_RESIDENTS = [
 {x:1640,y:660,frame:'noble-man',name:'旧家の紳士',lines:['この上着は祖父の代から仕立て直して着ている。都にも、長く受け継いできたものがあるのだよ。','家の名に頼るだけではいけない。今の街を知っておかねばな。']},
 {x:2070,y:650,frame:'noble-woman',name:'旧家の婦人',lines:['この飾りも、布も、昔から残ったものです。手入れのできる職人がいてこそ、大切に使い続けられます。']},
 {x:1010,y:2120,frame:'wealthy-merchant',name:'商会の主人',lines:['遠くから届く布はまだ高い。運ぶ道も、修理する車も、ただでは整わないからね。','商いが続けられるのは職人や荷運びの人のおかげさ。']},
 {x:1950,y:810,frame:'administrator',name:'都の事務官',lines:['住宅の修繕を願う書類を預かっています。古い建物を使い続けている地区からの相談が多いのです。','必要な資材を、どこへ先に回すか……簡単には決められません。']},
 {x:1370,y:2430,frame:'repair-artisan',name:'街の修理職人',lines:['新品に替えるより、直して使うことが多いよ。古い機械でも、まだ働ける部品はある。','工具の柄も自分で継ぎ直した。手になじんでいるからね。']},
 {x:870,y:2480,frame:'seamstress',name:'仕立て仕事の住民',lines:['上着のほころびなら繕えるよ。いい布は高いから、裏返したり継いだりして長く着るの。','今日はこの布を届けたら、夕飯の買い物に行くつもり。']},
 {x:1110,y:2940,frame:'poor-elder',name:'荷を運ぶ年配の住民',lines:['屋根を直す材料を少しずつ集めているんだ。今は雨のたびに、寝床を移さなくちゃならなくてね。','この袋も何度も繕ったが、まだ荷物は運べるよ。']},
 {x:2650,y:2770,frame:'poor-youth',name:'仕事帰りの若者',lines:['今日は荷ほどきの仕事があったから、家の分も食べ物を買えたよ。明日も頼まれるといいんだけど。','靴底がまた薄くなってきた。帰ったら、残りの革で直してみる。']},
];
for (const resident of CAPITAL_FRONT_RESIDENTS) {
  const anchor = {x:resident.x,y:resident.y};
  let placed = false;
  // Keep placements stable while avoiding buildings, props and existing speakers.
  for (let radius=0;radius<=640 && !placed;radius+=40) {
    for (const [dx,dy] of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]]) {
      const x=anchor.x+dx,y=anchor.y+dy;
      if (onCapitalRoad(x,y,16) || !canWalkCapital(x,y) || CAPITAL_RESIDENTS.some(n=>Math.hypot(n.x-x,n.y-y)<110) || CAPITAL_PLACES.some(p=>Math.hypot(p.x-x,p.y-y)<115)) continue;
      Object.assign(resident,{x,y,texture:'capitalFrontResidents',facing:'front'});
      CAPITAL_RESIDENTS.push(resident);placed=true;break;
    }
  }
  if (!placed) throw new Error(`No walkable placement for ${resident.frame}`);
}
export const CAPITAL_GUARD={x:1800,y:430,frame:'guard-front',texture:'yuateaGuard',facing:'front',name:'入口の警備兵',lines:['ご用件をお伺いします。']};
CAPITAL_RESIDENTS.push(CAPITAL_GUARD);
export function capitalDistrict(x, y) {
  if (y < 750) return 'ユアテア・行政地区';
  if (y > 2800) return '南交通ターミナル・住宅地区';
  if (x > 2850) return '東研究地区';
  if (x < 1400) return '西商業街';
  if (x > 2000 && y > 1900) return '中央公園';
  return '中央大通り';
}

// These two residents now use empty-handed frontal artwork, including repeated speakers.
for (const resident of CAPITAL_RESIDENTS) {
  if (['office-worker','transit-attendant'].includes(resident.frame)) {
    resident.texture = 'capitalWorkersFront';
    resident.facing = 'front';
  }
}


// Repaired vehicles keep to two lanes and yield before occupied crossings.
export function createCapitalTraffic() {
 return CAPITAL_ROADS.flatMap((road,index)=>[-1,1].flatMap(direction=>[0,1].map(n=>({
   axis:road.axis,direction,center:road.points[0][road.axis==='vertical'?0:1],
   position:180+n*1400+index*137,speed:72+(index%3)*12,
   color:[0x567f80,0x99734f,0x697c61,0x8a6360][index%4],
 }))));
}
export function capitalVehiclePosition(car) {
 const lane=car.direction*36;
 return car.axis==='vertical'?{x:car.center-lane,y:car.position}:{x:car.position,y:car.center+lane};
}
export function stepCapitalTraffic(cars,delta) {
 const dt=Math.min(delta,100)/1000;
 for(const car of cars) {
   const limit=car.axis==='vertical'?CAPITAL.height:CAPITAL.width;
   car.position=((car.position+car.direction*car.speed*dt)%limit+limit)%limit;
 }
}
export function capitalVehicleHits(car,person,radius=14) {
 const p=capitalVehiclePosition(car);
 const halfWidth=car.axis==='vertical'?24:42;
 const halfHeight=car.axis==='vertical'?42:24;
 return Math.abs(person.x-p.x)<halfWidth+radius && Math.abs(person.y-p.y)<halfHeight+radius;
}
