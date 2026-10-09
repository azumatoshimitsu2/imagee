import test from 'node:test';
import assert from 'node:assert/strict';
import {STEALTH_CITY,STEALTH_START,STEALTH_GATE,STEALTH_REFUGES,STEALTH_ACTORS,stealthWalkable} from '../js/data/capital-stealth.js';
import {CAPITAL} from '../js/data/vektena-city.js';
import {createCapitalStealth,stepCapitalStealth,seesCapitalPlayer,stealthLineClear,stealthPath,useCapitalDisguise,capitalSupport,enterCapitalRefuge,leaveCapitalRefuge,retryCapitalStealth,finishCapitalStealth} from '../js/systems/capital-stealth.js';

test('largest map contains both intelligence services and civilian facades, with reachable start, refuges and gate',()=>{
 assert.ok(STEALTH_CITY.width*STEALTH_CITY.height===CAPITAL.width*CAPITAL.height);
 assert.equal(STEALTH_ACTORS.filter(a=>a.faction&&!a.boss).length,40);
 assert.ok(STEALTH_ACTORS.some(a=>a.faction==='ingas'));assert.ok(STEALTH_ACTORS.some(a=>a.faction==='jiat'));assert.ok(STEALTH_ACTORS.some(a=>!a.faction));
 for(const a of STEALTH_ACTORS){assert.ok(stealthWalkable(a.x,a.y));assert.ok(a.route.length);}
 for(const p of [...STEALTH_REFUGES,...STEALTH_REFUGES.map(r=>r.back),STEALTH_GATE])assert.ok(stealthPath(STEALTH_START,p).length);
});

test('vision needs facing and an unobstructed line; crouching and disguise reduce reach',()=>{
 const s=createCapitalStealth({hasDisguise:true});s.grace=0;s.player={x:1800,y:3060};const a={faction:'ingas',x:1800,y:2860,dx:0,dy:1,pause:0};
 assert.equal(seesCapitalPlayer(a,s),true);a.dy=-1;assert.equal(seesCapitalPlayer(a,s),false);a.dy=1;s.crouching=true;assert.equal(seesCapitalPlayer(a,s),false);s.crouching=false;s.disguise=10;assert.equal(seesCapitalPlayer(a,s),false);
 assert.equal(stealthLineClear({x:0,y:0},{x:10,y:10}),false);
});

test('capture retries from city entry without removing equipment or disguise possession',()=>{
 const s=createCapitalStealth({hasDisguise:true,equipment:['swift-shoes','cloak-clasp']});s.player={...STEALTH_REFUGES[0]};assert.ok(enterCapitalRefuge(s,'merchant'));assert.ok(leaveCapitalRefuge(s));s.caught=true;
 retryCapitalStealth(s);assert.deepEqual(s.player.x,STEALTH_START.x);assert.deepEqual(s.player.y,STEALTH_START.y);assert.equal(s.checkpointId,null);assert.equal(s.caught,false);assert.equal(s.hasDisguise,true);assert.deepEqual(s.equipment,['swift-shoes','cloak-clasp']);assert.ok(s.grace>0);
});

test('refuge pauses patrols, permits safe disguise, and has both exits',()=>{
 const s=createCapitalStealth({hasDisguise:true,equipment:['cloak-clasp']});s.player={...STEALTH_REFUGES[0]};enterCapitalRefuge(s,'merchant');const before=s.actors.map(a=>({x:a.x,y:a.y}));
 assert.ok(useCapitalDisguise(s));assert.equal(s.disguise,32);stepCapitalStealth(s,60);assert.deepEqual(s.actors.map(a=>({x:a.x,y:a.y})),before);
 leaveCapitalRefuge(s,false);assert.equal(s.player.y,STEALTH_REFUGES[0].y);enterCapitalRefuge(s,'merchant');leaveCapitalRefuge(s,true);assert.equal(s.player.y,STEALTH_REFUGES[0].back.y);
});

