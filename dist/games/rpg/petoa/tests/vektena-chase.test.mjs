import test from 'node:test';
import assert from 'node:assert/strict';
import { START, PLACES, MAP, DISGUISE_WARDROBE, REFUGE_EXITS } from '../js/data/vektena-chase.js';
import { createChase as createRawChase, assignRoles, walkable, lineClear, findPath, stepChase, command, changeDisguise, enterPlace, leavePlace, retryChase, seenBy, collectDisguise, collectPass, nearPassDocument, nearbyRefugeExit, refugeWalkable } from '../js/systems/vektena-chase.js';
import { CITY, MERCHANT_HALL } from '../js/data/bazaar-city.js';
const createPendingChase = (saved = {}) => createRawChase({ autonomous: false, ...saved });
const createChase = (saved = {}) => createPendingChase({ roles: { mados: 'lure', iria: 'shield' }, ...saved });
const OPEN_STREET = { x: 1296, y: 1248 };
const tick = (state, seconds, input = {}) => { for (let t = 0; t < seconds - .001; t += .05) stepChase(state, input, .05); };
const takeCoat = s => { Object.assign(s.refugePlayer, { x: DISGUISE_WARDROBE.x, y: 340 }); assert.ok(collectDisguise(s)); };
const gather = (s, p) => { Object.assign(s.player, p); s.trail = [{ ...p }]; for (const m of s.team) Object.assign(m, { x: p.x, y: p.y }); };

test('a visible spy pursues immediately from the hall while the party can escape', () => {
  const s = createChase(), spy = s.agents[0];
  const initialDistance = Math.hypot(spy.x - s.player.x, spy.y - s.player.y);
  assert.ok(initialDistance > 120 && initialDistance < 240);
  assert.ok(lineClear(spy, s.player));
  assert.ok(s.agents.every(a => a.frame === 'spy-down'));
  assert.ok(s.civilians.every(a => a.frame !== 'spy-down'));
  tick(s, .5);
  assert.ok(Math.hypot(spy.x - s.player.x, spy.y - s.player.y) < initialDistance - 40);
  assert.equal(s.caught, false);
  assert.equal(command(s, 'mados'), true);
  tick(s, .1, { x: 1, run: true });
  assert.ok(spy.lured);
  assert.ok(s.player.x > START.x);
  assert.equal(s.caught, false);
});

test('the same city and hall doorway connect every refuge, both exits and the final gate', () => {
  assert.equal(MAP.width, CITY.width); assert.equal(MAP.height, CITY.height);
  assert.deepEqual(START, { x: MERCHANT_HALL.door.x, y: MERCHANT_HALL.door.y + 70 });
  for (const p of [START, ...PLACES, ...PLACES.filter(p => p.back).map(p => p.back)]) {
    assert.ok(walkable(p.x, p.y));
    const route = findPath(START, p); assert.ok(route.length);
    let last = START;
    for (const point of route) { assert.ok(lineClear(last, point)); last = point; }
  }
  assert.equal(walkable(1296, 650), false);
  assert.equal(lineClear({ x: 1150, y: 650 }, { x: 1440, y: 650 }), false);
});

test('ordinary pedestrians alone do not increase pressure or capture the player', () => {
  const s = createChase(); s.agents = [];
  gather(s, s.civilians[0]); tick(s, 15);
  assert.equal(s.alert, 0); assert.equal(s.caught, false);
});

test('Mados diverts nearby observers while Iria stops a person, with independent cooldowns', () => {
  const s = createChase(); s.civilians = []; gather(s, OPEN_STREET);
  s.agents = s.agents.slice(-2);
  s.agents[0].x = s.player.x; s.agents[0].y = s.player.y - 130;
  s.agents[1].x = s.player.x + 35; s.agents[1].y = s.player.y - 170;
  const old = { x: s.agents[0].x, y: s.agents[0].y };
  assert.equal(command(s, 'mados'), true); tick(s, .1);
  assert.ok(s.agents.some(a => a.lured));
  assert.equal(command(s, 'mados'), false);
  assert.equal(command(s, 'iria'), true);
  tick(s, .6);
  assert.ok(s.agents.some(a => a.distracted > 0));
  tick(s, 1);
  assert.ok(s.team[0].active > 0 && s.team[1].active > 0);
  assert.ok(s.team.every(m => m.cooldown > 0));
  assert.ok(Math.hypot(s.team[0].x - old.x, s.team[0].y - old.y) > 30);
});

