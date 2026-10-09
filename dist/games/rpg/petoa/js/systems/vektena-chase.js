import { travelSpeed, disguiseDuration } from '../data/barter-shop.js';
import { TILE, MAP, START, BUILDINGS, PLACES, MARKETS, CIVILIANS, AGENTS, DISGUISE_WARDROBE, PASS_DOCUMENT, REFUGE_EXITS, REFUGE_BLOCKERS, at } from '../data/vektena-chase.js';
import { isCanalWater } from '../data/bazaar-city.js';
import { ROLE_STATS, MEMBER_NAMES, validRoles } from '../data/chase-roles.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const WALK_SPEED = 178;
export const ENEMY_CHASE_SPEED = WALK_SPEED;
const inside = (p, r) => p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h;
export function walkable(x, y, radius = 12) {
  if (x < 72 || y < 72 || x > MAP.width - 72 || y > MAP.height - 72) return false;
  if (isCanalWater(x, y) || isCanalWater(x - radius, y) || isCanalWater(x + radius, y)) return false;
  return !BUILDINGS.some(b => x + radius > b.x * TILE && x - radius < (b.x + b.w) * TILE && y + radius > b.y * TILE && y - radius < (b.y + b.h) * TILE);
}
export function lineClear(a, b) {
  const count = Math.ceil(distance(a, b) / 20);
  for (let i = 0; i <= count; i++) {
    const t = count ? i / count : 0;
    if (!walkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 0)) return false;
  }
  return true;
}
const index = p => Math.floor(p.y / TILE) * MAP.columns + Math.floor(p.x / TILE);
export function findPath(from, to) {
  const start = index(from), end = index(to), size = MAP.columns * MAP.rows;
  if (!walkable(to.x, to.y, 0) || start < 0 || start >= size || end < 0 || end >= size) return [];
  if (start === end) return [{ ...to }];
  const prev = new Int32Array(size).fill(-1), queue = new Int32Array(size);
  let head = 0, tail = 1; queue[0] = start; prev[start] = start;
  while (head < tail && prev[end] === -1) {
    const n = queue[head++], x = n % MAP.columns, y = Math.floor(n / MAP.columns);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 1 || ny < 1 || nx >= MAP.columns - 1 || ny >= MAP.rows - 1) continue;
      const next = ny * MAP.columns + nx, p = at(nx, ny);
      if (prev[next] !== -1 || !walkable(p.x, p.y, 14)) continue;
      // Leave clearance for the moving body's radius, including narrow props.
      const from = at(x, y);
      if (![0, .25, .5, .75, 1].every(t => walkable(from.x + (p.x - from.x) * t, from.y + (p.y - from.y) * t, 14))) continue;
      prev[next] = n; queue[tail++] = next;
    }
  }
  if (prev[end] === -1) return [];
  const result = [];
  for (let n = end; n !== start; n = prev[n]) result.push(at(n % MAP.columns, Math.floor(n / MAP.columns)));
  result.reverse();
  // Center the start cell before turning: actors must not clip corners.
  return [at(start % MAP.columns, Math.floor(start / MAP.columns)), ...result, { ...to }];
}
const actor = spec => ({ ...spec, home: { x: spec.x, y: spec.y }, path: [], navWait: 0, dx: 0, dy: 1, memory: 0, distracted: 0, routeIndex: 0, pause: 0 });
export function createChase(saved = {}) {
  const stage = Math.max(0, Math.min(2, saved.stage ?? 0));
  const checkpoint = stage ? PLACES[stage - 1].back : START;
  const agents = AGENTS.map(actor);
  // A visible pursuer is already on our trail when the merchant hall door opens.
  if (stage === 0) Object.assign(agents[0], {
    x: START.x, y: START.y + 180, dx: 0, dy: -1, role: 'pursuit',
    memory: 10, lastSeen: { ...START },
  });
  return {
    rolesReady: !!validRoles(saved.roles), equipment: [...(saved.equipment ?? [])],
    autonomous: saved.autonomous !== false, teamThink: 0,
    player: { ...checkpoint, dx: 0, dy: -1 }, stage, checkpoint: { ...checkpoint }, time: 0,
    alert: 0, caught: false, complete: !!saved.complete, indoor: null, disguise: 0, disguiseCooldown: 0,
    hasDisguise: stage >= 1, grace: 3, moving: false, running: false,
    trail: [{ x: checkpoint.x - 92, y: checkpoint.y }, { ...checkpoint }], civilians: CIVILIANS.map(actor), agents,
    team: ['mados', 'iria'].map((id, i) => ({ ...actor({ id, x: checkpoint.x - (i + 1) * 46, y: checkpoint.y }), role: validRoles(saved.roles) ? saved.roles[id] : null, cooldown: 0, active: 0, returning: false, offset: (i + 1) * 46 })),
    uses: { mados: 0, iria: 0, disguise: 0 }, message: '', messageTime: 0,
  };
}
export function assignRoles(state, shieldId) {
  if (state.rolesReady || state.complete || !['mados', 'iria'].includes(shieldId)) return false;
  for (const member of state.team) member.role = member.id === shieldId ? 'shield' : 'lure';
  state.rolesReady = true;
  say(state, '役割決定！ 二人は敵を見て自動で行動する。チャトアを動かして、西の布店へ逃げよう。');
  return true;
}
export function say(state, text) { state.message = text; state.messageTime = 5; }
function move(actor, target, speed, dt) {
  actor.navWait -= dt;
  const samples = Math.max(1, Math.ceil(distance(actor, target) / 12));
  const direct = Array.from({ length: samples + 1 }, (_, i) => i / samples)
    .every(t => walkable(actor.x + (target.x - actor.x) * t, actor.y + (target.y - actor.y) * t, 8));
  if (direct) { actor.path = [{ ...target }]; actor.destination = { ...target }; actor.navWait = .7; }
  const changed = actor.destination == null || distance(actor.destination, target) > 45;
  if (actor.navWait <= 0 && (changed || !actor.path.length)) {
    actor.path = findPath(actor, target); actor.destination = { ...target }; actor.navWait = .7;
  }
  let budget = speed * dt;
  while (actor.path.length && budget > 0) {
    const p = actor.path[0], d = distance(actor, p);
    if (d < .5) { actor.path.shift(); continue; }
    const step = Math.min(budget, d), dx = (p.x - actor.x) / d, dy = (p.y - actor.y) / d;
    const x = actor.x + dx * step, y = actor.y + dy * step;
    if (!walkable(x, y, 6)) { actor.path = []; actor.navWait = 0; break; }
    actor.x = x; actor.y = y; actor.dx = dx; actor.dy = dy; budget -= step;
    if (step === d) actor.path.shift();
  }
}
export function inMarket(p) { return MARKETS.some(r => inside(p, r)); }
export function seenBy(agent, p, range = 320) {
  const d = distance(agent, p);
  if (d > range || !lineClear(agent, p)) return false;
  return d < 90 || (agent.dx * (p.x - agent.x) + agent.dy * (p.y - agent.y)) / (d || 1) > -.2;
}
function trailTarget(state, offset) {
  for (let i = state.trail.length - 1; i > 0; i--) {
    const a = state.trail[i], b = state.trail[i - 1], d = distance(a, b);
    if (d >= offset) return { x: a.x + (b.x - a.x) * offset / d, y: a.y + (b.y - a.y) * offset / d };
    offset -= d;
  }
  return state.trail[0];
}
function lureGoal(state, member) {
  const p = state.player, objective = PLACES[Math.min(state.stage, 2)];
  const candidates = [];
  for (const radius of [144, 216]) for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, point = { x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius };
    if (!walkable(point.x, point.y) || !lineClear(member, point)) continue;
    // Draw pursuit away from the player's movement and the next safe doorway.
    const forward = (point.x - p.x) * p.dx + (point.y - p.y) * p.dy;
    candidates.push({ point, score: distance(point, objective) - forward * .7 + radius * .3 });
  }
  return candidates.sort((a, b) => b.score - a.score)[0]?.point;
}

