import {CAPITAL_RESIDENTS} from '../data/vektena-city.js';
import {STEALTH_CITY,STEALTH_START,STEALTH_GATE,STEALTH_ACTORS,STEALTH_BUILDINGS,STEALTH_CROWDS,STEALTH_REFUGES,stealthWalkable} from '../data/capital-stealth.js';
import {travelSpeed,disguiseDuration} from '../data/barter-shop.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function stealthLineClear(a,b){
 const steps=Math.ceil(distance(a,b)/24);
 for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!stealthWalkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0))return false;}
 return true;
}
// Shared grid cache; A* searches run only when a remembered destination changes.
const TILE=48,COLS=Math.ceil(STEALTH_CITY.width/TILE),ROWS=Math.ceil(STEALTH_CITY.height/TILE);
const grid=Uint8Array.from({length:COLS*ROWS},(_,i)=>stealthWalkable((i%COLS+.5)*TILE,(Math.floor(i/COLS)+.5)*TILE,16)?1:0);
export function stealthPath(from,to){
 if(!stealthWalkable(to.x,to.y))return [];
 const index=p=>Math.floor(p.y/TILE)*COLS+Math.floor(p.x/TILE);
 const start=index(from),end=index(to),prev=new Int32Array(grid.length).fill(-1),cost=new Float64Array(grid.length).fill(Infinity);
 const heuristic=n=>Math.abs(n%COLS-end%COLS)+Math.abs(Math.floor(n/COLS)-Math.floor(end/COLS));
 const open=[start];cost[start]=0;
 while(open.length){
  let best=0;for(let i=1;i<open.length;i++)if(cost[open[i]]+heuristic(open[i])<cost[open[best]]+heuristic(open[best]))best=i;
  const n=open.splice(best,1)[0];if(n===end)break;
  const x=n%COLS,y=Math.floor(n/COLS);
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
   if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;const next=ny*COLS+nx;
   if(!grid[next]||cost[next]<=cost[n]+1)continue;
   cost[next]=cost[n]+1;prev[next]=n;if(!open.includes(next))open.push(next);
  }
 }
 if(start!==end&&prev[end]<0)return [];
 const path=[];for(let n=end;n!==start;n=prev[n])path.push({x:(n%COLS+.5)*TILE,y:(Math.floor(n/COLS)+.5)*TILE});
 path.reverse();return [...path,{...to}];
}
const PERSON_DISTANCE=32;
export function capitalPeopleAllowMove(from,to,people){
 return people.every(other=>{
  const before=distance(from,other),after=distance(to,other);
  return after>=PERSON_DISTANCE||(before<PERSON_DISTANCE&&after>=before);
 });
}
export function capitalResidentsAllowMove(from,to,people){
 const spacing=(a,b)=>Math.hypot((a.x-b.x)/58,(a.y-b.y)/92);
 return people.every(other=>spacing(to,other)>=1||(spacing(from,other)<1&&spacing(to,other)>=spacing(from,other)));
}
function move(a,target,speed,dt,state){
 if(distance(a,target)<2)return;
 a.navWait=(a.navWait??0)-dt;
 if(stealthLineClear(a,target))a.path=[target];
 else if(a.navWait<=0){a.path=stealthPath(a,target);a.navWait=1.2;}
 const p=a.path?.[0];if(!p)return;
 const d=distance(a,p),dx=(p.x-a.x)/d,dy=(p.y-a.y)/d;
 let step=Math.min(d,speed*dt);
 while(step>.4){
  const next={x:a.x+dx*step,y:a.y+dy*step};
  if(stealthWalkable(next.x,next.y,12)&&capitalPeopleAllowMove(a,next,[state.player])&&capitalResidentsAllowMove(a,next,[...CAPITAL_RESIDENTS,...state.actors.filter(b=>b!==a)])){
   a.x=next.x;a.y=next.y;a.dx=dx;a.dy=dy;break;
  }
  step/=2;
 }
 if(distance(a,p)<2)a.path.shift();
}
export function createCapitalStealth(saved={}){
 const checkpoint=STEALTH_REFUGES.find(r=>r.id===saved.checkpoint)?.back??STEALTH_START;
 return {player:{...checkpoint,dx:0,dy:-1},checkpoint:{...checkpoint},checkpointId:saved.checkpoint??null,
 actors:STEALTH_ACTORS.map(a=>({...a,route:a.route.map(p=>({...p})),home:{x:a.x,y:a.y},dx:a.initialFacing?.dx??0,dy:a.initialFacing?.dy??1,routeIndex:1,wait:0,revealed:false,contactProtection:0,contactTime:0,suspicion:0,memory:0,delay:0,pause:0,path:[]})),
 equipment:[...(saved.equipment??[])],hasDisguise:!!saved.hasDisguise,disguise:0,disguiseCooldown:0,grace:saved.checkpoint?4:1.5,time:0,caught:false,complete:false,indoor:null,
 crouching:false,hidden:false,alert:0,commands:{mados:0,iria:0},lure:null,message:'',trail:[{x:checkpoint.x,y:checkpoint.y+96},{...checkpoint}]};
}
export function seesCapitalPlayer(a,state){
 if(!a.faction||state.indoor||state.grace>0||a.pause>0)return false;
 const p=state.player,d=distance(a,p);
 const crowd=STEALTH_CROWDS.some(r=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height);
 const range=state.disguise?85:state.crouching?140:crowd?160:a.boss?380:300;
 if(d>range||!stealthLineClear(a,p))return false;
 if(d<70)return true;
 const forward=((p.x-a.x)*a.dx+(p.y-a.y)*a.dy)/d;
 return forward>.45;
}
export function useCapitalDisguise(state){
 if(!state.hasDisguise||state.disguiseCooldown>0||state.disguise>0||state.caught||state.complete)return false;
 if(!state.indoor&&state.actors.some(a=>seesCapitalPlayer(a,state))){state.message='人目を避けてから着替えよう。';return false;}
 state.disguise=disguiseDuration(state.equipment);state.disguiseCooldown=state.disguise+30;state.message='上着を着替えた。近くの人物には気をつけよう。';return true;
}
export function capitalSupport(state,id){
 if(id!=='mados'&&id!=='iria')return false;
 if(state.indoor||state.caught||state.complete)return false;
 if(state.commands[id]>0){state.message=`${id==='mados'?'マドス':'イリア'}の再使用まであと${Math.ceil(state.commands[id])}秒。`;return false;}
 const targets=state.actors.filter(a=>a.faction&&distance(a,state.player)<430&&stealthLineClear(a,state.player)).sort((a,b)=>(b.revealed?1:0)-(a.revealed?1:0)||distance(a,state.player)-distance(b,state.player));
 if(!targets.length){state.message='今は援護が必要な相手が近くにいない。';return false;}
 const a=targets[0];state.commands[id]=id==='mados'?20:14;
 if(id==='mados'){const target=[[180,150],[-180,150],[0,180],[0,-180]].map(([x,y])=>({x:state.player.x+x,y:state.player.y+y})).find(p=>stealthWalkable(p.x,p.y)&&stealthLineClear(state.player,p))??state.player;a.memory=a.boss?12:7;a.pause=0;a.lastSeen={...target};a.pursuitTarget={...target};a.path=[];a.navWait=0;state.lure={id:a.id,x:target.x,y:target.y,remaining:a.boss?11:7};state.message='マドスが一人の注意を引きつけている。';}
 else{a.pause=6;a.memory=0;a.suspicion=0;a.path=[];state.iriaSupport={id:a.id,remaining:6};state.message='イリアが一人の足を止めている。今のうちに進もう。';}
 return true;
}
export function enterCapitalRefuge(state,id){
 const r=STEALTH_REFUGES.find(r=>r.id===id);
 if(!r||state.indoor||distance(r,state.player)>95||state.caught)return false;
 state.indoor=id;state.checkpoint={...r.back};state.checkpointId=id;state.grace=3;state.alert=0;
 for(const a of state.actors){a.memory=0;a.suspicion=0;a.path=[];}return true;
}
export function leaveCapitalRefuge(state,back=true){
 const r=STEALTH_REFUGES.find(r=>r.id===state.indoor);if(!r)return false;
 state.player={...(back?r.back:r),dx:0,dy:-1};state.indoor=null;state.grace=4;state.trail=[{x:state.player.x,y:state.player.y+96},{...state.player}];return true;
}
export function retryCapitalStealth(state){
 const fresh=createCapitalStealth({equipment:state.equipment,hasDisguise:state.hasDisguise});
 Object.assign(state,fresh);return state;
}
export function finishCapitalStealth(state){
 if(state.indoor||state.caught||distance(state.player,STEALTH_GATE)>95)return false;
 if(state.lure){state.message='マドスの合流を待とう。';return false;}
 if(state.actors.some(a=>a.faction&&a.memory>0&&distance(a,state.player)<330)){state.message='まだ尾行を振り切れていない。建物や路地で視線を切ろう。';return false;}
 state.complete=true;state.message='最後の包囲を抜けた。ユアテアはもう目の前だ。';return true;
}
function revealObserver(a,state){
 if(!a.revealed){a.revealed=true;a.contactProtection=1;a.contactTime=0;a.pause=.5;}
 a.memory=a.boss?12:7;a.lastSeen={x:state.player.x,y:state.player.y};
}
export function capitalPursuitTarget(a,state,sees,moving=true){
 // Predict only while the observer can actually see movement. Lost targets stay at last sighting.
 const p=state.player,known=a.lastSeen;
 if(!known)return null;
 if(!sees||distance(a,p)<110)return {...known};

 if(!moving||a.role==='tail')return {...known};
 const partners=state.actors.filter(b=>b.faction===a.faction&&b.role===a.role);
 const sign=partners.indexOf(a)%2?1:-1;
 const ahead=a.boss?380:a.role==='block'?300:160,side=sign*(a.boss?120:a.role==='block'?90:150);
 for(const factor of [1,.65,.3]){
  const target={x:known.x+(p.dx*ahead-p.dy*side)*factor,y:known.y+(p.dy*ahead+p.dx*side)*factor};
  if(stealthWalkable(target.x,target.y))return target;
 }
 return {...known};
}
function searchCapitalObserver(a,state,dt){
 if(!a.searching){
  a.searching=true;a.searchTime=0;a.lookWait=0;a.lookIndex=0;
  a.searchHeading=Math.atan2(a.dy||0,a.dx||0);a.searchDestination=null;a.searchCorner=0;a.path=[];a.navWait=0;
 }
 a.searchTime+=dt;a.lookWait-=dt;
 // Pause to scan, then approach the last known location; never follow unseen movement.
 const atLastLocation=distance(a,a.searchDestination??a.lastSeen)<32;
 const scanning=(!a.boss&&atLastLocation)||a.searchTime%2.4<1.2;
 if(scanning){
  if(a.lookWait<=0){
   const angles=[0,1.15,-1.15,Math.PI];
   const angle=a.searchHeading+angles[a.lookIndex++%angles.length];
   a.dx=Math.cos(angle);a.dy=Math.sin(angle);a.lookWait=a.boss?.9:.7;
  }
 }else{
  if(a.boss&&atLastLocation){
   const offsets=[[120,0],[0,120],[-120,0],[0,-120]];
   for(let n=0;n<offsets.length;n++){
    const [x,y]=offsets[a.searchCorner++%offsets.length],target={x:a.lastSeen.x+x,y:a.lastSeen.y+y};
    if(stealthWalkable(target.x,target.y)&&stealthLineClear(a.lastSeen,target)){a.searchDestination=target;break;}
   }
  }
  move(a,a.searchDestination??a.lastSeen,a.boss?150:135,dt,state);
 }
}
export function stepCapitalStealth(state,delta,input={x:0,y:0}){
 if(state.caught||state.complete)return;
 const dt=Math.min(delta,60)/1000;state.time+=dt;state.grace=Math.max(0,state.grace-dt);
 state.disguise=Math.max(0,state.disguise-dt);state.disguiseCooldown=Math.max(0,state.disguiseCooldown-dt);
 for(const id of ['mados','iria'])state.commands[id]=Math.max(0,state.commands[id]-dt);
 if(state.iriaSupport){state.iriaSupport.remaining-=dt;if(state.iriaSupport.remaining<=0)state.iriaSupport=null;}
 if(state.indoor)return;
 const p=state.player,len=Math.hypot(input.x,input.y)||1,speed=travelSpeed(state.crouching?105:185,state.equipment);
 const dx=input.x/len,dy=input.y/len;
 const people=[...CAPITAL_RESIDENTS,...state.actors];
 const canMove=to=>stealthWalkable(to.x,to.y)&&capitalPeopleAllowMove(p,to,people);
 if(canMove({x:p.x+dx*speed*dt,y:p.y}))p.x+=dx*speed*dt;
 if(canMove({x:p.x,y:p.y+dy*speed*dt}))p.y+=dy*speed*dt;
 if(input.x||input.y){p.dx=dx;p.dy=dy;}
 if(distance(p,state.trail.at(-1))>3){state.trail.push({x:p.x,y:p.y});if(state.trail.length>180)state.trail.shift();}
 if(state.lure){state.lure.remaining-=dt;if(state.lure.remaining<=0){const actor=state.actors.find(a=>a.id===state.lure.id);if(actor){actor.lastSeen={x:state.lure.x,y:state.lure.y};actor.memory=actor.boss?12:7;actor.searching=false;actor.path=[];}state.lure=null;}}
 const moving=!!(input.x||input.y);
 for(const a of state.actors){
  a.contactProtection=Math.max(0,a.contactProtection-dt);
  if(a.faction&&!a.revealed&&state.lure?.id!==a.id&&state.grace<=0&&(seesCapitalPlayer(a,state)||(distance(a,p)<=100&&stealthLineClear(a,p)))){
   revealObserver(a,state);
   state.message=a.boss?'追跡主任がこちらに気づいた。部下を呼ぶ前に距離を取ろう。':'近づいた住民が上着を脱いだ……諜報員だ。距離を取ろう。';
  }
  a.pause=Math.max(0,a.pause-dt);if(a.pause>0)continue;
  const sees=state.lure?.id===a.id?false:seesCapitalPlayer(a,state);
  a.suspicion=Math.max(0,Math.min(1,a.suspicion+(sees?dt*.8:-dt*.35)));
  if(sees){a.memory=a.boss?12:7;a.lastSeen={x:p.x,y:p.y};a.searching=false;}
  else a.memory=Math.max(0,a.memory-dt);
  if(a.memory>0&&(a.revealed||state.lure?.id===a.id)){
   if(sees)a.lastSeen={x:p.x,y:p.y};
   const lure=state.lure?.id===a.id?state.lure:null;
   a.planWait=Math.max(0,(a.planWait??0)-dt);
   if(!sees||!a.pursuitTarget||a.planWait<=0){a.pursuitTarget=capitalPursuitTarget(a,state,sees,moving);a.planWait=.4;}
   // Approaching the player switches from interception to a direct catch.
   const target=lure??(sees&&distance(a,p)<110?a.lastSeen:a.pursuitTarget);
   if(a.revealed&&!sees&&!lure&&a.lastSeen)searchCapitalObserver(a,state,dt);
   else if(target&&stealthWalkable(target.x,target.y))move(a,target,a.boss?250:a.revealed?260:72,dt,state);
   a.relayWait=Math.max(0,(a.relayWait??0)-dt);
   if(sees&&!lure&&a.relayWait<=0){
    const nearby=state.actors.filter(b=>b!==a&&b.faction===a.faction&&b.pause<=0&&distance(a,b)<(a.boss?800:600)&&stealthLineClear(a,b)&&b.memory<=0)
     .sort((b,c)=>distance(b,p)-distance(c,p)).slice(0,a.boss?4:3);
    for(const b of nearby){revealObserver(b,state);b.lastSeen={...a.lastSeen};b.pursuitTarget={...a.lastSeen};b.planWait=0;}
    a.relayWait=a.boss?1:a.role==='relay'?1.5:3;
   }
  }else{
   a.searching=false;
   a.wait=Math.max(0,a.wait-dt);
   const target=a.route[a.routeIndex%a.route.length];
   if(a.wait<=0){move(a,target,a.walkSpeed??54,dt,state);if(distance(a,target)<8){a.routeIndex=(a.routeIndex+1)%a.route.length;a.wait=3+state.actors.indexOf(a)%6;}}
  }
  if(a.faction&&a.revealed&&state.grace<=0&&distance(a,p)<=38&&a.pause<=0&&state.lure?.id!==a.id&&a.contactProtection<=0){
   state.caught=true;state.message='諜報員に捕まった。街の入口からやり直そう。';
  }else a.contactTime=0;
 }
 state.alert=Math.max(0,...state.actors.filter(a=>a.faction).map(a=>a.memory>0?1:a.suspicion));
 state.hidden=state.actors.every(a=>!seesCapitalPlayer(a,state));
}
