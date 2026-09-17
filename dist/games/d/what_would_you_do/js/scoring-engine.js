import { currentAnswers, isAnswered } from './answer-history.js';
export function scoreAnswers(answers, axes, settings) {
  const current = currentAnswers(answers).filter(a => isAnswered(a) && !settings.ignoreModes.includes(a.snapshot.scoringMode));
  return Object.fromEntries(axes.map(axis => {
    const samples = current.filter(a => Object.hasOwn(a.derivedWeights, axis.id));
    const totalWeight = samples.reduce((sum, a) => sum + a.weight, 0);
    const score = totalWeight ? samples.reduce((sum, a) => sum + a.derivedWeights[axis.id] * a.weight, 0) / totalWeight : null;
    const confidence = samples.length;
    const visibility = confidence < settings.minimumAxisAnswers ? 'hidden' : confidence < settings.provisionalBelow ? 'provisional' : 'available';
    return [axis.id, { score, confidence, totalWeight, visibility, position: score === null || visibility === 'hidden' ? null : Math.abs(score) < settings.middleAbsoluteBelow ? 'middle' : score < 0 ? 'negative' : 'positive', evidenceAnswerIds: samples.map(a => a.id) }];
  }));
}
