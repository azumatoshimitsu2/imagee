import { ENDING_REPORT, ENDING_EXPLANATION, ENDING_CHOICES, ENDING_QUESTION, transferEndingStone } from '../data/yuatea-ending.js';
import { YuateaEntranceScene } from './17-yuatea-entrance.js';
import { createEscortSprite } from '../ui/escort-sprites.js';
import { CHANCELLOR_ROOM, canWalkChancellor } from '../data/yuatea-chancellor.js';
const $=selector=>document.querySelector(selector);

// Scene 19 starts the audience; the subsequent political discussion is a separate beat.
export class YuateaChancellorScene extends YuateaEntranceScene {
  constructor(){super({key:'YuateaChancellorScene',chapter:'CHAPTER 16',title:'ユアテア・宰相との謁見',time:'昼'});}
  preload(){super.preload();this.load.image('endingSunstone','./assets/img/items/cave/blue-shard-pixel-v1.png');this.load.atlas('liliaChancellor','./assets/img/characters/lilia-chancellor-v1.png','./assets/img/characters/lilia-chancellor-v1.json');this.load.image('yuateaChancellorOffice','./assets/img/tiles/yuatea/chancellor-office-v1.png');}
  create(){
    $('#title-screen')?.classList.add('closed');
    this.storyBusy=false;this.advanceStory=null;this.touchDirection=null;this.transitioning=false;
    this.endingStarted=false;this.endingFinished=false;this.choicePanel=null;this.endingPanel=null;
    this.events.once('shutdown',()=>{this.choicePanel?.remove();this.endingPanel?.remove();$('#next-button').hidden=false;});
    this.registered=false;this.eventDone=true;this.eventStarted=true;this.eventBusy=false;this.audienceReady=false;
    this.bindSceneControls();this.clearWorld();this.area='audience';
    this.add.image(0,0,'yuateaChancellorOffice').setOrigin(0).setDisplaySize(CHANCELLOR_ROOM.width,CHANCELLOR_ROOM.height).setDepth(0);
    const sprite=this.add.sprite(CHANCELLOR_ROOM.chancellor.x,CHANCELLOR_ROOM.chancellor.y,'liliaChancellor','chancellor-front').setOrigin(.5,.85).setDepth(CHANCELLOR_ROOM.chancellor.y);sprite.setScale(70/sprite.frame.realHeight);
    this.npcs=[{id:'chancellor',name:'リリアの宰相',...CHANCELLOR_ROOM.chancellor,sprite}];
    for(const {x,y} of CHANCELLOR_ROOM.guards){const sp=this.add.sprite(x,y,'yuateaGuard','guard-front').setOrigin(.5,.85).setDepth(y);sp.setScale(70/sp.frame.realHeight);this.npcs.push({id:`guard-${x}`,name:'内廷の警備兵',x,y,sprite:sp});}
    this.player=this.character(CHANCELLOR_ROOM.entry.x,CHANCELLOR_ROOM.entry.y,'returnChatoa',3).setDepth(CHANCELLOR_ROOM.entry.y);
    this.followers=[createEscortSprite(this,'mados',425,584,74,'up'),createEscortSprite(this,'iria',535,584,70,'up')];
    this.trail=[{x:480,y:626},{x:480,y:578},{...CHANCELLOR_ROOM.entry}];
    this.cameras.main.setZoom(.85).setBounds(0,0,960,720).startFollow(this.player,true,.15,.15).fadeIn(450);
    this.updateHud();
    this.showStory({lines:[
      {speaker:'内廷の案内官',text:'宰相閣下。アドバ様のご紹介の、チャトア様、マドス様、イリア様です。'},
      {speaker:'リリアの宰相',text:'よく来てくださいました。アドバからの紹介は受け取っています。受付での出来事も報告を受けました。'},
      {speaker:'リリアの宰相',text:'この場では、あなた方のお話を伺います。まずは落ち着いて、島で何があったのかをお聞かせください。'},
    ]});
  }
  canWalk(x,y){return canWalkChancellor(x,y)&&!this.npcs.some(n=>Math.hypot(n.x-x,n.y-y)<28);}
  nearbyInteraction(){return Math.hypot(this.player.x-CHANCELLOR_ROOM.conversation.x,this.player.y-CHANCELLOR_ROOM.conversation.y)<85?this.npcs[0]:null;}
  interact(){
    if(this.storyBusy)return this.advanceStory?.();
    if(this.endingStarted||!this.nearbyInteraction())return;
    this.endingStarted=true;this.touchDirection=null;
    this.cameras.main.stopFollow().pan(332,340,450);
    this.showStory({lines:ENDING_REPORT,onComplete:()=>this.handOverSunstone()});
  }
  handOverSunstone(){
    const {stone,remaining}=transferEndingStone(this.registry.get('caveCollectedItems')??[]);
    this.registry.set('caveCollectedItems',remaining);this.registry.set('chancellorReceivedShard',stone??'story-sunstone');
    this.registry.set('endingStoneDelivered',true);
    const glow=this.add.image(332,285,'endingSunstone').setDisplaySize(24,24).setDepth(1000).setAlpha(0);
    this.tweens.add({targets:glow,alpha:1,duration:650,onComplete:()=>this.showStory({lines:ENDING_EXPLANATION,onComplete:()=>this.showEndingChoice()})});
    this.storyBusy=true;this.advanceStory=null;
  }
  showEndingChoice(){
    this.storyBusy=true;this.advanceStory=null;$('#dialog').hidden=false;$('#speaker').textContent='リリアの宰相';$('#message').textContent=ENDING_QUESTION;$('#next-button').hidden=true;
    this.input.keyboard.resetKeys();this.input.keyboard.enabled=false;
    this.choicePanel=document.createElement('div');this.choicePanel.className='ending-choices';this.choicePanel.setAttribute('role','group');this.choicePanel.setAttribute('aria-label',ENDING_QUESTION);
    for(const choice of ENDING_CHOICES){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.dataset.endingChoice=choice.id;button.onclick=()=>this.chooseEnding(choice.id);this.choicePanel.append(button);}
    $('#dialog').append(this.choicePanel);this.choicePanel.querySelector('button').focus();
  }
  chooseEnding(id){
    const choice=ENDING_CHOICES.find(c=>c.id===id);if(!choice||!this.choicePanel)return;
    this.registry.set('endingAnswer',id);this.choicePanel.remove();this.choicePanel=null;$('#next-button').hidden=false;
    this.input.keyboard.resetKeys();this.input.keyboard.enabled=true;
    this.showStory({speaker:'リリアの宰相',lines:[choice.reply],onComplete:()=>this.finishEnding()});
  }
  finishEnding(){
    if(this.endingFinished)return;this.endingFinished=true;this.storyBusy=true;this.advanceStory=null;this.touchDirection=null;
    this.registry.set('petoaEndingComplete',true);$('#hint').textContent='';$('#next-button').hidden=false;
    this.cameras.main.once('camerafadeoutcomplete',()=>{
      this.endingPanel=document.createElement('section');this.endingPanel.className='petoa-ending';this.endingPanel.setAttribute('aria-label','PETOA 光を運ぶ子 エンディング');
      const title=document.createElement('img');title.src='./assets/img/petoa-title-clean-v1.png';title.alt='PETOA 光を運ぶ子';
      const end=document.createElement('p');end.textContent='END';
      const button=document.createElement('button');button.type='button';button.textContent='タイトルに戻る';button.onclick=()=>window.location.assign('./');
      this.endingPanel.append(title,end,button);document.body.append(this.endingPanel);button.focus();
    });this.cameras.main.fadeOut(1200,0,0,0);
  }
  updateHint(){if(!this.storyBusy)$('#hint').textContent=this.nearbyInteraction()?'Enter / Space・調べるで宰相に島での出来事を話す。':'左奥の執務机の前で、宰相と話せます。';}
  updateHud(){
    $('.chapter').textContent='CHAPTER 16';$('.hud h1').textContent='ユアテア・宰相との謁見';$('#time-label').textContent='昼';$('#step-label').textContent='宰相府・三人で謁見';
    $('#phaser-stage').setAttribute('aria-label','シーン19。リリアの宰相との謁見');$('#quest-list').replaceChildren();
    for(const text of['✓ 内廷からの案内で謁見の間へ','✓ 三人で宰相のもとに到着']){const li=document.createElement('li');li.textContent=text;$('#quest-list').append(li);}this.updateHint();
  }
}
