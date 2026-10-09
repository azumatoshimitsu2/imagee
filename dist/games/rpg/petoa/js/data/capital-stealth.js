import {CAPITAL,CAPITAL_ENTRY,CAPITAL_BUILDINGS,CAPITAL_GRID_X,CAPITAL_GRID_Y,CAPITAL_RESIDENTS,canWalkCapital,pedestrianCapital} from './vektena-city.js';
export const STEALTH_CITY=CAPITAL;
export const STEALTH_START=CAPITAL_ENTRY;
export const STEALTH_GATE={x:1800,y:430};
export const STEALTH_ROADS_X=CAPITAL_GRID_X,STEALTH_ROADS_Y=CAPITAL_GRID_Y;
export const STEALTH_BUILDINGS=CAPITAL_BUILDINGS;
export const STEALTH_REFUGES=[
 {id:'merchant',name:'商人の仕立て店',x:1080,y:2340,back:{x:1080,y:2220},lines:['ここなら少し休めるよ。上着を整えてから出るといい。']},
 {id:'workshop',name:'修理職人の工房',x:3120,y:1620,back:{x:3120,y:1500},lines:['表通りから離れて、少し休んでいきなさい。']},
];
export const STEALTH_CROWDS=[{x:940,y:2200,width:440,height:400},{x:1560,y:1450,width:500,height:400}];
export const stealthWalkable=canWalkCapital;
export const STEALTH_ACTORS=[];
const profiles=[
 ['office-worker','帳簿係',['昨日の帳簿と数字が合わなくてね。昼休みまで持ち越してしまった。','古い紙の裏にも書くから、見落としが増えるんだ。']],
 ['student','図書室へ向かう学生',['壊れる前の街の地図を借りたんだ。今と違う道ばかりで面白いよ。','帰りは古本屋に寄ろうかな。先生には内緒ね。']],
 ['researcher','部品を探す技師',['同じ規格の歯車が、もう作られていないんだ。店を一軒ずつ回っているよ。','新品を待つより、使える部品を探したほうが早いこともある。']],
 ['shop-assistant','店番の見習い',['お使いを頼まれたのに、店の場所を聞き忘れちゃって。','青い布の軒先が目印だって。似た店がいくつもあるでしょう？']],
 ['casual-youth','散歩中の若者',['この街に越してきたばかりなんだ。今日は裏通りを覚えているところ。','大通りから一本入ると、店の匂いまで変わるね。']],
 ['shopper','夕飯を考える住民',['干した豆を買ったけど、家に塩があったかしら。','一度帰るより、もう一軒のぞいていこうかな。']],
 ['elder-resident','昔を知る住民',['昔の友人と待ち合わせだよ。待つ場所だけは昔と同じなんだ。','時計が止まっていても、あの人なら分かるだろう。']],
 ['transit-attendant','休憩中の案内係',['今日は乗合車の修理で、発車が遅れているんだ。','待っている人に同じ説明をしていたら、喉がからからだよ。']],
 ['noble-man','旧家の当主',['屋敷の修繕を頼みに来た。材料を持つ家が、先に出すべきだろう。','職人の仕事を急がせるつもりはないよ。']],
 ['noble-woman','古い飾りを身に着けた婦人',['この留め具を直せる方を探しています。母から譲られた品なの。','見栄えより、長く使えるようにしていただきたいわ。']],
 ['wealthy-merchant','布を扱う商人',['荷が届くまで、仕立て屋を回って注文を聞いているよ。','遠くへ運ぶ道が落ち着けば、値も少し下げられるのだが。']],
 ['administrator','住宅係の事務官',['水路の点検に来ました。窓口の書類だけでは分からないことも多くて。','困っている家を、順に訪ねています。']],
 ['repair-artisan','修理仕事の職人',['道具の柄が折れてね。自分の道具を直す時間をやっと取れたよ。','よそで捨てた木でも、削れば十分使える。']],
 ['seamstress','布を届ける仕立て職人',['この包みを届けたら、今日は仕事じまい。','余った布で子どもの袖を継ごうと思っているの。']],
 ['poor-elder','日雇い仕事を探す住民',['市場で荷運びを頼まれないか、声をかけて回っているんだ。','今日は風が冷たいね。雨が降る前に帰れるといいが。']],
 ['poor-youth','仕事帰りの若者',['賃金をもらったから、靴底の革を買いに来た。','食べ物も買いたいし、どちらを先にするか迷うよ。']],
 ['porter','市場の荷運び人',['朝から穀物の袋を運んでいたんだ。肩より先に、靴底がへたっちまうよ。','今日はもう一仕事あれば、家族の分の干し魚も買えるんだがな。'],'capitalExtraResidents'],
 ['market-woman','市場の惣菜売り',['豆の煮込みを売っているの。火を分け合って炊けば、薪も少なくて済むでしょう。','欠けた器でも持っておいで。食べ盛りの子には、少し多めによそってあげる。'],'capitalExtraResidents'],
 ['courier','商会の配達人',['この鞄の届け物を済ませたら、次は北の商会だよ。路地を覚えると、ずいぶん近くなるんだ。','国境を越える荷には通行証が要るんだって。街の配達だけで、今日は十分忙しいけどね。'],'capitalExtraResidents'],
 ['wealthy-lady','旧家の奥方',['この上着は祖母の代から仕立て直しているの。よい布も、手入れする人がいてこそ長持ちしますわ。','屋敷の井戸を近所の方にも開けています。門を閉ざすばかりでは、この街で暮らしていけませんもの。'],'capitalExtraResidents'],
 ['repair-worker','揚水機の修理工',['井戸の揚水機を直してきたところ。歯車は動くようになったけど、軸受けがもう限界でね。','古い機械を解体する店を回るんだ。合う部品があれば、あの通りの水を止めずに済む。'],'capitalExtraResidents'],
 ['shopper','家族を待つ住民',['家族が工房から戻るのを待っているの。つい店先を見てしまうわ。','待ち合わせは、いつもこのあたりよ。']],
 ['elder-resident','近所を歩く住民',['じっと座っていると足が鈍るから、少し歩いてくるんだ。','今日は花屋の前まで。明日は公園まで行けるかな。']],
 ['transit-attendant','荷物係',['届け先の札が読めなくなっていてね。商会で聞き直してくるよ。','荷物を間違えると、修理を待つ人がまた待つことになる。']],
];
let seed=1616;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const separation=(a,b)=>Math.hypot((a.x-b.x)/58,(a.y-b.y)/92);
const pedestrian=p=>stealthWalkable(p.x,p.y,22)&&pedestrianCapital(p.x,p.y,20);
const segment=(a,b)=>{const steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/16);for(let n=0;n<=steps;n++){const t=n/(steps||1);if(!pedestrian({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false;}return true;};
// Spread residents around the whole town; never spawn on another person.
for(let attempt=0;attempt<12000&&STEALTH_ACTORS.length<64;attempt++){
 const axis=random()<.5,road=(axis?STEALTH_ROADS_X:STEALTH_ROADS_Y),center=road[Math.floor(random()*road.length)];
 const offset=(random()<.5?-1:1)*(110+random()*26);
 const start=axis?{x:center+offset,y:200+random()*(CAPITAL.height-400)}:{x:200+random()*(CAPITAL.width-400),y:center+offset};
 if(!pedestrian(start)||[...CAPITAL_RESIDENTS,...STEALTH_ACTORS,STEALTH_START].some(p=>separation(p,start)<1.25))continue;
 const route=[start];
 for(let trial=0;trial<100&&route.length<5;trial++){
  const last=route.at(-1),p={x:start.x+(random()-.5)*440,y:start.y+(random()-.5)*560};
  if(Math.hypot(last.x-p.x,last.y-p.y)<75||!segment(last,p))continue;route.push(p);
 }
 if(route.length<3)continue;
 // Return along the same walkable route after visiting several local destinations.
 const circuit=[...route,...route.slice(1,-1).reverse()];
 const i=STEALTH_ACTORS.length,faction=i%8<5?(i%2?'jiat':'ingas'):null;
 const profileIndex=faction?STEALTH_ACTORS.filter(a=>a.faction).length*7%profiles.length:STEALTH_ACTORS.filter(a=>!a.faction).length%profiles.length,profile=profiles[profileIndex];
 STEALTH_ACTORS.push({id:`resident-${i}`,...start,frame:profile[0],texture:profile[3]??(profileIndex>=8&&profileIndex<16?'capitalFrontResidents':'capitalResidents'),name:profile[1],lines:profile[2],faction,role:faction?['tail','relay','block'][i%3]:'civilian',route:circuit,walkSpeed:42+random()*18});
}

// Undercover observers also visit the central boulevard so it is not a guaranteed escape lane.
for(const [index,anchorY] of [2900,2300,1400,740].entries()){
 const actor=STEALTH_ACTORS.filter(a=>a.faction)[index*8];
 const otherPeople=[...CAPITAL_RESIDENTS,...STEALTH_ACTORS.filter(a=>a!==actor)];
 for(const offset of [0,110,-110,220,-220,330,-330]){
  const start={x:1800,y:anchorY+offset};
  if(!pedestrian(start)||otherPeople.some(p=>separation(p,start)<1.25))continue;
  const candidates=[{x:1776,y:start.y-85},{x:1820,y:start.y+90},{x:1782,y:start.y+180}];
  const route=[start];
  for(const p of candidates)if(segment(route.at(-1),p))route.push(p);
  if(route.length<3)continue;
  Object.assign(actor,start,{route:[...route,...route.slice(1,-1).reverse()],role:index%2?'relay':'block',initialFacing:{dx:0,dy:1}});
  break;
 }
}

// A visibly distinct intelligence director patrols the central district.
for(let attempt=0;attempt<800;attempt++){
 const start={x:1500+random()*330,y:1420+random()*280};
 if(!pedestrian(start)||[...CAPITAL_RESIDENTS,...STEALTH_ACTORS].some(p=>separation(p,start)<1.25))continue;
 const route=[start];
 for(let trial=0;trial<80&&route.length<4;trial++){
  const p={x:start.x+(random()-.5)*300,y:start.y+(random()-.5)*300};
  if(Math.hypot(route.at(-1).x-p.x,route.at(-1).y-p.y)>70&&segment(route.at(-1),p))route.push(p);
 }
 if(route.length<3)continue;
 STEALTH_ACTORS.push({id:'ingas-chief',...start,frame:'chief-front',texture:'capitalChief',name:'インガスの追跡主任',boss:true,faction:'ingas',role:'chief',route:[...route,...route.slice(1,-1).reverse()],walkSpeed:48});
 break;
}
