import { check, safeJSON, validateSchema, indexById } from './validation.js';

export function validateCatalog(data) {
  safeJSON(data);
  for (const key of ['questions', 'axes', 'followups', 'rules', 'settings', 'copy']) check(data[key]?.schemaVersion === 1, `${key}: unsupported schemaVersion`);
  validateSchema(data.questions, data.schemas['questions.schema.json'], data.schemas);
  for (const dialogue of [data.followups.manualDialogue, data.followups.comparisonDialogue, data.followups.reevaluationDialogue, data.followups.wordDialogue]) {
  check(dialogue && Number.isInteger(dialogue.version) && dialogue.version > 0 && typeof dialogue.prompt === 'string' && dialogue.prompt.length > 0, 'Invalid manual dialogue');
  check(Number.isInteger(dialogue.maxLength) && dialogue.maxLength > 0 && dialogue.maxLength <= 2000 && dialogue.options.length > 0, 'Invalid dialogue limits');
  indexById(dialogue.options, 'dialogue options');
  check(dialogue.options.every(o => typeof o.label === 'string' && o.label.length > 0), 'Invalid dialogue labels');
  }
  check(typeof data.followups.reevaluationDialogue.reasonPrompt === 'string' && data.followups.reevaluationDialogue.reasonPrompt.length > 0, 'Invalid reevaluation reason prompt');
  const questions = indexById(data.questions.questions, 'questions');
  const axes = indexById(data.axes.axes, 'axes');
  const categories = indexById(data.axes.categories, 'categories');
  const followups = indexById(data.followups.followUps, 'followups');
  const rules = indexById(data.rules.rules, 'rules');
  const relations = new Map();
  for (const q of questions.values()) {
    indexById(q.options, `${q.id}.options`);
    check(q.axes.every(id => axes.has(id)) && q.category.every(id => categories.has(id)), `${q.id}: unknown axis/category`);
    for (const o of q.options) {
      check(Object.keys(o.weights).every(id => q.axes.includes(id)), `${q.id}: undeclared weight`);
      if (o.isNonAnswer) check(Object.keys(o.weights).length === 0, `${q.id}: non-answer cannot score`);
      if (q.scoringMode === 'none') check(Object.keys(o.weights).length === 0, `${q.id}: reflection-only question cannot score`);
    }
    for (const id of q.followUps) check(followups.has(id), `${q.id}: unknown follow-up`);
    if (q.scenario) {
      check(q.options.filter(o => !o.isNonAnswer).every(o => q.scenario.decisionMap[o.id]), `${q.id}: missing decision map`);
    }
    for (const relation of q.relations) {
      const source = questions.get(relation.questionId);
      check(source && source !== q && !relations.has(relation.id), `${q.id}: invalid relation`);
      check(source.axes.includes(relation.axis) && q.axes.includes(relation.axis), `${q.id}: invalid relation axis`);
      for (const id of relation.ruleIds) check(rules.get(id)?.relationId === relation.id, `${q.id}: broken rule link`);
      relations.set(relation.id, { source, target: q, relation });
    }
  }
  const types = { related_option_pairs: ['CONSISTENCY', 'TENSION', 'CONTEXT_SHIFT'], series_decision_change: ['BOUNDARY'], profile_time_change: ['TIME_SHIFT'], reflection_due: ['REFLECTION_RETURN'] };
  const placeholders = new Set(['previousTitle','previousAnswer','currentTitle','currentAnswer','previousCategory','currentCategory','lowerValue','upperValue','axisLabel','previousText']);
  for (const r of rules.values()) {
    check(types[r.detector]?.includes(r.type), `${r.id}: unsupported detector/type`);
    check(Number.isInteger(r.version) && r.version > 0 && typeof r.enabled === 'boolean' && Number.isFinite(r.priority), `${r.id}: invalid metadata`);
    const template = data.rules.templates[r.templateId];
    check(typeof template === 'string', `${r.id}: missing template`);
    for (const match of template.matchAll(/\{([^}]+)\}/g)) check(placeholders.has(match[1]), `${r.id}: unknown template variable`);
    if (r.relationId) {
      const entry = relations.get(r.relationId);
      check(entry?.relation.ruleIds.includes(r.id) && entry.relation.axis === r.axis, `${r.id}: missing relation`);
      check(Number.isInteger(r.minimumDistinctQuestions) && r.minimumDistinctQuestions >= 0, `${r.id}: invalid threshold`);
      if (r.detector === 'related_option_pairs') {
        check(Array.isArray(r.when.optionPairs) && r.when.optionPairs.length > 0, `${r.id}: no pairs`);
        for (const pair of r.when.optionPairs) for (const side of ['source', 'target']) {
          check(typeof pair[side] === 'string', `${r.id}: invalid option pair`);
          // Old-version mappings remain valid even when the current catalog changed its options.
          if (entry.relation[`${side}Versions`].includes(entry[side].version)) check(entry[side].options.some(o => o.id === pair[side] && !o.isNonAnswer), `${r.id}: invalid option pair`);
        }
      } else {
        check(r.when.requireIdenticalConstants === true && r.when.requireDistinctValues === true && r.when.report === 'observed_interval_only', `${r.id}: unsupported boundary policy`);
        check(entry.source.scenario?.seriesId === r.when.seriesId && entry.target.scenario?.seriesId === r.when.seriesId, `${r.id}: invalid series`);
      }
    } else check(['profile_time_change','reflection_due'].includes(r.detector), `${r.id}: relation required`);
    if (r.detector === 'profile_time_change') check(r.when.metric === 'changeOverTime' && r.when.operator === 'absolute_gte' && r.when.requireComparableVersions === true && Number.isFinite(r.when.threshold) && r.when.threshold >= 0 && r.when.minimumAnswers >= 20 && r.when.minimumTimeSpanDays > 0, `${r.id}: invalid time policy`);
    if (r.detector === 'reflection_due') check(Array.isArray(r.when.any) && r.when.any.length > 0 && r.when.any.every(c => Object.keys(c).length === 1 && Object.entries(c).every(([k,v]) => ['elapsedDays','additionalDistinctQuestions'].includes(k) && Number.isFinite(v) && v > 0)), `${r.id}: invalid return policy`);
    if (r.followUpId) check(followups.has(r.followUpId), `${r.id}: missing follow-up`);
  }
  for (const f of followups.values()) {
    check(Number.isInteger(f.version) && f.version > 0 && f.optional === true, `${f.id}: invalid metadata`);
    check(['reason','deferred_question','free_text','reevaluation'].includes(f.kind), `${f.id}: unsupported follow-up kind`);
    check(['after_answer','later_day','history_action','reflection_return'].includes(f.trigger?.event), `${f.id}: invalid trigger`);
    for (const id of f.trigger.requiresAnswered ?? []) check(questions.has(id), `${f.id}: unknown prerequisite`);
    if (f.kind === 'reason') {
      indexById(f.options);
      check(f.scoringMode === 'none' && f.options.every(o => typeof o.label === 'string' && Object.keys(o.weights).length === 0), `${f.id}: reason scoring unsupported`);
    }
    if (f.kind === 'deferred_question') check(questions.get(f.targetQuestionId)?.version === f.targetQuestionVersion, `${f.id}: unknown target version`);
    if (f.kind === 'free_text') check(Number.isInteger(f.maxLength) && f.maxLength > 0 && f.maxLength <= 2000, `${f.id}: invalid text limit`);
    if (f.returnPolicyId) check(rules.get(f.returnPolicyId)?.type === 'REFLECTION_RETURN', `${f.id}: invalid return rule`);
    if (f.privacyCopyId) check(typeof data.copy.copy[f.privacyCopyId] === 'string', `${f.id}: unknown copy`);
  }
  const s = data.settings;
  const retired = s.scheduling.retiredQuestionIds ?? [];
  check(Array.isArray(retired) && new Set(retired).size === retired.length && retired.every(id => questions.has(id)), 'Invalid retired questions');
  check(s.scheduling.initialQuestionIds.every(id => !retired.includes(id)), 'Retired initial question');
  check(data.followups.followUps.every(f => f.kind !== 'deferred_question' || !retired.includes(f.targetQuestionId)), 'Retired deferred question');
  check(s.storage.schemaVersion === 1 && s.scoring.method === 'weighted_mean', 'Unsupported storage/scoring policy');
  check(s.scoring.minimumAxisAnswers >= 3 && s.scoring.provisionalBelow >= s.scoring.minimumAxisAnswers && s.scoring.middleAbsoluteBelow >= 0, 'Invalid score thresholds');
  check(s.scheduling.initialQuestionIds.every(id => questions.has(id)), 'Unknown initial question');
  check(new Set(s.scheduling.initialQuestionIds).size === s.scheduling.initialQuestionIds.length, 'Duplicate initial question');
  const journeys = s.boundaryJourneys ?? [];
  indexById(journeys, 'boundary journeys');
  const journeyQuestions = new Set();
  for (const journey of journeys) {
    check(typeof journey.title === 'string' && typeof journey.description === 'string' && typeof journey.variableLabel === 'string' && typeof journey.observationNote === 'string', 'Invalid journey text');
    check(Array.isArray(journey.questionIds) && journey.questionIds.length >= 2 && new Set(journey.questionIds).size === journey.questionIds.length, 'Invalid journey questions');
    const series = journey.questionIds.map(id => questions.get(id));
    check(journey.questionIds.every(id => !retired.includes(id)), 'Retired journey question');
    check(series.every(q => q?.scenario?.seriesId === journey.id), 'Unknown journey scenario');
    const first = series[0].scenario;
    check(series.every(q => q.scenario.variable === first.variable && q.scenario.unit === first.unit && JSON.stringify(q.scenario.constants) === JSON.stringify(first.constants)), 'Journey must change only one condition');
    check(new Set(series.map(q => q.scenario.value)).size === series.length, 'Duplicate journey values');
    for (const q of series) {
      check(!journeyQuestions.has(q.id), 'Question belongs to multiple journeys');
      journeyQuestions.add(q.id);
    }
    for (let i = 1; i < series.length; i++) {
      check(series[i].scenario.value > series[i-1].scenario.value, 'Journey conditions must be ordered');
      check(series[i].relations.some(r => r.questionId === series[i-1].id && r.ruleIds.some(id => rules.get(id)?.type === 'BOUNDARY')), 'Missing journey boundary relation');
    }
  }
  for (const [type, prompt] of Object.entries(data.followups.comparisonDialogue.promptsByType ?? {})) {
    check(['CONSISTENCY','TENSION','CONTEXT_SHIFT','BOUNDARY'].includes(type) && typeof prompt === 'string' && prompt.length > 0, 'Invalid comparison prompt');
  }
  const daily = s.dailyReflection;
  check(daily && typeof daily.enabled === 'boolean', 'Invalid daily reflection policy');
  for (const key of ['minimumAgeDays','repeatAfterDays']) check(Number.isInteger(daily[key]) && daily[key] >= 0, 'Invalid daily reflection days');
  check(Number.isInteger(daily.limitPerDay) && daily.limitPerDay >= 1 && daily.limitPerDay <= 10, 'Invalid daily reflection limit');
  check(Array.isArray(daily.typeOrder) && daily.typeOrder.length > 0 && new Set(daily.typeOrder).size === daily.typeOrder.length && daily.typeOrder.every(k => ['comparison','words','reevaluation'].includes(k)), 'Invalid daily reflection kinds');
  for (const kind of daily.typeOrder) check(typeof daily.labels[kind]?.intro === 'string' && typeof daily.labels[kind]?.action === 'string', 'Invalid daily reflection copy');
  return data;
}

export async function loadCatalog({ baseURL = new URL('../data/', import.meta.url), fetcher = globalThis.fetch } = {}) {
  const base = new URL(baseURL);
  const entries = await Promise.all(['questions','axes','followups','rules','settings','copy','schemas/questions.schema','schemas/state.schema'].map(async name => {
    const response = await fetcher(new URL(`${name}.json`, base));
    check(response.ok, `Cannot load ${name}: ${response.status}`);
    return [name, await response.json()];
  }));
  const raw = Object.fromEntries(entries);
  const schemas = { 'questions.schema.json': raw['schemas/questions.schema'], 'state.schema.json': raw['schemas/state.schema'] };
  delete raw['schemas/questions.schema']; delete raw['schemas/state.schema'];
  return validateCatalog({ ...raw, schemas });
}
