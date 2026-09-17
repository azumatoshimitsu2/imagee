import { appendAnswer, currentAnswers } from './answer-history.js';
import { check, clone, validTimestamp } from './validation.js';

export function reevaluationChoices(state) {
  return currentAnswers(state.answers).sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
}

export function appendReevaluation(state, definition, { previousAnswerId, optionId, reason = '', now = new Date().toISOString(), id = globalThis.crypto.randomUUID(), answerId = globalThis.crypto.randomUUID() }) {
  const previous = reevaluationChoices(state).find(a => a.id === previousAnswerId);
  check(previous, 'Reevaluation answer changed since opening');
  check(typeof reason === 'string' && reason.length <= definition.maxLength, 'Invalid reevaluation reason');
  check(validTimestamp(now) && Date.parse(now) >= Date.parse(previous.answeredAt), 'Invalid reevaluation timestamp');
  check(typeof id === 'string' && id.length > 0 && !(state.reevaluations ?? []).some(r => r.id === id), 'Duplicate reevaluation id');
  const next = appendAnswer(state, previous.snapshot, optionId, { id: answerId, now, source: 'reevaluation', expectedPreviousId: previous.id });
  next.reevaluations ??= [];
  next.reevaluations.push({ id, previousAnswerId, answerId, reason, reasonPromptSnapshot: definition.reasonPrompt, createdAt: now });
  return next;
}

export function appendReevaluationNote(state, definition, { reevaluationId, stanceId, text = '', now = new Date().toISOString(), id = globalThis.crypto.randomUUID() }) {
  const entry = (state.reevaluations ?? []).find(r => r.id === reevaluationId);
  check(entry, 'Missing reevaluation');
  const stance = definition.options.find(o => o.id === stanceId);
  check(stance, 'Unknown reevaluation stance');
  check(typeof text === 'string' && text.length <= definition.maxLength, 'Invalid reevaluation note');
  check(validTimestamp(now) && Date.parse(now) >= Date.parse(entry.createdAt), 'Invalid reevaluation note timestamp');
  check(typeof id === 'string' && id.length > 0 && !(state.reevaluationNotes ?? []).some(r => r.id === id), 'Duplicate reevaluation note id');
  const next = clone(state);
  next.reevaluationNotes ??= [];
  next.reevaluationNotes.push({ id, reevaluationId, definitionVersion: definition.version, promptSnapshot: definition.prompt,
    stanceId, stanceLabelSnapshot: stance.label, text, createdAt: now });
  return next;
}

export const reevaluationReason = (state, answerId) => (state.reevaluations ?? []).find(r => r.answerId === answerId)?.reason ?? '';