test('commands affect one nearby observer, honor cooldowns and never require weapons',()=>{
 const s=createCapitalStealth();s.player={x:1800,y:3060};s.actors[0]= {...s.actors[0],x:1800,y:2940};
 assert.ok(capitalSupport(s,'iria'));assert.equal(s.actors.filter(a=>a.pause>0).length,1);assert.equal(capitalSupport(s,'iria'),false);
 assert.ok(capitalSupport(s,'mados'));assert.ok(s.lure);assert.equal(capitalSupport(s,'mados'),false);
});

test('being spotted builds suspicion, contact captures and completion needs lost pursuit',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060};s.actors=[{...s.actors[0],x:1800,y:2940,dx:0,dy:1,route:[{x:1800,y:3200}],routeIndex:0}];
 for(let i=0;i<30;i++)stepCapitalStealth(s,60);
 assert.ok(s.actors[0].memory>0||s.caught);
 const capture=createCapitalStealth();capture.grace=0;capture.actors=[{...capture.actors[0],...capture.player}];stepCapitalStealth(capture,16);assert.equal(capture.caught,false);assert.equal(capture.actors[0].revealed,true);assert.ok(capture.actors[0].contactProtection>0);
 for(let i=0;i<10;i++)stepCapitalStealth(capture,60);assert.equal(capture.caught,false);
 const a=capture.actors[0];a.contactProtection=0;a.pause=0;for(let i=0;i<30;i++){Object.assign(a,capture.player);stepCapitalStealth(capture,60);}assert.equal(capture.caught,true);
 const end=createCapitalStealth();end.player={...STEALTH_GATE};end.actors=[{...end.actors[0],x:STEALTH_GATE.x,y:STEALTH_GATE.y+100,memory:4}];assert.equal(finishCapitalStealth(end),false);end.actors[0].memory=0;assert.ok(finishCapitalStealth(end));assert.equal(end.complete,true);
});

test('ordinary walkers pause instead of immediately reversing at their destination',()=>{const s=createCapitalStealth();s.actors=[s.actors.find(a=>!a.faction)];const a=s.actors[0],end=a.route[1];Object.assign(a,end);stepCapitalStealth(s,60);assert.ok(a.wait>=3);const position={x:a.x,y:a.y};for(let i=0;i<20;i++)stepCapitalStealth(s,60);assert.deepEqual({x:a.x,y:a.y},position);assert.equal(a.revealed,false);});


test('approaching an observer reveals their disguise before body contact and allows escape',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:-1};
 s.actors=[{...s.actors[0],x:1800,y:2965}];
 stepCapitalStealth(s,16);assert.equal(s.actors[0].revealed,true);assert.equal(s.caught,false);assert.ok(s.actors[0].pause>.4);
 const startY=s.player.y;for(let i=0;i<20;i++)stepCapitalStealth(s,60,{x:0,y:1});
 assert.ok(s.player.y>startY+100);assert.equal(s.caught,false);
});

test('walking cannot pass through moving citizens or stationary residents',()=>{
 const s=createCapitalStealth();s.player={x:1800,y:3060,dx:0,dy:-1};
 const citizen=s.actors.find(a=>!a.faction);s.actors=[{...citizen,x:1800,y:3000,pause:10}];
 for(let i=0;i<40;i++)stepCapitalStealth(s,60,{x:0,y:-1});
 assert.ok(s.player.y>=3032);assert.ok(s.player.y<3060);
 s.actors=[];s.player={x:1650,y:3140,dx:0,dy:-1};
 for(let i=0;i<40;i++)stepCapitalStealth(s,60,{x:0,y:-1});
 assert.ok(s.player.y>=3112);
});

test('a pedestrian approaching the player stops without walking through them',()=>{
 const s=createCapitalStealth();s.player={x:1800,y:3060};
 const citizen=s.actors.find(a=>!a.faction);s.actors=[{...citizen,x:1800,y:3000,route:[{x:1800,y:3000},{x:1800,y:3200}],routeIndex:1}];
 for(let i=0;i<80;i++)stepCapitalStealth(s,60);
 assert.ok(s.actors[0].y<=3028);assert.ok(s.actors[0].y>3000);
});