test('shield targets spies only and does not stop innocent citizens', () => {
  const s = createChase(); s.agents = []; gather(s, START);
  s.civilians = [s.civilians[0]]; Object.assign(s.civilians[0], { x: s.player.x, y: s.player.y - 70 });
  assert.equal(command(s, 'iria'), false);
  assert.equal(s.civilians[0].distracted, 0); assert.equal(s.alert, 0);
});

test('disguise needs the cloth shop and a hidden position; old sprint input has no effect', () => {
  const s = createChase(); assert.equal(changeDisguise(s), false);
  gather(s, PLACES[0]); assert.equal(enterPlace(s, 'cloth'), true); takeCoat(s);
  assert.equal(changeDisguise(s), true); assert.ok(s.disguise > 0);
  leavePlace(s, true); assert.deepEqual({ x: s.player.x, y: s.player.y }, PLACES[0].back);
  tick(s, .05, { x: 1, run: true }); assert.ok(s.disguise > 0); assert.equal(s.running, false);
  s.disguiseCooldown = 0; gather(s, OPEN_STREET);
  s.agents = [s.agents[0]]; Object.assign(s.agents[0], { x: s.player.x, y: s.player.y + 50 });
  assert.equal(changeDisguise(s), false);
});

test('spies wait at the front when the team shelters and checkpoint progress survives capture', () => {
  const s = createChase(); gather(s, PLACES[0]);
  Object.assign(s.agents[0], { x: s.player.x + 130, y: s.player.y + 20 });
  assert.ok(enterPlace(s, 'cloth')); assert.ok(s.agents[0].waitAt);
  tick(s, 2); assert.equal(s.caught, false); takeCoat(s);
  const retried = retryChase(s); assert.equal(retried.stage, 1); assert.ok(retried.hasDisguise);
  assert.deepEqual({ x: retried.player.x, y: retried.player.y }, PLACES[0].back);
});

test('the gate requires the pass, a clear approach and both companions reunited', () => {
  const s = createChase(); gather(s, PLACES[2]);
  assert.equal(enterPlace(s, 'gate'), false);
  s.stage = 2; assert.equal(enterPlace(s, 'gate'), false, 'waiting observers prevent an unassisted dash');
  s.agents = []; s.team[0].active = 2; assert.equal(enterPlace(s, 'gate'), false);
  s.team[0].active = 0; s.alert = 70; assert.equal(enterPlace(s, 'gate'), false);
  s.alert = 0; assert.equal(enterPlace(s, 'gate'), true); assert.ok(s.complete);
});

test('contact captures on the first frame even at zero pressure, while walls block observation', () => {
  const s = createChase(); s.civilians = []; gather(s, OPEN_STREET);
  s.agents = [s.agents[0]]; Object.assign(s.agents[0], { x: s.player.x, y: s.player.y + 10 });
  s.alert = 0; s.grace = 0; stepChase(s, {}, 1 / 60); assert.ok(s.caught);
  const retried = retryChase(s);
  assert.equal(retried.caught, false);
  assert.deepEqual({ x: retried.player.x, y: retried.player.y }, s.checkpoint);
  const a = { x: 1150, y: 650, dx: 1, dy: 0 }; assert.equal(seenBy(a, { x: 1440, y: 650 }, 1000), false);
});

