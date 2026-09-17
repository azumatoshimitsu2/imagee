import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCatalog, validateCatalog } from '../js/data-loader.js';
import { createStorage, memoryAdapter, StorageConflictError } from '../js/storage.js';
import { createState, appendAnswer, appendReason, reviseAnswer, currentAnswers, distinctCount, localDate } from '../js/answer-history.js';
import { scoreAnswers } from '../js/scoring-engine.js';
import { detectComments, formatComment, selectComment, recordShownComment } from '../js/comment-engine.js';
import { analyzeProfile, comparePeriods } from '../js/profile-engine.js';
import { appendReflection } from '../js/reflection-engine.js';
import { availableQuestions, chooseQuestion, assignToday, eligibleFollowUps, dailyProgress } from '../js/question-engine.js';
import { createGameService } from '../js/game-service.js';
import { validateState } from '../js/state-validation.js';

const catalog = await loadCatalog({fetcher: async url => ({ok:true, json:async () => JSON.parse(await readFile(url,'utf8'))})});
const schemas = catalog.schemas;
const time = '2026-09-15T09:00:00+09:00';
let sequence = 0;
const id = () => `test-${++sequence}`;
const q = name => catalog.questions.questions.find(q => q.id === name);
const f = name => catalog.followups.followUps.find(f => f.id === name);
const add = (state, questionId = 'q003', option = 'A', options = {}) => appendAnswer(state, typeof questionId === 'string' ? q(questionId) : questionId, option, {now:time,id:id(),...options});
const empty = () => createState(time);

test('self-paced selection advances on the same day and ignores unavailable legacy assignments',()=>{
  const storage=store();
  const old=empty();old.dailyAssignments.push({localDate:localDate(time),questionId:'q001',questionVersion:1,completedAnswerId:null});
  storage.saveState(old);
  const game=createGameService({storage,catalog,clock:()=>time,makeId:id});
  const seen=new Set();
  for(let n=0;n<10;n++) {
    const before=storage.exportJSON();
    const question=game.getNextQuestion();
    assert.equal(storage.exportJSON(),before);
    assert.ok(question && !seen.has(question.id));
    seen.add(question.id);
    game.answer(question.id,n===1?'unsure':'A',{expectedPreviousId:null});
  }
  assert.deepEqual(storage.getState().dailyAssignments,old.dailyAssignments);
  assert.equal(storage.getState().answers.length,10);
  assert.deepEqual([...seen],catalog.settings.scheduling.initialQuestionIds);
  assert.throws(()=>game.answer('q001','A',{expectedPreviousId:null}));
  const restored=store();restored.importJSON(storage.exportJSON());
  assert.equal(createGameService({storage:restored,catalog,clock:()=>time}).getNextQuestion().id,game.getNextQuestion().id);
});

test('self-paced sequence ends without repeating completed or unsure questions',()=>{
  const storage=store();
  let state=empty();for(const question of catalog.questions.questions)state=add(state,question,'unsure');
  storage.saveState(state);
  const game=createGameService({storage,catalog,clock:()=>time});
  assert.equal(game.getNextQuestion(),null);
});
const store = (adapter = memoryAdapter()) => createStorage({schemas,adapter,now:()=>time});
function fill(state,count) {
  while (distinctCount(state) < count) {
    const question = structuredClone(q('q004'));
    question.id = `filler-${distinctCount(state)}`;
    question.relations = []; question.followUps = [];
    state = add(state,question);
  }
  return state;
}
function setEvent(state,questionId,optionId,at) {
  return add(state,questionId,optionId,{now:at});
}

test('external data loader rejects HTTP failures and invalid references or detectors', async () => {
  await assert.rejects(loadCatalog({fetcher:async()=>({ok:false,status:404})}),/Cannot load/);
  const bad = structuredClone(catalog);
  bad.questions.questions[0].followUps.push('missing');
  assert.throws(()=>validateCatalog(bad),/unknown follow-up/);
  const badRule = structuredClone(catalog); badRule.rules.rules[0].detector='execute_javascript';
  assert.throws(()=>validateCatalog(badRule),/unsupported detector/);
  const wrongOption = structuredClone(catalog); wrongOption.rules.rules[0].when.optionPairs[0].source='missing';
  assert.throws(()=>validateCatalog(wrongOption),/invalid option pair/);
});

test('append and revision preserve snapshots; latest answer alone contributes', () => {
  let state = add(empty());
  const first = structuredClone(state.answers[0]);
  const next = reviseAnswer(state,first.id,'B',{id:id(),now:time});
  assert.deepEqual(state.answers[0],first);
  assert.deepEqual(next.answers[0],first);
  assert.equal(currentAnswers(next.answers).length,1);
  assert.equal(distinctCount(next),1);
  assert.equal(scoreAnswers(next.answers,catalog.axes.axes,catalog.settings.scoring).principle_outcome.score,-.7);
  validateState(next,schemas);
  assert.throws(()=>reviseAnswer(next,first.id,'A',{id:id(),now:time}),/current answer/);
});

test('reason changes are appended and do not add scored samples', () => {
  let state = add(empty());
  state = appendReason(state,state.answers[0].id,f('fu_reason_conditions'),'impact',{id:id(),now:time});
  assert.equal(state.answers[0].followUps.length,0);
  assert.equal(state.answers[1].followUps[0].optionId,'impact');
  assert.equal(scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring).principle_outcome.confidence,1);
  validateState(state,schemas);
});

test('scoring is deterministic, weighted, and distinguishes missing from measured zero', () => {
  let state = empty();
  for (const [index,weight,value] of [[1,1,-1],[2,3,1],[3,1,0]]) {
    const question=structuredClone(q('q004'));question.id=`weight-${index}`;question.importance=weight;question.options[0].weights={principle_outcome:value};
    state=add(state,question);
  }
  const a=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  assert.equal(a.principle_outcome.score,.4);
  assert.equal(a.principle_outcome.confidence,3);
  assert.equal(a.principle_outcome.visibility,'provisional');
  assert.equal(a.freedom_security.score,null);
  assert.deepEqual(a,scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring));
});

test('non-answer revisions remove old score and self reports do not score', () => {
  let state=add(empty());
  state=reviseAnswer(state,state.answers[0].id,'unsure',{id:id(),now:time});
  state=add(state,'q030',q('q030').options[0].id);
  assert.equal(distinctCount(state),1);
  const result=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  assert.equal(result.principle_outcome.score,null);
  assert.equal(result.principle_outcome.visibility,'hidden');
});

test('export clear import is lossless including reasons, changes, and literal user text', () => {
  const storage=store();
  let state=fill(add(empty(),'q030',q('q030').options[0].id),20);
  const source=state.answers[0];
  state=appendReflection(state,f('fu_self_definition'),'<img src=x onerror=alert(1)>自由',{sourceAnswerId:source.id,id:id(),now:time});
  state=add(state,'q003');
  state=appendReason(state,currentAnswers(state.answers).find(a=>a.questionId==='q003').id,f('fu_reason_conditions'),'impact',{id:id(),now:time});
  storage.saveState(state);
  const exported=storage.exportJSON();
  storage.clear();
  assert.equal(storage.getState().answers.length,0);
  storage.importJSON(exported);
  assert.deepEqual(storage.getState(),state);
  const copy=storage.getState(); copy.answers.length=0;
  assert.equal(storage.getState().answers.length,state.answers.length);
});

