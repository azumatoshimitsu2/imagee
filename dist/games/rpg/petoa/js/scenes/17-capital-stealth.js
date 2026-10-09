import {BazaarCityScene} from './13-bazaar-city.js';
import {STEALTH_CITY,STEALTH_START,STEALTH_GATE,STEALTH_ROADS_X,STEALTH_ROADS_Y,STEALTH_BUILDINGS,STEALTH_CROWDS,STEALTH_REFUGES} from '../data/capital-stealth.js';
import {createCapitalStealth,stepCapitalStealth,useCapitalDisguise,capitalSupport,enterCapitalRefuge,leaveCapitalRefuge,retryCapitalStealth,finishCapitalStealth} from '../systems/capital-stealth.js';
import {ESCORT_TEXTURE,ESCORT_ATLAS,createEscortSprite,syncEscortSprite} from '../ui/escort-sprites.js';
const $=s=>document.querySelector(s);
export class CapitalStealthScene extends BazaarCityScene {
 constructor(){super({key:'CapitalStealthScene',chapter:'CHAPTER 15',title:'ベクテーナ・最後の包囲網',time:'昼'});}
 preload(){
  super.preload();
  for(const name of ['ground','buildings','street']){const path=`./assets/img/tiles/vektena/vektena-${name}-v1`;this.load.atlas(`capital-${name}`,`${path}.png`,`${path}.json`);}
  for(const [key,path] of [['capitalResidents','vektena-residents-v2'],['capitalFrontResidents','vektena-residents-front-v1'],['capitalWorkersFront','vektena-workers-front-v1'],[ESCORT_TEXTURE,'bazaar-escort-directions-v1']])this.load.atlas(key,`./assets/img/characters/${path}.png`,`./assets/img/characters/${path}.json`);
 }
 create(){
  this.storyBusy=false;this.advanceStory=null;this.touchDirection=null;this.transitioning=false;
  this.state=createCapitalStealth({checkpoint:this.registry.get('capitalStealthCheckpoint'),equipment:this.registry.get('travelEquipment'),hasDisguise:this.registry.get('vektenaStage')>=1});
  this.bindSceneControls();this.commandKeys=this.input.keyboard.addKeys({mados:'Q',iria:'E',disguise:'R',crouch:'C'});
  this.commandPanel=document.createElement('div');this.commandPanel.className='chase-mobile-commands';
  for(const [id,label] of [['mados','Q マドス：囮'],['iria','E イリア：注意を逸らす'],['disguise','R 変装'],['crouch','C 忍び足']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.stealthCommand=id;button.addEventListener('click',()=>this.command(id));this.commandPanel.append(button);
  }
  $('.game-panel').classList.add('chase-mode');
  const dialog=$('#dialog'),dialogParent=dialog.parentNode,dialogNext=dialog.nextSibling;$('#viewport').append(dialog);
  $('.touch-controls').prepend(this.commandPanel);
  this.mapCanvas=document.createElement('canvas');this.mapCanvas.width=260;this.mapCanvas.height=195;this.mapCanvas.className='capital-map';this.mapCanvas.setAttribute('role','img');$('.quest').append(this.mapCanvas);
  this.events.once('shutdown',()=>{this.commandPanel.remove();this.mapCanvas.remove();$('.game-panel').classList.remove('chase-mode');dialogParent.insertBefore(dialog,dialogNext);});
  this.renderStreet();this.updateHud();
  this.showStory({lines:[
   {speaker:'イリア',text:'館までは、まだ街区をいくつも抜けるわ。インガスとジアットの諜報員が、住民に紛れている。'},
   {speaker:'マドス',text:'連中もリリアの街で公然と武器は使えない。だが尾行を引き継ぎ、挟み込んでくる。囲まれる前に視線を切れ。'},
   {speaker:'イリア',text:'仕立て店と工房は協力してくれる。裏口から路地に出られるわ。人混みや建物の陰も使いましょう。'},
   {speaker:'マドス',text:'Qで俺が囮、Eでイリアが注意を逸らす。Cで忍び足、Rで変装だ。まずは三人で、北のユアテア手前を目指そう。'},
  ]});
 }
 renderStreet(){
  this.clearWorld();this.indoorView=false;
  this.cameras.main.setBounds(0,0,STEALTH_CITY.width,STEALTH_CITY.height).setZoom(1);
  this.add.tileSprite(0,0,STEALTH_CITY.width,STEALTH_CITY.height,'capital-ground','sidewalk').setOrigin(0).setTileScale(.24);
  const g=this.add.graphics().setDepth(1);
  for(const x of STEALTH_ROADS_X)g.fillStyle(0xd9d4be).fillRect(x-152,0,304,STEALTH_CITY.height);
  for(const y of STEALTH_ROADS_Y)g.fillStyle(0xd9d4be).fillRect(0,y-152,STEALTH_CITY.width,304);
  for(const x of STEALTH_ROADS_X)g.fillStyle(0x53616a).fillRect(x-72,0,144,STEALTH_CITY.height);
  for(const y of STEALTH_ROADS_Y)g.fillStyle(0x53616a).fillRect(0,y-72,STEALTH_CITY.width,144);
  for(const x of STEALTH_ROADS_X)for(let y=0;y<STEALTH_CITY.height;y+=72)g.fillStyle(0xd6c999).fillRect(x-2,y,4,32);
  for(const y of STEALTH_ROADS_Y)for(let x=0;x<STEALTH_CITY.width;x+=72)g.fillStyle(0xd6c999).fillRect(x,y-2,32,4);
  for(const x of STEALTH_ROADS_X)for(const y of STEALTH_ROADS_Y)for(let n=-64;n<=64;n+=24)g.fillStyle(0xf1e9cc).fillRect(x+n,y-145,12,48).fillRect(x+n,y+97,12,48).fillRect(x-145,y+n,48,12).fillRect(x+97,y+n,48,12);
  for(const b of STEALTH_BUILDINGS)this.add.image(b.x+b.width/2,b.y+b.height,'capital-buildings',b.frame).setOrigin(.5,1).setDisplaySize(b.width,b.height).setDepth(b.y+b.height);
  for(const crowd of STEALTH_CROWDS){
   g.fillStyle(0xdac7a6).fillRect(crowd.x,crowd.y,crowd.width,crowd.height);
   for(let n=0;n<4;n++)this.add.image(crowd.x+70+n*85,crowd.y+80,'capital-street',n%2?'produce':'food-cart').setOrigin(.5,1).setDisplaySize(100,95).setDepth(crowd.y+80);
   this.add.text(crowd.x+crowd.width/2,crowd.y+crowd.height-35,'人混みに紛れる市場',{fontSize:'16px',color:'#fff3cf',backgroundColor:'#384b47'}).setOrigin(.5).setDepth(5000);
   for(let n=0;n<8;n++){const sp=this.add.sprite(crowd.x+50+(n%4)*95,crowd.y+180+Math.floor(n/4)*100,'capitalResidents',['shopper','student','shop-assistant','elder-resident'][n%4]).setOrigin(.5,.85);sp.setScale(68/sp.frame.realHeight).setDepth(sp.y);}
  }
  for(const r of STEALTH_REFUGES){
   this.add.image(r.x-130,r.y-80,'capital-buildings','shophouses').setOrigin(.5,1).setDisplaySize(200,230).setDepth(r.y-80);
   this.add.text(r.x,r.y-48,`${r.name}\n［調べる：退避］`,{fontSize:'17px',align:'center',color:'#fff3cf',backgroundColor:'#254c60',padding:{x:8,y:5}}).setOrigin(.5,1).setDepth(5000);
  }
  this.add.text(STEALTH_GATE.x,STEALTH_GATE.y-70,'ユアテア直前・最後の通用門\n［調べる］',{fontSize:'20px',align:'center',color:'#fff3cf',backgroundColor:'#254c60',padding:{x:12,y:8}}).setOrigin(.5).setDepth(5000);
  this.actorSprites=new Map();
  for(const a of this.state.actors){const texture=['office-worker','transit-attendant'].includes(a.frame)?'capitalWorkersFront':'capitalResidents';const sp=this.add.sprite(a.x,a.y,texture,a.frame).setOrigin(.5,.85);sp.setScale(70/sp.frame.realHeight).setDepth(a.y);this.actorSprites.set(a.id,sp);}
  this.player=this.character(this.state.player.x,this.state.player.y,'returnChatoa',3);
  this.followers=['mados','iria'].map((id,i)=>createEscortSprite(this,id,this.player.x,this.player.y+48*(i+1),id==='mados'?74:70,'up'));
  this.cameras.main.startFollow(this.player,true,.15,.15).centerOn(this.player.x,this.player.y);this.syncActors();
 }
 renderRefuge(){
  this.clearWorld();this.indoorView=true;
  for(let y=0;y<576;y+=48)for(let x=0;x<768;x+=48)this.add.image(x+24,y+24,'returnInterior',x===0||x===720||y===0||y===528?1:0).setDisplaySize(48,48);
  this.add.image(170,190,'returnFurniture','table').setDisplaySize(160,100).setDepth(210);
  this.add.image(600,190,'returnFurniture','shelf').setDisplaySize(100,120).setDepth(210);
  for(const [x,y,text] of [[384,100,'裏口：北の路地へ'],[384,470,'表口：店の前へ']])this.add.text(x,y,text,{fontSize:'18px',color:'#fff3cf',backgroundColor:'#254c60'}).setOrigin(.5);
  this.player=this.character(384,380,'returnChatoa',3);createEscortSprite(this,'mados',310,420,74);createEscortSprite(this,'iria',458,420,70);
  this.cameras.main.setBounds(0,0,768,576).centerOn(384,288);
  this.showStory({speaker:'協力してくれる店主',lines:STEALTH_REFUGES.find(r=>r.id===this.state.indoor).lines});
 }
 command(id){
  if(this.storyBusy||this.state.complete)return;
  if(id==='crouch'){this.state.crouching=!this.state.crouching;this.state.message=this.state.crouching?'忍び足で進む。':'普段の歩き方に戻した。';}
  else if(id==='disguise')useCapitalDisguise(this.state);else capitalSupport(this.state,id);
  this.updateHud();
 }
 interact(){
  if(this.storyBusy)return this.advanceStory?.();
  if(this.state.complete)return;
  if(this.state.indoor){
   const back=this.player.y<270;leaveCapitalRefuge(this.state,back);this.renderStreet();this.updateHud();return;
  }
  const refuge=STEALTH_REFUGES.find(r=>Math.hypot(r.x-this.state.player.x,r.y-this.state.player.y)<95);
  if(refuge&&enterCapitalRefuge(this.state,refuge.id)){this.registry.set('capitalStealthCheckpoint',refuge.id);this.renderRefuge();this.updateHud();return;}
  if(Math.hypot(this.state.player.x-STEALTH_GATE.x,this.state.player.y-STEALTH_GATE.y)<95&&this.followers.some(s=>Math.hypot(s.x-this.player.x,s.y-this.player.y)>140)){this.state.message='二人が合流するまで待とう。';this.updateHud();return;}
  if(finishCapitalStealth(this.state)){
   this.registry.set('capitalStealthComplete',true);this.updateHud();
   this.showStory({lines:[{speaker:'マドス',text:'最後の包囲を抜けた。三人とも、ここまで来たな。'},{speaker:'イリア',text:'あの門の向こうがユアテアよ。石は無事ね。ここで一息つきましょう。'},{speaker:'',text:'三人はユアテアへ入る直前までたどり着いた。'}]});
  }else this.updateHud();
 }
 syncActors(){
  const p=this.state.player;this.player.setPosition(p.x,p.y).setDepth(p.y).setFrame(Math.abs(p.dx)>Math.abs(p.dy)?p.dx>0?1:2:p.dy>0?0:3);
  if(this.state.disguise)this.player.setTint(0xb6b7d9);else this.player.clearTint();
  for(const a of this.state.actors)this.actorSprites.get(a.id).setPosition(a.x,a.y).setDepth(a.y).setFlipX(a.dx>0);
  this.followers.forEach((sprite,i)=>{
   let remaining=(i+1)*48,target=this.state.trail[0];
   for(let n=this.state.trail.length-1;n>0;n--){const a=this.state.trail[n],b=this.state.trail[n-1],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>=remaining){const t=remaining/d;target={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};break;}remaining-=d;}
   if(i===0&&this.state.lure){const lure=this.state.lure;sprite.setTint(0xffdc9d);syncEscortSprite(sprite,lure.x,lure.y);}else{sprite.clearTint();syncEscortSprite(sprite,target.x,target.y);}
  });
 }
 update(_time,delta){
  const action=Phaser.Input.Keyboard.JustDown(this.keys.action)||Phaser.Input.Keyboard.JustDown(this.keys.space);
  const commands=Object.keys(this.commandKeys).filter(id=>Phaser.Input.Keyboard.JustDown(this.commandKeys[id]));
  if(this.storyBusy){if(action)this.advanceStory?.();return;}
  if(this.state.complete)return;
  if(action){this.interact();return;}
  for(const id of commands)this.command(id);
  const d=this.activeDirection();
  if(this.state.indoor){
   stepCapitalStealth(this.state,delta);
   const speed=180*Math.min(delta,50)/1000,len=Math.hypot(d.x,d.y)||1;
   this.player.x=Phaser.Math.Clamp(this.player.x+d.x/len*speed,260,510);this.player.y=Phaser.Math.Clamp(this.player.y+d.y/len*speed,90,480);
  }else{
   stepCapitalStealth(this.state,delta,d);this.syncActors();
   if(this.state.caught){this.showStory({speaker:'イリア',lines:[this.state.message],onComplete:()=>{retryCapitalStealth(this.state);this.renderStreet();this.updateHud();}});}
  }
  this.hudWait=(this.hudWait??0)-delta;if(this.hudWait<=0){this.hudWait=200;this.updateHud();}
 }
 updateHud(){
  const s=this.state;$('.chapter').textContent='CHAPTER 15';$('.hud h1').textContent='ベクテーナ・最後の包囲網';$('#time-label').textContent='昼';
  $('#step-label').textContent=s.complete?'✓ ユアテア直前に到達':s.indoor?'店内：安全':s.alert>.65?'周囲の緊張：高い':s.alert>.25?'周囲の緊張：気になる動き':'周囲の緊張：静か';
  const texts=[s.complete?'✓ 最後の包囲網を抜けた':'住民の動きを観察し、北の通用門を目指す','市場・建物・路地で視線を切る',`退避場所：${STEALTH_REFUGES.find(r=>r.id===s.checkpointId)?.name??'都市区間の入口'}`,s.disguise>0?`変装：あと${Math.ceil(s.disguise)}秒`:s.hasDisguise?`変装：${s.disguiseCooldown>0?Math.ceil(s.disguiseCooldown)+'秒で再使用':'人目のない場所で使える'}`:'変装用の上着は未所持'];
  $('#quest-list').replaceChildren();for(const text of texts){const li=document.createElement('li');li.textContent=text;$('#quest-list').append(li);}
  $('#hint').textContent=s.complete?'ユアテアはもう目の前。三人は門の手前で一息ついた。':s.indoor?'上の裏口／下の表口に移動して調べる。店内で変装・再使用待ちもできます。':s.message||'矢印/WASDで移動。Q：マドスの囮、E：イリアの援護、R：変装、C：忍び足。';
  for(const button of this.commandPanel.children){const id=button.dataset.stealthCommand;const wait=id==='disguise'?s.disguiseCooldown:s.commands[id]??0;button.disabled=this.storyBusy||s.complete||wait>0;button.setAttribute('aria-pressed',id==='crouch'?String(s.crouching):'false');}
  const c=this.mapCanvas.getContext('2d'),scale=260/STEALTH_CITY.width;c.fillStyle='#bdc6bd';c.fillRect(0,0,260,195);c.save();c.scale(scale,scale);c.fillStyle='#647a84';for(const x of STEALTH_ROADS_X)c.fillRect(x-72,0,144,STEALTH_CITY.height);for(const y of STEALTH_ROADS_Y)c.fillRect(0,y-72,STEALTH_CITY.width,144);c.fillStyle='#386074';for(const b of STEALTH_BUILDINGS)c.fillRect(b.x,b.y,b.width,b.height);c.fillStyle='#85cfa8';for(const r of STEALTH_REFUGES)c.fillRect(r.x-50,r.y-50,100,100);c.fillStyle='#f4c96a';c.fillRect(STEALTH_GATE.x-70,STEALTH_GATE.y-70,140,140);c.fillStyle='#24b6da';c.beginPath();c.arc(s.player.x,s.player.y,55,0,Math.PI*2);c.fill();c.restore();this.mapCanvas.setAttribute('aria-label','都市の案内図。水色は現在地、緑は退避店、金色はユアテア直前の門。住民の正体は表示しない。');
 }
}