test('route following can cross the city without cutting building corners', () => {
  const s = createChase(); s.agents = []; s.civilians = [];
  const route = findPath(START, PLACES[0]);
  for (const p of route) {
    for (let n = 0; n < 1000 && Math.hypot(s.player.x - p.x, s.player.y - p.y) > 5; n++) {
      stepChase(s, { x: p.x - s.player.x, y: p.y - s.player.y }, .05);
      assert.ok(walkable(s.player.x, s.player.y));
      for (const m of s.team) assert.ok(walkable(m.x, m.y, 6));
    }
  }
  assert.ok(Math.hypot(s.player.x - PLACES[0].x, s.player.y - PLACES[0].y) < 10);
  assert.ok(enterPlace(s, 'cloth'));
});

for (const autonomous of [false, true]) for (const shieldId of ['iria', 'mados']) test(`a ${autonomous ? 'fully autonomous' : 'autonomous with optional commands'} playthrough clears all objectives with ${shieldId} as shield`, () => {
  const s = createPendingChase({ autonomous: true }); assignRoles(s, shieldId);
  const walk = goal => {
    const route = findPath(s.player, goal); assert.ok(route.length);
    for (const p of route) {
      let limit = 0;
      while (Math.hypot(s.player.x - p.x, s.player.y - p.y) > 6 && limit++ < 200) {
        if (!autonomous && s.alert > 35) command(s, 'mados');
        if (!autonomous && s.alert > 60) command(s, 'iria');
        stepChase(s, { x: p.x - s.player.x, y: p.y - s.player.y }, .03);
        assert.equal(s.caught, false);
        if (s.complete) return;
      }
      assert.ok(limit < 200, 'route must not get stuck: ' + JSON.stringify({ player: s.player, target: p }));
    }
  };
  walk(PLACES[0]); assert.ok(enterPlace(s, 'cloth')); takeCoat(s); tick(s, 35); assert.ok(changeDisguise(s)); leavePlace(s);
  walk(PLACES[1]); assert.ok(enterPlace(s, 'archive')); Object.assign(s.refugePlayer, { x: 541, y: 350 }); assert.ok(collectPass(s)); tick(s, 35); assert.ok(changeDisguise(s)); leavePlace(s);
  // Use the northern street in disguise to avoid spending one-target abilities on unrelated patrols.
  walk({ x: 1770, y: 432 }); walk({ x: 2424, y: 432 });
  // Approach from the city side and interact before walking into the guards.
  walk({ x: PLACES[2].x, y: PLACES[2].y + 72 });
  for (let i = 0; i < 400 && !s.complete; i++) {
    if (!autonomous && s.team[0].cooldown <= 0) command(s, 'mados');
    if (!autonomous && i % 120 === 0) command(s, 'iria');
    stepChase(s, {}, .05); enterPlace(s, 'gate');
    assert.equal(s.caught, false);
  }
  assert.ok(s.complete); assert.ok(s.uses.mados > 0); assert.ok(s.uses.iria > 0);
});

test('crossing the gate exits even under pursuit and while escorts are regrouping', () => {
  const gate = PLACES.find(p => p.id === 'gate');
  const s = createChase({ stage: 2 });
  gather(s, { x: gate.x, y: gate.y - 14 });
  s.alert = 100; s.grace = 0;
  Object.assign(s.agents[0], { x: gate.x, y: gate.y - 16 });
  Object.assign(s.team[0], { x: gate.x, y: gate.y + 160, returning: true });
  stepChase(s, { y: -1 }, .05);
  assert.equal(s.complete, true);
  assert.equal(s.caught, false);
});

test('crossing outside the gate or without a pass does not exit', () => {
  const gate = PLACES.find(p => p.id === 'gate');
  for (const [stage, x] of [[1, gate.x], [2, gate.x + 120]]) {
    const s = createChase({ stage }); s.agents = []; s.civilians = [];
    gather(s, { x, y: gate.y - 30 });
    tick(s, .05);
    assert.equal(s.complete, false);
  }
});

