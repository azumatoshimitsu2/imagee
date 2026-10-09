import {nearestYuateaEscort,yuateaAdmissionLines} from '../systems/yuatea-admission.js';
import {createCapitalClock} from '../ui/capital-clock.js';
import {STEALTH_ACTORS,STEALTH_REFUGES} from '../data/capital-stealth.js';
import {createCapitalStealth,stepCapitalStealth,capitalSupport,useCapitalDisguise,retryCapitalStealth} from '../systems/capital-stealth.js';
import { BazaarCityScene } from './13-bazaar-city.js';
import { CAPITAL, CAPITAL_GUARD, CAPITAL_ALLEYS, CAPITAL_ENTRY, CAPITAL_PLACES, CAPITAL_BUILDINGS, CAPITAL_ROADS, CAPITAL_PROPS, CAPITAL_PARK, CAPITAL_POND, CAPITAL_RESIDENTS, CAPITAL_CROSSWALKS, CAPITAL_SIDEWALK, createCapitalTraffic, capitalVehiclePosition, stepCapitalTraffic, capitalVehicleHits, canWalkCapital, capitalDistrict } from '../data/vektena-city.js';
import { travelSpeed } from '../data/barter-shop.js';
import { ESCORT_TEXTURE, ESCORT_ATLAS, createEscortSprite, syncEscortSprite } from '../ui/escort-sprites.js';
const $ = selector => document.querySelector(selector);