test('corrupted saved JSON is retained, memory remains usable, explicit clear removes it', () => {
  const adapter=memoryAdapter({'selfDialogueGame:v1':'{broken'});
  const storage=store(adapter);
  assert.equal(storage.getStatus().issue,'invalid_saved_data');
  assert.equal(storage.getRecoveryText(),'{broken');
  storage.saveState(add(storage.getState()));
  assert.equal(adapter.getItem('selfDialogueGame:v1'),'{broken');
  storage.clear();
  assert.equal(adapter.getItem('selfDialogueGame:v1'),null);
});

test('unavailable and quota-exceeded storage retain in-memory work and report status', () => {
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');}};
  const a=store(denied);a.saveState(add(a.getState()));
  assert.equal(a.getStatus().mode,'memory');assert.equal(a.getState().answers.length,1);
  const quota={getItem(){return null;},setItem(){const e=new Error();e.name='QuotaExceededError';throw e;},removeItem(){}};
  const b=store(quota);b.saveState(add(b.getState()));
  assert.equal(b.getStatus().issue,'quota_exceeded');assert.equal(b.getState().answers.length,1);
});

test('bad imports cannot destroy state: format, versions, weights, prototype keys and size', () => {
  const s=store();s.saveState(add(empty()));const before=s.exportJSON();
  const variants=[null,{...empty(),schemaVersion:999},JSON.parse('{"schemaVersion":1,"__proto__":{"polluted":true}}')];
  const mismatch=JSON.parse(before);mismatch.answers[0].derivedWeights.principle_outcome=1;variants.push(mismatch);
  const date=JSON.parse(before);date.answers[0].answeredAt='2026-02-30T09:00:00Z';variants.push(date);
  for(const value of variants){assert.throws(()=>s.importJSON(JSON.stringify(value)));assert.equal(s.exportJSON(),before);}
  assert.throws(()=>s.importJSON('{'));assert.equal(s.exportJSON(),before);
  assert.throws(()=>s.importJSON(' '.repeat(5*1024*1024+1)),/too large/);
  assert.equal({}.polluted,undefined);
});

test('forks, cycles, multiple roots, and altered old events are rejected', () => {
  let state=add(empty());state=reviseAnswer(state,state.answers[0].id,'B',{id:id(),now:time});
  const s=store();s.saveState(state);
  const fork=structuredClone(state);fork.answers.push({...structuredClone(fork.answers[1]),id:id()});
  assert.throws(()=>s.importJSON(JSON.stringify(fork)),/branching/);
  const cycle=structuredClone(state);cycle.answers[0].supersedesAnswerId=cycle.answers[1].id;
  assert.throws(()=>s.importJSON(JSON.stringify(cycle)),/Cyclic/);
  const roots=structuredClone(state);roots.answers[1].supersedesAnswerId=null;
  assert.throws(()=>s.importJSON(JSON.stringify(roots)),/Multiple answer roots/);
  const altered=structuredClone(state);altered.answers[0].source='reevaluation';
  assert.throws(()=>s.saveState(altered),/overwrite/);
});

test('stale browser tabs do not overwrite newer persistent data', () => {
  const backend=memoryAdapter(),a=store(backend),b=store(backend);
  a.saveState(add(a.getState()));
  assert.throws(()=>b.saveState(add(b.getState(),'q004')),StorageConflictError);
  b.reload();b.saveState(add(b.getState(),'q004'));
  assert.equal(b.getState().answers.length,2);
});

test('question version updates retain the original snapshot and old score', () => {
  const storage=store();storage.saveState(add(empty()));
  const updated=structuredClone(q('q003'));updated.version++;updated.body='改訂した本文';updated.options[0].weights.principle_outcome=.1;
  storage.update(s=>add(s,updated));
  assert.equal(storage.getState().answers[0].snapshot.body,q('q003').body);
  assert.equal(storage.getState().answers[0].derivedWeights.principle_outcome,.7);
  assert.equal(currentAnswers(storage.getState().answers)[0].questionVersion,updated.version);
});

const examples=JSON.parse(await readFile(new URL('../data/examples/rule-cases.json',import.meta.url),'utf8'));
for(const example of examples.cases) test(`rule acceptance: ${example.name}`,()=>{
  let state=empty();
  for(const answer of example.answers){const question=structuredClone(q(answer.questionId));question.version=answer.questionVersion;state=add(state,question,answer.optionId);}
  state=fill(state,example.distinctQuestions);
  assert.deepEqual(detectComments(state,catalog,{now:time}).map(c=>c.ruleId).sort(),[...example.expectedRuleIds].sort());
});

test('comments order prior/current by time, preserve literal template text and deduplicate',()=>{
  let state=add(empty(),'q024','A',{now:'2026-09-01T09:00:00Z'});
  const altered=structuredClone(q('q003'));altered.title='<img src=x onerror=alert(1)>';
  state=add(state,altered,'A',{now:'2026-09-15T09:00:00Z'});state=fill(state,10);
  const candidates=detectComments(state,catalog,{now:time});const comment=selectComment(candidates,state);
  assert.equal(comment.templateData.previousTitle,q('q024').title);
  assert.ok(formatComment(comment,catalog).includes(altered.title));
  state=recordShownComment(state,comment,time);
  assert.equal(selectComment(candidates,state),null);
  assert.equal(recordShownComment(state,comment,time).discoveries.length,1);
  const current=currentAnswers(state.answers).find(a=>a.questionId==='q003');
  state=reviseAnswer(state,current.id,'B',{id:id(),now:time});
  assert.equal(detectComments(state,catalog,{now:time})[0].type,'CONSISTENCY');
});

test('boundary refuses changed constants even with declared pair',()=>{
  let state=add(empty(),'q007');const question=structuredClone(q('q011'));question.scenario.constants.closePerson='family';
  state=fill(add(state,question),20);
  assert.equal(detectComments(state,catalog,{now:time}).length,0);
});

test('profile with too few answers hides direction and leaves advanced metrics provisional',()=>{
  const profile=analyzeProfile(add(empty()),catalog);
  assert.equal(profile.axes.principle_outcome.visibility,'hidden');
  assert.equal(profile.axes.principle_outcome.position,null);
  assert.equal(profile.axes.principle_outcome.consistency.value,null);
  assert.equal(profile.axes.principle_outcome.contextDependency,null);
  assert.equal(profile.axes.principle_outcome.changeOverTime,null);
  assert.equal(profile.axes.principle_outcome.advancedAnalysisVisible,false);
});

test('context compares sufficiently sampled categories, consistency uses only explicit pairs',()=>{
  let state=empty();
  for(let n=0;n<6;n++){const question=structuredClone(q('q004'));question.id=`context-${n}`;question.category=[n<3?'work':'family'];question.options[0].weights={principle_outcome:n<3?-1:1};state=add(state,question);}
  const axis=analyzeProfile(state,catalog).axes.principle_outcome;
  assert.equal(axis.contextDependency,1);assert.equal(axis.consistency.value,null);
  assert.equal(detectComments(state,catalog).length,0);
});