test('the final gate completes automatically without interaction once the party is ready', () => {
  const s = createChase({ stage: 2 }); s.agents = []; s.civilians = [];
  const gate = PLACES.find(p => p.id === 'gate');
  gather(s, { x: gate.x, y: gate.y + 100 });
  tick(s, .05);
  assert.equal(s.complete, false, 'the party must reach the gate');
  gather(s, gate); s.team[0].active = 1; s.team[0].goal = { ...gate };
  tick(s, .05);
  assert.equal(s.complete, false, 'active companions must regroup');
  s.team[0].active = 0;
  tick(s, .05);
  assert.equal(s.complete, true);
});

test('later agents relay their last sighting when meeting, without sharing globally', () => {
  const s = createChase({ stage: 1 }); s.civilians = [];
  s.agents = s.agents.slice(0, 3);
  Object.assign(s.agents[0], { x: 1296, y: 1248, memory: 4, lastSeen: { x: 1296, y: 1152 } });
  Object.assign(s.agents[1], { x: 1296, y: 1296 });
  Object.assign(s.agents[2], { x: 2424, y: 1500 });
  tick(s, .05);
  assert.ok(s.agents[1].memory > 0);
  assert.deepEqual(s.agents[1].lastSeen, s.agents[0].lastSeen);
  assert.equal(s.agents[2].memory, 0);
});

test('market crowds shorten observation distance compared with an open street', () => {
  const crowd = createChase(); crowd.civilians = []; crowd.agents = [crowd.agents[0]];
  gather(crowd, { x: 600, y: 1248 }); Object.assign(crowd.agents[0], { x: crowd.player.x + 200, y: crowd.player.y, dx: -1, dy: 0 });
  tick(crowd, .05); assert.equal(crowd.alert, 0);
  const street = createChase(); street.civilians = []; street.agents = [street.agents[0]];
  gather(street, OPEN_STREET); Object.assign(street.agents[0], { x: street.player.x, y: street.player.y + 200, dx: 0, dy: -1 });
  tick(street, .05); assert.ok(street.alert > 0);
});

