import { currentAnswers, isAnswered, distinctCount } from './answer-history.js';
import { equal, check, clone } from './validation.js';
import { dueReflections } from './reflection-engine.js';

export function relationEvidence(state, catalog) {
  const answers = new Map(currentAnswers(state.answers).filter(isAnswered).map(a => [a.questionId, a]));
  return catalog.questions.questions.flatMap(target => target.relations.flatMap(relation => {
    const sourceAnswer = answers.get(relation.questionId), targetAnswer = answers.get(target.id);
    if (!sourceAnswer || !targetAnswer || !relation.sourceVersions.includes(sourceAnswer.questionVersion) || !relation.targetVersions.includes(targetAnswer.questionVersion)) return [];
    return [{ relation, sourceAnswer, targetAnswer }];
  }));
}
function matches(rule, pair) {
  if (rule.detector === 'related_option_pairs') return rule.when.optionPairs.some(p => p.source === pair.sourceAnswer.optionId && p.target === pair.targetAnswer.optionId);
  const a = pair.sourceAnswer.snapshot.scenario, b = pair.targetAnswer.snapshot.scenario;
  return a && b && a.seriesId === rule.when.seriesId && b.seriesId === rule.when.seriesId && a.variable === rule.when.variable && b.variable === rule.when.variable && equal(a.constants, b.constants) && a.value !== b.value
    && a.decisionMap[pair.sourceAnswer.optionId] && b.decisionMap[pair.targetAnswer.optionId]
    && !(rule.when.excludeDecisionIds ?? []).includes(a.decisionMap[pair.sourceAnswer.optionId]) && !(rule.when.excludeDecisionIds ?? []).includes(b.decisionMap[pair.targetAnswer.optionId])
    && a.decisionMap[pair.sourceAnswer.optionId] !== b.decisionMap[pair.targetAnswer.optionId];
}
const selectedLabel = a => a.snapshot.options.find(o => o.id === a.optionId).label;
function pairTemplate(pair, catalog) {
  const ordered = [pair.sourceAnswer, pair.targetAnswer].sort((a,b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt) || a.id.localeCompare(b.id));
  const [previous, current] = ordered;
  const category = a => a.snapshot.category.map(id => catalog.axes.categories.find(c => c.id === id)?.label ?? id).join('・');
  const data = { previousTitle: previous.snapshot.title, previousAnswer: selectedLabel(previous), currentTitle: current.snapshot.title, currentAnswer: selectedLabel(current), previousCategory: category(previous), currentCategory: category(current) };
  if (pair.sourceAnswer.snapshot.scenario && pair.targetAnswer.snapshot.scenario) {
    data.lowerValue = Math.min(pair.sourceAnswer.snapshot.scenario.value, pair.targetAnswer.snapshot.scenario.value);
    data.upperValue = Math.max(pair.sourceAnswer.snapshot.scenario.value, pair.targetAnswer.snapshot.scenario.value);
  }
  return data;
}
export function discoveryKey(rule, evidence) {
  return JSON.stringify([rule.id, rule.version, [...evidence.answerIds].sort(), [...evidence.reflectionIds].sort()]);
}
function candidate(rule, evidence, templateData) {
  return { id: discoveryKey(rule, evidence), ruleId: rule.id, ruleVersion: rule.version, type: rule.type, priority: rule.priority, evidence, templateData };
}
export function detectComments(state, catalog, { now = new Date().toISOString(), profile = null } = {}) {
  const count = distinctCount(state), pairs = relationEvidence(state, catalog), result = [];
  for (const rule of catalog.rules.rules) {
    if (!rule.enabled || count < (rule.minimumDistinctQuestions ?? 0)) continue;
    if (['related_option_pairs','series_decision_change'].includes(rule.detector)) {
      const pair = pairs.find(p => p.relation.id === rule.relationId && p.relation.ruleIds.includes(rule.id));
      if (pair && matches(rule, pair)) result.push(candidate(rule, { answerIds: [pair.sourceAnswer.id, pair.targetAnswer.id].sort(), reflectionIds: [] }, pairTemplate(pair, catalog)));
    } else if (rule.detector === 'reflection_due') {
      const unlock = catalog.settings.progression.timeAndReflectionReturnFrom;
      if (unlock === null || count < unlock) continue;
      for (const r of dueReflections(state, rule, now)) result.push(candidate(rule, { answerIds: [], reflectionIds: [r.id] }, { previousText: r.text }));
    } else if (rule.detector === 'profile_time_change') {
      const unlock = catalog.settings.progression.timeAndReflectionReturnFrom;
      if (unlock === null || count < unlock) continue;
      for (const axis of catalog.axes.axes) {
        const change = profile?.axes?.[axis.id]?.changeOverTime;
        if (change?.comparable && change.answerCount >= rule.when.minimumAnswers && change.timeSpanDays >= rule.when.minimumTimeSpanDays && Math.abs(change.delta) >= rule.when.threshold) {
          result.push(candidate(rule, { answerIds: change.evidenceAnswerIds, reflectionIds: [] }, { axisLabel: `${axis.negativeLabel}と${axis.positiveLabel}` }));
        }
      }
    } else check(false, `Unsupported detector: ${rule.detector}`);
  }
  return result.sort((a,b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId) || a.id.localeCompare(b.id));
}
export function selectComment(candidates, state, { answerId = null } = {}) {
  return candidates.find(c => (!answerId || c.evidence.answerIds.includes(answerId) || c.type === 'REFLECTION_RETURN') && !state.discoveries.some(d => d.id === c.id && d.shownAt)) ?? null;
}
export function formatComment(comment, catalog) {
  const rule = catalog.rules.rules.find(r => r.id === comment.ruleId && r.version === comment.ruleVersion);
  check(rule, 'Unknown comment rule');
  return catalog.rules.templates[rule.templateId].replace(/\{([^}]+)\}/g, (_match,key) => {
    check(Object.hasOwn(comment.templateData, key), `Missing template value: ${key}`);
    return String(comment.templateData[key]); // Plain text. UI must use textContent.
  });
}
export function recordShownComment(state, comment, now = new Date().toISOString()) {
  if (state.discoveries.some(d => d.id === comment.id)) return clone(state);
  const next = clone(state);
  next.discoveries.push({ ...clone(comment), createdAt: now, shownAt: now });
  next.meta.lastVisit = now;
  return next;
}
export function consistencyByAxis(state, catalog) {
  const evidence = relationEvidence(state, catalog);
  return Object.fromEntries(catalog.axes.axes.map(axis => {
    const eligible = evidence.filter(p => p.relation.axis === axis.id && p.relation.ruleIds.some(id => catalog.rules.rules.some(r => r.id === id && r.enabled && r.type === 'CONSISTENCY')));
    const matched = eligible.filter(p => p.relation.ruleIds.some(id => catalog.rules.rules.some(r => r.id === id && r.enabled && r.type === 'CONSISTENCY' && matches(r,p))));
    return [axis.id, { value: eligible.length ? matched.length / eligible.length : null, pairCount: eligible.length, matchedPairs: matched.length, evidenceAnswerIds: [...new Set(eligible.flatMap(p => [p.sourceAnswer.id,p.targetAnswer.id]))] }];
  }));
}