test('time comparison requires explicit non-overlapping periods and matched versions',()=>{
  let state=empty();
  for(let n=0;n<10;n++){const question=structuredClone(q('q004'));question.id=`time-${n}`;question.options[0].weights={principle_outcome:-.4};question.options[1].weights={principle_outcome:.4};state=add(state,question,'A',{now:'2026-01-01T09:00:00Z'});state=add(state,question,'B',{now:'2026-03-01T09:00:00Z'});}
  const periods={earlier:{from:'2026-01-01T00:00:00Z',to:'2026-01-31T23:59:59Z'},recent:{from:'2026-03-01T00:00:00Z',to:'2026-03-31T23:59:59Z'}};
  assert.ok(Math.abs(comparePeriods(state,catalog,periods).principle_outcome.delta - .8) < 1e-12);
  assert.equal(comparePeriods(state,catalog,null).principle_outcome,null);
  assert.throws(()=>comparePeriods(state,catalog,{...periods,recent:periods.earlier}),/overlap/);
  const changed=structuredClone(state);for(const a of changed.answers.filter(a=>a.optionId==='B')){a.questionVersion++;a.snapshot.version++;}
  assert.equal(comparePeriods(changed,catalog,periods).principle_outcome,null);
  const modified=structuredClone(catalog);modified.rules.rules.find(r=>r.type==='TIME_SHIFT').enabled=true;modified.settings.progression.timeAndReflectionReturnFrom=10;
  const profile=analyzeProfile(state,modified,{periods});
  assert.ok(detectComments(state,modified,{profile}).some(c=>c.type==='TIME_SHIFT'));
  assert.ok(!detectComments(state,catalog,{profile}).some(c=>c.type==='TIME_SHIFT'));
});

test('reflection return respects disabled settings, elapsed time and previous replies',()=>{
  let state=fill(add(empty(),'q030',q('q030').options[0].id),20);
  state=appendReflection(state,f('fu_self_definition'),'自由とは <script>何か</script>',{id:id(),sourceAnswerId:state.answers[0].id,now:time});
  assert.equal(detectComments(state,catalog,{now:'2026-12-01T09:00:00Z'}).length,0);
  const modified=structuredClone(catalog);modified.rules.rules.find(r=>r.type==='REFLECTION_RETURN').enabled=true;modified.settings.progression.timeAndReflectionReturnFrom=20;
  assert.equal(detectComments(state,modified,{now:time}).length,0);
  const comments=detectComments(state,modified,{now:'2026-12-01T09:00:00Z'});
  assert.equal(comments[0].type,'REFLECTION_RETURN');
  assert.ok(formatComment(comments[0],modified).includes('<script>何か</script>'));
  state=appendReflection(state,f('fu_reflection_response'),'今もそう思う',{id:id(),parentReflectionId:state.reflections[0].id,now:'2026-12-01T09:00:00Z'});
  assert.equal(detectComments(state,modified,{now:'2026-12-01T09:00:00Z'}).length,0);
  validateState(state,schemas);
});

test('daily question is stable after other answers and progress excludes archive',()=>{
  const assigned=assignToday(empty(),catalog,{date:'2026-09-15'});
  let state=add(assigned.state,'q004');
  const again=assignToday(state,catalog,{date:'2026-09-15'});
  assert.equal(again.question.id,assigned.question.id);
  assert.equal(dailyProgress(state,'2026-09-15').completedDays,0);
  state=add(state,assigned.question.id,'A',{source:'daily',date:'2026-09-15'});
  assert.equal(dailyProgress(state,'2026-09-15').streak,1);
  validateState(state,schemas);
});

test('assigned version changes report unavailability without quietly switching questions',()=>{
  const assigned=assignToday(empty(),catalog,{date:'2026-09-15'});
  const changed=structuredClone(catalog);changed.questions.questions.find(q=>q.id===assigned.question.id).version++;
  const result=assignToday(assigned.state,changed,{date:'2026-09-15'});
  assert.equal(result.unavailable,true);assert.equal(result.question,null);
});

test('data-only question addition works and exhausted catalogs return null',()=>{
  let state=empty();for(const question of catalog.questions.questions)state=add(state,question,question.options[0].id);
  assert.equal(chooseQuestion(state,catalog),null);
  const changed=structuredClone(catalog);const added=structuredClone(q('q004'));added.id='new-question';added.relations=[];changed.questions.questions.push(added);
  validateCatalog(changed);
  assert.equal(chooseQuestion(state,changed).id,'new-question');
  assert.equal(chooseQuestion(state,changed,{includeDrafts:false}),null);
});

test('follow-up eligibility limits reasons but unlocks new boundary questions on the same day',()=>{
  let state=fill(empty(),3);state=add(state,'q003');const answer=state.answers.at(-1);
  assert.ok(eligibleFollowUps(state,catalog,{event:'after_answer',answerId:answer.id,date:'2026-09-15'}).some(f=>f.kind==='reason'));
  state=appendReason(state,answer.id,f('fu_reason_conditions'),'impact',{id:id(),now:time});
  state=add(state,'q001');
  assert.equal(eligibleFollowUps(state,catalog,{event:'after_answer',answerId:state.answers.at(-1).id,date:'2026-09-15'}).length,0);
  state=add(state,'q007');
  assert.ok(!availableQuestions(state,catalog,{date:'2026-09-15'}).some(q=>q.id==='q011'));
  state=fill(state,20);
  assert.ok(availableQuestions(state,catalog,{date:'2026-09-15'}).some(q=>q.id==='q011'));
  assert.ok(eligibleFollowUps(state,catalog,{event:'later_day',date:'2026-09-15'}).some(f=>f.targetQuestionId==='q011'));
  assert.ok(eligibleFollowUps(state,catalog,{event:'later_day',date:'2026-09-16'}).some(f=>f.targetQuestionId==='q011'));
});

test('service composes storage, answers, revisions and profile without browser globals',()=>{
  const storage=store(),service=createGameService({storage,catalog,clock:()=>time,makeId:id});
  const today=service.getToday();
  const result=service.answer(today.question.id,'A',{source:'daily'});
  assert.equal(result.state.answers.length,1);
  assert.equal(service.getDailyProgress().todayCompleted,true);
  service.revise(result.state.answers[0].id,'B');
  assert.equal(service.getHistory().length,2);
  assert.equal(service.getProfile().distinctQuestions,1);
  assert.equal(service.currentAnswer(today.question.id).optionId,'B');
});

