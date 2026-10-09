import test from 'node:test';import assert from 'node:assert/strict';
import {ENDING_CHOICES,ENDING_EXPLANATION,ENDING_QUESTION,transferEndingStone} from '../js/data/yuatea-ending.js';
test('handover transfers one carried shard while retaining other inventory',()=>{
 const items=['old-fang','blue-shard-3','blue-shard-4'];const r=transferEndingStone(items);
 assert.equal(r.stone,'blue-shard-3');assert.deepEqual(r.remaining,['old-fang','blue-shard-4']);assert.deepEqual(items,['old-fang','blue-shard-3','blue-shard-4']);
 assert.deepEqual(transferEndingStone(['old-fang']),{stone:null,remaining:['old-fang']});
});
test('three final answers have distinct replies and the explanation includes international cooperation and weapon risk',()=>{
 assert.deepEqual(ENDING_CHOICES.map(c=>c.label),['はい','分からない','いいえ']);assert.equal(new Set(ENDING_CHOICES.map(c=>c.reply)).size,3);
 assert.match(ENDING_QUESTION,/渡してよかった/);const text=ENDING_EXPLANATION.map(l=>l.text).join('');assert.match(text,/国々の技術者/);assert.match(text,/兵器/);assert.match(text,/約束できません/);
});