test('role selection freezes enemies, movement and timers until one valid assignment is confirmed', () => {
  const s = createPendingChase(), before = JSON.stringify(s);
  tick(s, 30, { x: 1, run: true });
  assert.equal(command(s, 'mados'), false); assert.equal(command(s, 'iria'), false);
  assert.equal(changeDisguise(s), false); assert.equal(enterPlace(s, 'cloth'), false);
  assert.equal(assignRoles(s, 'unknown'), false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(assignRoles(s, 'mados'), true);
  assert.deepEqual(s.team.map(m => m.role), ['shield', 'lure']);
  assert.equal(assignRoles(s, 'iria'), false, 'roles cannot change during pursuit');
  tick(s, .5, { x: -1 }); assert.ok(s.time > 0); assert.ok(s.player.x < START.x);
  const retried = retryChase(s);
  assert.equal(retried.rolesReady, true); assert.deepEqual(retried.team.map(m => m.role), ['shield', 'lure']);
});

for (const shieldId of ['mados', 'iria']) test(`${shieldId} shield physically stops only the configured number of spies`, () => {
  const s = createPendingChase(); assignRoles(s, shieldId); gather(s, OPEN_STREET);
  s.agents = s.agents.slice(0, 3);
  s.agents.forEach((a, i) => Object.assign(a, { x: OPEN_STREET.x + (i - 1) * 25, y: OPEN_STREET.y + 65 }));
  assert.ok(command(s, shieldId)); tick(s, .1);
  const blocked = s.agents.filter(a => a.distracted > 0);
  assert.equal(blocked.length, 1);
  const positions = blocked.map(a => [a.x, a.y]); tick(s, .2);
  assert.deepEqual(blocked.map(a => [a.x, a.y]), positions);
  assert.ok(s.civilians.every(a => a.distracted === 0));
  const member = s.team.find(m => m.id === shieldId);
  assert.ok(member.cooldown > (shieldId === 'mados' ? 19 : 11));
});

for (const lureId of ['mados', 'iria']) test(`${lureId} lure has its own attraction range and movement speed`, () => {
  const s = createPendingChase(); assignRoles(s, lureId === 'mados' ? 'iria' : 'mados'); gather(s, OPEN_STREET);
  s.civilians = []; s.agents = [s.agents[0]];
  Object.assign(s.agents[0], { x: OPEN_STREET.x, y: OPEN_STREET.y + 420 });
  const member = s.team.find(m => m.id === lureId), before = { x: member.x, y: member.y };
  assert.ok(command(s, lureId)); tick(s, .1);
  assert.equal(s.agents[0].lured, lureId === 'mados');
  assert.ok(Math.abs(Math.hypot(member.x - before.x, member.y - before.y) - (lureId === 'mados' ? 21 : 30)) < .01);
});

test('the final mission keeps escorts following and allows only manual abilities', () => {
  const s = createRawChase({ stage: 2 }); assignRoles(s, 'mados'); gather(s, OPEN_STREET);
  s.civilians = []; s.agents = [s.agents[0]];
  Object.assign(s.agents[0], { x: OPEN_STREET.x, y: OPEN_STREET.y + 110 });
  tick(s, .5);
  assert.equal(s.uses.mados + s.uses.iria, 0);
  assert.ok(s.team.every(m => !m.active && !m.returning));
  assert.equal(command(s, 'iria', true), false);
  assert.equal(command(s, 'iria'), true);
  tick(s, .05);
  assert.ok(s.team.find(m => m.id === 'iria').active > 0);
});

test('entering the final mission cancels ongoing automatic abilities and regroups', () => {
  const s = createRawChase(); assignRoles(s, 'mados'); gather(s, OPEN_STREET);
  s.agents = []; s.civilians = [];
  assert.ok(command(s, 'iria', true));
  s.stage = 2;
  tick(s, .05);
  assert.equal(s.team.find(m => m.id === 'iria').active, 0);
  tick(s, 1);
  assert.ok(s.team.every(m => !m.active && !m.returning));
  assert.equal(s.uses.iria, 1);
});

test('autonomous shield intercepts nearby spies without a command and respects cooldown', () => {
  const s = createRawChase(); assignRoles(s, 'mados'); gather(s, OPEN_STREET);
  s.civilians = []; s.agents = [s.agents[0]];
  Object.assign(s.agents[0], { x: OPEN_STREET.x, y: OPEN_STREET.y + 110 });
  tick(s, .6);
  assert.equal(s.uses.mados, 1); assert.ok(s.team[0].automatic);
  assert.ok(s.agents[0].distracted > 0);
  const pos = { x: s.agents[0].x, y: s.agents[0].y };
  tick(s, .5); assert.equal(s.uses.mados, 1);
  assert.deepEqual({ x: s.agents[0].x, y: s.agents[0].y }, pos);
});

test('autonomous lure draws pursuit away from the player without a command', () => {
  const s = createRawChase(); assignRoles(s, 'mados'); gather(s, OPEN_STREET);
  s.civilians = []; s.agents = [s.agents[0]];
  Object.assign(s.agents[0], { x: OPEN_STREET.x, y: OPEN_STREET.y + 240 });
  tick(s, .5);
  assert.equal(s.uses.iria, 1); assert.ok(s.team[1].automatic); assert.ok(s.agents[0].lured);
  assert.ok(Math.hypot(s.team[1].x - s.player.x, s.team[1].y - s.player.y) > 100);
});

test('autonomous teammates do not deploy for civilians, through walls, or while indoors', () => {
  const s = createRawChase(); assignRoles(s, 'mados'); s.agents = [];
  tick(s, 5); assert.equal(s.uses.mados + s.uses.iria, 0);
  const other = createRawChase(); assignRoles(other, 'mados'); gather(other, { x: 1150, y: 650 });
  other.agents = [other.agents[0]]; Object.assign(other.agents[0], { x: 1440, y: 650, memory: 0 });
  tick(other, .1); assert.equal(other.uses.mados + other.uses.iria, 0);
  gather(other, PLACES[0]); assert.ok(enterPlace(other, 'cloth'));
  Object.assign(other.agents[0], { x: other.player.x, y: other.player.y + 70 });
  tick(other, 5); assert.equal(other.uses.mados + other.uses.iria, 0);
});

for (const shieldId of ['mados', 'iria']) test(`each role affects only one spy throughout an action with ${shieldId} as shield`, () => {
  const s = createPendingChase(); assignRoles(s, shieldId); gather(s, OPEN_STREET);
  s.civilians = []; s.grace = 30; s.agents = s.agents.slice(0, 4);
  s.agents.forEach((a, i) => Object.assign(a, { x: OPEN_STREET.x + (i - 1) * 30, y: OPEN_STREET.y + 80, memory: 10, lastSeen: { ...OPEN_STREET } }));
  const lureId = shieldId === 'mados' ? 'iria' : 'mados';
  assert.ok(command(s, shieldId)); assert.ok(command(s, lureId));
  const stopped = new Set(), lured = new Set();
  for (let i = 0; i < 200; i++) {
    stepChase(s, {}, .05);
    const blockedNow = s.agents.filter(a => a.distracted > 0), luredNow = s.agents.filter(a => a.lured);
    assert.ok(blockedNow.length <= 1); assert.ok(luredNow.length <= 1);
    blockedNow.forEach(a => stopped.add(a.id)); luredNow.forEach(a => lured.add(a.id));
  }
  assert.equal(stopped.size, 1); assert.equal(lured.size, 1);
  assert.notEqual([...stopped][0], [...lured][0]);
});

test('even an alarmed spy cannot gain on Chatoa walking in a straight line', () => {
  const s = createChase(); gather(s, OPEN_STREET); s.civilians = []; s.agents = [s.agents[0]];
  Object.assign(s.agents[0], { x: s.player.x, y: s.player.y - 180, dx: 0, dy: 1, memory: 10, lastSeen: { ...s.player } });
  s.alert = 100; s.grace = 30;
  const startPlayer = s.player.y, startSpy = s.agents[0].y;
  tick(s, 1, { y: 1 });
  assert.ok(Math.abs((s.player.y - startPlayer) - 178) < .01);
  assert.ok(Math.abs((s.agents[0].y - startSpy) - 178) < .01);
  assert.ok(Math.abs(s.player.y - s.agents[0].y - 180) < .01);
});

for (const id of ['cloth', 'archive']) for (const back of [true, false]) test(`disguise permits walking inside ${id} and after its ${back ? 'back' : 'front'} exit`, () => {
  const s = createChase({ stage: id === 'archive' ? 1 : 0 }); s.agents = [];
  const place = PLACES.find(p => p.id === id); gather(s, place);
  assert.ok(enterPlace(s, id)); if (id === 'cloth') takeCoat(s);
  Object.assign(s.refugePlayer, { x: 384, y: 400 }); assert.ok(changeDisguise(s));
  const street = { x: s.player.x, y: s.player.y }, duration = s.disguise;
  tick(s, .5, { x: 1 }); assert.ok(s.refugePlayer.x > 450);
  tick(s, .3, { y: 1 }); assert.ok(s.refugePlayer.y > 440);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, street);
  assert.equal(s.disguise, duration, 'shop movement does not spend the disguise timer');
  leavePlace(s, back); const start = s.player.x;
  tick(s, .3, { x: 1 }); assert.ok(s.player.x > start);
  assert.ok(s.disguise > 0 && s.disguise < duration); assert.equal(s.refugePlayer, null);
});