const { appendDialogue } = await import('../js/dialogue-engine.js');
test('manual dialogue preserves historical answers and does not affect analysis', () => {
  let state = add(empty()); const original = state.answers[0];
  state = reviseAnswer(state, original.id, 'B', { now: time, id: id() });
  const before = structuredClone(state), profile = analyzeProfile(state, catalog);
  const next = appendDialogue(state, catalog.followups.manualDialogue, {sourceType:'answer',sourceId:original.id,stanceId:'changed',text:'<img src=x onerror=alert(1)>',now:time,id:id()});
  assert.deepEqual(state,before); assert.deepEqual(next.answers,before.answers);
  assert.deepEqual(analyzeProfile(next,catalog),profile);
  validateState(next,schemas);
  const storage=store(); storage.saveState(next);
  const restored=store(); restored.importJSON(storage.exportJSON());
  assert.deepEqual(restored.getState(),next);
  const changed=structuredClone(next);changed.dialogues[0].text='overwrite';
  assert.throws(()=>storage.saveState(changed),/Cannot overwrite/);
  const missing=structuredClone(next);missing.dialogues[0].sourceId='missing';
  assert.throws(()=>restored.importJSON(JSON.stringify(missing)),/Missing dialogue source/);
  restored.clear();assert.equal(restored.getState().dialogues?.length ?? 0,0);
});
test('manual dialogue validates inputs and accepts legacy v1 without replies',()=>{
  const state=add(empty()),sourceId=state.answers[0].id;
  const options={sourceType:'answer',sourceId,stanceId:'same',now:time,id:id()};
  for(const patch of [{sourceType:'other'},{sourceId:'missing'},{stanceId:'bad'},{text:'x'.repeat(2001)},{now:'bad'}]) {
    assert.throws(()=>appendDialogue(state,catalog.followups.manualDialogue,{...options,...patch}));
  }
  const storage=store(); storage.importJSON(JSON.stringify(state));
  const next=appendDialogue(storage.getState(),catalog.followups.manualDialogue,options);
  storage.saveState(next);assert.equal(storage.getState().dialogues[0].text,'');
});
test('manual dialogue can revisit literal free writing without enabling automatic rules',()=>{
  const state=empty();state.reflections.push({id:'words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'自由とは？',text:'<script>bad()</script>',createdAt:time,distinctQuestionsAtCreation:0,parentReflectionId:null,returnPolicyId:null});
  const storage=store();storage.saveState(state);
  const game=createGameService({storage,catalog,clock:()=>time,makeId:id});
  game.replyToPast('reflection','words','unsure','まだ考えています');
  validateState(storage.getState(),schemas);
  assert.equal(storage.getState().reflections[0].text,state.reflections[0].text);
  assert.equal(distinctCount(storage.getState()),0);
  assert.equal(detectComments(storage.getState(),catalog).length,0);
});

const { appendComparison, comparisonRecords } = await import('../js/comparison-engine.js');
function comparisonState() { return fill(add(add(empty(),'q003'),'q024'),10); }
test('comparison uses explicit eligible relations and rejects arbitrary pairs or insufficient answers',()=>{
  assert.equal(comparisonRecords(add(add(empty(),'q003'),'q024'),catalog).length,0);
  assert.equal(comparisonRecords(fill(add(add(empty(),'q004'),'q006'),10),catalog).length,0);
  const state=comparisonState(),record=comparisonRecords(state,catalog)[0];
  assert.ok(record);assert.equal(record.type,'TENSION');
  for(const patch of [{comparisonId:'unrelated'},{stanceId:'unknown'},{text:'x'.repeat(2001)},{now:'bad'}]) {
    assert.throws(()=>appendComparison(state,catalog,{comparisonId:record.id,stanceId:'context',now:time,id:id(),...patch}));
  }
});
test('comparison replies preserve old versions and analysis through revision, rule edits and JSON round trip',()=>{
  const state=comparisonState(),record=comparisonRecords(state,catalog)[0],before=structuredClone(state);
  const storage=store();storage.saveState(state);
  const game=createGameService({storage,catalog,clock:()=>time,makeId:id});
  game.replyToComparison(record.id,'context','<img src=x onerror=alert(1)>');
  const replied=storage.getState();assert.deepEqual(state,before);
  assert.deepEqual(replied.answers,state.answers);
  assert.deepEqual(analyzeProfile(replied,catalog),analyzeProfile(state,catalog));
  const original=state.answers.find(a=>a.questionId==='q003');
  const revised=reviseAnswer(replied,original.id,'B',{id:id(),now:time});
  const changedCatalog=structuredClone(catalog);changedCatalog.rules.rules.forEach(r=>{r.enabled=false;});
  assert.deepEqual(comparisonRecords(revised,changedCatalog),[record]);
  const next=appendComparison(revised,changedCatalog,{comparisonId:record.id,stanceId:'unsure',text:'',now:time,id:id()});
  validateState(next,schemas);storage.saveState(next);
  const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),next);
  const changed=structuredClone(next);changed.comparisons[0].text='overwrite';assert.throws(()=>storage.saveState(changed),/Cannot overwrite/);
  const bad=structuredClone(next);bad.comparisons[0].comparison.answerIds[0]='missing';assert.throws(()=>restored.importJSON(JSON.stringify(bad)),/comparison/);
  restored.clear();assert.equal(restored.getState().comparisons?.length ?? 0,0);
});

const { boundaryJourneys } = await import('../js/boundary-engine.js');
function delayState(options) {
  return options.reduce((s,option,i)=>add(s,['q031','q032','q033'][i],option),empty());
}
test('guided boundary series is resumable, ordered and excluded from automatic questions',()=>{
  const storage=store();const game=createGameService({storage,catalog,clock:()=>time,makeId:id});
  assert.ok(!availableQuestions(empty(),catalog).some(q=>q.scenario?.seriesId==='help_delay'));
  assert.throws(()=>game.answerBoundary('help_delay','q033','A'),/not next/);
  game.answerBoundary('help_delay','q031','A');
  assert.throws(()=>game.answerBoundary('help_delay','q031','B'),/not next/);
  assert.equal(boundaryJourneys(storage.getState(),catalog)[0].nextQuestion.id,'q032');
  const restored=store();restored.importJSON(storage.exportJSON());
  assert.equal(boundaryJourneys(restored.getState(),catalog)[0].answeredCount,1);
  game.answerBoundary('help_delay','q032','A');game.answerBoundary('help_delay','q033','B');
  const result=boundaryJourneys(storage.getState(),catalog)[0];assert.equal(result.complete,true);
  assert.equal(result.boundaries.length,1);
  assert.deepEqual(result.boundaries[0].answerIds.map(id=>storage.getState().answers.find(a=>a.id===id).snapshot.scenario.value).sort((a,b)=>a-b),[30,120]);
  assert.equal(analyzeProfile(storage.getState(),catalog).axes.individual_collective.confidence,0);
  game.replyToComparison(result.boundaries[0].id,'context','自分の時間も大切にしたい');
  assert.equal(storage.getState().comparisons[0].promptSnapshot,catalog.followups.comparisonDialogue.promptsByType.BOUNDARY);
});
test('boundary observation handles same, undecided and non-monotonic decisions without a personal threshold',()=>{
  const result=options=>boundaryJourneys(delayState(options),catalog)[0];
  assert.equal(result(['A','A','A']).boundaries.length,0);
  assert.equal(result(['unsure','unsure','unsure']).boundaries.length,0);
  assert.equal(result(['A','unsure','B']).boundaries.length,1);
  assert.equal(result(['A','B','A']).boundaries.length,2);
  const state=delayState(['A','A','B']);const changed=structuredClone(catalog);
  changed.questions.questions.find(q=>q.id==='q032').version=2;
  const incompatible=boundaryJourneys(state,changed)[0];assert.equal(incompatible.compatible,false);assert.equal(incompatible.boundaries.length,0);
});

