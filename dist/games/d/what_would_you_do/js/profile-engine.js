import { scoreAnswers } from './scoring-engine.js';
import { currentAnswers, isAnswered, distinctCount } from './answer-history.js';
import { consistencyByAxis } from './comment-engine.js';
import { check, validTimestamp } from './validation.js';

// Period boundaries must be supplied explicitly until TODO-03 is decided.
export function comparePeriods(state, catalog, periods) {
  if (!periods) return Object.fromEntries(catalog.axes.axes.map(a => [a.id, null]));
  const { earlier, recent, minimumPairs = 3, minimumAnswers = 20, minimumTimeSpanDays = 30 } = periods;
  check([earlier.from,earlier.to,recent.from,recent.to].every(validTimestamp), 'Invalid period timestamps');
  check(Date.parse(earlier.from) <= Date.parse(earlier.to) && Date.parse(earlier.to) < Date.parse(recent.from) && Date.parse(recent.from) <= Date.parse(recent.to), 'Periods must not overlap');
  check(minimumPairs >= 3 && minimumAnswers >= 20 && minimumTimeSpanDays > 0, 'Insufficient time comparison thresholds');
  const inPeriod = range => currentAnswers(state.answers.filter(a => Date.parse(a.answeredAt) <= Date.parse(range.to)))
    .filter(a => Date.parse(a.answeredAt) >= Date.parse(range.from) && isAnswered(a) && a.snapshot.scoringMode === 'behavior');
  const first = new Map(inPeriod(earlier).map(a => [a.questionId,a]));
  const pairs = inPeriod(recent).flatMap(b => {
    const a = first.get(b.questionId);
    return a && a.questionVersion === b.questionVersion ? [[a,b]] : [];
  });
  const allIds = pairs.flatMap(p => p.map(a => a.id));
  const span = pairs.length ? (Math.max(...pairs.map(p => Date.parse(p[1].answeredAt))) - Math.min(...pairs.map(p => Date.parse(p[0].answeredAt)))) / 86400000 : 0;
  return Object.fromEntries(catalog.axes.axes.map(axis => {
    const samples = pairs.filter(pair => pair.every(a => Object.hasOwn(a.derivedWeights, axis.id)));
    if (allIds.length < minimumAnswers || samples.length < minimumPairs || span < minimumTimeSpanDays) return [axis.id,null];
    const mean = index => samples.reduce((sum,p) => sum + p[index].derivedWeights[axis.id] * p[index].weight,0) / samples.reduce((sum,p) => sum + p[index].weight,0);
    return [axis.id,{ delta: mean(1) - mean(0), comparable: true, pairCount: samples.length, answerCount: allIds.length, timeSpanDays: span, evidenceAnswerIds: samples.flatMap(p => p.map(a => a.id)) }];
  }));
}
export function analyzeProfile(state, catalog, { periods = null } = {}) {
  const axes = scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  const consistency = consistencyByAxis(state,catalog);
  const changes = comparePeriods(state,catalog,periods);
  const current = currentAnswers(state.answers).filter(a => isAnswered(a) && a.snapshot.scoringMode === 'behavior');
  const count = distinctCount(state);
  for (const axis of catalog.axes.axes) {
    const categories = catalog.axes.categories.map(category => {
      const samples = current.filter(a => a.snapshot.category.includes(category.id));
      return { id: category.id, ...scoreAnswers(samples,[axis],catalog.settings.scoring)[axis.id] };
    });
    const measured = categories.filter(c => c.confidence >= catalog.settings.analysisDraft.minimumCategorySamples);
    const contextDependency = measured.length < 2 ? null : (Math.max(...measured.map(c => c.score)) - Math.min(...measured.map(c => c.score))) / 2;
    Object.assign(axes[axis.id], { consistency: consistency[axis.id], categories, contextDependency, changeOverTime: changes[axis.id], advancedAnalysisStatus: 'draft', advancedAnalysisVisible: false });
    if (count < catalog.settings.progression.profileFrom) { axes[axis.id].visibility = 'hidden'; axes[axis.id].position = null; }
  }
  return { distinctQuestions: count, axes, selfReports: currentAnswers(state.answers).filter(a => isAnswered(a) && a.snapshot.scoringMode === 'self_report_only'), pendingDecisions: ['TODO-01','TODO-03'] };
}
