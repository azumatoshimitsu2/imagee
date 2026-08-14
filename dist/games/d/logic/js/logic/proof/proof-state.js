export function createInitialProofState(problem) {
  return {
    category: problem.category,
    problem,
    lines: []
  };
}

export function getProblemReferenceLines(state) {
  return (state.problem.premises ?? []).map((formula, index) => ({
    id: `premise-${index + 1}`,
    number: index + 1,
    formula,
    rule: '前提',
    justification: 'premise',
    dependencies: []
  }));
}

export function getStackedLineLayout(state) {
  return {
    lines: state.lines.map((line, index) => ({
      ...line,
      number: index + 1,
      x: 0,
      y: index * 52,
      formula: line.formula,
      rule: line.rule,
      justification: line.justification,
      dependencies: Array.isArray(line.dependencies) ? line.dependencies : []
    }))
  };
}

export function addProofLine(state, draft) {
  const sanitizedFormula = (draft.formula ?? '').trim();
  const rule = draft.rule ?? '前提';
  const dependencies = Array.isArray(draft.dependencies) ? draft.dependencies : [];

  if (!sanitizedFormula) {
    return { ok: false, message: '式が空です。' };
  }

  if (!dependencies.every((dependency) => Number.isInteger(dependency) && dependency >= 0)) {
    return { ok: false, message: '依存元は、表示されている参照番号をカンマ区切りで入力してください。' };
  }

  const lineNumber = state.lines.length + 1;
  const line = {
    id: `line-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    number: lineNumber,
    formula: sanitizedFormula,
    rule,
    justification: dependencies.length ? `dep:${dependencies.map((n) => n + 1).join(',')}` : 'user',
    dependencies: [...dependencies]
  };

  const validation = validateLine(state, line);
  if (!validation.ok) {
    return validation;
  }

  state.lines.push(line);
  return { ok: true, line, message: validation.message };
}

function normalizeFormula(value) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/／/g, '/')
    .replace(/−/g, '-')
    .replace(/⊥/g, 'bot')
    .replace(/¬/g, '~')
    .replace(/∧/g, '&')
    .replace(/∨/g, '|')
    .replace(/→/g, '->');

  return stripOuterParentheses(normalized);
}

function sameFormula(a, b) {
  return normalizeFormula(a) === normalizeFormula(b);
}

function stripOuterParentheses(formula) {
  let target = formula;
  let changed = true;

  while (changed && target.startsWith('(') && target.endsWith(')')) {
    changed = false;
    let depth = 0;
    let wrapsWholeFormula = true;

    for (let index = 0; index < target.length; index += 1) {
      const char = target[index];
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (depth === 0 && index < target.length - 1) {
        wrapsWholeFormula = false;
        break;
      }
    }

    if (wrapsWholeFormula && depth === 0) {
      target = target.slice(1, -1);
      changed = true;
    }
  }

  return target;
}

function splitImplication(formula) {
  const target = normalizeFormula(formula);
  let depth = 0;
  for (let index = 0; index < target.length; index += 1) {
    const char = target[index];
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && target.slice(index, index + 2) === '->') {
      return [target.slice(0, index), target.slice(index + 2)];
    }
  }
  return null;
}

function splitDisjunction(formula) {
  const target = normalizeFormula(formula);
  let depth = 0;
  for (let index = 0; index < target.length; index += 1) {
    const char = target[index];
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && target[index] === '|') {
      return [target.slice(0, index), target.slice(index + 1)];
    }
  }
  return null;
}

function splitConjunction(formula) {
  const target = normalizeFormula(formula);
  let depth = 0;
  for (let index = 0; index < target.length; index += 1) {
    const char = target[index];
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && target[index] === '&') {
      return [target.slice(0, index), target.slice(index + 1)];
    }
  }
  return null;
}

function stripNegation(formula) {
  const target = normalizeFormula(formula);
  if (target.startsWith('~')) {
    return target.slice(1);
  }
  return null;
}

function getRowsBeforeLine(state, line) {
  const proofLines = state.lines ?? [];
  const lineIndex = proofLines.findIndex((candidate) => candidate.id === line.id);
  const previousLines = lineIndex >= 0
    ? proofLines.slice(0, lineIndex)
    : proofLines;

  return [
    ...getProblemReferenceLines(state),
    ...previousLines
  ];
}

function getRowsThroughLine(state, line) {
  const proofLines = state.lines ?? [];
  const lineIndex = proofLines.findIndex((candidate) => candidate.id === line.id);
  const includedLines = lineIndex >= 0
    ? proofLines.slice(0, lineIndex + 1)
    : [...proofLines, line];

  return [
    ...getProblemReferenceLines(state),
    ...includedLines
  ];
}

function buildDependencyVariants(rawIndexes, previous) {
  if (!Array.isArray(rawIndexes) || rawIndexes.length === 0) {
    return [[]];
  }

  const variants = [[]];
  for (const rawIndex of rawIndexes) {
    const numericIndex = Number(rawIndex);
    const candidates = Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < previous.length
      ? [numericIndex]
      : [];

    const nextVariants = [];
    for (const prefix of variants) {
      if (candidates.length === 0) {
        nextVariants.push([...prefix, null]);
        continue;
      }
      for (const candidate of [...new Set(candidates)]) {
        nextVariants.push([...prefix, candidate]);
      }
    }
    variants.length = 0;
    variants.push(...nextVariants);
  }

  return variants.filter((variant) => variant.every((index) => Number.isInteger(index) && index >= 0 && index < previous.length));
}

export function getOpenAssumptionNumbers(state, line) {
  const premiseCount = state.problem.premises?.length ?? 0;
  return getOpenAssumptionIndexes(state, line).map((index) => index - premiseCount + 1);
}

function getOpenAssumptionIndexes(state, line) {
  const rows = getRowsThroughLine(state, line);
  const premiseCount = state.problem.premises?.length ?? 0;
  const currentIndex = rows.findIndex((candidate) => candidate.id === line.id);
  const memo = new Map();

  function collect(rowIndex) {
    if (memo.has(rowIndex)) return memo.get(rowIndex);
    if (rowIndex < premiseCount) {
      memo.set(rowIndex, []);
      return [];
    }

    const row = rows[rowIndex];
    if (!row) return [];
    if (row.rule === '前提' || row.rule === '排中律') {
      memo.set(rowIndex, []);
      return [];
    }
    if (row.rule === '仮定') {
      memo.set(rowIndex, [rowIndex]);
      return [rowIndex];
    }

    const dependencies = Array.isArray(row.dependencies) ? row.dependencies : [];
    const openAssumptions = new Set();
    dependencies
      .filter((dependency) => Number.isInteger(dependency) && dependency >= 0 && dependency < rowIndex)
      .forEach((dependency) => {
        collect(dependency).forEach((assumptionIndex) => openAssumptions.add(assumptionIndex));
      });

    if (row.rule === '→-導入' && Number.isInteger(dependencies[0])) {
      openAssumptions.delete(dependencies[0]);
    }

    if (row.rule === '¬-導入' || row.rule === '反証法') {
      const dischargedFormula = stripNegation(row.formula);
      if (dischargedFormula) {
        [...openAssumptions].forEach((assumptionIndex) => {
          if (sameFormula(rows[assumptionIndex]?.formula, dischargedFormula)) {
            openAssumptions.delete(assumptionIndex);
          }
        });
      }
    }

    const result = [...openAssumptions];
    memo.set(rowIndex, result);
    return result;
  }

  return currentIndex >= 0 ? collect(currentIndex) : [];
}

function evaluateRule(state, line) {
  const formula = (line.formula ?? '').trim();
  const previous = getRowsBeforeLine(state, line);

  if (!formula) {
    return false;
  }

  const dependencyIndexes = Array.isArray(line.dependencies) ? line.dependencies : [];
  const dependencyVariants = buildDependencyVariants(dependencyIndexes, previous);
  const dependencyValid = dependencyVariants.length > 0;
  const requiresDependency = ['→-導入', '→-除去', '∧-導入', '∧-除去', '∨-導入', '∨-除去', '¬-導入', '¬-除去', '二重否定除去', '反証法'].includes(line.rule);

  if (requiresDependency && !dependencyValid) {
    return false;
  }

  switch (line.rule) {
    case '前提': {
      return state.problem.premises.some((premise) => sameFormula(premise, formula));
    }
    case '仮定': {
      return Boolean(formula) && !sameFormula(formula, state.problem.conclusion);
    }
    case '→-導入': {
      return dependencyVariants.some(([assumptionIndex, conclusionIndex]) => {
        if (!Number.isInteger(assumptionIndex) || !Number.isInteger(conclusionIndex)) return false;
        const assumption = previous[assumptionIndex]?.formula;
        const conclusion = previous[conclusionIndex]?.formula;
        if (!assumption || !conclusion) return false;

        const implication = splitImplication(formula);
        if (!implication) return false;
        const [left, right] = implication;
        if (!left || !right) return false;

        return sameFormula(assumption, left) && sameFormula(conclusion, right);
      });
    }
    case '→-除去': {
      return dependencyVariants.some(([firstIndex, secondIndex]) => {
        if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex)) return false;
        const first = previous[firstIndex]?.formula;
        const second = previous[secondIndex]?.formula;
        if (!first || !second) return false;

        const implicationFirst = splitImplication(first);
        if (implicationFirst) {
          const [left, right] = implicationFirst;
          if (sameFormula(second, left) && sameFormula(formula, right)) return true;
        }

        const implicationSecond = splitImplication(second);
        if (!implicationSecond) return false;
        const [left, right] = implicationSecond;
        return sameFormula(first, left) && sameFormula(formula, right);
      });
    }
    case '∧-導入': {
      return dependencyVariants.some(([leftIndex, rightIndex]) => {
        if (!Number.isInteger(leftIndex) || !Number.isInteger(rightIndex)) return false;
        const left = previous[leftIndex]?.formula;
        const right = previous[rightIndex]?.formula;
        if (!left || !right) return false;
        const pair = splitConjunction(formula);
        if (!pair) return false;
        return (sameFormula(pair[0], left) && sameFormula(pair[1], right)) ||
          (sameFormula(pair[0], right) && sameFormula(pair[1], left));
      });
    }
    case '∧-除去': {
      return dependencyVariants.some(([sourceIndex]) => {
        if (!Number.isInteger(sourceIndex)) return false;
        const source = previous[sourceIndex]?.formula;
        if (!source) return false;
        const parts = splitConjunction(source);
        if (!parts) return false;
        return sameFormula(formula, parts[0]) || sameFormula(formula, parts[1]);
      });
    }
    case '∨-導入': {
      return dependencyVariants.some(([sourceIndex]) => {
        if (!Number.isInteger(sourceIndex)) return false;
        const source = previous[sourceIndex]?.formula;
        if (!source) return false;
        const pair = splitDisjunction(formula);
        if (!pair) return false;
        const [left, right] = pair;
        return sameFormula(source, left) || sameFormula(source, right);
      });
    }
    case '∨-除去': {
      return dependencyVariants.some(([firstIndex, secondIndex]) => {
        if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex)) return false;
        const first = previous[firstIndex]?.formula;
        const second = previous[secondIndex]?.formula;
        if (!first || !second) return false;
        const [disjunction, elimination] = splitDisjunction(first)
          ? [first, second]
          : [second, first];
        const pair = splitDisjunction(disjunction);
        if (!pair) return false;
        const [left, right] = pair;
        const negated = stripNegation(elimination);

        if (sameFormula(formula, elimination)) {
          return sameFormula(elimination, left) || sameFormula(elimination, right);
        }

        if (negated && sameFormula(negated, left)) {
          return sameFormula(formula, right);
        }

        if (negated && sameFormula(negated, right)) {
          return sameFormula(formula, left);
        }

        return false;
      });
    }
    case '¬-導入': {
      const target = stripNegation(formula);
      if (!target) return false;
      return dependencyVariants.some(([sourceIndex]) => {
        if (!Number.isInteger(sourceIndex)) return false;
        const source = previous[sourceIndex]?.formula;
        return Boolean(source) && sameFormula(source, target);
      });
    }
    case '¬-除去': {
      return dependencyVariants.some(([sourceIndex]) => {
        if (!Number.isInteger(sourceIndex)) return false;
        const source = previous[sourceIndex]?.formula;
        if (!source) return false;
        const target = stripNegation(source);
        return Boolean(target) && sameFormula(formula, target);
      });
    }
    case '二重否定除去': {
      return dependencyVariants.some(([sourceIndex]) => {
        if (!Number.isInteger(sourceIndex)) return false;
        const source = previous[sourceIndex]?.formula;
        if (!source) return false;
        const onceStripped = stripNegation(source);
        const twiceStripped = stripNegation(onceStripped);
        return Boolean(twiceStripped) && sameFormula(formula, twiceStripped);
      });
    }
    case '反証法': {
      const negatedFormula = stripNegation(formula);
      if (!negatedFormula) return false;

      return dependencyVariants.some((indexes) => {
        const referenced = indexes
          .filter((index) => Number.isInteger(index))
          .map((index) => previous[index]?.formula)
          .filter(Boolean);

        return referenced.some((candidate) => {
          const positive = stripNegation(candidate);
          if (positive) {
            return referenced.some((other) => sameFormula(other, positive));
          }
          return referenced.some((other) => sameFormula(stripNegation(other), candidate));
        });
      });
    }
    case '排中律': {
      const pair = splitDisjunction(formula);
      if (!pair) return false;
      return sameFormula(stripNegation(pair[0]), pair[1]) ||
        sameFormula(stripNegation(pair[1]), pair[0]);
    }
    default:
      return false;
  }
}

function getExpectedDependencyCount(rule) {
  switch (rule) {
    case '前提':
    case '仮定':
    case '排中律':
      return 0;
    case '∧-除去':
    case '∨-導入':
    case '¬-導入':
    case '¬-除去':
    case '二重否定除去':
      return 1;
    case '→-導入':
    case '→-除去':
    case '∧-導入':
    case '∨-除去':
    case '反証法':
      return 2;
    default:
      return null;
  }
}

export function validateLine(state, line) {
  const problem = state.problem;
  const currentFormula = (line.formula ?? '').trim();

  if (!currentFormula) {
    return { ok: false, message: '式を入力してください。' };
  }

  const availableRules = problem.availableRules ?? ['前提', '仮定', '→-導入', '→-除去', '∧-導入', '∧-除去', '∨-導入', '∨-除去', '¬-導入', '¬-除去', '反証法', '二重否定除去', '排中律'];
  if (!availableRules.includes(line.rule)) {
    return { ok: false, message: `${line.rule} はこの問題では利用できない規則です。` };
  }

  const dependencies = Array.isArray(line.dependencies) ? line.dependencies : [];
  const expectedDependencyCount = getExpectedDependencyCount(line.rule);
  if (expectedDependencyCount === null) {
    return { ok: false, message: `${line.rule} は未対応の規則です。` };
  }
  if (dependencies.length !== expectedDependencyCount) {
    return { ok: false, message: `${line.rule} では依存元を ${expectedDependencyCount} 個指定してください。` };
  }

  if (line.rule === '仮定' && sameFormula(currentFormula, problem.conclusion)) {
    return { ok: false, message: '仮定だけで結論を証明することはできません。さらに導出規則を使ってください。' };
  }

  const validByRule = evaluateRule(state, line);
  if (!validByRule) {
    return {
      ok: false,
      message: `${line.rule} としては、この式の形が不適切です。依存関係と式の形を確認してください。`
    };
  }

  const isComplete = sameFormula(currentFormula, problem.conclusion) &&
    getOpenAssumptionIndexes(state, line).length === 0;

  return { ok: true, message: isComplete
    ? '結論に到達しました。証明が完成しています。'
    : `${line.rule} を使った証明行として適切です。` };
}

export function checkProblemSolved(state) {
  const problem = state.problem;
  if ((problem.premises ?? []).some((premise) => sameFormula(premise, problem.conclusion))) {
    return true;
  }

  return (state.lines ?? []).some((line) => (
    line.rule !== '仮定' &&
    sameFormula(line.formula, problem.conclusion) &&
    evaluateRule(state, line) &&
    getOpenAssumptionIndexes(state, line).length === 0
  ));
}

export function getSolutionPreview(problem) {
  return Array.isArray(problem.solution) ? problem.solution : [];
}