for (const id of ['cloth', 'archive']) test(`${id} entry immediately brings distant and active escorts indoors`, () => {
  const s = createChase({ stage: id === 'archive' ? 1 : 0 });
  const place = PLACES.find(p => p.id === id);
  Object.assign(s.player, place);
  for (const [i, m] of s.team.entries()) Object.assign(m, {
    x: START.x, y: START.y, active: i === 0 ? 5 : 0, returning: i === 1,
    goal: { ...START }, targetId: s.agents[0].id, cooldown: 10,
  });
  assert.ok(enterPlace(s, id));
  assert.equal(s.indoor, id);
  for (const m of s.team) {
    assert.equal(m.active, 0); assert.equal(m.returning, false);
    assert.equal(m.targetId, null); assert.equal(m.cooldown, 10);
    assert.equal(m.x, s.player.x); assert.equal(m.y, s.player.y);
  }
  assert.equal(command(s, 'iria'), false);
  tick(s, 1);
  assert.equal(s.caught, false);
  assert.ok(s.team.every(m => !m.active && !m.returning));
  leavePlace(s);
  for (const m of s.team) assert.ok(Math.hypot(m.x - s.player.x, m.y - s.player.y) <= 130);
});

test('immediate building entry still requires reaching the doorway and obtaining the coat first', () => {
  const s = createChase();
  assert.equal(enterPlace(s, 'cloth'), false);
  Object.assign(s.player, PLACES[1]);
  assert.equal(enterPlace(s, 'archive'), false);
  assert.equal(s.indoor, null);
});