const { appendReevaluation, appendReevaluationNote } = await import('../js/reevaluation-engine.js');
test('blind reevaluation preserves original question version, old reasons and immutable history',()=>{
  let state=add(empty(),'q003');
  const follow=f('fu_reason_conditions');
  state=appendReason(state,state.answers[0].id,follow,follow.options[0].id,{now:time,id:id()});
  const before=structuredClone(state),previous=currentAnswers(state.answers)[0];
  const storage=store();storage.saveState(state);
  const updatedCatalog=structuredClone(catalog);updatedCatalog.questions.questions.find(q=>q.id==='q003').version++;
  updatedCatalog.questions.questions.find(q=>q.id==='q003').body='New wording must not leak into the old question';
  const game=createGameService({storage,catalog:updatedCatalog,clock:()=>time,makeId:id});
  const entryId=game.reevaluate(previous.id,'A','同じ答えでも、今は責任を考えた');
  const next=storage.getState(),answer=currentAnswers(next.answers)[0];
  assert.deepEqual(state,before);assert.deepEqual(answer.snapshot,previous.snapshot);assert.equal(answer.questionVersion,previous.questionVersion);
  assert.equal(answer.source,'reevaluation');assert.deepEqual(answer.followUps,[]);
  assert.deepEqual(next.answers.slice(0,2),before.answers);
  assert.equal(distinctCount(next),1);
  assert.deepEqual(analyzeProfile(next,catalog).axes.principle_outcome.score,analyzeProfile(before,catalog).axes.principle_outcome.score);
  assert.throws(()=>game.reevaluate(previous.id,'B'),/changed since opening/);
  game.writeReevaluationNote(entryId,'reason_changed','<img src=x onerror=alert(1)>');
  const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),storage.getState());
  const corrupt=restored.getState();corrupt.reevaluations[0].previousAnswerId='missing';assert.throws(()=>restored.importJSON(JSON.stringify(corrupt)),/reevaluation/);
  const changed=storage.getState();changed.reevaluationNotes[0].text='overwrite';assert.throws(()=>storage.saveState(changed),/Cannot overwrite/);
  restored.clear();assert.equal(restored.getState().reevaluations?.length ?? 0,0);
});
test('reevaluation validates notes, optional reasons and changed or undecided selections',()=>{
  const state=add(empty(),'q003'),previous=state.answers[0];
  const definition=catalog.followups.reevaluationDialogue;
  const input={previousAnswerId:previous.id,optionId:'B',now:time,id:'repeat',answerId:'new-answer'};
  for (const patch of [{reason:'x'.repeat(2001)},{optionId:'unknown'},{previousAnswerId:'missing'},{now:'bad'}]) assert.throws(()=>appendReevaluation(state,definition,{...input,...patch}));
  const changed=appendReevaluation(state,definition,input);validateState(changed,schemas);
  assert.equal(currentAnswers(changed.answers)[0].optionId,'B');assert.equal(changed.reevaluations[0].reason,'');
  for (const patch of [{reevaluationId:'missing'},{stanceId:'unknown'},{text:'x'.repeat(2001)},{now:'bad'}]) assert.throws(()=>appendReevaluationNote(changed,definition,{reevaluationId:'repeat',stanceId:'unsure',now:time,id:id(),...patch}));
  const unsure=appendReevaluation(state,definition,{...input,optionId:'unsure'});validateState(unsure,schemas);
  assert.equal(currentAnswers(unsure.answers)[0].optionId,'unsure');
  const again=appendReevaluation(changed,definition,{previousAnswerId:'new-answer',optionId:'A',now:time,id:'repeat-again',answerId:'answer-again'});
  validateState(again,schemas);assert.equal(again.reevaluations.length,2);
});

const { appendWordEntry, wordThreads } = await import('../js/word-engine.js');
function wordState() {
  const state=empty();
  state.reflections.push({id:'original-words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'あなたにとって自由とは何ですか？',text:'自分で選べること。',createdAt:'2026-01-01T00:00:00Z',distinctQuestionsAtCreation:0,parentReflectionId:null,returnPolicyId:null});
  return state;
}
test('word threads preserve literal text, existing replies and version boundaries in date order',()=>{
  const state=wordState(), original=state.reflections[0];
  state.reflections.push({...original,id:'again',text:'問い直した文章',createdAt:'2026-02-01T00:00:00Z'});
  state.reflections.push({...original,id:'new-version',followUpVersion:2,text:'別versionの文章'});
  state.reflections.push({...original,id:'child',parentReflectionId:'original-words',followUpId:'fu_reflection_response',text:'再提示への返事',createdAt:'2026-03-01T00:00:00Z'});
  let next=appendDialogue(state,catalog.followups.manualDialogue,{sourceType:'reflection',sourceId:'child',stanceId:'same',text:'前に書いた返事',now:time,id:id()});
  next=appendWordEntry(next,catalog.followups.wordDialogue,{sourceReflectionId:'original-words',stanceId:'add',text:'<img src=x onerror=alert(1)>\n選ばない自由も。',now:time,id:id()});
  validateState(next,schemas);
  const threads=wordThreads(next);assert.equal(threads.length,2);
  const thread=threads.find(t=>t.roots.includes('original-words'));assert.equal(thread.entries.length,5);
  assert.deepEqual(thread.roots,['original-words','again']);
  assert.equal(thread.entries[0].text,'自分で選べること。');assert.equal(thread.entries.at(-1).text,'<img src=x onerror=alert(1)>\n選ばない自由も。');
  assert.deepEqual(analyzeProfile(next,catalog),analyzeProfile(state,catalog));
  const storage=store();storage.saveState(next);const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),next);
  const bad=restored.getState();bad.wordEntries[0].sourceReflectionId='missing';assert.throws(()=>restored.importJSON(JSON.stringify(bad)),/original word/);
  const overwrite=restored.getState();overwrite.wordEntries[0].text='overwrite';assert.throws(()=>restored.saveState(overwrite),/Cannot overwrite/);
  restored.clear();assert.equal(restored.getState().wordEntries?.length ?? 0,0);
});
test('word entries require an original prompt, valid stance and nonblank bounded text',()=>{
  const state=wordState(),definition=catalog.followups.wordDialogue;
  const input={sourceReflectionId:'original-words',stanceId:'same',text:'今も、自分で選べること。',now:time,id:id()};
  for(const patch of [{sourceReflectionId:'missing'},{stanceId:'unknown'},{text:'  \n '},{text:'x'.repeat(2001)},{now:'2025-01-01T00:00:00Z'}]) assert.throws(()=>appendWordEntry(state,definition,{...input,...patch}));
  const storage=store();storage.importJSON(JSON.stringify(state));const game=createGameService({storage,catalog,clock:()=>time,makeId:id});
  game.writeWords('original-words','unsure','まだ、うまく言葉にできない。');
  assert.equal(storage.getState().wordEntries.length,1);assert.equal(state.wordEntries,undefined);
  assert.deepEqual(storage.getState().reflections,state.reflections);
  assert.equal(detectComments(storage.getState(),catalog).length,0);
});

