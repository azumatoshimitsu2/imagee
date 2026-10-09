import { BazaarCityScene } from './13-bazaar-city.js';
import { ESCORT_TEXTURE, ESCORT_ATLAS, createEscortSprite, syncEscortSprite } from '../ui/escort-sprites.js';
import { drawRouteMarker } from '../ui/markers.js';
import { RECEPTION, RECEPTION_NPCS, canWalkReception, receptionRegistrationLines, AUDIENCE_DOOR, shouldStartReceptionIncident, RECEPTION_INCIDENT_LINES, RECEPTION_GUIDE_LINES } from '../data/yuatea-reception.js';
const $ = selector => document.querySelector(selector);

export class YuateaEntranceScene extends BazaarCityScene {
  constructor(config={key:'YuateaEntranceScene',chapter:'CHAPTER 15',title:'ユアテア・政務受付',time:'昼'}) { super(config); }
  preload() {
    super.preload();
    this.load.atlas(ESCORT_TEXTURE,`${ESCORT_ATLAS}.png`,`${ESCORT_ATLAS}.json`);
    this.load.atlas('capitalChief','./assets/img/characters/ingas-chief-v5.png','./assets/img/characters/ingas-chief-v5.json');
    this.load.atlas('vektenaSpies','./assets/img/enemies/vektena-spy-v1.png','./assets/img/enemies/vektena-spy-v1.json');
    this.load.atlas('yuateaStaff','./assets/img/characters/vektena-residents-front-v1.png','./assets/img/characters/vektena-residents-front-v1.json');
    this.load.atlas('yuateaGuard','./assets/img/characters/yuatea-guard-v3.png','./assets/img/characters/yuatea-guard-v3.json');
    this.load.atlas('yuateaCounter','./assets/img/tiles/yuatea/reception-counter-v1.png','./assets/img/tiles/yuatea/reception-counter-v1.json');
    this.load.image('yuateaReception','./assets/img/tiles/yuatea/reception-hall-v1.png');
  }
  create() {
    $('#title-screen')?.classList.add('closed');
    this.storyBusy=false;this.advanceStory=null;this.touchDirection=null;this.transitioning=false;
    this.registered=!!this.registry.get('yuateaReceptionRegistered');
    this.eventDone=!!this.registry.get('yuateaReceptionIncidentDone');this.audienceReady=!!this.registry.get('yuateaAudienceReady');
    this.eventStarted=false;this.eventBusy=false;this.waitElapsed=0;this.waitWalked=0;this.doorMarker=null;
    this.bindSceneControls();this.clearWorld();this.area='reception';
    this.add.image(0,0,'yuateaReception').setOrigin(0).setDisplaySize(RECEPTION.width,RECEPTION.height).setDepth(0);
    this.drawCounter();
    this.npcs=RECEPTION_NPCS.map(n=>{const sprite=this.add.sprite(n.x,n.y,n.texture,n.frame).setOrigin(.5,.85).setDepth(n.y);sprite.setScale(70/sprite.frame.realHeight);return {...n,sprite};});
    this.player=this.character(RECEPTION.entry.x,RECEPTION.entry.y,'returnChatoa',3).setDepth(RECEPTION.entry.y);
    this.followers=[createEscortSprite(this,'mados',425,620,74,'up'),createEscortSprite(this,'iria',535,620,70,'up')];
    this.trail=[{x:480,y:652},{x:480,y:638},{...RECEPTION.entry}];
    this.cameras.main.setZoom(.85).setBounds(0,0,RECEPTION.width,RECEPTION.height).startFollow(this.player,true,.15,.15).fadeIn(450);
    if(this.audienceReady)this.addAudienceMarker();
    this.updateHud();
    this.showStory({lines:[
      {speaker:'',text:'彫刻を施した扉の向こうで、記録官が書類を運んでいる。地方の報告も、国々からの使節も、この広間を通って政務区画へ向かう。'},
      {speaker:this.registry.get('yuateaAdmissionSpeaker')==='mados'?'マドス':'イリア',text:this.registry.get('yuateaAdmissionSpeaker')==='mados'?'ここが政務の受付か。まずは中央で、三人の名前と用件を伝えよう。':'アドバさんの紹介が伝わっています。まずは中央の受付で、三人の名前と用件を伝えましょう。'},
    ],onComplete:()=>{if(this.eventDone&&!this.audienceReady)this.arriveGuide();}});
  }
  drawCounter() {
    this.add.image(480,324,'yuateaCounter','counter').setOrigin(.5,1).setDisplaySize(280,70).setDepth(324);
    this.add.text(480,332,'政務・来訪受付',{fontSize:'13px',color:'#f0dfb0',backgroundColor:'#403025',padding:{x:8,y:3}}).setOrigin(.5,0).setDepth(325);
  }
  nearbyInteraction() {
    const targets=[{id:'reception',name:'王宮の受付官',...RECEPTION.counter},...this.npcs.filter(n=>n.id!=='reception')];
    return targets.filter(n=>Math.hypot(n.x-this.player.x,n.y-this.player.y)<85).sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0];
  }
  canWalk(x,y){return canWalkReception(x,y,this.audienceReady)&&!this.npcs.some(n=>Math.hypot(n.x-x,n.y-y)<28);}
  interact() {
    if(this.storyBusy)return this.advanceStory?.();
    if(this.eventBusy||this.transitioning)return;
    if(this.audienceReady&&Math.hypot(this.player.x-AUDIENCE_DOOR.x,this.player.y-AUDIENCE_DOOR.y)<58)return this.enterAudience();
    const npc=this.nearbyInteraction();if(!npc)return;
    if(npc.id==='reception'){
      if(this.audienceReady)return this.showStory({speaker:npc.name,lines:['宰相がお待ちです。受付台の左右から奥の扉へお進みください。']});
      if(this.registered)return this.showStory({speaker:npc.name,lines:['三名のご来訪は記録済みです。アドバ様の紹介状を添えて、内廷へ取り次いでおります。','待合席をご利用ください。お名前が呼ばれるまでは、政務区画の扉の先へお進みにならないようお願いいたします。']});
      this.showStory({lines:receptionRegistrationLines(this.registry.get('yuateaAdmissionSpeaker')),onComplete:()=>{
        this.waitElapsed=0;this.waitWalked=0;
        this.registered=true;this.registry.set('yuateaReceptionRegistered',true);this.registry.set('yuateaReceptionTicket',true);this.updateHud();
      }});return;
    }
    this.showStory({speaker:npc.name,lines:npc.lines});
  }
  startReceptionIncident() {
    if(this.eventStarted||this.eventDone)return;
    this.eventStarted=true;this.eventBusy=true;this.touchDirection=null;
    this.cameras.main.stopFollow().pan(480,410,450);
    const stage=(sp,x,y)=>this.tweens.add({targets:sp,x,y,duration:650,ease:'Sine.easeInOut',onUpdate:()=>sp.setDepth(sp.y)});
    stage(this.player,360,438);stage(this.followers[0],312,488);stage(this.followers[1],390,506);
    const guard=this.npcs.find(n=>n.id==='guard');
    guard.x=605;guard.y=397;stage(guard.sprite,guard.x,guard.y);
    this.intruders=[['capitalChief','chief-front',580,480],['vektenaSpies','spy-up',540,540],['vektenaSpies','spy-up',620,540]].map(([texture,frame,x,y])=>{
      const sp=this.add.sprite(x,690,texture,frame).setOrigin(.5,.85).setDepth(690);sp.setScale(70/sp.frame.realHeight);stage(sp,x,y);return sp;
    });
    this.time.delayedCall(750,()=>this.showStory({lines:RECEPTION_INCIDENT_LINES,onComplete:()=>this.dismissIntruders()}));
  }
  dismissIntruders() {
    for(const [i,sp] of this.intruders.entries()){
      if(i>0)sp.setFrame('spy-down').setScale(70/sp.frame.realHeight);
      this.tweens.add({targets:sp,y:700,alpha:0,duration:650,onUpdate:()=>sp.setDepth(sp.y),onComplete:()=>sp.destroy()});
    }
    this.time.delayedCall(750,()=>{
      this.intruders=[];this.eventDone=true;this.registry.set('yuateaReceptionIncidentDone',true);
      const guard=this.npcs.find(n=>n.id==='guard');guard.x=674;guard.y=355;
      this.tweens.add({targets:guard.sprite,x:guard.x,y:guard.y,duration:400,onUpdate:()=>guard.sprite.setDepth(guard.sprite.y)});
      this.arriveGuide();
    });
  }
  arriveGuide() {
    this.eventBusy=true;
    const sp=this.add.sprite(700,215,'yuateaStaff','administrator').setOrigin(.5,.85).setDepth(215);sp.setScale(70/sp.frame.realHeight);
    this.guide={id:'guide',name:'内廷の案内官',x:700,y:440,sprite:sp,lines:['宰相がお待ちです。中央の受付台の左右を通って、奥の扉へどうぞ。']};
    this.npcs.push(this.guide);
    this.tweens.add({targets:sp,y:440,duration:550,onUpdate:()=>sp.setDepth(sp.y),onComplete:()=>this.showStory({lines:RECEPTION_GUIDE_LINES,onComplete:()=>{
      this.audienceReady=true;this.registry.set('yuateaAudienceReady',true);
      this.eventBusy=false;this.addAudienceMarker();
      this.trail=[{x:this.player.x,y:this.player.y+96},{x:this.player.x,y:this.player.y+48},{x:this.player.x,y:this.player.y}];
      this.cameras.main.startFollow(this.player,true,.15,.15);this.updateHud();
    }})});
  }
  addAudienceMarker() {
    if(!this.audienceReady||this.doorMarker)return;
    const markerPosition={x:AUDIENCE_DOOR.x,y:64};
    this.doorMarker=drawRouteMarker(this,{...markerPosition,depth:10000});
    this.add.text(markerPosition.x,markerPosition.y-22,'宰相との謁見',{fontSize:'13px',color:'#d7f3ff',backgroundColor:'#173c50',padding:{x:6,y:3}}).setOrigin(.5,1).setDepth(10000);
  }
  enterAudience() {
    if(!this.audienceReady||this.transitioning||this.eventBusy)return;
    this.transitioning=true;this.touchDirection=null;
    this.registry.set('yuateaAudienceEntered',true);
    this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('YuateaChancellorScene'));
    this.cameras.main.fadeOut(350);
  }
  update(_time,delta) {
    const action=Phaser.Input.Keyboard.JustDown(this.keys.action)||Phaser.Input.Keyboard.JustDown(this.keys.space);
    if(this.storyBusy){if(action)this.advanceStory?.();return;}
    if(this.eventBusy||this.transitioning)return;
    if(action){this.interact();return;}
    const d=this.activeDirection(),length=Math.hypot(d.x,d.y)||1,step=170*Math.min(delta,50)/1000;
    const previous={x:this.player.x,y:this.player.y};
    const x=this.player.x+d.x/length*step,y=this.player.y+d.y/length*step;
    if(this.canWalk(x,this.player.y))this.player.x=x;
    if(this.canWalk(this.player.x,y))this.player.y=y;
    if(d.x||d.y)this.player.setFrame(d.x?d.x>0?1:2:d.y>0?0:3);
    this.player.setDepth(this.player.y);
    if(Math.hypot(this.player.x-this.trail.at(-1).x,this.player.y-this.trail.at(-1).y)>3){this.trail.push({x:this.player.x,y:this.player.y});if(this.trail.length>180)this.trail.shift();}
    this.followers.forEach((sp,i)=>{
      let remaining=(i+1)*48,target=this.trail[0];
      for(let j=this.trail.length-1;j>0;j--){const a=this.trail[j],b=this.trail[j-1],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>=remaining){const t=remaining/distance;target={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};break;}remaining-=distance;}
      syncEscortSprite(sp,target.x,target.y);
    });
    if(this.registered&&!this.eventDone){
      this.waitElapsed+=Math.min(delta,50)/1000;
      this.waitWalked+=Math.hypot(this.player.x-previous.x,this.player.y-previous.y);
      if(shouldStartReceptionIncident({registered:this.registered,eventStarted:this.eventStarted,eventDone:this.eventDone,elapsed:this.waitElapsed,walked:this.waitWalked})){this.startReceptionIncident();return;}
    }
    this.updateHint();
  }
  updateHint(){if(this.storyBusy||this.eventBusy)return;if(this.audienceReady&&Math.hypot(this.player.x-AUDIENCE_DOOR.x,this.player.y-AUDIENCE_DOOR.y)<58){$('#hint').textContent='Enter / Space・調べる：奥の扉から宰相との謁見へ進む。';return;}const npc=this.nearbyInteraction();$('#hint').textContent=npc?`Enter / Space・調べる：「${npc.name}」と話す。`:this.registered?'取次ぎを待っています。記録官や使者の話を聞くこともできます。':'中央の受付台で、紹介と三人の名前を伝えましょう。';}
  updateHud(){
    $('.chapter').textContent='CHAPTER 15';$('.hud h1').textContent='ユアテア・政務受付';$('#time-label').textContent='昼';$('#step-label').textContent=this.audienceReady?'宰相からの案内・奥の扉へ':this.registered?'受付済み・内廷への取次ぎを待つ':'政治の中枢・来訪者の広間';
    $('#phaser-stage').setAttribute('aria-label','ユアテアの政務受付。王宮の受付官、記録官、警備兵、地方の使者がいる広間');
    $('#quest-list').replaceChildren();
    for(const text of ['✓ アドバの紹介でユアテアへ到着',`${this.registered?'✓':'□'} 中央の受付で三人の名前を届ける`,this.registered?'✓ 受付票を受け取った':'□ 受付票を受け取る',this.audienceReady?'□ 奥の扉から宰相との謁見へ':this.eventDone?'✓ 警備兵が来訪者を守った':this.registered?'内廷への取次ぎを待つ':'記録官や使者から政務の話を聞ける']){const li=document.createElement('li');li.textContent=text;$('#quest-list').append(li);}
    this.updateHint();
  }
}
