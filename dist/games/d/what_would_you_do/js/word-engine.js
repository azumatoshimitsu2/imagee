import { check, clone, validTimestamp } from './validation.js';

// Group only identical, versioned prompts. Never infer similarity from prose.
export function wordThreads(state) {
  const reflections = new Map(state.reflections.map(r => [r.id, r]));
  const groups = new Map(), rootGroups = new Map();
  for (const r of state.reflections.filter(r => r.parentReflectionId === null)) {
    const key = JSON.stringify([r.followUpId, r.followUpVersion, r.promptSnapshot]);
    if (!groups.has(key)) groups.set(key, { id: r.id, prompt: r.promptSnapshot, version: r.followUpVersion, roots: [], entries: [] });
    const group = groups.get(key);
    group.roots.push(r.id); rootGroups.set(r.id, group);
  }
  const groupFor = id => {
    let pointer = reflections.get(id);
    const seen = new Set();
    while (pointer?.parentReflectionId) {
      if (seen.has(pointer.id)) return null;
      seen.add(pointer.id); pointer = reflections.get(pointer.parentReflectionId);
    }
    return pointer ? rootGroups.get(pointer.id) : null;
  };
  for (const r of state.reflections) groupFor(r.id)?.entries.push({ id: `reflection:${r.id}`, at: r.createdAt, label: r.parentReflectionId ? '読み返したときの言葉' : '書き残した言葉', text: r.text });
  for (const r of state.dialogues ?? []) {
    if (r.sourceType === 'reflection') groupFor(r.sourceId)?.entries.push({ id: `dialogue:${r.id}`, at: r.createdAt, label: r.stanceLabelSnapshot, text: r.text });
  }
  for (const r of state.wordEntries ?? []) rootGroups.get(r.sourceReflectionId)?.entries.push({ id: `words:${r.id}`, at: r.createdAt, label: r.stanceLabelSnapshot, text: r.text });
  for (const group of groups.values()) group.entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return [...groups.values()].sort((a, b) => Date.parse(b.entries.at(-1).at) - Date.parse(a.entries.at(-1).at));
}

export function appendWordEntry(state, definition, { sourceReflectionId, stanceId, text, now = new Date().toISOString(), id = globalThis.crypto.randomUUID() }) {
  const original = state.reflections.find(r => r.id === sourceReflectionId && r.parentReflectionId === null);
  check(original, 'Missing original word reflection');
  const stance = definition.options.find(o => o.id === stanceId);
  check(stance, 'Invalid word stance');
  check(typeof text === 'string' && text.trim().length > 0 && [...text].length <= definition.maxLength, 'Invalid word text');
  check(validTimestamp(now) && Date.parse(now) >= Date.parse(original.createdAt), 'Invalid word date');
  check(typeof id === 'string' && id.length > 0 && !(state.wordEntries ?? []).some(r => r.id === id), 'Duplicate word entry');
  const next = clone(state);
  next.wordEntries ??= [];
  next.wordEntries.push({ id, sourceReflectionId, definitionVersion: definition.version, promptSnapshot: definition.prompt,
    stanceId, stanceLabelSnapshot: stance.label, text, createdAt: now });
  return next;
}