const { reflectionCandidates, assignDailyReflections, dailyReflectionCards, recordDailyReflectionAction } = await import('../js/daily-reflection-engine.js');
const suggestionTime='2026-09-16T12:00:00+09:00';
function oldAnswerState(){return add(empty(),'q003','A',{now:'2026-09-09T12:00:00+09:00'});}
test('daily suggestions respect age, future dates, configured kinds and recent word activity',()=>{
  const state=oldAnswerState();
  assert.equal(reflectionCandidates(state,catalog,'2026-09-15T12:00:00+09:00').length,0);
  assert.equal(reflectionCandidates(state,catalog,suggestionTime).length,1);
  assert.equal(reflectionCandidates(state,catalog,'2026-09-01T12:00:00+09:00').length,0);
  const words=wordState();
  assert.equal(reflectionCandidates(words,catalog,suggestionTime)[0].kind,'words');
  const updated=appendWordEntry(words,catalog.followups.wordDialogue,{sourceReflectionId:'original-words',stanceId:'same',text:'今の言葉',now:suggestionTime,id:id()});
  assert.equal(reflectionCandidates(updated,catalog,suggestionTime).length,0);
  const pairs=comparisonState();
  assert.equal(reflectionCandidates(pairs,catalog,'2026-09-23T12:00:00+09:00')[0].kind,'comparison');
  const c=comparisonRecords(pairs,catalog)[0];
  const reflected=appendComparison(pairs,catalog,{comparisonId:c.id,stanceId:'context',now:time,id:id()});
  assert.ok(!reflectionCandidates(reflected,catalog,'2026-09-23T12:00:00+09:00').some(r=>r.kind==='comparison'));
});
test('daily assignment and dismissal are persistent, capped and never replace the same day',()=>{
  const state=oldAnswerState();
  const assigned=assignDailyReflections(state,catalog,{now:suggestionTime,makeId:id});
  validateState(assigned,schemas);assert.equal(assigned.dailyReflections.length,1);
  const card=dailyReflectionCards(assigned,catalog,suggestionTime)[0];
  assert.equal(card.kind,'reevaluation');assert.equal(card.title,q('q003').title);
  assert.ok(!JSON.stringify(card).includes(q('q003').options[0].label));
  const opened=recordDailyReflectionAction(assigned,catalog,card.id,'opened',{now:suggestionTime,id:id()});
  assert.equal(dailyReflectionCards(opened,catalog,suggestionTime)[0].opened,true);
  const dismissed=recordDailyReflectionAction(opened,catalog,card.id,'dismissed',{now:suggestionTime,id:id()});
  assert.equal(dailyReflectionCards(dismissed,catalog,suggestionTime)[0].status,'dismissed');
  assert.deepEqual(assignDailyReflections(dismissed,catalog,{now:suggestionTime,makeId:id}),dismissed);
  const tomorrow='2026-09-17T12:00:00+09:00';
  assert.equal(assignDailyReflections(dismissed,catalog,{now:tomorrow,makeId:id}).dailyReflections.length,1);
  const nextWeek=assignDailyReflections(dismissed,catalog,{now:'2026-09-23T12:00:00+09:00',makeId:id});
  assert.equal(nextWeek.dailyReflections.length,2);
  const storage=store();storage.saveState(dismissed);const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),dismissed);
  const bad=restored.getState();bad.dailyReflectionActions[0].suggestionId='missing';assert.throws(()=>restored.importJSON(JSON.stringify(bad)),/Missing daily/);
  const overwrite=restored.getState();overwrite.dailyReflections[0].title='overwrite';assert.throws(()=>restored.saveState(overwrite),/Cannot overwrite/);
  restored.clear();assert.equal(restored.getState().dailyReflections?.length ?? 0,0);
});
test('daily suggestions handle changed answers, stale actions and configurable limits without changing scores',()=>{
  const original=oldAnswerState();const assigned=assignDailyReflections(original,catalog,{now:suggestionTime,makeId:id});
  const changed=reviseAnswer(assigned,original.answers[0].id,'B',{now:suggestionTime,id:id()});
  assert.equal(dailyReflectionCards(changed,catalog,suggestionTime)[0].status,'updated');
  assert.throws(()=>recordDailyReflectionAction(changed,catalog,assigned.dailyReflections[0].id,'opened',{now:suggestionTime,id:id()}),/no longer available/);
  assert.throws(()=>recordDailyReflectionAction(assigned,catalog,assigned.dailyReflections[0].id,'opened',{now:'2026-09-17T12:00:00+09:00',id:id()}),/no longer available/);
  assert.deepEqual(analyzeProfile(assigned,catalog),analyzeProfile(original,catalog));
  const config=structuredClone(catalog);config.settings.dailyReflection.limitPerDay=2;
  const two=add(original,'q004','A',{now:'2026-09-09T12:00:00+09:00'});
  assert.equal(assignDailyReflections(two,config,{now:suggestionTime,makeId:id}).dailyReflections.length,2);
  config.settings.dailyReflection.enabled=false;assert.equal(reflectionCandidates(two,config,suggestionTime).length,0);
});

const beforeReview=JSON.parse(await readFile(new URL('../data/reviews/questions-before.json',import.meta.url),'utf8')).questions;
const oldQuestion=name=>beforeReview.find(q=>q.id===name);
test('editorial review retains authentic v1 snapshots and never retroactively changes their weights',()=>{
  let state=empty();for(const question of beforeReview) state=add(state,question);
  const storage=store();storage.saveState(state);
  const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),state);
  const original=state.answers.find(a=>a.questionId==='q004');assert.deepEqual(original.derivedWeights,{principle_outcome:-.4});
  const revised=add(state,'q004');validateState(revised,schemas);
  assert.deepEqual(revised.answers.find(a=>a.id===original.id),original);
  assert.deepEqual(currentAnswers(revised.answers).find(a=>a.questionId==='q004').derivedWeights,{});
  const one=add(empty(),oldQuestion('q004'));
  assert.equal(scoreAnswers(one.answers,catalog.axes.axes,catalog.settings.scoring).principle_outcome.score,-.4);
  assert.equal(scoreAnswers(add(one,'q004').answers,catalog.axes.axes,catalog.settings.scoring).principle_outcome.confidence,0);
});
test('review removes unsupported axes without replacing them with invented personality weights',()=>{
  for(const name of ['q002','q004','q007','q011']) for(const option of q(name).options) assert.deepEqual(option.weights,{});
  assert.deepEqual(q('q001').axes,['principle_outcome']);assert.deepEqual(q('q003').axes,['principle_outcome']);
  for(const name of ['q001','q003']) for(const option of q(name).options) assert.ok(Object.keys(option.weights).every(axis=>axis==='principle_outcome'));
  for(const old of beforeReview){const current=q(old.id);assert.equal(current.review.humanReviewed,false);assert.equal(current.status,'editorial_draft');assert.equal(current.version,old.id==='q005'?old.version:old.version+1);}
});
test('review permits meaningful mixed-version comparisons and excludes the old unpromised-secret premise',()=>{
  const oldPromise=fill(add(add(empty(),oldQuestion('q001'),'A'),'q016','B'),10);
  assert.ok(!detectComments(oldPromise,catalog).some(c=>c.ruleId.startsWith('rel_001_016')));
  const updated=add(oldPromise,'q001','A');const discovery=detectComments(updated,catalog).find(c=>c.ruleId==='rel_001_016_different');
  assert.ok(discovery);assert.ok(formatComment(discovery,catalog).includes('秘密を預かることと、手伝う予定を約束することには違い'));
  const procedures=fill(add(add(empty(),oldQuestion('q003'),'A'),'q024','A'),10);
  const comparison=detectComments(procedures,catalog).find(c=>c.ruleId==='rel_003_024_different');assert.ok(comparison);
  assert.ok(formatComment(comparison,catalog).includes('会社と地域'));
  const rescue=fill(add(add(empty(),oldQuestion('q007'),'A'),'q011','A'),20);
  assert.ok(detectComments(rescue,catalog).some(c=>c.type==='BOUNDARY'));
});

