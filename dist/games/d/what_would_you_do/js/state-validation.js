import { check, safeJSON, equal, validateSchema, indexById, validTimestamp } from './validation.js';
import { isAnswered } from './answer-history.js';

export function validateState(state, schemas) {
  safeJSON(state);
  check(state.schemaVersion === 1, 'Unsupported schemaVersion');
  validateSchema(state, schemas['state.schema.json'], schemas);
  const answers = indexById(state.answers, 'answers');
  const roots = new Set(), children = new Map();
  const definitions = new Map();
  for (const a of state.answers) {
    const q = a.snapshot;
    check(q.id === a.questionId && q.version === a.questionVersion && q.importance === a.weight, 'Snapshot identity/weight mismatch');
    const options = indexById(q.options);
    const choice = options.get(a.optionId);
    check(choice && equal(choice.weights, a.derivedWeights), 'Answer weights do not match snapshot');
    for (const o of q.options) {
      check(Object.keys(o.weights).every(axis => q.axes.includes(axis)), 'Undeclared snapshot axis');
      if (o.isNonAnswer) check(Object.keys(o.weights).length === 0, 'Non-answer has weights');
    }
    const key = JSON.stringify([q.id, q.version]);
    const { status: _status, review: _review, ...meaning } = q;
    if (definitions.has(key)) check(equal(definitions.get(key), meaning), 'One question version has different snapshots');
    definitions.set(key, meaning);
    if (a.supersedesAnswerId) {
      const prior = answers.get(a.supersedesAnswerId);
      check(prior && prior.questionId === a.questionId && prior.id !== a.id && !children.has(prior.id), 'Invalid or branching answer chain');
      children.set(prior.id, a.id);
    } else {
      check(!roots.has(a.questionId), 'Multiple answer roots');
      roots.add(a.questionId);
    }
    indexById(a.followUps, 'answer follow-ups');
    for (const f of a.followUps) {
      check(q.followUps.includes(f.id) && f.snapshot.id === f.id && f.snapshot.version === f.version, 'Invalid follow-up reference');
      check(f.snapshot.kind === 'reason' && f.snapshot.scoringMode === 'none', 'Invalid reason snapshot');
      check(f.snapshot.options?.some(o => o.id === f.optionId), 'Unknown reason option');
      indexById(f.snapshot.options);
      check(f.snapshot.options.every(o => typeof o.label === 'string' && o.weights && Object.keys(o.weights).length === 0), 'Invalid reason weights');
      check(isAnswered(a), 'Reason on non-answer');
    }
    const visited = new Set();
    let pointer = a;
    while (pointer) {
      check(!visited.has(pointer.id), 'Cyclic answer history');
      visited.add(pointer.id);
      pointer = answers.get(pointer.supersedesAnswerId);
    }
  }
  const reflections = indexById(state.reflections, 'reflections');
  for (const r of state.reflections) {
    check(r.sourceAnswerId === null || answers.has(r.sourceAnswerId), 'Missing reflection answer');
    if (r.parentReflectionId) check(reflections.has(r.parentReflectionId), 'Missing parent reflection');
    let pointer = r; const seen = new Set();
    while (pointer) {
      check(!seen.has(pointer.id), 'Cyclic reflections');
      seen.add(pointer.id); pointer = reflections.get(pointer.parentReflectionId);
    }
  }
  indexById(state.dialogues ?? [], 'dialogues');
  for (const reply of state.dialogues ?? []) {
    check((reply.sourceType === 'answer' ? answers : reflections).has(reply.sourceId), 'Missing dialogue source');
  }
  indexById(state.comparisons ?? [], 'comparisons');
  const comparisonDefinitions = new Map();
  for (const reply of state.comparisons ?? []) {
    const c = reply.comparison;
    const pair = c.answerIds.map(id => answers.get(id));
    check(pair.every(Boolean) && pair[0].questionId !== pair[1].questionId, 'Missing or duplicate comparison answers');
    check(c.id === JSON.stringify([c.ruleId, c.ruleVersion, [...c.answerIds].sort(), []]), 'Invalid comparison identity');
    if (comparisonDefinitions.has(c.id)) check(equal(comparisonDefinitions.get(c.id), c), 'Comparison snapshot changed');
    comparisonDefinitions.set(c.id, c);
  }
  const reevaluations = indexById(state.reevaluations ?? [], 'reevaluations');
  const reevaluatedAnswers = new Set();
  for (const entry of reevaluations.values()) {
    const previous = answers.get(entry.previousAnswerId), answer = answers.get(entry.answerId);
    check(previous && answer && answer.supersedesAnswerId === previous.id && answer.source === 'reevaluation', 'Invalid reevaluation answer chain');
    check(equal(previous.snapshot, answer.snapshot) && answer.answeredAt === entry.createdAt, 'Reevaluation must preserve the original question');
    check(!reevaluatedAnswers.has(answer.id), 'Duplicate reevaluation answer');
    reevaluatedAnswers.add(answer.id);
  }
  indexById(state.reevaluationNotes ?? [], 'reevaluation notes');
  for (const note of state.reevaluationNotes ?? []) check(reevaluations.has(note.reevaluationId), 'Missing reevaluation for note');
  indexById(state.wordEntries ?? [], 'word entries');
  for (const entry of state.wordEntries ?? []) {
    const original = reflections.get(entry.sourceReflectionId);
    check(original && original.parentReflectionId === null, 'Missing original word reflection');
    check(entry.text.trim().length > 0 && Date.parse(entry.createdAt) >= Date.parse(original.createdAt), 'Invalid word entry text/date');
  }
  const suggestions = indexById(state.dailyReflections ?? [], 'daily reflections');
  const suggestionKeys = new Set();
  for (const suggestion of suggestions.values()) {
    check(suggestion.answerIds.every(id => answers.has(id)) && suggestion.reflectionIds.every(id => reflections.has(id)), 'Missing daily reflection evidence');
    check(suggestion.key === JSON.stringify([suggestion.kind, suggestion.targetId]), 'Invalid daily reflection key');
    const dayKey = JSON.stringify([suggestion.localDate, suggestion.key]);
    check(!suggestionKeys.has(dayKey), 'Duplicate daily reflection'); suggestionKeys.add(dayKey);
    if (suggestion.kind === 'reevaluation') check(suggestion.answerIds.length === 1 && suggestion.answerIds[0] === suggestion.targetId && !suggestion.reflectionIds.length, 'Invalid reevaluation suggestion');
    if (suggestion.kind === 'words') check(suggestion.reflectionIds.length === 1 && suggestion.reflectionIds[0] === suggestion.targetId && !suggestion.answerIds.length && reflections.get(suggestion.targetId).parentReflectionId === null, 'Invalid words suggestion');
    if (suggestion.kind === 'comparison') check(suggestion.answerIds.length === 2 && !suggestion.reflectionIds.length, 'Invalid comparison suggestion');
  }
  indexById(state.dailyReflectionActions ?? [], 'daily reflection actions');
  const actions = new Set();
  for (const action of state.dailyReflectionActions ?? []) {
    check(suggestions.has(action.suggestionId), 'Missing daily reflection suggestion');
    const key = JSON.stringify([action.suggestionId, action.action]);
    check(!actions.has(key), 'Duplicate daily reflection action'); actions.add(key);
  }
  indexById(state.discoveries, 'discoveries');
  for (const d of state.discoveries) {
    check(d.evidence.answerIds.every(id => answers.has(id)) && d.evidence.reflectionIds.every(id => reflections.has(id)), 'Missing discovery evidence');
    check(d.evidence.answerIds.length + d.evidence.reflectionIds.length > 0, 'Empty discovery evidence');
  }
  const dates = new Set();
  for (const day of state.dailyAssignments) {
    check(!dates.has(day.localDate), 'Duplicate daily assignment'); dates.add(day.localDate);
    if (day.completedAnswerId) {
      const a = answers.get(day.completedAnswerId);
      check(a && a.source === 'daily' && a.localDate === day.localDate && a.questionId === day.questionId && a.questionVersion === day.questionVersion && isAnswered(a), 'Invalid daily completion');
    }
  }
  check(validTimestamp(state.meta.firstVisit) && validTimestamp(state.meta.lastVisit), 'Invalid visit timestamp');
  return state;
}
