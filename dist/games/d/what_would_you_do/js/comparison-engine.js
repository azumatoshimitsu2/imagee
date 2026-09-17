import { detectComments, formatComment } from './comment-engine.js';
import { check, clone, validTimestamp } from './validation.js';

export function comparisonRecords(state, catalog) {
  const records = new Map();
  // Preserve the first saved wording even when rules or current answers change.
  for (const reply of state.comparisons ?? []) records.set(reply.comparison.id, clone(reply.comparison));
  for (const discovery of detectComments(state, catalog)) {
    if (!['CONSISTENCY', 'TENSION', 'CONTEXT_SHIFT', 'BOUNDARY'].includes(discovery.type) || discovery.evidence.answerIds.length !== 2) continue;
    if (!records.has(discovery.id)) records.set(discovery.id, { id: discovery.id, ruleId: discovery.ruleId, ruleVersion: discovery.ruleVersion,
      type: discovery.type, answerIds: [...discovery.evidence.answerIds], comment: formatComment(discovery, catalog) });
  }
  return [...records.values()];
}

export function appendComparison(state, catalog, { comparisonId, stanceId, text = '', now = new Date().toISOString(), id = globalThis.crypto.randomUUID() }) {
  const comparison = comparisonRecords(state, catalog).find(c => c.id === comparisonId);
  check(comparison, 'Comparison is not available');
  const definition = catalog.followups.comparisonDialogue;
  const stance = definition.options.find(o => o.id === stanceId);
  check(stance, 'Invalid comparison stance');
  check(typeof text === 'string' && text.length <= definition.maxLength, 'Invalid comparison text');
  check(validTimestamp(now) && comparison.answerIds.every(answerId => Date.parse(now) >= Date.parse(state.answers.find(a => a.id === answerId).answeredAt)), 'Invalid comparison timestamp');
  check(typeof id === 'string' && id.length > 0 && !(state.comparisons ?? []).some(r => r.id === id), 'Duplicate comparison reply id');
  const next = clone(state);
  next.comparisons ??= [];
  next.comparisons.push({ id, comparison: clone(comparison), definitionVersion: definition.version, promptSnapshot: definition.promptsByType?.[comparison.type] ?? definition.prompt,
    stanceId, stanceLabelSnapshot: stance.label, text, createdAt: now });
  return next;
}
