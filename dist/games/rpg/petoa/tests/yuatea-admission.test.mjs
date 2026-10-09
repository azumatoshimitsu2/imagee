import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {nearestYuateaEscort,yuateaAdmissionLines} from '../js/systems/yuatea-admission.js';
import {CAPITAL_GUARD,canWalkCapital} from '../js/data/vektena-city.js';
test('the escort physically closer to the guard explains the introduction',()=>{
 const mados={id:'mados',x:1800,y:460},iria={id:'iria',x:1830,y:520};
 assert.equal(nearestYuateaEscort(CAPITAL_GUARD,[mados,iria]).id,'mados');
 iria.y=440;assert.equal(nearestYuateaEscort(CAPITAL_GUARD,[mados,iria]).id,'mados');
 iria.x=1800;assert.equal(nearestYuateaEscort(CAPITAL_GUARD,[mados,iria]).id,'iria');
 assert.equal(nearestYuateaEscort(CAPITAL_GUARD,[]),null);
});
test('both escorts name Adba and the guard confirms the introduction came from a supervisor',()=>{
 for(const id of ['mados','iria']){
  const lines=yuateaAdmissionLines(id);
  assert.equal(lines[1].speaker,id==='mados'?'マドス':'イリア');assert.match(lines[1].text,/アドバ/);
  assert.equal(lines[2].speaker,'入口の警備兵');assert.match(lines[2].text,/上司/);assert.match(lines[3].text,/中へ/);
 }
});
test('guard artwork has its own valid atlas and is accessible from the palace forecourt',()=>{
 const base=new URL('../assets/img/characters/',import.meta.url),png=readFileSync(new URL('yuatea-guard-v3.png',base));
 const atlas=JSON.parse(readFileSync(new URL('yuatea-guard-v3.json',base),'utf8')),f=atlas.frames['guard-front'].frame;
 assert.ok(f.x+f.w<=png.readUInt32BE(16));assert.ok(f.y+f.h<=png.readUInt32BE(20));assert.ok(f.w>0&&f.h>0);
 assert.ok(canWalkCapital(CAPITAL_GUARD.x,CAPITAL_GUARD.y+48));assert.equal(CAPITAL_GUARD.texture,'yuateaGuard');
});
