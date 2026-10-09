import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANCELLOR_ROOM,canWalkChancellor} from '../js/data/yuatea-chancellor.js';
test('the audience approach reaches the left desk without crossing furniture',()=>{
 const {entry,conversation}=CHANCELLOR_ROOM;
 for(let x=entry.x;x>=conversation.x;x-=4)assert.ok(canWalkChancellor(x,entry.y));
 for(let y=entry.y;y>=conversation.y;y-=4)assert.ok(canWalkChancellor(conversation.x,y));
 for(const [x,y] of [[332,310],[720,520],[330,200],[100,500],[480,680]])assert.equal(canWalkChancellor(x,y),false);
 assert.equal(canWalkChancellor(550,350),true);
});
