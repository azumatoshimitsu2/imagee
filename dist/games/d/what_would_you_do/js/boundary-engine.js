import { currentAnswers, isAnswered } from './answer-history.js';
import { comparisonRecords } from './comparison-engine.js';
import { equal } from './validation.js';

export function boundaryJourneys(state, catalog) {
  const latest = new Map(currentAnswers(state.answers).map(a => [a.questionId, a]));
  const comparisons = comparisonRecords(state, catalog);
  return (catalog.settings.boundaryJourneys ?? []).map(definition => {
    const steps = definition.questionIds.map(id => {
      const question = catalog.questions.questions.find(q => q.id === id);
      const answer = latest.get(id) ?? null;
      return { question, answer, compatible: !answer || answer.questionVersion === question.version };
    });
    const compatible = steps.every(s => s.compatible);
    const complete = steps.every(s => s.answer);
    const currentIds = new Set(steps.filter(s => s.answer).map(s => s.answer.id));
    const records = comparisons.filter(c => c.type === 'BOUNDARY' && c.answerIds.every(id => currentIds.has(id)));
    // Retain only intervals with no answered, decisive condition between them.
    // An undecided intermediate answer cannot establish a narrower interval.
    const boundaries = compatible ? records.filter(c => {
      const pair = c.answerIds.map(id => state.answers.find(a => a.id === id));
      const [lo, hi] = pair.map(a => a.snapshot.scenario.value).sort((a, b) => a - b);
      return !steps.some(s => s.answer && isAnswered(s.answer) && s.question.scenario.value > lo && s.question.scenario.value < hi);
    }) : [];
    const comparable = compatible && steps.every(s => equal(s.question.scenario.constants, steps[0].question.scenario.constants));
    return { ...definition, steps, complete, compatible: comparable, boundaries,
      answeredCount: steps.filter(s => s.answer).length,
      undecidedCount: steps.filter(s => s.answer && !isAnswered(s.answer)).length,
      nextQuestion: compatible ? steps.find(s => !s.answer)?.question ?? null : null };
  });
}