const beforeRemainingReview=JSON.parse(await readFile(new URL('../data/reviews/remaining-questions-before.json',import.meta.url),'utf8')).questions;
const oldRemainingQuestion=name=>beforeRemainingReview.find(q=>q.id===name);
test('remaining review keeps authentic old snapshots and new unscored responses separate',()=>{
  let state=empty();for(const question of beforeRemainingReview)state=add(state,question,question.options[0].id);
  const storage=store();storage.saveState(state);const restored=store();restored.importJSON(storage.exportJSON());assert.deepEqual(restored.getState(),state);
  const revised=add(state,'q028');validateState(revised,schemas);assert.deepEqual(revised.answers.slice(0,state.answers.length),state.answers);
  assert.deepEqual(currentAnswers(revised.answers).find(a=>a.questionId==='q028').derivedWeights,{});
  assert.equal(state.answers.find(a=>a.questionId==='q028').derivedWeights.principle_outcome,.5);
  for(const name of ['q012','q013','q019','q020','q021','q022','q023','q025','q026','q027','q028','q029'])for(const option of q(name).options)assert.deepEqual(option.weights,{});
  for(const old of beforeRemainingReview){const current=q(old.id);assert.equal(current.version,Number(old.id.slice(1))>=30?old.version:old.version+1);assert.equal(current.review.humanReviewed,false);assert.equal(current.status,'editorial_draft');}
  assert.equal(q('q030').scoringMode,'self_report_only');assert.equal(q('q021').scenario,undefined);
});
test('remaining context pairs work across explicit versions and state their different roles and purposes',()=>{
  for(const [source,target,sameOption,differentOption,prefix,phrase] of [
    ['q015','q023','A','B','rel_015_023','配分の目的が異なります'],
    ['q017','q022','B','A','rel_017_022','友人に助言する立場は異なります'],
  ]){
    const same=fill(add(add(empty(),oldRemainingQuestion(source),'A'),target,sameOption),20);
    const sameComment=detectComments(same,catalog).find(c=>c.ruleId===prefix+'_same');assert.ok(sameComment);assert.ok(formatComment(sameComment,catalog).includes(phrase));
    const different=fill(add(add(empty(),source,'A'),oldRemainingQuestion(target),differentOption),20);
    const change=detectComments(different,catalog).find(c=>c.ruleId===prefix+'_different');assert.equal(change.type,'CONTEXT_SHIFT');assert.ok(formatComment(change,catalog).includes('あなたはどう捉えますか'));
    const unknown=structuredClone(q(target));unknown.version=3;
    assert.ok(!detectComments(fill(add(add(empty(),source,'A'),unknown,differentOption),20),catalog).some(c=>c.ruleId.startsWith(prefix)));
  }
});
test('the original 33 reviewed questions alone keep unsupported axes hidden',()=>{
  let state=empty();for(const question of catalog.questions.questions.filter(q=>Number(q.id.slice(1))<=33))state=add(state,question,question.options.find(o=>!o.isNonAnswer).id);
  const result=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  assert.equal(result.principle_outcome.confidence,6);
  for(const axis of ['individual_collective','fairness_relationship','stability_change','freedom_security','equality_efficiency'])assert.equal(result[axis].visibility,'hidden');
  for(const r of catalog.rules.rules.filter(r=>['TIME_SHIFT','REFLECTION_RETURN'].includes(r.type)))assert.equal(r.enabled,false);
});

test('additional questions bring five axes only to provisional coverage and preserve history through export',()=>{
  let state=empty();
  for(const question of catalog.questions.questions)state=add(state,question,question.options.find(o=>!o.isNonAnswer).id);
  const result=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
  for(const [axis,count] of Object.entries({individual_collective:3,fairness_relationship:3,stability_change:4,freedom_security:4,equality_efficiency:3})) {
    assert.equal(result[axis].confidence,count);
    assert.equal(result[axis].visibility,'provisional');
  }
  const storage=store(); storage.saveState(state);
  const restored=store();restored.importJSON(storage.exportJSON());
  assert.deepEqual(restored.getState().answers,state.answers);
  for(let n=34;n<=43;n++) {
    const question=q(`q0${n}`), axis=question.axes[0];
    for(const option of question.options) {
      const scores=scoreAnswers(add(empty(),question,option.id).answers,catalog.axes.axes,catalog.settings.scoring);
      assert.equal(scores[axis].score,option.isNonAnswer?null:option.weights[axis]);
      assert.equal(scores[axis].confidence,option.isNonAnswer?0:1);
      for(const other of catalog.axes.axes.filter(a=>a.id!==axis))assert.equal(scores[other.id].confidence,0);
    }
  }
});

test('new context comparisons use explicit reversed options, thresholds and versions',()=>{
  for(let n=34;n<=42;n+=2) {
    const source=q(`q0${n}`),target=q(`q0${n+1}`),prefix=`rel_0${n}_0${n+1}`;
    for(const [left,right,type] of [['A','B','CONSISTENCY'],['B','A','CONSISTENCY'],['A','A','CONTEXT_SHIFT'],['B','B','CONTEXT_SHIFT']]) {
      const state=add(add(empty(),source,left),target,right);
      assert.ok(!detectComments(state,catalog).some(c=>c.ruleId.startsWith(prefix)));
      const matches=detectComments(fill(state,20),catalog).filter(c=>c.ruleId.startsWith(prefix));
      assert.equal(matches.length,1);assert.equal(matches[0].type,type);
      assert.ok(formatComment(matches[0],catalog).includes(source.title));
    }
    const unsure=fill(add(add(empty(),source,'A'),target,'unsure'),20);
    assert.ok(!detectComments(unsure,catalog).some(c=>c.ruleId.startsWith(prefix)));
    const unknown=structuredClone(target);unknown.version=2;
    assert.ok(!detectComments(fill(add(add(empty(),source,'A'),unknown,'B'),20),catalog).some(c=>c.ruleId.startsWith(prefix)));
  }
});

test('new optional reasons retain snapshots without affecting scores',()=>{
  for(let n=34;n<=43;n++) {
    const question=q(`q0${n}`);
    let state=add(fill(empty(),3),question,'A');
    const answer=state.answers.at(-1),reason=f(question.followUps[0]);
    assert.ok(eligibleFollowUps(state,catalog,{event:'after_answer',answerId:answer.id}).some(item=>item.id===reason.id));
    const before=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
    state=appendReason(state,answer.id,reason,'other',{now:time,id:id()});
    const after=scoreAnswers(state.answers,catalog.axes.axes,catalog.settings.scoring);
    for(const axis of catalog.axes.axes) {
      assert.equal(after[axis.id].score,before[axis.id].score);
      assert.equal(after[axis.id].confidence,before[axis.id].confidence);
    }
    validateState(state,schemas);
    assert.equal(state.answers.length,5);
    assert.deepEqual(state.answers[3],answer);
  }
});