test('residents are spread apart, have varied conversations, and wander through multiple destinations',async()=>{
 const {CAPITAL_RESIDENTS}=await import('../js/data/vektena-city.js');
 const spacing=(a,b)=>Math.hypot((a.x-b.x)/58,(a.y-b.y)/92);
 assert.equal(STEALTH_ACTORS.filter(a=>!a.boss).length,64);
 for(let i=0;i<STEALTH_ACTORS.length;i++){
  const a=STEALTH_ACTORS[i];
  assert.ok(a.route.length>=3);if(!a.boss)assert.ok(a.lines.length>=2);
  assert.ok(new Set(a.route.map(p=>Math.round(p.x))).size>=3);
  for(const b of [...CAPITAL_RESIDENTS,...STEALTH_ACTORS.slice(i+1)])assert.ok(spacing(a,b)>=1.25,`${a.id} overlaps a resident`);
 }
 const citizens=STEALTH_ACTORS.filter(a=>!a.faction);
 assert.ok(new Set(citizens.map(a=>a.lines.join())).size>=12);
 const s=createCapitalStealth();s.grace=100;
 for(let n=0;n<300;n++)stepCapitalStealth(s,60);
 for(let i=0;i<s.actors.length;i++)for(const b of [...CAPITAL_RESIDENTS,...s.actors.slice(i+1)])assert.ok(spacing(s.actors[i],b)>=.999,`${s.actors[i].id} walks over a resident`);
});


test('each revealed observer gives one second of grace, then contact captures immediately',()=>{
 const s=createCapitalStealth();s.grace=0;const a=s.actors[0];s.actors=[a];Object.assign(a,{...s.player,dx:0,dy:1});
 stepCapitalStealth(s,16);assert.equal(a.contactProtection,1);assert.equal(s.caught,false);
 for(let i=0;i<16;i++){Object.assign(a,s.player);stepCapitalStealth(s,60);assert.equal(s.caught,false);}
 assert.ok(a.contactProtection>0);Object.assign(a,s.player);stepCapitalStealth(s,60);assert.equal(s.caught,true);
});

test('entering an observers field of view starts pursuit without waiting for accumulated suspicion',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:-1};
 const a={...s.actors[0],x:1800,y:2840,dx:0,dy:1,role:'tail'};s.actors=[a];
 stepCapitalStealth(s,16);assert.equal(a.revealed,true);assert.ok(a.memory>0);assert.equal(s.caught,false);
 const before=a.y;for(let i=0;i<40;i++)stepCapitalStealth(s,60);assert.ok(a.y>before);assert.ok(a.memory>0);
});


test('a visible pursuer closes the gap even against the speed shoes',()=>{
 const s=createCapitalStealth({equipment:['swift-shoes']});s.grace=0;s.player={x:1800,y:3060,dx:0,dy:-1};
 const a={...s.actors[0],x:1800,y:3280,dx:0,dy:-1,revealed:true,contactProtection:0,pause:0,role:'tail',memory:7,lastSeen:{x:1800,y:3060}};s.actors=[a];
 const before=Math.hypot(a.x-s.player.x,a.y-s.player.y);
 for(let i=0;i<10;i++)stepCapitalStealth(s,60,{x:0,y:-1});
 assert.ok(Math.hypot(a.x-s.player.x,a.y-s.player.y)<before-10);assert.equal(s.caught,false);
});

test('interceptors predict ahead while seeing movement, but do not track through walls',async()=>{
 const {capitalPursuitTarget}=await import('../js/systems/capital-stealth.js');
 const s=createCapitalStealth();s.player={x:1800,y:3060,dx:0,dy:-1};
 const a={...s.actors[0],x:1800,y:3280,role:'block',lastSeen:{x:1800,y:3060}};s.actors=[a];
 assert.ok(capitalPursuitTarget(a,s,true).y<3060);
 s.player.y=2600;assert.deepEqual(capitalPursuitTarget(a,s,false),{x:1800,y:3060});
 assert.deepEqual(capitalPursuitTarget(a,s,true,false),{x:1800,y:3060});
});

