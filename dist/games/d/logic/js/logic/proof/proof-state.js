import { parseFormula } from "../parser.js";

export function createInitialProofState(problem) {
  const rootScope = {
    id: "root",
    parentScopeId: null,
    assumptionLineId: null,
    closed: false
  };

  const lines = problem.premises.map((premise, index) => ({
    id: `line-${index + 1}`,
    formula: parseFormula(premise),
    rule: "premise",
    references: [],
    scopeId: "root",
    assumption: false
  }));

  return {
    problemId: problem.id,
    system: problem.system,
    conclusion: parseFormula(problem.conclusion),
    lines,
    scopes: [rootScope],
    currentScopeId: "root",
    selectedLineIds: [],
    nextLineNumber: lines.length + 1,
    nextScopeNumber: 1,
    stepCount: 0,
    completed: false
  };
}

export function getSelectedLines(proofState) {
  return proofState.selectedLineIds
    .map(lineId => proofState.lines.find(line => line.id === lineId))
    .filter(Boolean);
}

export function toggleSelectedLine(proofState, lineId) {
  const selectedLineIds = proofState.selectedLineIds.includes(lineId)
    ? proofState.selectedLineIds.filter(selectedLineId => selectedLineId !== lineId)
    : [...proofState.selectedLineIds, lineId];

  return {
    ...proofState,
    selectedLineIds
  };
}

export function clearSelectedLines(proofState) {
  return {
    ...proofState,
    selectedLineIds: []
  };
}

export function addProofLine(proofState, formula, rule, references) {
  const line = {
    id: `line-${proofState.nextLineNumber}`,
    formula,
    rule,
    references,
    scopeId: proofState.currentScopeId,
    assumption: false
  };

  return {
    ...proofState,
    lines: [...proofState.lines, line],
    selectedLineIds: [],
    nextLineNumber: proofState.nextLineNumber + 1,
    stepCount: proofState.stepCount + 1
  };
}

export function addAssumption(proofState, formula) {
  const line = {
    id: `line-${proofState.nextLineNumber}`,
    formula,
    rule: "assumption",
    references: [],
    scopeId: `scope-${proofState.nextScopeNumber}`,
    assumption: true
  };
  const scope = {
    id: line.scopeId,
    parentScopeId: proofState.currentScopeId,
    assumptionLineId: line.id,
    closed: false
  };

  return {
    ...proofState,
    lines: [...proofState.lines, line],
    scopes: [...proofState.scopes, scope],
    currentScopeId: scope.id,
    selectedLineIds: [],
    nextLineNumber: proofState.nextLineNumber + 1,
    nextScopeNumber: proofState.nextScopeNumber + 1,
    stepCount: proofState.stepCount + 1
  };
}

export function closeCurrentScopeWithLine(proofState, formula, rule, references) {
  const currentScope = proofState.scopes.find(scope => scope.id === proofState.currentScopeId);

  if (!currentScope || currentScope.id === "root") {
    throw new Error("閉じられる仮定スコープがありません。");
  }

  const line = {
    id: `line-${proofState.nextLineNumber}`,
    formula,
    rule,
    references,
    scopeId: currentScope.parentScopeId,
    assumption: false
  };
  const scopes = proofState.scopes.map(scope => (
    scope.id === currentScope.id
      ? {
          ...scope,
          closed: true
        }
      : scope
  ));

  return {
    ...proofState,
    lines: [...proofState.lines, line],
    scopes,
    currentScopeId: currentScope.parentScopeId,
    selectedLineIds: [],
    nextLineNumber: proofState.nextLineNumber + 1,
    stepCount: proofState.stepCount + 1
  };
}
