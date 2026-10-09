import test from 'node:test';import assert from 'node:assert/strict';
import {SAVE_KEY,encodeSave,decodeSave,readSave,writeSave} from '../js/data/save-game.js';
import {startNewGame,blockSaveButtonActivation,focusGame} from '../js/ui/save-game.js';
import {createJournal} from '../js/data/journal.js';
test('save controls allow movement keydown and keyup to reach the game',()=>{
 for(const type of ['keydown','keyup'])for(const code of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']){
  let stopped=false;blockSaveButtonActivation({type,code,stopPropagation:()=>{stopped=true;}});
  assert.equal(stopped,false,`${type} ${code}`);
 }
 for(const type of ['keydown','keyup'])for(const code of ['Enter','Space']){
  let stopped=false;blockSaveButtonActivation({type,code,stopPropagation:()=>{stopped=true;}});
  assert.equal(stopped,true,`${type} ${code}`);
 }
});
test('manual save returns keyboard focus to the game without scrolling the page',()=>{
 let options;const canvas={focus:value=>{options=value;}};
 focusGame({canvas});assert.equal(canvas.tabIndex,-1);assert.deepEqual(options,{preventScroll:true});
 assert.doesNotThrow(()=>focusGame({}));
});
test('new game stops the previous scenes and resets inventory and journal before starting the village',()=>{
 const registry=new Map([['beachShells',8],['travelEquipment',['boots']],['vektenaComplete',true]]);
 const journal=createJournal();journal.discover('runner');
 const stopped=[],scenes=[{sys:{settings:{key:'VektenaCityScene'}}},{sys:{settings:{key:'UpetoaVillageScene'}}}];
 const game={registry:{reset:()=>registry.clear()},events:{emit:event=>{assert.equal(event,'new-game');journal.reset();}},scene:{getScenes:active=>{assert.equal(active,false);return scenes;},stop:key=>stopped.push(key),start:key=>{
  assert.equal(key,'UpetoaVillageScene');assert.equal(registry.size,0);assert.equal(journal.size,0);assert.deepEqual(stopped,['VektenaCityScene','UpetoaVillageScene']);
 }}};
 startNewGame(game);
});
test('progress sets and nested registry inventory survive serialization without mutating the original',()=>{
 const source={facts:new Set(['father','forest']),items:['old-fang'],state:{position:{x:1800,y:3336}}};const restored=decodeSave(JSON.parse(JSON.stringify(encodeSave(source))));assert.deepEqual(restored,source);assert.notEqual(restored,source);
});
test('valid saves roundtrip, while corrupted, unsupported or out-of-range data is ignored',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const snapshot={version:1,savedAt:123,scene:'VektenaCityScene',registry:{items:['old-fang']},resume:{checkpoint:false,position:{x:1800,y:3336}}};assert.equal(writeSave(storage,snapshot),true);assert.deepEqual(readSave(storage),snapshot);
 for(const invalid of ['{',JSON.stringify({...snapshot,version:2}),JSON.stringify({...snapshot,scene:'UnknownScene'}),JSON.stringify({...snapshot,resume:{position:{x:'1800',y:3336}}})]){memory.set(SAVE_KEY,invalid);assert.equal(readSave(storage),null);}
});
test('storage failure keeps the previous save and dangerous object keys are not restored',()=>{
 assert.equal(writeSave({setItem:()=>{throw Error('quota');}},{version:1}),false);
 const object=decodeSave(JSON.parse('{"__proto__":{"polluted":true},"constructor":{},"good":42}'));assert.deepEqual(object,{good:42});assert.equal({}.polluted,undefined);
});
