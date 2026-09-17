import { currentAnswers, isAnswered, distinctCount, localDate } from './answer-history.js';
import { check, clone, validDate } from './validation.js';
import { scoreAnswers } from './scoring-engine.js';

function calendarDays(a,b) { return (Date.parse(a) - Date.parse(b)) / 86400000; }
function deferredEligible(f, state, catalog, date) {
  const current = new Map(currentAnswers(state.answers).filter(isAnswered).map(a => [a.questionId,a]));
  if (distinctCount(state) < (f.trigger.minimumDistinctQuestions ?? 0)) return false;
  return (f.trigger.requiresAnswered ?? []).every(id => current.has(id) && calendarDays(date,current.get(id).localDate) >= catalog.settings.scheduling.boundary.minimumDayGap);
}
export function contributesToAxis(question, axisId, catalog) {
  return !catalog.settings.scoring.ignoreModes.includes(question.scoringMode)
    && question.options.some(option => !option.isNonAnswer && Object.hasOwn(option.weights, axisId));
}
export function isQuestionActive(question, catalog) {
  return !(catalog.settings.scheduling.retiredQuestionIds ?? []).includes(question.id);
}
export function availableQuestions(state, catalog, { date = localDate(), includeDrafts = true, axisId = null } = {}) {
  check(validDate(date), 'Invalid local date');
  check(axisId === null || catalog.axes.axes.some(axis => axis.id === axisId), 'Unknown question axis');
  const visited = new Set(state.answers.map(a => a.questionId));
  const guided = new Set((catalog.settings.boundaryJourneys ?? []).flatMap(j => j.questionIds));
  return catalog.questions.questions.filter(q => isQuestionActive(q, catalog) && (includeDrafts || q.status === 'reviewed') && !visited.has(q.id) && !guided.has(q.id)
    && (axisId === null || contributesToAxis(q, axisId, catalog))).filter(q => {
    const deferred = catalog.followups.followUps.filter(f => f.kind === 'deferred_question' && f.targetQuestionId === q.id);
    return deferred.length === 0 || deferred.some(f => deferredEligible(f,state,catalog,date));
  });
}
export function chooseQuestion(state, catalog, options = {}) {
  const candidates = availableQuestions(state,catalog,options);
  const initial = catalog.settings.scheduling.initialQuestionIds.map(id => candidates.find(q => q.id === id)).find(Boolean);
  if (initial) return initial;
  const latest = currentAnswers(state.answers);
  const answered = new Set(latest.filter(isAnswered).map(a => a.questionId));
  const recent = [...latest].sort((a,b) => Date.parse(b.answeredAt)-Date.parse(a.answeredAt) || a.id.localeCompare(b.id)).slice(0,3);
  const scores = scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  const weights = catalog.settings.scheduling.priorityWeights;
  const filtered = candidates.filter(q => !catalog.settings.scheduling.avoidConsecutiveCategories.some(c => q.category.includes(c) && recent[0]?.snapshot.category.includes(c)));
  const pool = filtered.length ? filtered : candidates;
  const rank = q => {
    const relationship = q.relations.some(r => answered.has(r.questionId)) || catalog.questions.questions.some(other => answered.has(other.id) && other.relations.some(r => r.questionId === q.id));
    const similar = recent.filter(a => a.snapshot.category.some(c => q.category.includes(c))).length;
    const features = {
      axisInformationNeed: q.axes.reduce((sum,id) => sum + 1 / (1 + scores[id].confidence),0) / q.axes.length,
      relationOpportunity: Number(relationship), categoryNovelty: Number(similar === 0), recentSimilarityPenalty: similar / 3,
      followUpFatiguePenalty: Number(q.followUps.length > 0 && recent.some(a => a.followUps.length > 0)),
    };
    return Object.entries(features).reduce((sum,[name,value]) => sum + value * weights[name],0);
  };
  return [...pool].sort((a,b) => rank(b)-rank(a) || a.id.localeCompare(b.id))[0] ?? null;
}
export function assignToday(state, catalog, { date = localDate(), ...options } = {}) {
  check(validDate(date), 'Invalid local date');
  const existing = state.dailyAssignments.find(d => d.localDate === date);
  if (existing) {
    if ((catalog.settings.scheduling.retiredQuestionIds ?? []).includes(existing.questionId)) {
      return { state: clone(state), question: null, assignment: clone(existing), unavailable: true };
    }
    const question = catalog.questions.questions.find(q => q.id === existing.questionId && q.version === existing.questionVersion)
      ?? state.answers.find(a => a.questionId === existing.questionId && a.questionVersion === existing.questionVersion)?.snapshot ?? null;
    return { state: clone(state), question: clone(question), assignment: clone(existing), unavailable: question === null };
  }
  const question = chooseQuestion(state,catalog,{ date,...options });
  if (!question) return { state: clone(state), question: null, assignment: null, unavailable: false };
  const next = clone(state), assignment = { localDate: date, questionId: question.id, questionVersion: question.version, completedAnswerId: null };
  next.dailyAssignments.push(assignment);
  return { state: next, question: clone(question), assignment: clone(assignment), unavailable: false };
}
export function eligibleFollowUps(state, catalog, { event, answerId = null, date = localDate() } = {}) {
  check(validDate(date), 'Invalid local date');
  const answer = currentAnswers(state.answers).find(a => a.id === answerId);
  const count = distinctCount(state);
  const current = currentAnswers(state.answers);
  const rootIds = [...new Set(state.answers.map(a => a.questionId))];
  return catalog.followups.followUps.filter(f => {
    if (f.trigger.event !== event || count < (f.trigger.minimumDistinctQuestions ?? 0)) return false;
    if (event === 'after_answer') {
      if (!answer || !isAnswered(answer) || !answer.snapshot.followUps.includes(f.id) || f.trigger.excludeOptionIds?.includes(answer.optionId)) return false;
      if (answer.followUps.some(item => item.id === f.id)) return false;
    }
    if (f.kind === 'deferred_question') return !state.answers.some(a => a.questionId === f.targetQuestionId) && deferredEligible(f,state,catalog,date);
    if (f.kind === 'reason') {
      const policy = catalog.settings.scheduling.reason;
      const reasonQuestions = current.filter(a => a.followUps.length > 0);
      if (reasonQuestions.length >= Math.floor(count * policy.targetRate)) return false;
      const last = Math.max(-1,...reasonQuestions.map(a => rootIds.indexOf(a.questionId)));
      if (rootIds.length - 1 - last < policy.minimumAnswerGap) return false;
    }
    if (f.kind === 'free_text' && event === 'after_answer') {
      if (state.reflections.some(r => r.sourceAnswerId && state.answers.find(a => a.id === r.sourceAnswerId)?.questionId === answer.questionId && r.followUpId === f.id)) return false;
      const lastCount = Math.max(0,...state.reflections.filter(r => !r.parentReflectionId).map(r => r.distinctQuestionsAtCreation));
      if (count - lastCount < catalog.settings.scheduling.free_text.minimumDistinctQuestionGap) return false;
    }
    if (event === 'history_action') return Boolean(answer);
    // Return prompts are exposed only with a due discovery, not as unsolicited text.
    if (event === 'reflection_return') return false;
    return true;
  }).map(clone);
}
export function dailyProgress(state, date = localDate()) {
  check(validDate(date), 'Invalid local date');
  const completed = new Set(state.dailyAssignments.filter(d => d.completedAnswerId).map(d => d.localDate));
  let cursor = date;
  const previousDay = d => new Date(Date.parse(d) - 86400000).toISOString().slice(0,10);
  if (!completed.has(cursor)) cursor = previousDay(cursor);
  let streak = 0;
  while (completed.has(cursor)) { streak++; cursor = previousDay(cursor); }
  return { completedDays: completed.size, streak, todayCompleted: completed.has(date) };
}
