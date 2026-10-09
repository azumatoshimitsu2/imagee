import {SAVE_KEY,encodeSave,decodeSave,readSave,writeSave} from '../data/save-game.js';
export function startNewGame(game){
 for(const scene of game.scene.getScenes(false))game.scene.stop(scene.sys.settings.key);
 game.registry.reset();
 game.events.emit('new-game');
 game.scene.start('UpetoaVillageScene');
}
const FIELDS=['phase','hidden','caughtCount','shellCount','drawnShellCount','isMorning','reachedWall','learned','visited','collected','waitElapsed','waitWalked'];
export function blockSaveButtonActivation(event){
 // Movement keydown and keyup must both reach Phaser, even while a button has focus.
 if(event.code==='Enter'||event.code==='Space')event.stopPropagation();
}
export function focusGame(game){
 if(!game.canvas)return;
 game.canvas.tabIndex=-1;
 game.canvas.focus({preventScroll:true});
}
export function canSaveScene(scene){
 if(!scene?.player&&!scene?.boat)return false;
 if(scene.isSaveBusy?.())return false;
 if(scene.roleDialog?.open||scene.storyBusy||scene.busy||scene.cinematic||scene.transitioning||scene.eventBusy||scene.chiefEncounter||scene.endingStarted||scene.exiting||scene.chapterTransition||scene.completed||scene.sim?.caught||scene.state?.caught)return false;
 // These scenes orchestrate action/cutscene timelines; keep their entry checkpoint.
 return scene.sys.settings.key!=='PetoaSeaEscapeScene';
}
export function captureSave(game,scene,{checkpoint=false}={}){
 const resume={checkpoint};
 if(!checkpoint){
  const player=scene.player??scene.boat;resume.position={x:player.x,y:player.y,frame:player.frame?.name};resume.area=scene.area;
  resume.fields={};for(const key of FIELDS)if(scene[key]!==undefined)resume.fields[key]=encodeSave(scene[key]);
  if(scene.getSaveProgress)resume.custom=encodeSave(scene.getSaveProgress());
  if(scene.sys.settings.key==='VektenaCityScene')resume.stealth=encodeSave(scene.state);
  if(scene.sys.settings.key==='VektenaChaseScene')resume.chase=encodeSave(scene.sim);
  if(scene.sys.settings.key==='PetoaBeachScene')resume.shells=scene.shells.map((sp,i)=>scene.savedShellIndices?.has(i)??!!sp.getData('collected'));
 }
 return {version:1,savedAt:Date.now(),scene:scene.sys.settings.key,title:document.querySelector('.hud h1').textContent,registry:encodeSave(game.registry.getAll()),resume};
}
export function restoreSave(scene,snapshot){
 const resume=snapshot.resume;if(resume.checkpoint)return;
 // Dialogue callbacks are not serializable. A stable save resumes free exploration.
 scene.storyBusy=false;scene.advanceStory=null;scene.touchDirection=null;
 document.querySelector('#dialog').hidden=true;document.querySelector('#next-button').hidden=false;
 if(resume.custom&&scene.restoreSaveProgress){scene.restoreSaveProgress(decodeSave(resume.custom));return;}
 for(const key of FIELDS)if(Object.hasOwn(resume.fields??{},key))scene[key]=decodeSave(resume.fields[key]);
 if(resume.chase){scene.sim=decodeSave(resume.chase);if(scene.roleDialog&&scene.sim.rolesReady){scene.roleDialog.close();scene.finishRoleChoice?.();}if(scene.sim.indoor)scene.renderRefuge();else scene.renderStreet();}
 if(resume.stealth){
  // Keep saved movement and pursuit progress, but use the current resident artwork and dialogue.
  const residents=new Map(scene.state.actors.map(a=>[a.id,a]));
  scene.state=decodeSave(resume.stealth);scene.state.grace=Math.max(scene.state.grace,2);
  for(const actor of scene.state.actors){const current=residents.get(actor.id);if(current)for(const key of ['frame','texture','name','lines'])actor[key]=current[key];}
 }
 if(resume.area==='hall'&&scene.area!=='hall'&&scene.enterHall)scene.enterHall();
 if(resume.area==='home'&&scene.area!=='home'&&scene.renderHome)scene.renderHome();
 if(resume.area==='village'&&scene.area!=='village'&&scene.renderOutside)scene.renderOutside(scene.phase==='night'||scene.phase==='eventComplete');
 const player=scene.player??scene.boat;
 if(player&&resume.position){player.setPosition(resume.position.x,resume.position.y);if(resume.position.frame!==undefined&&player.setFrame)player.setFrame(resume.position.frame);if(scene.state?.player)Object.assign(scene.state.player,{x:player.x,y:player.y});if(scene.sim?.player)Object.assign(scene.sim.player,{x:player.x,y:player.y});scene.trail=[{x:player.x,y:player.y+96},{x:player.x,y:player.y+48},{x:player.x,y:player.y}];}
 if(resume.shells&&scene.shells)scene.shells.forEach((sp,i)=>{if(resume.shells[i]){scene.savedShellIndices?.add(i);sp.setData('collected',true);sp.setVisible(false);}});
 scene.input.keyboard?.resetKeys();scene.cameras.main.startFollow(player,true,.15,.15);scene.updateHud?.();
}
export function installSaveGame(game,{preview=false}={}){
 let storage;try{storage=window.localStorage;}catch{}
 const panel=document.createElement('div');panel.className='save-controls';
 const saveButton=document.createElement('button'),loadButton=document.createElement('button'),status=document.createElement('span');
 saveButton.type=loadButton.type='button';saveButton.textContent='セーブ';loadButton.textContent='ロード';status.setAttribute('role','status');
 panel.addEventListener('keydown',blockSaveButtonActivation);
 panel.addEventListener('keyup',blockSaveButtonActivation);
 panel.append(saveButton,loadButton,status);document.querySelector('.status').append(panel);
 const continueButton=document.createElement('button');continueButton.type='button';continueButton.textContent='つづきから';continueButton.id='continue-button';continueButton.addEventListener('keydown',event=>event.stopPropagation());document.querySelector('#title-screen').append(continueButton);
 const details=document.createElement('p');details.className='save-details';document.querySelector('#title-screen').append(details);
 let current=null,loading=false,nextAutomatic=0;
 const active=()=>game.scene.getScenes(true).find(s=>s.player||s.boat);
 const refresh=()=>{const saved=readSave(storage);continueButton.hidden=!saved;loadButton.disabled=!saved;details.textContent=saved?`${saved.title} ／ ${new Date(saved.savedAt).toLocaleString('ja-JP')}`:'';};refresh();
 const save=(automatic=false,checkpoint=false)=>{
  const scene=active();if(!scene||loading||!checkpoint&&!canSaveScene(scene))return false;
  const snapshot=captureSave(game,scene,{checkpoint});
  if(!writeSave(storage,snapshot)){if(!automatic)status.textContent='保存できませんでした。';return false;}
 status.textContent=automatic?'自動セーブ済み':'セーブしました';refresh();return true;
 };
 const load=()=>{
  const snapshot=readSave(storage);if(!snapshot)return;
  loading=true;document.querySelector('#title-screen').classList.add('closed');
  for(const s of game.scene.getScenes(true))game.scene.stop(s.sys.settings.key);
  game.registry.reset();for(const [key,v]of Object.entries(decodeSave(snapshot.registry)))game.registry.set(key,v);
  const target=game.scene.getScene(snapshot.scene);
  target.events.once('create',()=>{restoreSave(target,snapshot);current=target;nextAutomatic=Date.now()+10000;loading=false;status.textContent='ロードしました';focusGame(game);});
  game.scene.start(snapshot.scene);
 };
 saveButton.onclick=()=>{save();focusGame(game);};loadButton.onclick=load;continueButton.onclick=load;
 const titleScreen=document.querySelector('#title-screen'),startButton=document.querySelector('#start-button');
 const newGame=()=>{
  if(loading)return;
  loading=true;
  try{storage?.removeItem(SAVE_KEY);}catch{}
  status.textContent='';current=null;
  document.querySelector('#dialog').hidden=true;
  document.querySelector('#next-button').hidden=false;
  const target=game.scene.getScene('UpetoaVillageScene');
  target.events.once('create',()=>{
   current=target;nextAutomatic=Date.now()+10000;loading=false;
   if(!preview)save(true,true);
   refresh();
  });
  titleScreen.classList.add('closed');
  startNewGame(game);
  focusGame(game);
 };
 const startWithKeyboard=event=>{
  if(titleScreen.classList.contains('closed')||event.target?.id==='continue-button')return;
  if(event.code!=='Enter'&&event.code!=='Space')return;
  event.preventDefault();newGame();
 };
 startButton.addEventListener('click',newGame);
 document.addEventListener('keydown',startWithKeyboard);
 const observe=()=>{
  const scene=active(),titleVisible=!document.querySelector('#title-screen').classList.contains('closed');
  saveButton.disabled=loading||titleVisible||!canSaveScene(scene);
  saveButton.title=saveButton.disabled?'会話・演出が終わると保存できます。':'冒険を保存します。';
  if(loading||titleVisible||!scene)return;
  if(current!==scene){current=scene;nextAutomatic=Date.now()+10000;if(!preview)save(true,!canSaveScene(scene));}
  if(!preview&&Date.now()>=nextAutomatic&&canSaveScene(scene)){save(true);nextAutomatic=Date.now()+10000;}
 };
 const beforeUnload=()=>{if(!preview&&canSaveScene(active())&&!document.querySelector('#title-screen').classList.contains('closed'))save(true);};
 game.events.on('poststep',observe);window.addEventListener('pagehide',beforeUnload);
 game.events.once('destroy',()=>{game.events.off('poststep',observe);window.removeEventListener('pagehide',beforeUnload);startButton.removeEventListener('click',newGame);document.removeEventListener('keydown',startWithKeyboard);panel.remove();continueButton.remove();details.remove();});
}