export function command(state, id, automatic = false) {
  if (!state.rolesReady || state.caught || state.complete || state.indoor) return false;
  if (automatic && state.stage >= 2) return false;
  const member = state.team.find(m => m.id === id);
  if (!member || member.cooldown > 0 || member.active > 0 || member.returning) { say(state, 'まだ合流・準備中だ。少し待とう。'); return false; }
  const stats = ROLE_STATS[id][member.role], name = MEMBER_NAMES[id];
  if (member.role === 'lure') {
    const p = state.player;
    const directions = [[-p.dy, p.dx], [p.dy, -p.dx], [-p.dx, -p.dy]];
    let goal = lureGoal(state, member);
    for (const [dx, dy] of directions) {
      if (goal) break;
      const candidate = { x: p.x + dx * 144, y: p.y + dy * 144 };
      if (walkable(candidate.x, candidate.y) && lineClear(p, candidate)) { goal = candidate; break; }
    }
    if (!goal) { say(state, `${name}「ここは狭い。広い道で引きつけよう！」`); return false; }
    member.goal = goal; member.targetId = null;
    say(state, `${name}が囮になった！ 敵を引きつけている間に角を曲がろう。`);
  } else {
    const p = state.player;
    const lure = state.team.find(m => m.role === 'lure');
    const candidates = state.agents.filter(a => !a.lured && !(a.diverted > 0) && !(lure.active && lure.targetId === a.id) && distance(a, p) < 240 && lineClear(a, p));
    candidates.sort((a, b) => {
      const score = a => distance(a, p) - 100 * ((a.x - p.x) * p.dx + (a.y - p.y) * p.dy) / (distance(a, p) || 1);
      return score(a) - score(b);
    });
    const target = candidates[0];
    if (!target) { say(state, `${name}「止める敵が近くにいない。近づいてきたら任せて！」`); return false; }
    member.goal = { x: target.x, y: target.y }; member.blockedIds = []; member.targetId = target.id;
    say(state, `${name}が盾になって敵の前へ！ 最大${stats.capacity}人を止める間に逃げよう。`);
  }
  member.active = stats.duration; member.cooldown = stats.cooldown; member.automatic = automatic;
  member.path = []; member.navWait = 0; state.uses[id]++; return true;
}

