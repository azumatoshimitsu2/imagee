import { check, clone, equal } from './validation.js';
import { createState } from './answer-history.js';
import { validateState } from './state-validation.js';

export class StorageConflictError extends Error {
  constructor() { super('Saved data changed in another tab. Reload before saving.'); this.name = 'StorageConflictError'; }
}
// Alternative adapters need only getItem/setItem/removeItem. No DOM is used.
export function memoryAdapter(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
export function migrate(state, schemas) {
  // No invented legacy format: add explicit version migrations when a real v2 exists.
  return validateState(clone(state), schemas);
}
export function createStorage({ schemas, key = 'selfDialogueGame:v1', adapter, now = () => new Date().toISOString(), maximumBytes = 5 * 1024 * 1024 } = {}) {
  let state = createState(now()), backend, lastRaw = null, rawRecovery = null;
  let status = { mode: 'persistent', issue: null };
  const parse = text => {
    check(typeof text === 'string' && new TextEncoder().encode(text).length <= maximumBytes, 'Import is too large');
    return migrate(JSON.parse(text), schemas);
  };
  const fallback = issue => { status = { mode: 'memory', issue }; };
  try {
    backend = adapter ?? globalThis.localStorage;
    if (!backend) throw new Error('Storage unavailable');
    lastRaw = backend.getItem(key);
  } catch { fallback('unavailable'); }
  if (status.mode === 'persistent' && lastRaw !== null) {
    try { state = parse(lastRaw); }
    catch { rawRecovery = lastRaw; fallback('invalid_saved_data'); }
  }
  function write(next, { replace = false } = {}) {
    validateState(next, schemas);
    if (!replace) {
      for (const collection of ['answers','reflections','discoveries','dialogues','comparisons','reevaluations','reevaluationNotes','wordEntries','dailyReflections','dailyReflectionActions']) {
        for (const previous of state[collection] ?? []) check((next[collection] ?? []).some(item => item.id === previous.id && equal(item, previous)), `Cannot overwrite ${collection} history`);
      }
      for (const day of state.dailyAssignments) {
        const updated = next.dailyAssignments.find(d => d.localDate === day.localDate);
        check(updated && updated.questionId === day.questionId && updated.questionVersion === day.questionVersion && (!day.completedAnswerId || updated.completedAnswerId === day.completedAnswerId), 'Cannot overwrite daily assignment');
      }
    }
    const serialized = JSON.stringify(next);
    check(new TextEncoder().encode(serialized).length <= maximumBytes, 'Saved data is too large');
    if (status.mode === 'persistent') {
      try {
        if (backend.getItem(key) !== lastRaw) throw new StorageConflictError();
        backend.setItem(key, serialized);
        lastRaw = serialized;
      } catch (error) {
        if (error instanceof StorageConflictError) throw error;
        fallback(error?.name === 'QuotaExceededError' ? 'quota_exceeded' : 'write_failed');
      }
    }
    state = clone(next);
    return clone(state);
  }
  return {
    getState: () => clone(state),
    getStatus: () => ({ ...status }),
    getRecoveryText: () => rawRecovery,
    saveState: next => write(next),
    update: change => write(change(clone(state))),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: text => write(parse(text), { replace: true }),
    reload: () => {
      check(backend, 'No persistent storage available');
      const raw = backend.getItem(key);
      const next = raw === null ? createState(now()) : parse(raw);
      state = next; lastRaw = raw; rawRecovery = null; status = { mode: 'persistent', issue: null };
      return clone(state);
    },
    clear: () => {
      // Explicit clear also removes a corrupt original; regular saving never does.
      if (backend) {
        try {
          if (backend.getItem(key) !== lastRaw) throw new StorageConflictError();
          backend.removeItem(key); lastRaw = null; status = { mode: 'persistent', issue: null };
        } catch (error) {
          if (error instanceof StorageConflictError) throw error;
          fallback('delete_failed');
        }
      }
      state = createState(now()); rawRecovery = null;
      return clone(state);
    },
  };
}