test('the coat must be taken from the wardrobe, not granted by entering or leaving the shop', () => {
  const s = createChase(); s.agents = [];
  assert.equal(collectDisguise(s), false);
  gather(s, PLACES[0]); assert.ok(enterPlace(s, 'cloth'));
  assert.equal(s.stage, 0); assert.equal(s.hasDisguise, false);
  assert.equal(changeDisguise(s), false); assert.equal(collectDisguise(s), false);
  leavePlace(s); gather(s, PLACES[1]);
  assert.equal(enterPlace(s, 'archive'), false);
  assert.equal(retryChase(s).hasDisguise, false);
  assert.deepEqual(retryChase(s).checkpoint, PLACES[0].back);
  gather(s, PLACES[0]); assert.ok(enterPlace(s, 'cloth'));
  tick(s, 1.2, { x: 1 }); tick(s, .35, { y: -1 });
  assert.ok(collectDisguise(s)); assert.equal(s.stage, 1);
  assert.equal(collectDisguise(s), false, 'the same coat cannot be taken twice');
  assert.ok(changeDisguise(s));
  const restored = createChase({ stage: s.stage });
  assert.ok(restored.hasDisguise, 'existing stage-based progress remains compatible');
  leavePlace(s); gather(s, PLACES[0]); enterPlace(s, 'cloth');
  assert.ok(s.hasDisguise); assert.equal(collectDisguise(s), false);
  leavePlace(s); gather(s, PLACES[1]); assert.ok(enterPlace(s, 'archive'));
  assert.equal(s.stage, 1);
  Object.assign(s.refugePlayer, { x: 541, y: 350 });
  assert.ok(collectPass(s)); assert.equal(s.stage, 2);
});


