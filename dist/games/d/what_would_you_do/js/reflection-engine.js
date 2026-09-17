import { check, clone, validTimestamp } from './validation.js';
import { distinctCount } from './answer-history.js';

export function appendReflection(state, followUp, text, { sourceAnswerId = null, parentReflectionId = null, now = new Date().toISOString(), id = globalThis.crypto.randomUUID() } = {}) {
  check(followUp.kind === 'free_text' && typeof text === 'string' && text.trim().length > 0 && [...text].length <= followUp.maxLength, 'Invalid reflection text');
  check(validTimestamp(now) && !state.reflections.some(r => r.id === id), 'Invalid reflection identity/date');
  const source = state.answers.find(a => a.id === sourceAnswerId);
  const parent = state.reflections.find(r => r.id === parentReflectionId);
  if (parentReflectionId) check(parent && followUp.trigger.event === 'reflection_return', 'Invalid reflection response');
  else {
    check(source && source.snapshot.followUps.includes(followUp.id), 'Reflection must be linked to an answered question');
    check(distinctCount(state) >= (followUp.trigger.minimumDistinctQuestions ?? 0), 'Reflection is not unlocked');
  }
  const next = clone(state);
  next.reflections.push({ id, followUpId: followUp.id, followUpVersion: followUp.version, sourceAnswerId, promptSnapshot: followUp.body, text, createdAt: now, distinctQuestionsAtCreation: distinctCount(state), parentReflectionId, returnPolicyId: followUp.returnPolicyId });
  next.meta.lastVisit = now;
  next.analysisCache = null;
  return next;
}
export function dueReflections(state, rule, now) {
  const count = distinctCount(state);
  return state.reflections.filter(r => {
    if (r.returnPolicyId !== rule.id) return false;
    if (rule.when.excludeAlreadyResponded && state.reflections.some(reply => reply.parentReflectionId === r.id)) return false;
    const elapsedDays = (Date.parse(now) - Date.parse(r.createdAt)) / 86400000;
    if (elapsedDays < 0) return false;
    return rule.when.any.some(condition => condition.elapsedDays !== undefined ? elapsedDays >= condition.elapsedDays : count - r.distinctQuestionsAtCreation >= condition.additionalDistinctQuestions);
  });
}
