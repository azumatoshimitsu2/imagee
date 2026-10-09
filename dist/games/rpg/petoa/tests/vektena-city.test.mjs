import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { CAPITAL, CAPITAL_ALLEYS, CAPITAL_ENTRY, CAPITAL_PLACES, CAPITAL_BUILDINGS, CAPITAL_POND, CAPITAL_RESIDENTS, CAPITAL_PROPS, capitalPropBlock, CAPITAL_GRID_X, CAPITAL_GRID_Y, CAPITAL_ROADS, onCapitalRoad, pedestrianCapital, createCapitalTraffic, capitalVehiclePosition, stepCapitalTraffic, capitalVehicleHits, canWalkCapital } from '../js/data/vektena-city.js';
import { CITY } from '../js/data/bazaar-city.js';

test('the capital is larger than the bazaar and buildings, pond and parked buses block movement', () => {
  assert.ok(CAPITAL.width * CAPITAL.height > CITY.width * CITY.height * 2);
  assert.ok(canWalkCapital(CAPITAL_ENTRY.x, CAPITAL_ENTRY.y));
  for (const b of [...CAPITAL_BUILDINGS, CAPITAL_POND]) assert.equal(canWalkCapital(b.x+b.width/2,b.y+b.height/2),false);
  for (const prop of CAPITAL_PROPS) {
    const b = capitalPropBlock(prop);
    assert.equal(canWalkCapital(b.x+b.width/2,b.y+b.height/2),false,prop.frame);
  }
  assert.equal(canWalkCapital(-1,100),false);
});

test('all landmarks and residents connect to the arrival point through walkable streets', () => {
  const tile=20,cols=CAPITAL.width/tile,rows=CAPITAL.height/tile;
  const cell=p=>Math.floor(p.y/tile)*cols+Math.floor(p.x/tile);
  const queue=[cell(CAPITAL_ENTRY)],seen=new Set(queue);
  for(let head=0;head<queue.length;head++) {
    const current=queue[head],x=current%cols,y=Math.floor(current/cols);
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      const id=ny*cols+nx;
      if(nx<0||nx>=cols||ny<0||ny>=rows||seen.has(id)||!canWalkCapital(nx*tile+10,ny*tile+10))continue;
      seen.add(id);queue.push(id);
    }
  }
  for(const place of [...CAPITAL_PLACES,...CAPITAL_RESIDENTS]) assert.ok(seen.has(cell(place)),place.name);
  for(let y=520;y<=CAPITAL_ENTRY.y;y+=20)assert.ok(canWalkCapital(1800,y),'central boulevard');
});


test('capital residents use all eight dedicated postwar city sprites', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/img/characters/vektena-residents-v2.json', import.meta.url), 'utf8'));
  const png = readFileSync(new URL('../assets/img/characters/vektena-residents-v2.png', import.meta.url));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(Object.keys(atlas.frames).length, 8);
  assert.equal(new Set(CAPITAL_RESIDENTS.filter(npc=>npc.texture!=='yuateaGuard').map(npc => npc.frame)).size, 16);
  for (const npc of CAPITAL_RESIDENTS.filter(n => !n.texture)) {
    const frame = atlas.frames[npc.frame]?.frame;
    assert.ok(frame, npc.name);
    assert.ok(frame.w > 0 && frame.h > 0 && frame.x >= 0 && frame.y >= 0);
    assert.ok(frame.x + frame.w <= width && frame.y + frame.h <= height);
  }
  const scene = readFileSync(new URL('../js/scenes/16-vektena-city.js', import.meta.url), 'utf8');
  assert.ok(scene.includes("npc.y,npc.texture ?? 'capitalResidents',npc.frame"));
});


test('eight additional front-facing residents have valid artwork and distinct reachable placements', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/img/characters/vektena-residents-front-v1.json', import.meta.url), 'utf8'));
  const png = readFileSync(new URL('../assets/img/characters/vektena-residents-front-v1.png', import.meta.url));
  const residents = CAPITAL_RESIDENTS.filter(n => n.texture === 'capitalFrontResidents');
  assert.equal(residents.length, 8);
  assert.equal(new Set(residents.map(n => n.frame)).size, 8);
  for (const npc of residents) {
    const frame = atlas.frames[npc.frame]?.frame;
    assert.ok(frame, npc.frame);
    assert.ok(frame.x + frame.w <= png.readUInt32BE(16));
    assert.ok(frame.y + frame.h <= png.readUInt32BE(20));
    assert.equal(npc.facing, 'front');
    assert.ok(canWalkCapital(npc.x, npc.y));
    assert.ok(npc.lines.length);
    assert.ok(CAPITAL_RESIDENTS.every(other => other === npc || Math.hypot(other.x - npc.x, other.y - npc.y) >= 110));
  }
});


