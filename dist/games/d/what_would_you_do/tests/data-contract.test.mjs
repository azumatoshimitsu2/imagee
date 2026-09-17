import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async name => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const [questionData, axisData, followData, ruleData, settings, copy, state, cases, questionSchema, stateSchema] = await Promise.all(
  ['questions', 'axes', 'followups', 'rules', 'settings', 'copy', 'examples/state', 'examples/rule-cases', 'schemas/questions.schema', 'schemas/state.schema'].map(read)
);
const questions = questionData.questions;
const followups = followData.followUps;
const rules = ruleData.rules;
const byId = list => new Map(list.map(item => [item.id, item]));
const qMap = byId(questions), fMap = byId(followups), rMap = byId(rules);
const axes = new Set(axisData.axes.map(a => a.id));
const categories = new Set(axisData.categories.map(c => c.id));
const relations = questions.flatMap(target => target.relations.map(relation => ({ target, relation })));
const relationMap = new Map(relations.map(r => [r.relation.id, r]));
const unique = values => assert.equal(new Set(values).size, values.length);
const nonempty = value => assert.ok(typeof value === 'string' && value.trim());
const option = (q, id) => q.options.find(o => o.id === id);

test('catalog retains initial questions and supports additional versioned drafts', () => {
  assert.ok(questions.length >= 30);
  assert.equal(axes.size, 6);
  for (const list of [questions, followups, rules, axisData.axes, axisData.categories]) unique(list.map(x => x.id));
  for (const data of [questionData, axisData, followData, ruleData, settings, copy, state, cases]) assert.equal(data.schemaVersion, 1);
  for (const q of questions) {
    assert.equal(q.status, 'editorial_draft');
    assert.equal(q.review.humanReviewed, false);
    assert.ok(Number.isInteger(q.version) && q.version > 0);
    for (const name of ['title', 'body']) nonempty(q[name]);
    nonempty(q.reflection.summary);
    nonempty(q.reflection.question);
    assert.ok(q.reflection.perspectives.length >= 2);
    q.reflection.perspectives.forEach(nonempty);
    assert.ok(q.category.length > 0 && q.category.every(c => categories.has(c)));
    unique(q.axes);
    assert.ok(q.axes.every(a => axes.has(a)));
  }
});

test('weights are finite, declared, bounded; missing answers and self reports stay distinct', () => {
  const coverage = new Set();
  for (const q of questions) {
    assert.equal(q.importance, 1);
    unique(q.options.map(o => o.id));
    assert.ok(q.options.length >= 3);
    for (const o of q.options) {
      nonempty(o.label);
      if (o.isNonAnswer) assert.deepEqual(o.weights, {});
      for (const [axis, weight] of Object.entries(o.weights)) {
        assert.ok(q.axes.includes(axis));
        assert.ok(Number.isFinite(weight) && weight >= -1 && weight <= 1);
        if (q.scoringMode === 'behavior') coverage.add(axis);
      }
    }
  }
  assert.deepEqual(coverage, axes);
  assert.equal(qMap.get('q030').scoringMode, 'self_report_only');
  assert.ok(settings.scoring.ignoreModes.includes('self_report_only'));
  assert.equal(settings.scoring.missingWeight, 'unmeasured');
});

test('follow-up references, target versions, copy and return policies resolve', () => {
  for (const q of questions) for (const id of q.followUps) assert.ok(fMap.has(id));
  for (const f of followups) {
    assert.ok(Number.isInteger(f.version) && f.version > 0);
    assert.equal(f.optional, true);
    if (f.trigger.schedulePolicy) assert.ok(settings.scheduling[f.trigger.schedulePolicy]);
    if (f.targetQuestionId) assert.equal(qMap.get(f.targetQuestionId)?.version, f.targetQuestionVersion);
    if (f.returnPolicyId) assert.equal(rMap.get(f.returnPolicyId)?.type, 'REFLECTION_RETURN');
    if (f.privacyCopyId) assert.ok(copy.copy[f.privacyCopyId]);
    for (const id of f.trigger.requiresAnswered ?? []) assert.ok(qMap.has(id));
    if (f.kind === 'reason') {
      assert.equal(f.scoringMode, 'none');
      unique(f.options.map(o => o.id));
      assert.ok(f.options.some(o => o.id === 'unknown'));
      for (const o of f.options) assert.deepEqual(o.weights, {});
    }
  }
});

test('relations bind explicit versions and valid option pairs to both endpoints', () => {
  assert.equal(relationMap.size, relations.length);
  for (const { target, relation } of relations) {
    const source = qMap.get(relation.questionId);
    assert.ok(source && source.id !== target.id);
    assert.ok(relation.sourceVersions.includes(source.version));
    assert.ok(relation.targetVersions.includes(target.version));
    assert.ok(source.axes.includes(relation.axis) && target.axes.includes(relation.axis));
    for (const id of relation.ruleIds) {
      const rule = rMap.get(id);
      assert.ok(rule);
      assert.equal(rule.relationId, relation.id);
      assert.equal(rule.axis, relation.axis);
      for (const pair of rule.when.optionPairs ?? []) {
        assert.ok(option(source, pair.source) && !option(source, pair.source).isNonAnswer);
        assert.ok(option(target, pair.target) && !option(target, pair.target).isNonAnswer);
      }
    }
    const pairs = relation.ruleIds.flatMap(id => (rMap.get(id).when.optionPairs ?? []).map(p => `${p.source}:${p.target}`));
    unique(pairs); // consistency and tension must not claim the same answer pair
  }
});

