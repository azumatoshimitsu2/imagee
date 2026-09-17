import { check, clone, validTimestamp } from './validation.js';

export function localDate(value = new Date()) {
  const d = new Date(value);
  check(Number.isFinite(d.getTime()), 'Invalid date');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const selectedOption = answer => answer.snapshot.options.find(o => o.id === answer.optionId);
export const isAnswered = answer => Boolean(selectedOption(answer) && !selectedOption(answer).isNonAnswer);
export function currentAnswers(answers) {
  const replaced = new Set(answers.map(a => a.supersedesAnswerId).filter(Boolean));
  return answers.filter(a => !replaced.has(a.id));
}
export const distinctCount = state => currentAnswers(state.answers).filter(isAnswered).length;
export function createState(now = new Date().toISOString()) {
  check(validTimestamp(now), 'Invalid timestamp');
  return { schemaVersion: 1, answers: [], reflections: [], discoveries: [], dailyAssignments: [], analysisCache: null, meta: { firstVisit: now, lastVisit: now } };
}
export function appendAnswer(state, question, optionId, { now = new Date().toISOString(), date = localDate(now), id = globalThis.crypto.randomUUID(), source = 'archive', followUps = [], expectedPreviousId } = {}) {
  const option = question.options.find(o => o.id === optionId);
  check(option, 'Unknown answer option');
  check(validTimestamp(now), 'Invalid timestamp');
  const previous = currentAnswers(state.answers).find(a => a.questionId === question.id);
  if (expectedPreviousId !== undefined) check((previous?.id ?? null) === expectedPreviousId, 'Answer changed since it was opened');
  check(!state.answers.some(a => a.id === id), 'Duplicate answer id');
  const next = clone(state);
  const event = { id, questionId: question.id, questionVersion: question.version, optionId, answeredAt: now, localDate: date, source, supersedesAnswerId: previous?.id ?? null, snapshot: clone(question), weight: question.importance, derivedWeights: clone(option.weights), followUps: clone(followUps) };
  next.answers.push(event);
  if (source === 'daily') {
    const assignment = next.dailyAssignments.find(a => a.localDate === date);
    check(assignment?.questionId === question.id && assignment.questionVersion === question.version, 'Answer is not today’s assigned question');
    if (isAnswered(event) && !assignment.completedAnswerId) assignment.completedAnswerId = id;
  }
  next.analysisCache = null;
  next.meta.lastVisit = now;
  return next;
}
export function reviseAnswer(state, answerId, optionId, options = {}) {
  const answer = state.answers.find(a => a.id === answerId);
  check(answer && currentAnswers(state.answers).some(a => a.id === answerId), 'Only the current answer can be revised');
  return appendAnswer(state, answer.snapshot, optionId, { ...options, source: 'history_revision', expectedPreviousId: answer.id });
}
export function appendReason(state, answerId, followUp, optionId, options = {}) {
  const answer = currentAnswers(state.answers).find(a => a.id === answerId);
  check(answer && answer.snapshot.followUps.includes(followUp.id), 'Reason is not linked to this answer');
  check(followUp.kind === 'reason' && followUp.options.some(o => o.id === optionId), 'Invalid reason');
  check(isAnswered(answer), 'Cannot attach a reason to a non-answer');
  const now = options.now ?? new Date().toISOString();
  const followUps = answer.followUps.filter(f => f.id !== followUp.id);
  followUps.push({ id: followUp.id, version: followUp.version, optionId, answeredAt: now, snapshot: clone(followUp) });
  return appendAnswer(state, answer.snapshot, answer.optionId, { ...options, now, source: 'history_revision', followUps, expectedPreviousId: answer.id });
}