export class VektenaCityScene extends BazaarCityScene {
  constructor() { super({ key: 'VektenaCityScene', chapter: 'CHAPTER 14', title: 'リリアの都・ベクテーナ', time: '昼' }); }
  preload() {
    super.preload();
    this.load.atlas('vektenaSpies','./assets/img/enemies/vektena-spy-v1.png','./assets/img/enemies/vektena-spy-v1.json');
    for (const name of ['ground', 'buildings', 'street']) {
      const path = `./assets/img/tiles/vektena/vektena-${name}-v1`;
      this.load.atlas(`capital-${name}`, `${path}.png`, `${path}.json`);
    }
    this.load.atlas('capitalResidents', './assets/img/characters/vektena-residents-v2.png', './assets/img/characters/vektena-residents-v2.json');
    this.load.atlas('capitalFrontResidents', './assets/img/characters/vektena-residents-front-v1.png', './assets/img/characters/vektena-residents-front-v1.json');
    this.load.atlas('capitalExtraResidents', './assets/img/characters/vektena-residents-extra-v1.png', './assets/img/characters/vektena-residents-extra-v1.json');
    this.load.atlas('capitalWorkersFront', './assets/img/characters/vektena-workers-front-v1.png', './assets/img/characters/vektena-workers-front-v1.json');
    this.load.atlas('capitalChief','./assets/img/characters/ingas-chief-v5.png','./assets/img/characters/ingas-chief-v5.json');
    this.load.atlas('yuateaGuard','./assets/img/characters/yuatea-guard-v3.png','./assets/img/characters/yuatea-guard-v3.json');
    this.load.image('capitalYuatea','./assets/img/tiles/vektena/yuatea-palace-v1.png');
    this.load.image('capitalPark', './assets/img/tiles/vektena/vektena-park-v1.png');
    this.load.atlas('capitalCars', './assets/img/vehicles/vektena-cars-v1.png', './assets/img/vehicles/vektena-cars-v1.json');
    this.load.atlas(ESCORT_TEXTURE, `${ESCORT_ATLAS}.png`, `${ESCORT_ATLAS}.json`);
  }
  create() {
    $('#title-screen')?.classList.add('closed');
    this.hudWait = 0;
    this.storyBusy = false; this.advanceStory = null; this.transitioning = false; this.touchDirection = null; this.chiefEncounter=false;
    this.collected = new Set(this.registry.get('caveCollectedItems') ?? []);
    this.visited = new Set((this.registry.get('capitalVisitedPlaces') ?? []).filter(id => CAPITAL_PLACES.some(p => p.id === id)));
    this.registry.set('bazaarEscortsJoined', true);
    this.registry.set('partyMembers', [...new Set([...(this.registry.get('partyMembers') ?? []), 'mados', 'iria'])]);
    this.bindSceneControls(); this.renderCapital();
    this.state=createCapitalStealth({checkpoint:this.registry.get('capitalStealthCheckpoint'),equipment:this.registry.get('travelEquipment'),hasDisguise:this.registry.get('vektenaStage')>=1});
    this.spySprites=new Map(this.state.actors.map(a=>{const sprite=this.add.sprite(a.x,a.y,a.texture??'capitalResidents',a.frame).setOrigin(.5,.85).setDepth(a.y);sprite.setScale(70/sprite.frame.realHeight);return [a.id,sprite];}));
    this.player.setPosition(this.state.player.x,this.state.player.y);
    this.commandKeys=this.input.keyboard.addKeys({mados:'Q',iria:'E',disguise:'R',crouch:'C'});
    this.commandPanel=document.createElement('div');this.commandPanel.className='chase-mobile-commands';
    this.supportPanel=document.createElement('section');this.supportPanel.className='capital-support-panel';
    for(const [id,label] of [['mados','Q マドス：囮'],['iria','E イリア：援護'],['disguise','R 変装'],['crouch','C 忍び足']]){
      for(const panel of [this.commandPanel,this.supportPanel]){const b=document.createElement('button');b.textContent=label;b.dataset.command=id;b.dataset.label=label;b.type='button';b.onclick=()=>this.command(id);panel.append(b);}
    }
    this.commandStatus=document.createElement('p');this.commandStatus.setAttribute('role','status');this.supportPanel.append(this.commandStatus);$('.quest').append(this.supportPanel);
    $('.touch-controls').prepend(this.commandPanel);$('.game-panel').classList.add('chase-mode');
    const dialog=$('#dialog'),parent=dialog.parentNode,next=dialog.nextSibling;$('#viewport').append(dialog);
    this.events.once('shutdown',()=>{this.commandPanel.remove();this.supportPanel.remove();$('.game-panel').classList.remove('chase-mode');parent.insertBefore(dialog,next);});
    this.mapCanvas = document.createElement('canvas'); this.mapCanvas.width = 260; this.mapCanvas.height = 217;
    this.mapCanvas.className = 'capital-map'; this.mapCanvas.setAttribute('role', 'img'); this.mapCanvas.setAttribute('aria-label', 'ベクテーナ案内図。南から北へ中央大通りが延びる。金色の点は名所、水色は現在地。');
    this.mapLegend = document.createElement('p');
    this.mapLegend.className = 'hint';
    this.mapLegend.textContent = '案内図：水色＝現在地 ／ 金色＝未訪問 ／ 緑＝訪問済み';
    $('.quest').append(this.mapCanvas, this.mapLegend);
    this.events.once('shutdown', () => { this.mapCanvas.remove(); this.mapLegend.remove(); });
    this.updateHud(); this.cameras.main.fadeIn(600, 17, 34, 44);
    if (!this.registry.get('capitalArrived')) {
      this.registry.set('capitalArrived', true);
      this.showStory({ lines: [
        { speaker: '', text: 'バザールの街を離れ、道をたどった三人は、ついにリリアの都・ベクテーナへ到着した。' },
        { speaker: 'チャトア', text: '……大きい。建物が、空まで続いているみたいだ。道も、こんなに広いんだね。' },
        { speaker: 'イリア', text: 'ここがベクテーナよ。中央大通りの先に、王のいるユアテアがあるわ。' },
        { speaker: 'マドス', text: '住民に紛れたインガスとジアットの諜報員に気をつけろ。連中も公然とは武器を使えない。' },
      ] });
    }
  }
  renderCapital() {
    this.clearWorld(); this.area = 'capital';
    this.cameras.main.setBounds(0, 0, CAPITAL.width, CAPITAL.height).setZoom(1).setBackgroundColor('#b8c9cd');
    this.add.tileSprite(0, 0, CAPITAL.width, CAPITAL.height, 'capital-ground', 'sidewalk')
      .setOrigin(0).setTileScale(.24).setDepth(0);
    const g = this.add.graphics().setDepth(1);
    for (const place of CAPITAL_PLACES) {
      if (['square', 'yuatea', 'terminal'].includes(place.id))
        g.fillStyle(0xe2e4d8).fillRoundedRect(place.x-240,place.y-110,280,220,16);
    }
    // Lay all sidewalks first, then carriageways, so intersections remain open.
    for (const road of CAPITAL_ROADS) this.drawRoad(g,road,road.width+CAPITAL_SIDEWALK*2,0xd9d4be);
    for (const road of CAPITAL_ROADS) this.drawRoad(g,road,road.width+8,0x9b9a89);
    for (const road of CAPITAL_ROADS) this.drawRoad(g,road,road.width,0x53616a);
    for (const road of CAPITAL_ROADS) {
      const vertical=road.axis==='vertical',center=road.points[0][vertical?0:1];
      const length=vertical?CAPITAL.height:CAPITAL.width;
      for(let n=20;n<length;n+=72) {
        const crossing=CAPITAL_ROADS.some(other=>other.axis!==road.axis&&Math.abs(n-other.points[0][vertical?1:0])<96);
        if(!crossing) g.fillStyle(0xd6c999).fillRect(vertical?center-2:n,vertical?n:center-2,vertical?4:34,vertical?34:4);
      }
    }
    for(const alley of CAPITAL_ALLEYS){
      g.fillStyle(0xb9b4a2).fillRect(alley.x,alley.y,alley.width,alley.height);
      g.fillStyle(0xd6d0bd).fillRect(alley.x+6,alley.y+6,alley.width-12,alley.height-12);
      g.lineStyle(1,0xc1bcaa,.65);
      for(let x=alley.x+32;x<alley.x+alley.width;x+=32)g.lineBetween(x,alley.y+6,x,alley.y+alley.height-6);
      for(let y=alley.y+32;y<alley.y+alley.height;y+=32)g.lineBetween(alley.x+6,y,alley.x+alley.width-6,y);
    }
    for(const crossing of CAPITAL_CROSSWALKS) {
      for(let d=4;d<144;d+=24) {
        g.fillStyle(0xf1e9cc).fillRect(crossing.x+(crossing.axis==='vertical'?d:0),crossing.y+(crossing.axis==='horizontal'?d:0),crossing.axis==='vertical'?12:crossing.width,crossing.axis==='horizontal'?12:crossing.height);
      }
    }
    this.add.image(CAPITAL_PARK.x,CAPITAL_PARK.y,'capitalPark').setOrigin(0)
      .setDisplaySize(CAPITAL_PARK.width,CAPITAL_PARK.height).setDepth(2);
    for (const [x,y] of [[2058,2040],[2290,2040],[2058,2450],[2290,2450]]) {
      this.add.image(x,y,'capital-street','palm').setOrigin(.5,1).setDisplaySize(110,140).setDepth(y);
    }
    createCapitalClock(this);
    for (const b of CAPITAL_BUILDINGS) this.drawBuilding(b);
    this.add.text(1730,450,'入口の警備兵\n［調べる：話す］',{fontSize:'14px',align:'center',color:'#fff3cf',backgroundColor:'#254c60',padding:{x:6,y:4}}).setOrigin(1,.5).setDepth(450);
    for (const prop of CAPITAL_PROPS) {
      this.add.image(prop.x, prop.y, 'capital-street', prop.frame)
        .setOrigin(.5, 1).setDisplaySize(prop.width, prop.height).setDepth(prop.y);
    }
    for (const place of CAPITAL_PLACES) {
      const signX=place.id==='yuatea'?place.x-230:place.x;
      const sign = this.add.graphics().setDepth(place.y);
      sign.fillStyle(0x4b616b).fillRect(signX-3,place.y-48,6,48);
      this.add.text(signX, place.y-48, `${place.name}\n［調べる］`, { fontSize:'17px', align:'center', color:'#fff3cf', backgroundColor:'#254c60', padding:{x:12,y:7} }).setOrigin(.5,1).setDepth(place.y+1);
    }
    this.npcs = CAPITAL_RESIDENTS.map(npc => {
      const sprite=this.add.sprite(npc.x,npc.y,npc.texture ?? 'capitalResidents',npc.frame).setOrigin(.5,.85).setDepth(npc.y);
      sprite.setScale(70/sprite.frame.realHeight).setFlipX(npc.facing === 'right');return {...npc,sprite};
    });
    this.createTraffic();
    this.player=this.character(CAPITAL_ENTRY.x,CAPITAL_ENTRY.y,'returnChatoa',3).setDepth(CAPITAL_ENTRY.y);
    this.trail=[{x:CAPITAL_ENTRY.x,y:CAPITAL_ENTRY.y+96},{x:CAPITAL_ENTRY.x,y:CAPITAL_ENTRY.y+48},{...CAPITAL_ENTRY}];
    this.followers=['mados','iria'].map((id,i)=>createEscortSprite(this,id,CAPITAL_ENTRY.x,CAPITAL_ENTRY.y+46*(i+1),id==='mados'?74:70));
    this.cameras.main.startFollow(this.player,true,.15,.15).centerOn(this.player.x,this.player.y);
  }
  drawRoad(g, road, width, color) {
    g.lineStyle(width, color, 1);
    g.beginPath();
    g.moveTo(...road.points[0]);
    for (const point of road.points.slice(1)) g.lineTo(...point);
    g.strokePath();
    for (const point of road.points) g.fillStyle(color).fillCircle(...point, width / 2);
  }
  createTraffic() {
    this.traffic=createCapitalTraffic();
    const frames=['hatchback','sedan','wagon','van'];
    this.trafficSprites=this.traffic.map((car,index)=>{
      const sprite=this.add.image(0,0,'capitalCars',frames[index%frames.length]).setOrigin(.5);
      sprite.setScale(Math.min(48/sprite.frame.realWidth,84/sprite.frame.realHeight));
      sprite.setRotation(car.axis==='vertical'?(car.direction>0?Math.PI:0):(car.direction>0?Math.PI/2:-Math.PI/2));
      return sprite;
    });
    this.updateTraffic(0);
  }
  updateTraffic(delta) {
    stepCapitalTraffic(this.traffic,delta);
    this.traffic.forEach((car,i)=>{
      const p=capitalVehiclePosition(car);
      this.trafficSprites[i].setPosition(p.x,p.y).setDepth(p.y);
    });
  }
  checkTrafficCollision() {
    if (this.storyBusy || this.time.now < (this.trafficProtectionUntil ?? 0)) return false;
    if (!this.traffic.some(car=>capitalVehicleHits(car,this.player))) return false;
    this.player.setPosition(CAPITAL_ENTRY.x,CAPITAL_ENTRY.y).setFrame(3).setDepth(CAPITAL_ENTRY.y);
    this.trail=[{x:CAPITAL_ENTRY.x,y:CAPITAL_ENTRY.y+96},{x:CAPITAL_ENTRY.x,y:CAPITAL_ENTRY.y+48},{...CAPITAL_ENTRY}];
    this.followers.forEach((sprite,i)=>syncEscortSprite(sprite,CAPITAL_ENTRY.x,CAPITAL_ENTRY.y+48*(i+1)));
    if(this.state){Object.assign(this.state.player,CAPITAL_ENTRY);this.state.grace=4;}
    this.touchDirection=null;
    this.trafficProtectionUntil=this.time.now+1500;
    this.cameras.main.centerOn(CAPITAL_ENTRY.x,CAPITAL_ENTRY.y).flash(180,180,80,60);
    this.updateHud();
    this.showStory({speaker:'チャトア',lines:['車にぶつかってしまった……。南交通ターミナルから、もう一度進もう。'],onComplete:()=>{this.trafficProtectionUntil=this.time.now+1500;}});
    return true;
  }
  drawBuilding(b) {
    this.add.image(b.x + b.width / 2, b.y + b.height, b.texture ?? 'capital-buildings', b.texture ? undefined : b.frame)
      .setOrigin(.5, 1).setDisplaySize(b.width, b.height).setDepth(b.y + b.height);
  }
  canWalk(x,y) { return canWalkCapital(x,y) && !this.npcs.some(n=>Math.hypot(n.x-x,n.y-y)<26); }
  nearbyNpc(){
    return [...this.npcs,...(this.state?.actors.filter(a=>!a.faction)??[])]
      .filter(n=>Math.hypot(n.x-this.player.x,n.y-this.player.y)<78)
      .sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0];
  }
  nearbyPlace() { return CAPITAL_PLACES.find(p=>Math.hypot(p.x-this.player.x,p.y-this.player.y)<94); }
  nearbyInteraction() {
    const place = this.nearbyPlace(), npc = this.nearbyNpc();
    const distance = target => Math.hypot(target.x - this.player.x, target.y - this.player.y);
    return npc && (!place || distance(npc) < distance(place)) ? { npc } : { place };
  }
  nearYuateaEntrance() { return Math.hypot(this.player.x-CAPITAL_GUARD.x,this.player.y-CAPITAL_GUARD.y)<90; }
  command(id){
    if(this.storyBusy||this.chiefEncounter||this.state.complete)return;
    Object.assign(this.state.player,{x:this.player.x,y:this.player.y});
    if(id==='crouch')this.state.crouching=!this.state.crouching;
    else if(id==='disguise')useCapitalDisguise(this.state);
    else capitalSupport(this.state,id);
    this.updateHud();
  }
  enterYuatea(){
    if(this.storyBusy||this.transitioning)return;
    Object.assign(this.state.player,{x:this.player.x,y:this.player.y});
    if(this.state.caught)return;
    this.state.complete=true;
    this.registry.set('capitalStealthComplete',true);this.registry.set('capitalExplorationComplete',true);
    const escorts=this.followers.map((sprite,i)=>({id:i===0?'mados':'iria',x:sprite.x,y:sprite.y}));
    const nearest=nearestYuateaEscort(CAPITAL_GUARD,escorts);
    this.registry.set('yuateaAdmissionSpeaker',nearest.id);
    this.showStory({lines:yuateaAdmissionLines(nearest.id),onComplete:()=>{
      this.registry.set('yuateaAdmissionGranted',true);this.transitioning=true;this.touchDirection=null;
      this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('YuateaEntranceScene'));
      this.cameras.main.fadeOut(350);
    }});this.updateHud();
  }
  nearbyChief() {
    return this.state.actors.find(a=>a.boss&&Math.hypot(a.x-this.player.x,a.y-this.player.y)<90);
  }
  resetToCityEntrance() {
    this.registry.set('capitalStealthCheckpoint',null);
    retryCapitalStealth(this.state);
    this.touchDirection=null;
    this.player.setPosition(this.state.player.x,this.state.player.y).setDepth(this.state.player.y).clearTint();
    this.trail=[{x:this.player.x,y:this.player.y+96},{x:this.player.x,y:this.player.y+48},{x:this.player.x,y:this.player.y}];
    this.followers.forEach((sprite,i)=>{sprite.supportActive=false;sprite.setPosition(this.player.x,this.player.y+(i+1)*48).setDepth(sprite.y);});
    for(const a of this.state.actors){const sp=this.spySprites.get(a.id);sp.setPosition(a.x,a.y).setDepth(a.y).setTexture(a.texture??'capitalResidents',a.frame).setScale(70/sp.frame.realHeight).setFlipX(false);}
    this.chiefEncounter=false;
    this.updateHud();
  }
  talkToChief(chief) {
    if(this.chiefEncounter||this.state.caught||this.state.complete)return;
    this.registry.set('capitalChiefTalked',true);
    this.chiefEncounter=true;this.touchDirection=null;
    this.showStory({speaker:chief.name,lines:['探す手間が省けた。……全員、こちらへ。逃げ道を塞げ。'],onComplete:()=>{
      const reinforcements=[];
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3;
        let radius=68;
        let target={x:this.player.x+Math.cos(angle)*radius,y:this.player.y+Math.sin(angle)*radius};
        while(radius>40&&!canWalkCapital(target.x,target.y)){radius-=4;target={x:this.player.x+Math.cos(angle)*radius,y:this.player.y+Math.sin(angle)*radius};}
        if(!canWalkCapital(target.x,target.y))continue;
        const frame=Math.abs(Math.cos(angle))>.6?(Math.cos(angle)>0?'spy-left':'spy-right'):(Math.sin(angle)>0?'spy-up':'spy-down');
        const sp=this.add.sprite(target.x+Math.cos(angle)*60,target.y+Math.sin(angle)*60,'vektenaSpies',frame).setOrigin(.5,.85).setAlpha(0).setDepth(target.y);
        sp.setScale(70/sp.frame.realHeight);reinforcements.push(sp);
        this.tweens.add({targets:sp,x:target.x,y:target.y,alpha:1,duration:700,ease:'Sine.easeOut',onUpdate:()=>sp.setDepth(sp.y)});
      }
      this.time.delayedCall(900,()=>this.showStory({speaker:'イリア',lines:['囲まれた……！　街の入り口から、もう一度やり直しましょう。'],onComplete:()=>{
        reinforcements.forEach(sp=>sp.destroy());
        this.cameras.main.once('camerafadeoutcomplete',()=>{this.resetToCityEntrance();this.cameras.main.fadeIn(250);});
        this.cameras.main.fadeOut(250);
      }}));
    }});
    this.updateHud();
  }
  interact() {
    if(this.storyBusy)return this.advanceStory?.();
    if(this.chiefEncounter)return;
    const chief=this.nearbyChief();if(chief)return this.talkToChief(chief);
    if(this.nearYuateaEntrance())return this.enterYuatea();
    const refuge=STEALTH_REFUGES.find(r=>Math.hypot(r.x-this.player.x,r.y-this.player.y)<95);
    if(refuge){this.state.checkpointId=refuge.id;this.registry.set('capitalStealthCheckpoint',refuge.id);for(const a of this.state.actors){a.memory=0;a.suspicion=0;}this.state.grace=4;this.showStory({speaker:refuge.name,lines:refuge.lines,onComplete:()=>{this.player.setPosition(refuge.back.x,refuge.back.y);Object.assign(this.state.player,refuge.back);this.state.grace=4;}});return;}
    const { place, npc } = this.nearbyInteraction();
    if(place) return this.showStory({speaker:place.name,lines:place.lines,onComplete:()=>{this.visited.add(place.id);this.registry.set('capitalVisitedPlaces',[...this.visited]);this.updateHud();}});
    if(npc)this.showStory({speaker:npc.name,lines:npc.lines});
  }
  update(_time,delta) {
    if(this.transitioning||this.state?.complete&&!this.storyBusy)return;
    if(this.chiefEncounter){
      const action=Phaser.Input.Keyboard.JustDown(this.keys.action)||Phaser.Input.Keyboard.JustDown(this.keys.space);
      if(this.storyBusy&&action)this.advanceStory?.();
      return;
    }
    if (!this.storyBusy) this.updateTraffic(delta);
    if (this.checkTrafficCollision()) return;
    const action=Phaser.Input.Keyboard.JustDown(this.keys.action)||Phaser.Input.Keyboard.JustDown(this.keys.space);
    if(this.storyBusy){if(action)this.advanceStory?.();return;}
    if(action){this.interact();return;}
    if(this.state.complete)return;
    for(const id of Object.keys(this.commandKeys))if(Phaser.Input.Keyboard.JustDown(this.commandKeys[id]))this.command(id);
    const d=this.activeDirection();Object.assign(this.state.player,{x:this.player.x,y:this.player.y});
    stepCapitalStealth(this.state,delta,d);
    this.player.setPosition(this.state.player.x,this.state.player.y);
    if(this.state.disguise>0)this.player.setTint(0xb6b7d9);else this.player.clearTint();
    for(const a of this.state.actors){const sp=this.spySprites.get(a.id);sp.setPosition(a.x,a.y).setDepth(a.y);
      if(a.boss){sp.setTexture('capitalChief','chief-front').setScale(70/sp.frame.realHeight).setFlipX(a.dx>0);}
      else if(a.revealed){const frame=Math.abs(a.dx)>Math.abs(a.dy)?a.dx>0?'spy-right':'spy-left':a.dy>0?'spy-down':'spy-up';sp.setTexture('vektenaSpies',frame).setScale(70/sp.frame.realHeight).setFlipX(false);}
      else sp.setTexture(a.texture??'capitalResidents',a.frame).setScale(70/sp.frame.realHeight).setFlipX(a.dx>0);
    }
    if(this.state.caught){this.showStory({speaker:'イリア',lines:[this.state.message],onComplete:()=>{this.registry.set('capitalStealthCheckpoint',null);retryCapitalStealth(this.state);this.player.setPosition(this.state.player.x,this.state.player.y);this.trail=[{x:this.player.x,y:this.player.y+96},{x:this.player.x,y:this.player.y+48},{x:this.player.x,y:this.player.y}];}});return;}
    if(d.x||d.y)this.player.setFrame(d.x?d.x>0?1:2:d.y>0?0:3);
    this.player.setDepth(this.player.y);
    if(Math.hypot(this.player.x-this.trail.at(-1).x,this.player.y-this.trail.at(-1).y)>3){this.trail.push({x:this.player.x,y:this.player.y});if(this.trail.length>180)this.trail.shift();}
    this.followers.forEach((sprite,i)=>{
      let remaining=(i+1)*48,target=this.trail[0];
      for(let n=this.trail.length-1;n>0;n--){const a=this.trail[n],b=this.trail[n-1],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>=remaining){const t=remaining/distance;target={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};break;}remaining-=distance;}
      const support=i===0?this.state.lure:this.state.iriaSupport;
      if(support||sprite.supportActive){
        sprite.supportActive=!!support||Math.hypot(target.x-sprite.x,target.y-sprite.y)>8;
        if(support&&i===0)target=support;
        else if(support){const a=this.state.actors.find(a=>a.id===support.id);if(a)target={x:a.x+55,y:a.y+30};}
        const distance=Math.hypot(target.x-sprite.x,target.y-sprite.y),step=Math.min(distance,220*Math.min(delta,60)/1000);
        if(distance>0)target={x:sprite.x+(target.x-sprite.x)*step/distance,y:sprite.y+(target.y-sprite.y)*step/distance};
      }
      sprite.setPosition(target.x,target.y).setDepth(target.y);syncEscortSprite(sprite);
    });
    if (this.checkTrafficCollision()) return;
    this.hudWait=(this.hudWait??0)-delta;if(this.hudWait<=0){this.hudWait=150;this.updateHud();}
  }
  updateHint() {
    if(this.storyBusy)return;
    if(this.nearbyChief()){ $('#hint').textContent='Enter / Space・調べるで追跡主任に話す。';return;}
    if(this.nearYuateaEntrance()){ $('#hint').textContent='Enter / Space・調べるで入口の警備兵に話す。近くの仲間が紹介を説明します。';return;}
    const { place, npc } = this.nearbyInteraction();
    $('#hint').textContent=place?`Enter / Space・調べる：「${place.name}」の案内板を読む。`:npc?`Enter / Space・調べる：「${npc.name}」と話す。`:'矢印 / WASDで移動。近くの市民は調べると会話できます。人物を避けて歩き、姿を変えた諜報員から離れましょう。';
  }
  updateHud() {
    $('.chapter').textContent='CHAPTER 14';$('.hud h1').textContent='リリアの都・ベクテーナ';$('#time-label').textContent='昼';
    $('#step-label').textContent=`${capitalDistrict(this.player.x,this.player.y)} · 三人で散策`;
    $('#phaser-stage').setAttribute('aria-label','ベクテーナの街。格子状の車道と歩道のある都をマドスとイリアと探索する');
    const list=$('#quest-list');list.replaceChildren();
    for(const text of ['✓ ベクテーナに到着した',`案内板（任意）：${this.visited.size} / ${CAPITAL_PLACES.length}か所`,this.state?.complete?'✓ 警備兵に紹介を説明する':'住民の動きを見ながら北の警備兵を目指す','Q：囮 ／ E：援護 ／ R：変装 ／ C：忍び足','黒いコートの追跡主任に注意。囮で長く引きつけられる']){const li=document.createElement('li');li.textContent=text;list.append(li);}
    if(this.state&&this.supportPanel){
      this.commandStatus.textContent=this.state.message||'囮：7秒（主任は11秒）引きつける ／ 援護：6秒足止め';
      for(const panel of [this.commandPanel,this.supportPanel])for(const b of panel.querySelectorAll('button')){
        const id=b.dataset.command,wait=id==='disguise'?this.state.disguiseCooldown:this.state.commands[id]??0;
        b.disabled=this.storyBusy||this.chiefEncounter||this.state.complete||wait>0;
        b.textContent=b.dataset.label+(wait>0?`（${Math.ceil(wait)}秒）`:id==='crouch'&&this.state.crouching?'：ON':'');
      }
    }
    this.updateHint();if(this.state?.message&&!this.nearbyChief()&&!this.nearbyNpc()&&!this.nearbyPlace())$('#hint').textContent=this.state.message;this.drawMap();
  }
  drawMap() {
    if(!this.mapCanvas)return;const c=this.mapCanvas.getContext('2d'),scale=this.mapCanvas.width/CAPITAL.width;
    c.fillStyle='#c3cdd0';c.fillRect(0,0,260,217);c.save();c.scale(scale,scale);
    c.strokeStyle='#647a84';c.lineCap='round';c.lineJoin='round';
    for(const road of CAPITAL_ROADS){c.lineWidth=road.width+CAPITAL_SIDEWALK*2;c.strokeStyle='#d9d4be';c.beginPath();c.moveTo(...road.points[0]);for(const point of road.points.slice(1))c.lineTo(...point);c.stroke();}
    for(const road of CAPITAL_ROADS){c.strokeStyle='#647a84';c.lineWidth=road.width;c.beginPath();c.moveTo(...road.points[0]);for(const point of road.points.slice(1))c.lineTo(...point);c.stroke();}
    c.fillStyle='#d6d0bd';for(const alley of CAPITAL_ALLEYS)c.fillRect(alley.x,alley.y,alley.width,alley.height);
    c.fillStyle='#386074';for(const b of CAPITAL_BUILDINGS)c.fillRect(b.x,b.y,b.width,b.height);
    c.fillStyle='#94b38c';c.fillRect(CAPITAL_PARK.x,CAPITAL_PARK.y,CAPITAL_PARK.width,CAPITAL_PARK.height);
    for(const p of CAPITAL_PLACES){c.fillStyle=this.visited.has(p.id)?'#85cfa8':'#f4c96a';c.beginPath();c.arc(p.x,p.y,50,0,Math.PI*2);c.fill();}
    c.fillStyle='#567f8f';c.fillRect(CAPITAL_POND.x,CAPITAL_POND.y,CAPITAL_POND.width,CAPITAL_POND.height);
    this.mapCanvas.setAttribute('aria-label', `ベクテーナ案内図。現在地：${capitalDistrict(this.player.x,this.player.y)}。案内板：${this.visited.size} / ${CAPITAL_PLACES.length}か所訪問済み。`);
    c.fillStyle='#ffffff';c.beginPath();c.arc(this.player.x,this.player.y,62,0,Math.PI*2);c.fill();c.fillStyle='#24b6da';c.beginPath();c.arc(this.player.x,this.player.y,40,0,Math.PI*2);c.fill();c.restore();
  }
}