test('all six discovery types have supported declarative detectors and safe template keys', () => {
  assert.deepEqual(new Set(rules.map(r => r.type)), new Set(['CONSISTENCY', 'TENSION', 'CONTEXT_SHIFT', 'BOUNDARY', 'TIME_SHIFT', 'REFLECTION_RETURN']));
  const detectors = new Set(['related_option_pairs', 'series_decision_change', 'profile_time_change', 'reflection_due']);
  const keys = new Set(['previousTitle', 'previousAnswer', 'currentTitle', 'currentAnswer', 'previousCategory', 'currentCategory', 'lowerValue', 'upperValue', 'axisLabel', 'previousText']);
  for (const r of rules) {
    assert.ok(detectors.has(r.detector));
    assert.ok(Number.isFinite(r.priority));
    assert.ok(r.version > 0);
    const template = ruleData.templates[r.templateId];
    nonempty(template);
    for (const match of template.matchAll(/\{([^}]+)\}/g)) assert.ok(keys.has(match[1]));
    if (r.relationId) assert.ok(relationMap.get(r.relationId)?.relation.ruleIds.includes(r.id));
    if (!r.enabled) nonempty(r.pendingDecision);
  }
});

test('boundary data changes only the declared number and uses semantic decision mappings', () => {
  for (const rule of rules.filter(r => r.type === 'BOUNDARY')) {
    const { target, relation } = relationMap.get(rule.relationId);
    const source = qMap.get(relation.questionId);
    const a = source.scenario, b = target.scenario;
    assert.equal(a.seriesId, b.seriesId);
    assert.equal(a.seriesId, rule.when.seriesId);
    assert.equal(a.variable, b.variable);
    assert.equal(a.variable, rule.when.variable);
    assert.deepEqual(a.constants, b.constants);
    assert.notEqual(a.value, b.value);
    const normalize = text => text.replace(/\d+/g, '#').replace(/[一二]人のいる側が/g, '#人のいる側が');
    assert.equal(normalize(source.body), normalize(target.body));
    for (const q of [source, target]) {
      for (const o of q.options.filter(o => !o.isNonAnswer)) assert.ok(q.scenario.decisionMap[o.id]);
    }
    assert.deepEqual(new Set(Object.values(a.decisionMap)), new Set(Object.values(b.decisionMap)));

  }
  assert.ok(!qMap.get('q021').scenario);
});

test('unresolved schedules remain explicit and initial order is valid', () => {
  assert.deepEqual(settings.scheduling.answerFlow, ['selection', 'optional_followup', 'explanation', 'past_dialogue']);
  assert.equal(settings.progression.timeAndReflectionReturnFrom, null);
  assert.equal(rMap.get('time_shift').enabled, false);
  assert.equal(rMap.get('reflection_return').enabled, false);
  const order = settings.scheduling.initialQuestionIds;
  assert.equal(order.length, 10);
  unique(order);
  const covered = new Set();
  for (const [i, id] of order.entries()) {
    assert.ok(qMap.has(id));
    qMap.get(id).axes.forEach(a => covered.add(a));
    if (i && qMap.get(id).category.includes('life')) assert.ok(!qMap.get(order[i - 1]).category.includes('life'));
  }
  assert.deepEqual(covered, axes);
});

test('storage example retains old answer, snapshots, reasons and revision links', () => {
  unique(state.answers.map(a => a.id));
  const seen = new Map();
  for (const a of state.answers) {
    assert.equal(a.questionId, a.snapshot.id);
    assert.equal(a.questionVersion, a.snapshot.version);
    assert.equal(a.weight, a.snapshot.importance);
    assert.deepEqual(a.derivedWeights, option(a.snapshot, a.optionId).weights);
    assert.ok(Number.isFinite(Date.parse(a.answeredAt)));
    if (a.supersedesAnswerId) assert.equal(seen.get(a.supersedesAnswerId)?.questionId, a.questionId);
    for (const f of a.followUps) {
      assert.equal(f.id, f.snapshot.id);
      assert.equal(f.version, f.snapshot.version);
      assert.ok(f.snapshot.options.some(o => o.id === f.optionId));
    }
    seen.set(a.id, a);
  }
  assert.equal(state.answers.length, 2);
  assert.notEqual(state.answers[0].optionId, state.answers[1].optionId);
  assert.equal(state.answers[1].supersedesAnswerId, state.answers[0].id);
  for (const f of state.reflections) assert.ok(seen.has(f.sourceAnswerId));
  assert.ok(questionSchema.$defs.question);
  assert.equal(stateSchema.properties.answers.items.properties.snapshot.$ref, 'questions.schema.json#/$defs/question');
});

test('future acceptance examples reference existing rules and question options', () => {
  for (const c of cases.cases) {
    c.expectedRuleIds.forEach(id => assert.ok(rMap.has(id)));
    for (const a of c.answers) assert.ok(option(qMap.get(a.questionId), a.optionId));
  }
  assert.equal(cases.cases.length, 10);
});
