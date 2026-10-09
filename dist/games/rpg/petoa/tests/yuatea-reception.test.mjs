import test from 'node:test';
import assert from 'node:assert/strict';
import {RECEPTION,RECEPTION_NPCS,canWalkReception,receptionRegistrationLines} from '../js/data/yuatea-reception.js';
import {createJournal,observeScene,JOURNAL_ENTRIES} from '../js/data/journal.js';
test('the entrance has a clear approach to the counter and furniture cannot be crossed',()=>{
 for(let y=RECEPTION.entry.y;y>=RECEPTION.counter.y;y-=4)assert.equal(canWalkReception(480,y),true);
 for(const [x,y] of [[480,280],[100,450],[860,450],[480,200],[480,700]])assert.equal(canWalkReception(x,y),false);
 for(const n of RECEPTION_NPCS.filter(n=>n.id!=='reception'))assert.equal(canWalkReception(n.x,n.y+60),true);
});
test('both escorts identify Adba and all three visitors before a reception ticket is issued',()=>{
 for(const id of ['mados','iria']){const lines=receptionRegistrationLines(id),text=lines.map(l=>l.text).join('');assert.equal(lines[1].speaker,id==='mados'?'マドス':'イリア');for(const name of ['アドバ','チャトア','マドス','イリア','受付票'])assert.ok(text.includes(name));}
});
test('reception ticket appears in the journal only after registration and survives journal reload',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},journal=createJournal(storage);
 const scene={sys:{settings:{key:'YuateaEntranceScene'}},registry:{get:key=>key==='yuateaReceptionTicket'?false:undefined}};
 observeScene(scene,id=>journal.discover(id));assert.equal(journal.has('yuatea-reception'),true);assert.equal(journal.has('yuatea-reception-ticket'),false);
 scene.registry.get=key=>key==='yuateaReceptionTicket'?true:undefined;observeScene(scene,id=>journal.discover(id));assert.equal(createJournal(storage).has('yuatea-reception-ticket'),true);
 assert.ok(JOURNAL_ENTRIES.find(e=>e.id==='yuatea-reception').image);
});

test('the incident requires registration and actual wandering, and only starts once',async()=>{
 const {shouldStartReceptionIncident}=await import('../js/data/yuatea-reception.js');
 const ready={registered:true,eventStarted:false,eventDone:false,elapsed:3,walked:160};
 assert.equal(shouldStartReceptionIncident(ready),true);
 for(const patch of [{registered:false},{elapsed:2.9},{walked:0},{walked:159},{eventStarted:true},{eventDone:true}])assert.equal(shouldStartReceptionIncident({...ready,...patch}),false);
});
test('the inner door remains inaccessible until the guide grants an audience, while the counter stays solid',()=>{
 assert.equal(canWalkReception(480,206),false);assert.equal(canWalkReception(480,206,true),true);
 for(let y=350;y>=200;y-=5)assert.equal(canWalkReception(300,y,true),true);
 for(let x=300;x<=480;x+=5)assert.equal(canWalkReception(x,206,true),true);
 assert.equal(canWalkReception(480,280,true),false);
});