function thinkTeam(state, dt) {
  // Keep the party together for the final gate; abilities require a command.
  if (state.stage >= 2) {
    for (const member of state.team) if (member.active && member.automatic) {
      member.active = 0; member.returning = true; member.path = []; member.navWait = 0;
    }
    return;
  }
  if (!state.autonomous || state.indoor) return;
  state.teamThink -= dt;
  if (state.teamThink > 0) return;
  state.teamThink = .25;
  const p = state.player;
  const threats = state.agents.filter(a => !a.distracted && !a.lured && !(a.diverted > 0) && distance(a, p) < 420 && lineClear(a, p)
    && (!state.disguise || a.memory > 0 || seenBy(a, p, 85)));
  const atDoor = nearbyPlace(state);
  // Once a doorway is safe, regroup instead of repeatedly leaving the party.
  if (atDoor && !threats.some(a => distance(a, p) < 180)) {
    for (const member of state.team) if (member.active && member.automatic) {
      member.active = 0; member.returning = true; member.path = []; member.navWait = 0;
    }
    return;
  }
  const shield = state.team.find(m => m.role === 'shield');
  const lure = state.team.find(m => m.role === 'lure');
  const ready = m => !m.active && !m.returning && !m.cooldown && distance(m, p) < 240;
  if (ready(shield) && threats.some(a => distance(a, p) < 180)) command(state, shield.id, true);
  if (ready(lure) && threats.some(a => !(shield.active && a.id === shield.targetId))) command(state, lure.id, true);
  for (const member of state.team) {
    if (!member.active || !member.automatic) continue;
    if (member.role === 'shield') {
      const target = state.agents.find(a => a.id === member.targetId);
      if (target && !target.distracted && distance(target, p) < 300 && lineClear(member, target)) {
        const d = distance(target, p) || 1;
        const intercept = { x: target.x + (p.x - target.x) / d * 35, y: target.y + (p.y - target.y) / d * 35 };
        if (walkable(intercept.x, intercept.y)) member.goal = intercept;
      }
    } else if (distance(member, member.goal) < 35 || distance(member, p) > 320) {
      const goal = lureGoal(state, member);
      if (goal) member.goal = goal;
    }
  }
}
export function nearDisguiseWardrobe(state) {
  return state.indoor === 'cloth' && !!state.refugePlayer && distance(state.refugePlayer, DISGUISE_WARDROBE) <= DISGUISE_WARDROBE.reach;
}
export function nearPassDocument(state) {
  return state.indoor === 'archive' && !!state.refugePlayer && distance(state.refugePlayer, PASS_DOCUMENT) <= PASS_DOCUMENT.reach;
}
export function collectPass(state) {
  if (!state.rolesReady || state.caught || state.complete || state.stage !== 1 || !nearPassDocument(state)) return false;
  state.stage = 2;
  say(state, '机の上から通用門の通行証を取った。三人で北東の通用門へ向かおう。');
  return true;
}
export function collectDisguise(state) {
  if (!state.rolesReady || state.caught || state.complete || state.hasDisguise || !nearDisguiseWardrobe(state)) return false;
  state.hasDisguise = true;
  state.stage = Math.max(state.stage, 1);
  say(state, 'タンスから変装用の上着を取った。Rで着替えられる。図鑑の「持ち物」で使い方を読み返せる。');
  return true;
}
export function changeDisguise(state) {
  if (!state.rolesReady) return false;
  if (!state.hasDisguise) { say(state, 'まずは西の布店のタンスを調べて、変装用の上着を取ろう。'); return false; }
  if (state.disguiseCooldown > 0 || state.caught || state.complete) return false;
  if (!state.indoor && state.agents.some(a => !a.distracted && seenBy(a, state.player, 260))) {
    say(state, '人目がある。店の中や建物の陰で着替えよう。'); return false;
  }
  state.disguise = disguiseDuration(state.equipment); state.disguiseCooldown = 30; state.alert = Math.max(0, state.alert - 35); state.uses.disguise++;
  say(state, '上着を替えた。距離を取って歩けば気づかれにくい。'); return true;
}
export function nearbyPlace(state) {
  return PLACES.filter(p => distance(state.player, p) < 85).sort((a, b) => distance(state.player, a) - distance(state.player, b))[0];
}
export function enterPlace(state, id) {
  if (!state.rolesReady || state.caught || state.complete || state.indoor) return false;
  const place = PLACES.find(p => p.id === id);
  if (!place || distance(state.player, place) > 85) return false;
  if (id === 'archive' && state.stage === 0) { say(state, '商人「まず西の布店へ。顔を覚えられる前に、着替えを用意しておいで」'); return false; }
  if (id === 'gate') {
    if (state.team.some(m => m.active > 0 || m.returning || distance(m, state.player) > 130)) {
      say(state, '二人と合流してから門を通ろう。'); return false;
    }
    if (state.stage < 2) { say(state, '先に交易商の連絡所で通行証を受け取ろう。'); return false; }
    const watched = state.agents.some(a => !a.distracted && !a.lured && seenBy(a, state.player, state.disguise ? 85 : 220));
    if (state.alert > 24 || watched) { say(state, 'まだ後を見られている。二人の助けで視線を外し、落ち着いてから門へ。'); return false; }
    state.complete = true; say(state, '三人で包囲を突破した。ユアテアへの道が開いた。'); return true;
  }
  // Bring both escorts indoors immediately, including those still using an ability.
  state.trail = [{ x: state.player.x, y: state.player.y }];
  for (const member of state.team) {
    Object.assign(member, { x: state.player.x, y: state.player.y, active: 0, returning: false,
      targetId: null, goal: null, blockedIds: [], path: [], navWait: 0, automatic: false });
  }
  state.refugePlayer = { x: 384, y: 400, dx: 0, dy: -1 };
  state.indoor = id; state.alert = Math.max(0, state.alert - 25);
  for (const agent of state.agents) if (distance(agent, place) < 450) { agent.waitAt = { x: place.x, y: place.y + 110 }; agent.memory = 10; }
  state.checkpoint = { ...place.back };
  say(state, id === 'cloth' ? state.hasDisguise
    ? '商人「その上着を使って。裏口なら、通りで待つ人に見られず出られるよ」'
    : '商人「右手のタンスに上着がある。近づいて調べて、自分で取っておいで」'
    : state.stage >= 2 ? '商人「通行証は持っているね。北東の通用門へ向かおう」' : '商人「通行証は机の上だ。近づいて調べて、持っていってくれ」');
  return true;
}
export function nearbyRefugeExit(state) {
  if (!state.indoor || !state.refugePlayer) return undefined;
  return REFUGE_EXITS.find(exit => distance(state.refugePlayer, exit) <= exit.reach);
}
export function refugeWalkable(x, y, place) {
  return x >= 64 && x <= 704 && y >= 120 && y <= 512 && !REFUGE_BLOCKERS.some(b =>
    (!b.place || b.place === place) && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom);
}
export function leavePlace(state, back = true) {
  if (!state.indoor) return;
  const place = PLACES.find(p => p.id === state.indoor), p = back ? place.back : { x: place.x, y: place.y + 35 };
  state.indoor = null; state.refugePlayer = null; Object.assign(state.player, p, { dx: 0, dy: back ? -1 : 1 }); state.trail = [{ x: p.x - 92, y: p.y }, { ...p }]; state.grace = 2;
  for (const m of state.team) { Object.assign(m, { x: p.x - m.offset, y: p.y }); m.path = []; m.active = 0; m.returning = false; }
}
export function retryChase(state) {
  const next = createChase({ stage: state.stage, equipment: state.equipment, autonomous: state.autonomous, roles: Object.fromEntries(state.team.map(m => [m.id, m.role])) }); next.uses = { ...state.uses };
  // Visiting the shop is a refuge even if its coat has not been picked up yet.
  const p = state.checkpoint;
  next.checkpoint = { ...p }; Object.assign(next.player, p);
  next.trail = [{ x: p.x - 92, y: p.y }, { ...p }];
  for (const member of next.team) Object.assign(member, { x: p.x - member.offset, y: p.y });
  say(next, '二人の助けで逃れた。最後に助けてもらった商人の裏口から、やり直そう。');
  return next;
}
export function stepChase(state, input, seconds) {
  if (!state.rolesReady || state.caught || state.complete) return;
  const dt = Math.min(.05, Math.max(0, seconds)); state.time += dt;
  state.messageTime = Math.max(0, state.messageTime - dt); state.grace = Math.max(0, state.grace - dt);
  if (!state.indoor) state.disguise = Math.max(0, state.disguise - dt);
  state.disguiseCooldown = Math.max(0, state.disguiseCooldown - dt);
  for (const member of state.team) member.cooldown = Math.max(0, member.cooldown - dt);
  const p = state.player, dx = input.x || 0, dy = input.y || 0, length = Math.hypot(dx, dy) || 1;
  const before = { x: p.x, y: p.y }; state.running = false;
  if (state.indoor && state.refugePlayer) {
    const r = state.refugePlayer;
    if (dx || dy) { r.dx = dx / length; r.dy = dy / length; }
    // Shop-floor movement uses separate coordinates from the street checkpoint.
    const canStand = (x, y) => refugeWalkable(x, y, state.indoor);
    const x = r.x + dx / length * travelSpeed(WALK_SPEED, state.equipment) * dt, y = r.y + dy / length * travelSpeed(WALK_SPEED, state.equipment) * dt;
    if (canStand(x, r.y)) r.x = x;
    if (canStand(r.x, y)) r.y = y;
  }
  if (!state.indoor) {
    if (dx || dy) { p.dx = dx / length; p.dy = dy / length; }
    const speed = travelSpeed(WALK_SPEED, state.equipment);
    const x = p.x + dx / length * speed * dt, y = p.y + dy / length * speed * dt;
    if (walkable(x, p.y)) p.x = x;
    if (walkable(p.x, y)) p.y = y;
  }
  state.moving = distance(before, p) > .1;
  thinkTeam(state, dt);
  if (distance(state.trail.at(-1), p) > 3) { state.trail.push({ x: p.x, y: p.y }); if (state.trail.length > 200) state.trail.shift(); }
  for (const member of state.team) {
    const stats = ROLE_STATS[member.id][member.role];
    if (member.active > 0) {
      member.active = Math.max(0, member.active - dt); move(member, member.goal, stats.speed, dt);
      if (member.role === 'shield' && member.active > 0) {
        const nearby = state.agents.filter(a => a.id === member.targetId && distance(a, member) <= stats.radius && lineClear(a, member));
        for (const agent of nearby) {
          if (!member.blockedIds.includes(agent.id) && member.blockedIds.length < stats.capacity) member.blockedIds.push(agent.id);
          if (member.blockedIds.includes(agent.id)) { agent.distracted = stats.linger; agent.memory = 0; }
        }
      }
      if (!member.active) { member.returning = true; member.path = []; member.navWait = 0; }
    } else if (member.returning) {
      move(member, p, stats.returnSpeed, dt);
      if (distance(member, p) < 50) { member.returning = false; member.path = []; }
    } else {
      const target = trailTarget(state, member.offset);
      move(member, target, 290, dt);
    }
  }
  // Crossing into the gate is an exit, even if pursuers still see the party.
  // Check before enemy movement/contact so crossing cannot be undone that frame.
  const gate = PLACES.find(place => place.id === 'gate');
  if (!state.indoor && state.stage >= 2 && Math.abs(p.x - gate.x) <= 85 && p.y <= gate.y - 15) {
    state.complete = true;
    say(state, '三人で通用門を通り抜け、ベクテーナへ向かった。');
    return;
  }
  for (const citizen of state.civilians) {
    citizen.distracted = Math.max(0, citizen.distracted - dt);
    if (citizen.distracted) continue;
    citizen.pause = Math.max(0, citizen.pause - dt);
    if (citizen.pause) continue;
    const target = citizen.route[citizen.routeIndex];
    move(citizen, target, 60 + Number(citizen.id.split('-')[1]) % 4 * 8, dt);
    if (distance(citizen, target) < 10) { citizen.routeIndex = (citizen.routeIndex + 1) % citizen.route.length; citizen.pause = 1.5; }
  }
  let witnesses = 0, closest = Infinity;
  const decoy = state.team.find(m => m.role === 'lure'), lureStats = ROLE_STATS[decoy.id].lure;
  // Lock one target for the entire action; crossing another spy never spreads the effect.
  if (decoy.active > 0 && !decoy.targetId) {
    const shield = state.team.find(m => m.role === 'shield');
    const target = state.agents.filter(a => !a.distracted && !(shield.active && shield.targetId === a.id)
      && distance(a, decoy) < lureStats.radius && lineClear(a, decoy))
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (target) decoy.targetId = target.id;
  }
  for (const agent of state.agents) {
    agent.distracted = Math.max(0, agent.distracted - dt); agent.memory = Math.max(0, agent.memory - dt); agent.lured = false;
    if (agent.distracted) continue;
    if (decoy.active > 0 && agent.id === decoy.targetId && distance(agent, decoy) < lureStats.radius && lineClear(agent, decoy)) {
      agent.lured = true; agent.memory = 0; agent.diverted = lureStats.linger; agent.diversion = { ...decoy.goal };
      if (distance(agent, decoy) > 65) move(agent, decoy, 165, dt);
      continue;
    }
    if (agent.diverted > 0) {
      agent.diverted = Math.max(0, agent.diverted - dt); agent.lured = true;
      move(agent, agent.diversion, 125, dt);
      continue;
    }
    if (state.indoor) {
      if (agent.waitAt) move(agent, agent.waitAt, 125, dt);
      else move(agent, agent.home, 75, dt);
      continue;
    }
    const range = state.disguise > 0 ? 85 : inMarket(p) ? 140 : state.running ? 410 : 310;
    const sees = seenBy(agent, p, range);
    if (sees) { agent.memory = state.stage >= 2 ? 8 : 4; agent.lastSeen = { x: p.x, y: p.y }; agent.waitAt = null; witnesses++; closest = Math.min(closest, distance(agent, p)); }
    if (agent.memory > 0 && agent.lastSeen) {
      let target = agent.lastSeen;
      if (state.stage > 0 && agent.role === 'block' && sees) {
        const ahead = { x: p.x + p.dx * 155, y: p.y + p.dy * 155 };
        if (walkable(ahead.x, ahead.y)) target = ahead;
      }
      // Early tailing pauses a moment after the player does; later agents converge.
      if (sees && state.alert < 40 && !['gate', 'pursuit'].includes(agent.role) && distance(agent, p) < 165) {
        agent.pause += dt;
        if (state.moving) agent.pause = 0;
        if (agent.pause > .7 || distance(agent, p) < 130) continue;
      }
      move(agent, target, state.alert > 60 ? ENEMY_CHASE_SPEED : 148, dt);
    } else {
      const patrol = agent.role === 'gate' ? agent.home : { x: agent.home.x, y: agent.home.y + (Math.floor(state.time / 6) % 2 ? 72 : 0) };
      move(agent, patrol, 92, dt);
    }
  }
  // Relay information only when two agents meet; the interaction has no enemy UI marker.
  if (state.stage > 0) for (const a of state.agents) {
    if (a.memory < 2 || !a.lastSeen || a.distracted || a.lured) continue;
    for (const b of state.agents) if (b !== a && b.memory <= 0 && distance(a, b) < 100 && lineClear(a, b)) {
      b.lastSeen = { ...a.lastSeen }; b.memory = 5;
    }
  }
  if (state.indoor) { state.alert = Math.max(0, state.alert - 18 * dt); return; }
  const gain = witnesses ? (closest < 85 ? 23 : 3) + Math.max(0, witnesses - 1) * 5 + (state.running ? 7 : 0) : -14;
  state.alert = Math.max(0, Math.min(100, state.alert + gain * dt));
  const near = state.agents.some(a => !a.distracted && !a.lured && distance(a, p) < 34 && lineClear(a, p));
  // Contact captures immediately; keep protection just after restarting or leaving a refuge.
  if (near && !state.grace) state.caught = true;
  if (!state.caught && state.stage >= 2 && nearbyPlace(state)?.id === 'gate') enterPlace(state, 'gate');
}
