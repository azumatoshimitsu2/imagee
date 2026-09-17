import { check, clone, validTimestamp } from './validation.js';

// Manual conversations are separate from scored answers and scheduled reflections.
export function appendDialogue(state, definition, { sourceType, sourceId, stanceId, text = '', now = new Date().toISOString(), id = globalThis.crypto.randomUUID() }) {
  check(['answer', 'reflection'].includes(sourceType), 'Invalid dialogue source type');
  const source = (sourceType === 'answer' ? state.answers : state.reflections).find(item => item.id === sourceId);
  check(source, 'Missing dialogue source');
  const stance = definition.options.find(option => option.id === stanceId);
  check(stance, 'Invalid dialogue stance');
  check(typeof text === 'string' && text.length <= definition.maxLength, 'Invalid dialogue text');
  check(validTimestamp(now) && Date.parse(now) >= Date.parse(source.answeredAt ?? source.createdAt), 'Invalid dialogue timestamp');
  check(typeof id === 'string' && id.length > 0 && !(state.dialogues ?? []).some(item => item.id === id), 'Duplicate dialogue id');
  const next = clone(state);
  next.dialogues ??= [];
  next.dialogues.push({ id, sourceType, sourceId, definitionVersion: definition.version, stanceId,
    stanceLabelSnapshot: stance.label, promptSnapshot: definition.prompt, text, createdAt: now });
  return next;
}

export function pastRecords(state) {
  return [
    ...state.answers.map(a => ({ type: 'answer', id: a.id, at: a.answeredAt, title: a.snapshot.title, body: a.snapshot.body,
      text: a.snapshot.options.find(o => o.id === a.optionId)?.label ?? '', answer: a })),
    ...state.reflections.map(r => ({ type: 'reflection', id: r.id, at: r.createdAt, title: r.promptSnapshot, text: r.text })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