test('all paper-holding worker and guide instances use the replacement frontal atlas', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/img/characters/vektena-workers-front-v1.json', import.meta.url), 'utf8'));
  const png = readFileSync(new URL('../assets/img/characters/vektena-workers-front-v1.png', import.meta.url));
  for (const name of ['office-worker', 'transit-attendant']) {
    const residents = CAPITAL_RESIDENTS.filter(n => n.frame === name);
    assert.ok(residents.length);
    const frame = atlas.frames[name].frame;
    assert.ok(frame.x + frame.w <= png.readUInt32BE(16));
    assert.ok(frame.y + frame.h <= png.readUInt32BE(20));
    for (const resident of residents) {
      assert.equal(resident.texture, 'capitalWorkersFront');
      assert.equal(resident.facing, 'front');
    }
  }
});


test('grid retains sidewalks and crossings while road lanes are freely walkable', () => {
  assert.equal(CAPITAL_ROADS.length, CAPITAL_GRID_X.length + CAPITAL_GRID_Y.length);
  for (const x of CAPITAL_GRID_X) {
    assert.ok(canWalkCapital(x, 1400));
    assert.equal(pedestrianCapital(x - 120, 1400), true);
    for (const y of CAPITAL_GRID_Y) {
      assert.ok(canWalkCapital(x, y));
      for(let offset=-96;offset<=96;offset+=4) {
        assert.ok(pedestrianCapital(x+offset,y-120));
        assert.ok(pedestrianCapital(x-120,y+offset));
      }
    }
  }
  for (const npc of CAPITAL_RESIDENTS) {
    assert.ok(pedestrianCapital(npc.x, npc.y), npc.name);
    assert.equal(onCapitalRoad(npc.x, npc.y,16), false, npc.name);
  }
});

test('traffic moves continuously in its lane and wraps at the city edge', () => {
  const cars=createCapitalTraffic();
  const original=cars.map(c=>c.position);
  stepCapitalTraffic(cars,100);
  assert.ok(cars.every((car,i)=>car.position !== original[i]));
  for(const car of cars) {
    const p=capitalVehiclePosition(car);
    assert.equal(car.axis==='vertical'?Math.abs(p.x-car.center):Math.abs(p.y-car.center),36);
  }
  const car={axis:'vertical',center:1920,direction:1,position:680,speed:100};
  stepCapitalTraffic([car],100,[{x:1884,y:780}]);
  assert.equal(car.position,690);
  stepCapitalTraffic([car],100,[]);
  assert.equal(car.position,700);
  car.position=CAPITAL.height-1;stepCapitalTraffic([car],100);
  assert.equal(car.position,9);
});


test('utility poles are removed from both rendering props and movement blockers', () => {
  assert.ok(CAPITAL_PROPS.every(prop => prop.frame !== 'pole'));
  for (const [x,y] of [[1630,3270],[2054,2930],[1800,1870]]) assert.ok(canWalkCapital(x,y));
});


test('vehicle contact covers both travel axes and excludes nearby sidewalks', () => {
  for (const axis of ['vertical','horizontal']) {
    const car={axis,center:1920,direction:1,position:1400};
    const p=capitalVehiclePosition(car);
    assert.ok(capitalVehicleHits(car,p));
    assert.ok(capitalVehicleHits(car,{x:p.x+20,y:p.y+20}));
    assert.equal(capitalVehicleHits(car,{x:p.x+90,y:p.y+90}),false);
  }
});


test('visible cross-block alleys have clear movement width and both ends connect to sidewalks',()=>{
 assert.ok(CAPITAL_ALLEYS.length>=8);
 for(const alley of CAPITAL_ALLEYS){
  for(let x=alley.x+20;x<=alley.x+alley.width-20;x+=20)
   for(let y=alley.y+20;y<=alley.y+alley.height-20;y+=20)assert.ok(canWalkCapital(x,y,16),`alley blocked at ${x},${y}`);
  const vertical=alley.height>alley.width;
  const ends=vertical?[{x:alley.x+alley.width/2,y:alley.y},{x:alley.x+alley.width/2,y:alley.y+alley.height}]:[{x:alley.x,y:alley.y+alley.height/2},{x:alley.x+alley.width,y:alley.y+alley.height/2}];
  for(const p of ends){assert.ok(canWalkCapital(p.x,p.y));assert.ok(CAPITAL_ROADS.some(road=>{const [x,y]=road.points[0];return Math.abs((road.axis==='vertical'?p.x-x:p.y-y))<=152;}));}
 }
 for(let i=0;i<CAPITAL_BUILDINGS.length;i++)for(const b of CAPITAL_BUILDINGS.slice(i+1)){
  const a=CAPITAL_BUILDINGS[i],dx=Math.max(b.x-a.x-a.width,a.x-b.x-b.width),dy=Math.max(b.y-a.y-a.height,a.y-b.y-b.height);
  assert.ok(dx>=80||dy>=80,'buildings leave an unusably narrow gap');
 }
});