const {validateLandscapes,loadLandscapes,selectLandscape}=await import('../js/landscape-engine.js');
const landscapeData=await loadLandscapes({axes:catalog.axes.axes,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(url,'utf8'))})});
const landscapeFor=state=>{
  const profile=analyzeProfile(state,catalog);
  return selectLandscape(landscapeData,profile,detectComments(state,catalog,{profile}));
};
function directionState(axis,direction) {
  let state=empty();
  for(const question of catalog.questions.questions.filter(q=>q.scoringMode==='behavior' && q.options.some(o=>(o.weights[axis]??0)*direction>0)).slice(0,3)) {
    state=add(state,question,question.options.find(o=>(o.weights[axis]??0)*direction>0).id);
  }
  return fill(state,5);
}

test('landscape catalog resolves all 16 local WebP assets and fails unsafe definitions',async()=>{
  assert.equal(landscapeData.landscapes.length,16);
  for(const landscape of landscapeData.landscapes) {
    const bytes=await readFile(new URL(`../${landscape.image}`,import.meta.url));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  }
  for(const path of ['https://example.com/image.webp','img/../secret.webp','javascript:alert(1)','img/a.webp?x=1']) {
    const bad=structuredClone(landscapeData);bad.landscapes[0].image=path;
    assert.throws(()=>validateLandscapes(bad,catalog.axes.axes),/Unsafe/);
  }
  const bad=structuredClone(landscapeData);bad.landscapes[1].conditions.axisHints.unknown={min:0.2};
  assert.throws(()=>validateLandscapes(bad,catalog.axes.axes),/Unknown landscape axis/);
  const fallback=structuredClone(landscapeData);fallback.selection.fallbackLandscapeId='missing';
  assert.throws(()=>validateLandscapes(fallback,catalog.axes.axes),/fallback/);
  await assert.rejects(loadLandscapes({axes:catalog.axes.axes,fetcher:async()=>({ok:false,status:503})}),/Cannot load/);
});

test('landscape selection is read-only and distinguishes insufficient data from no matching candidate',()=>{
  const state=empty(),before=structuredClone(state);
  assert.equal(landscapeFor(state).status,'insufficient');
  assert.equal(landscapeFor(state).landscape.id,landscapeData.selection.fallbackLandscapeId);
  assert.deepEqual(state,before);
  const profile=analyzeProfile(directionState('principle_outcome',1),catalog);
  profile.axes.principle_outcome.score=0;
  const result=selectLandscape(landscapeData,profile);
  assert.equal(result.status,'unmatched');assert.deepEqual(result.evidenceAnswerIds,[]);
  for(const a of Object.values(profile.axes))a.visibility='hidden';
  assert.equal(selectLandscape(landscapeData,profile).status,'insufficient');
});

test('base landscapes require every hinted axis to be visible and match its threshold',()=>{
  for(const entry of landscapeData.landscapes.filter(l=>l.enabled && l.conditions.axisHints)) {
    const definition=structuredClone(landscapeData);
    definition.landscapes=definition.landscapes.filter(l=>l.id===entry.id || l.id===definition.selection.fallbackLandscapeId);
    const profile=analyzeProfile(empty(),catalog);
    for(const [axis,range] of Object.entries(entry.conditions.axisHints)) Object.assign(profile.axes[axis],{
      visibility:'provisional',score:range.min??range.max,confidence:3,evidenceAnswerIds:[`evidence-${axis}`],
    });
    const result=selectLandscape(definition,profile);
    assert.equal(result.landscape.id,entry.id);assert.equal(result.provisional,true);
    assert.equal(result.matchedAxes.length,Object.keys(entry.conditions.axisHints).length);
    const first=Object.keys(entry.conditions.axisHints)[0];profile.axes[first].confidence=2;
    assert.equal(selectLandscape(definition,profile).landscape.id,definition.selection.fallbackLandscapeId);
  }
});

test('landscape follows current revised answers and ignores unsure or self-report scores',()=>{
  let state=directionState('principle_outcome',1);
  const before=landscapeFor(state);
  assert.equal(before.landscape.id,'landscape_05');assert.equal(before.provisional,true);
  for(const answer of currentAnswers(state.answers).filter(a=>a.derivedWeights.principle_outcome)) {
    const opposite=answer.snapshot.options.find(o=>o.weights.principle_outcome<0);
    state=reviseAnswer(state,answer.id,opposite.id,{now:time,id:id()});
  }
  const after=landscapeFor(state);
  assert.equal(after.landscape.id,'landscape_04');
  assert.ok(after.evidenceAnswerIds.every(id=>!before.evidenceAnswerIds.includes(id)));
  assert.equal(landscapeFor(add(state,'q030',q('q030').options[0].id)).landscape.id,'landscape_04');
  for(const answer of currentAnswers(state.answers).filter(a=>a.derivedWeights.principle_outcome))state=reviseAnswer(state,answer.id,'unsure',{now:time,id:id()});
  assert.equal(landscapeFor(state).status,'insufficient');
});

test('current boundary evidence outranks base landscapes and stale saved discoveries do not',()=>{
  let state=add(add(directionState('principle_outcome',1),'q031','A'),'q032','B');
  const found=landscapeFor(state);
  assert.equal(found.landscape.id,'landscape_14');assert.equal(found.status,'special');
  assert.equal(found.evidenceAnswerIds.length,2);assert.equal(found.discoveryIds.length,1);
  const discovery=detectComments(state,catalog).find(d=>d.type==='BOUNDARY');
  state=recordShownComment(state,discovery,time);
  const answer=currentAnswers(state.answers).find(a=>a.questionId==='q032');
  state=reviseAnswer(state,answer.id,'A',{now:time,id:id()});
  assert.equal(state.discoveries.length,1);
  assert.equal(landscapeFor(state).landscape.id,'landscape_05');
});

test('pending analytical landscapes stay disabled even when draft metrics look high',()=>{
  const profile=analyzeProfile(directionState('principle_outcome',1),catalog);
  for(const a of Object.values(profile.axes))Object.assign(a,{contextDependency:1,changeOverTime:{delta:1},consistency:{value:0}});
  const result=selectLandscape(landscapeData,profile);
  assert.equal(result.landscape.type,'base');
  for(const n of [11,12,13,15,16])assert.equal(landscapeData.landscapes.find(l=>l.id===`landscape_${n}`).enabled,false);
});

test('a data-only landscape addition participates in deterministic selection',()=>{
  const definition=structuredClone(landscapeData);
  const added=structuredClone(definition.landscapes.find(l=>l.id==='landscape_05'));
  added.id='landscape_17';added.name='追加の風景';added.priority=99;
  definition.landscapes.push(added);
  validateLandscapes(definition,catalog.axes.axes);
  const profile=analyzeProfile(directionState('principle_outcome',1),catalog);
  assert.equal(selectLandscape(definition,profile).landscape.id,added.id);
  added.priority=20;
  assert.equal(selectLandscape(definition,profile).landscape.id,'landscape_05');
  const invalid=structuredClone(definition);invalid.landscapes.find(l=>l.id==='landscape_11').enabled=true;
  assert.throws(()=>validateLandscapes(invalid,catalog.axes.axes),/Unsupported landscape condition/);
});
