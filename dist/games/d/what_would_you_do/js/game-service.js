// UI-facing facade. All persistence passes through Storage; no DOM/Lit imports.
import { appendAnswer, reviseAnswer, appendReason, localDate, currentAnswers } from './answer-history.js';
import { assignDailyReflections, dailyReflectionCards, recordDailyReflectionAction } from './daily-reflection-engine.js';
import { appendWordEntry } from './word-engine.js';
import { appendReevaluation, appendReevaluationNote } from './reevaluation-engine.js';
import { boundaryJourneys } from './boundary-engine.js';
import { appendComparison } from './comparison-engine.js';
import { appendDialogue } from './dialogue-engine.js';
import { appendReflection } from './reflection-engine.js';
import { detectComments, selectComment, recordShownComment, formatComment } from './comment-engine.js';
import { analyzeProfile } from './profile-engine.js';
import { assignToday, chooseQuestion, eligibleFollowUps, dailyProgress, isQuestionActive } from './question-engine.js';
import { check } from './validation.js';

export function createGameService({ storage, catalog, clock = () => new Date().toISOString(), makeId = () => globalThis.crypto.randomUUID() }) {
  const question = id => { const q = catalog.questions.questions.find(q => q.id === id); check(q,'Unknown question'); return q; };
  const followUp = id => { const f = catalog.followups.followUps.find(f => f.id === id); check(f,'Unknown follow-up'); return f; };
  const report = answerId => {
    const state = storage.getState(), now = clock(), profile = analyzeProfile(state,catalog);
    const candidates = detectComments(state,catalog,{now,profile});
    const comment = selectComment(candidates,state,{answerId});
    return { state, profile, comment, commentText: comment ? formatComment(comment,catalog) : null, followUps: eligibleFollowUps(state,catalog,{event:'after_answer',answerId,date:localDate(now)}), storageStatus:storage.getStatus() };
  };
  return {
    getState: () => storage.getState(),
    getProfile: options => analyzeProfile(storage.getState(),catalog,options),
    getHistory: () => storage.getState().answers,
    getNextQuestion: ({ axisId = null } = {}) => chooseQuestion(storage.getState(), catalog, { date: localDate(clock()), axisId }),
    getDailyProgress: () => dailyProgress(storage.getState(),localDate(clock())),
    getToday: options => {
      const result = assignToday(storage.getState(),catalog,{...options,date:localDate(clock())});
      storage.saveState(result.state);
      return result;
    },
    answer: (questionId, optionId, {source = 'archive', expectedPreviousId} = {}) => {
      const now = clock(), id = makeId(), state = storage.getState();
      let q = question(questionId);
      check(isQuestionActive(q, catalog), 'Question is retired; use the saved answer to revisit it');
      if (source === 'daily') {
        const assigned = assignToday(state,catalog,{date:localDate(now)});
        check(assigned.assignment?.questionId === questionId && assigned.question, 'Today’s question is unavailable');
        q = assigned.question;
        // getToday must persist the assignment before submission.
      }
      storage.update(s => appendAnswer(s,q,optionId,{now,id,source,expectedPreviousId}));
      return report(id);
    },
    revise: (answerId, optionId) => {
      const now = clock(), id = makeId();
      storage.update(s => reviseAnswer(s,answerId,optionId,{now,id}));
      return report(id);
    },
    answerReason: (answerId, followUpId, optionId) => {
      const now = clock(), id = makeId();
      const state = storage.getState();
      const existing = currentAnswers(state.answers).find(a => a.id === answerId)?.followUps.some(f => f.id === followUpId);
      check(existing || eligibleFollowUps(state,catalog,{event:'after_answer',answerId,date:localDate(now)}).some(f => f.id === followUpId), 'Reason is not currently eligible');
      storage.update(s => appendReason(s,answerId,followUp(followUpId),optionId,{now,id}));
      return report(id);
    },
    writeReflection: (followUpId,text,options = {}) => {
      const now = clock();
      const f = followUp(followUpId);
      if (options.parentReflectionId) {
        const due = detectComments(storage.getState(),catalog,{now}).some(c => c.type === 'REFLECTION_RETURN' && c.evidence.reflectionIds.includes(options.parentReflectionId));
        check(due,'Reflection is not due');
      } else check(eligibleFollowUps(storage.getState(),catalog,{event:'after_answer',answerId:options.sourceAnswerId,date:localDate(now)}).some(item => item.id === followUpId), 'Reflection is not currently eligible');
      return storage.update(s => appendReflection(s,f,text,{...options,now,id:makeId()}));
    },
    getDailyReflections: () => {
      const state = storage.getState(), now = clock();
      const next = assignDailyReflections(state, catalog, { now, makeId });
      if (JSON.stringify(next) !== JSON.stringify(state)) storage.saveState(next);
      return dailyReflectionCards(storage.getState(), catalog, now);
    },
    dailyReflectionAction: (suggestionId, action) => {
      const now = clock();
      const card = dailyReflectionCards(storage.getState(), catalog, now).find(r => r.id === suggestionId);
      storage.update(s => recordDailyReflectionAction(s, catalog, suggestionId, action, { now, id: makeId() }));
      return card.href;
    },
    writeWords: (sourceReflectionId, stanceId, text) => storage.update(s => appendWordEntry(s, catalog.followups.wordDialogue, { sourceReflectionId, stanceId, text, now: clock(), id: makeId() })),
    reevaluate: (previousAnswerId, optionId, reason = '') => {
      const id = makeId(), answerId = makeId();
      storage.update(s => appendReevaluation(s, catalog.followups.reevaluationDialogue, { previousAnswerId, optionId, reason, id, answerId, now: clock() }));
      return id;
    },
    writeReevaluationNote: (reevaluationId, stanceId, text = '') => storage.update(s => appendReevaluationNote(s, catalog.followups.reevaluationDialogue, { reevaluationId, stanceId, text, id: makeId(), now: clock() })),
    answerBoundary: (journeyId, questionId, optionId) => {
      const state = storage.getState();
      const journey = boundaryJourneys(state, catalog).find(j => j.id === journeyId);
      check(journey?.nextQuestion?.id === questionId, 'Boundary question is not next');
      return storage.update(s => appendAnswer(s, journey.nextQuestion, optionId, { now: clock(), id: makeId(), source: 'boundary', expectedPreviousId: null }));
    },
    replyToComparison: (comparisonId, stanceId, text = '') => storage.update(s => appendComparison(s, catalog, { comparisonId, stanceId, text, now: clock(), id: makeId() })),
    replyToPast: (sourceType, sourceId, stanceId, text = '') => storage.update(s => appendDialogue(s, catalog.followups.manualDialogue, { sourceType, sourceId, stanceId, text, now: clock(), id: makeId() })),
    markCommentShown: id => {
      const state = storage.getState(), now = clock();
      const candidate = detectComments(state,catalog,{now,profile:analyzeProfile(state,catalog)}).find(c => c.id === id);
      check(candidate, 'Comment is no longer current');
      return storage.update(s => recordShownComment(s,candidate,now));
    },
    currentAnswer: questionId => currentAnswers(storage.getState().answers).find(a => a.questionId === questionId) ?? null,
  };
}