test('a relay recruits nearby allies with their own one second contact grace',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:1};
 const relay={...s.actors[0],x:1800,y:2800,dx:0,dy:1,role:'relay',revealed:true,memory:7,lastSeen:{x:1800,y:3060}};
 const ally={...s.actors[1],faction:relay.faction,x:1800,y:2940,dx:0,dy:-1,memory:0};s.actors=[relay,ally];
 stepCapitalStealth(s,16);assert.equal(ally.revealed,true);assert.ok(ally.memory>0);assert.ok(ally.contactProtection>=.98);assert.equal(s.caught,false);
});


test('newly revealed observers wait half a second before pursuit and interceptors spread to opposite sides',async()=>{
 const {capitalPursuitTarget}=await import('../js/systems/capital-stealth.js');
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:-1};
 const a={...s.actors[0],x:1800,y:2965,role:'relay',dx:0,dy:1},b={...s.actors[1],x:1800,y:2820,role:'relay',faction:a.faction};s.actors=[a,b];
 stepCapitalStealth(s,16);const before={x:a.x,y:a.y};
 for(let i=0;i<6;i++)stepCapitalStealth(s,60);
 assert.deepEqual({x:a.x,y:a.y},before);assert.equal(s.caught,false);
 a.lastSeen={...s.player};b.lastSeen={...s.player};
 const left=capitalPursuitTarget(a,s,true),right=capitalPursuitTarget(b,s,true);
 // Both plans must remain walkable; opposite-side plans may shorten to fit the sidewalk.
 assert.ok(left.x!==right.x);assert.ok((left.x-1800)*(right.x-1800)<=0);
});


test('lost observers stop and look around, then resume pursuit when their scan finds Chatoa',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:0};
 const a={...s.actors[0],x:1800,y:2820,dx:0,dy:-1,revealed:true,contactProtection:0,pause:0,memory:7,lastSeen:{x:1800,y:2820},role:'tail'};s.actors=[a];
 stepCapitalStealth(s,60);assert.equal(a.searching,true);assert.equal(a.y,2820);
 const directions=new Set();let found=false;
 for(let i=0;i<65;i++){stepCapitalStealth(s,60);directions.add(`${a.dx.toFixed(2)},${a.dy.toFixed(2)}`);if(!a.searching&&a.y>2820){found=true;break;}}
 assert.ok(directions.size>=3);assert.ok(found);assert.ok(a.memory>0);assert.equal(a.contactProtection,0);
});

test('a search does not learn the players unseen position and eventually returns to civilian walking',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3400};
 const a={...s.actors[0],x:1800,y:2820,dx:0,dy:-1,revealed:true,pause:0,memory:.5,lastSeen:{x:1800,y:2820},role:'tail'};s.actors=[a];
 for(let i=0;i<12;i++)stepCapitalStealth(s,60);
 assert.equal(a.memory,0);assert.equal(a.searching,false);assert.deepEqual(a.lastSeen,{x:1800,y:2820});
});


test('holding straight north on the central boulevard cannot bypass the stealth encounter',()=>{
 const s=createCapitalStealth({equipment:['swift-shoes']});
 for(let i=0;i<450&&!s.caught;i++)stepCapitalStealth(s,60,{x:0,y:-1});
 assert.equal(s.caught,true);assert.ok(s.player.y>STEALTH_GATE.y+200);
 assert.ok(s.actors.some(a=>a.revealed));
});


