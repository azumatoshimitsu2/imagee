import { currentAnswers, localDate } from './answer-history.js';
import { comparisonRecords } from './comparison-engine.js';
import { wordThreads } from './word-engine.js';
import { check, clone, validTimestamp } from './validation.js';

const keyFor = (kind, targetId) => JSON.stringify([kind, targetId]);
const dayDistance = (a, b) => (Date.parse(a) - Date.parse(b)) / 86400000;

export function reflectionCandidates(state, catalog, now = new Date().toISOString()) {
  check(validTimestamp(now), 'Invalid suggestion time');
  const policy = catalog.settings.dailyReflection;
  if (!policy.enabled) return [];
  const date = localDate(now), items = [];
  const add = item => {
    if (policy.typeOrder.includes(item.kind) && dayDistance(date, localDate(item.recordedAt)) >= policy.minimumAgeDays && Date.parse(item.recordedAt) <= Date.parse(now)) items.push({ ...item, key: keyFor(item.kind, item.targetId) });
  };
  for (const a of currentAnswers(state.answers)) add({ kind: 'reevaluation', targetId: a.id, title: a.snapshot.title, recordedAt: a.answeredAt, answerIds: [a.id], reflectionIds: [] });
  for (const thread of wordThreads(state)) add({ kind: 'words', targetId: thread.id, title: thread.prompt, recordedAt: thread.entries.at(-1).at, answerIds: [], reflectionIds: [thread.id] });
  for (const c of comparisonRecords(state, catalog)) {
    if ((state.comparisons ?? []).some(r => r.comparison.id === c.id)) continue;
    const answers = c.answerIds.map(id => state.answers.find(a => a.id === id));
    add({ kind: 'comparison', targetId: c.id, title: answers.map(a => a.snapshot.title).join(' と '), recordedAt: answers.map(a => a.answeredAt).sort((a,b) => Date.parse(b)-Date.parse(a))[0], answerIds: [...c.answerIds], reflectionIds: [] });
  }
  return items.sort((a, b) => policy.typeOrder.indexOf(a.kind) - policy.typeOrder.indexOf(b.kind) || Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.key.localeCompare(b.key));
}

export function assignDailyReflections(state, catalog, { now = new Date().toISOString(), makeId = () => globalThis.crypto.randomUUID() } = {}) {
  check(validTimestamp(now), 'Invalid suggestion time');
  const policy = catalog.settings.dailyReflection, date = localDate(now);
  const next = clone(state);
  // Once today's offer is made, never replace it with a new one after dismissal or completion.
  if (!policy.enabled || (state.dailyReflections ?? []).some(r => r.localDate === date)) return next;
  const candidates = reflectionCandidates(state, catalog, now).filter(c => !(state.dailyReflections ?? []).some(r => r.key === c.key && dayDistance(date, r.localDate) < policy.repeatAfterDays));
  for (const c of candidates.slice(0, policy.limitPerDay)) {
    next.dailyReflections ??= [];
    const id = makeId();
    check(typeof id === 'string' && id.length > 0 && !next.dailyReflections.some(r => r.id === id), 'Duplicate suggestion id');
    next.dailyReflections.push({ id, localDate: date, ...c, createdAt: now });
  }
  return next;
}

export function dailyReflectionCards(state, catalog, now = new Date().toISOString()) {
  if (!catalog.settings.dailyReflection.enabled) return [];
  const candidates = reflectionCandidates(state, catalog, now);
  return (state.dailyReflections ?? []).filter(r => r.localDate === localDate(now)).map(r => {
    const actions = (state.dailyReflectionActions ?? []).filter(a => a.suggestionId === r.id);
    const status = actions.some(a => a.action === 'dismissed') ? 'dismissed' : !candidates.some(c => c.key === r.key) ? 'updated' : 'available';
    return { ...r, status, opened: actions.some(a => a.action === 'opened'),
      href: r.kind === 'reevaluation' ? `#revisit?answer=${encodeURIComponent(r.targetId)}` : r.kind === 'words' ? `#words?id=${encodeURIComponent(r.targetId)}` : `#compare?id=${encodeURIComponent(r.targetId)}` };
  });
}

export function recordDailyReflectionAction(state, catalog, suggestionId, action, { now = new Date().toISOString(), id = globalThis.crypto.randomUUID() } = {}) {
  check(['opened','dismissed'].includes(action), 'Invalid daily reflection action');
  const card = dailyReflectionCards(state, catalog, now).find(r => r.id === suggestionId);
  check(card?.status === 'available', 'Daily reflection is no longer available');
  const next = clone(state);
  if ((next.dailyReflectionActions ?? []).some(a => a.suggestionId === suggestionId && a.action === action)) return next;
  next.dailyReflectionActions ??= [];
  check(typeof id === 'string' && id.length > 0 && !next.dailyReflectionActions.some(a => a.id === id), 'Duplicate suggestion action id');
  next.dailyReflectionActions.push({ id, suggestionId, action, createdAt: now });
  return next;
}