for (const id of ['cloth', 'archive']) test(`${id} has separate reachable north/back and south/front exits`, () => {
  const s = createChase({ stage: id === 'archive' ? 1 : 0 }); s.agents = [];
  const place = PLACES.find(p => p.id === id); gather(s, place); assert.ok(enterPlace(s, id));
  assert.equal(nearbyRefugeExit(s), undefined, 'entering the shop does not put the player at an exit');
  tick(s, 1, { y: -1 });
  assert.ok(s.refugePlayer.y > 312, 'the merchant and counter block a straight line through them');
  const walk = goal => {
    for (let i = 0; i < 200 && Math.hypot(s.refugePlayer.x - goal.x, s.refugePlayer.y - goal.y) > 5; i++) {
      stepChase(s, { x: goal.x - s.refugePlayer.x, y: goal.y - s.refugePlayer.y }, .03);
      assert.ok(refugeWalkable(s.refugePlayer.x, s.refugePlayer.y, id));
    }
    assert.ok(Math.hypot(s.refugePlayer.x - goal.x, s.refugePlayer.y - goal.y) <= 5);
  };
  walk({ x: 480, y: s.refugePlayer.y }); walk({ x: 480, y: 140 }); walk({ x: 384, y: 140 });
  assert.equal(nearbyRefugeExit(s)?.id, 'back');
  leavePlace(s, nearbyRefugeExit(s).back);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, place.back);
  assert.equal(s.player.dy, -1);
  gather(s, place); assert.ok(enterPlace(s, id));
  walk(REFUGE_EXITS.find(exit => exit.id === 'front'));
  assert.equal(nearbyRefugeExit(s)?.id, 'front');
  leavePlace(s, nearbyRefugeExit(s).back);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, { x: place.x, y: place.y + 35 });
  assert.equal(s.player.dy, 1); assert.equal(nearbyRefugeExit(s), undefined);
});

test('the indoor route keeps feet outside the walls and furniture', () => {
  for (const p of [{x:40,y:400},{x:384,y:80},{x:720,y:400},{x:384,y:550}, {x:384,y:220},{x:120,y:120},{x:600,y:260}]) {
    assert.equal(refugeWalkable(p.x,p.y,'cloth'),false);
  }
  for (const p of [{x:480,y:140},{x:480,y:240},{x:600,y:340},{x:384,y:128},{x:384,y:500}]) {
    assert.equal(refugeWalkable(p.x,p.y,'cloth'),true);
  }
});


test('restart protection and shield distraction prevent immediate contact capture', () => {
  for (const protection of ['grace', 'shield']) {
    const s = createChase(); gather(s, OPEN_STREET);
    s.agents = [s.agents[0]];
    Object.assign(s.agents[0], { x: s.player.x, y: s.player.y + 10, distracted: protection === 'shield' ? 2 : 0 });
    s.grace = protection === 'grace' ? 2 : 0;
    stepChase(s, {}, 1 / 60);
    assert.equal(s.caught, false, protection);
    s.grace = 0; s.agents[0].distracted = 0;
    stepChase(s, {}, 1 / 60);
    assert.equal(s.caught, true, protection);
  }
});


test('the final gate sits at the northern map edge with a reachable approach and guards', () => {
  const gate = PLACES.find(p => p.id === 'gate');
  assert.equal(gate.y - 15 - 205, 0, 'gate artwork starts at the map edge');
  assert.ok(lineClear({ x: gate.x, y: 432 }, gate));
  const s = createChase({ stage: 2 });
  const guards = s.agents.filter(a => a.role === 'gate');
  assert.equal(guards.length, 2);
  for (const guard of guards) {
    assert.equal(guard.y, gate.y);
    assert.ok(walkable(guard.x, guard.y));
  }
  s.agents = [];
  gather(s, { x: gate.x, y: 576 });
  assert.equal(enterPlace(s, 'gate'), false, 'old gate position is no longer an exit');
  gather(s, gate);
  assert.equal(enterPlace(s, 'gate'), true);
});

 test('the pass requires inspecting the desk and survives leaving and retrying', () => {
  const s = createChase({ stage: 1 }); s.agents = []; gather(s, PLACES[1]);
  assert.ok(enterPlace(s, 'archive')); assert.equal(s.stage, 1);
  assert.equal(collectPass(s), false);
  leavePlace(s); assert.equal(s.stage, 1);
  gather(s, PLACES[1]); assert.ok(enterPlace(s, 'archive'));
  tick(s, .9, { x: 1 }); tick(s, .3, { y: -1 });
  assert.ok(nearPassDocument(s)); assert.ok(collectPass(s));
  assert.equal(s.stage, 2); assert.equal(collectPass(s), false);
  leavePlace(s); assert.equal(retryChase(s).stage, 2);
});