test('a lure makes an unalerted observer follow Mados and ignore Chatoa for its duration',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:-1};
 const a={...s.actors[0],x:1800,y:2940,memory:0,revealed:false,pause:0,dx:0,dy:1};s.actors=[a];
 assert.ok(capitalSupport(s,'mados'));const before={x:a.x,y:a.y},target={x:s.lure.x,y:s.lure.y};
 for(let i=0;i<20;i++)stepCapitalStealth(s,60);
 assert.ok(Math.hypot(a.x-target.x,a.y-target.y)<Math.hypot(before.x-target.x,before.y-target.y));
 assert.equal(s.caught,false);assert.equal(a.revealed,false);assert.ok(s.lure.remaining>0);
});

test('Iria holds a pursuing observer still and prevents capture during six seconds',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060};
 const a={...s.actors[0],x:1800,y:3030,revealed:true,contactProtection:0,memory:7,pause:0};s.actors=[a];
 assert.ok(capitalSupport(s,'iria'));const before={x:a.x,y:a.y};
 for(let i=0;i<90;i++)stepCapitalStealth(s,60);
 assert.deepEqual({x:a.x,y:a.y},before);assert.equal(s.caught,false);assert.ok(s.iriaSupport.remaining>0);
});


test('an enemy approaching stationary Chatoa captures and retry returns to the city entrance',()=>{
 const s=createCapitalStealth({checkpoint:'merchant',equipment:['swift-shoes'],hasDisguise:true});
 s.grace=0;s.player={x:1800,y:3060,dx:0,dy:0};
 s.actors=[{...s.actors[0],x:1800,y:3180,dx:0,dy:-1,role:'tail'}];
 for(let i=0;i<80&&!s.caught;i++)stepCapitalStealth(s,60);
 assert.equal(s.caught,true);retryCapitalStealth(s);assert.equal(s.player.x,STEALTH_START.x);assert.equal(s.player.y,STEALTH_START.y);assert.equal(s.checkpointId,null);assert.deepEqual(s.equipment,['swift-shoes']);
});


test('pursuit resumes after half a second while contact grace is tracked separately',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060,dx:0,dy:0};
 const a={...s.actors[0],x:1800,y:2840,dx:0,dy:1,role:'tail'};s.actors=[a];
 stepCapitalStealth(s,16);const y=a.y;
 for(let i=0;i<8;i++)stepCapitalStealth(s,60);
 assert.equal(a.y,y);stepCapitalStealth(s,40);assert.ok(a.y>y);assert.ok(a.contactProtection>0);assert.equal(s.caught,false);
});


test('one conspicuous intelligence chief patrols without overlapping townspeople',()=>{
 const bosses=STEALTH_ACTORS.filter(a=>a.boss);assert.equal(bosses.length,1);assert.equal(bosses[0].texture,'capitalChief');assert.equal(bosses[0].role,'chief');assert.ok(bosses[0].route.length>=3);
});

test('the chief has a longer observation range and remains distracted by Mados longer',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3060};
 const a={...s.actors.find(a=>a.boss),x:1800,y:2700,dx:0,dy:1,pause:0};s.actors=[a];
 assert.equal(seesCapitalPlayer(a,s),true);assert.equal(seesCapitalPlayer({...a,boss:false},s),false);
 assert.ok(capitalSupport(s,'mados'));assert.equal(s.lure.remaining,11);
 for(let n=0;n<130;n++)stepCapitalStealth(s,60);
 assert.ok(s.lure.remaining>0);assert.ok(a.memory>0);assert.equal(s.caught,false);
});

test('the chief searches nearby exits and remembers the last sighting for twelve seconds',()=>{
 const s=createCapitalStealth();s.grace=0;s.player={x:1800,y:3400};
 const a={...s.actors.find(a=>a.boss),x:1800,y:2820,dx:0,dy:-1,revealed:true,pause:0,memory:12,lastSeen:{x:1800,y:2820}};s.actors=[a];
 for(let n=0;n<125;n++)stepCapitalStealth(s,60);
 assert.ok(a.memory>0);assert.equal(a.searching,true);assert.ok(a.searchDestination);assert.deepEqual(a.lastSeen,{x:1800,y:2820});
});
