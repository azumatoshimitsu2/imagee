export function getScopeAncestors(proofState, scopeId) {
  const ancestors = [];
  let currentScope = proofState.scopes.find(scope => scope.id === scopeId);

  while (currentScope) {
    ancestors.push(currentScope.id);

    if (!currentScope.parentScopeId) {
      break;
    }

    currentScope = proofState.scopes.find(scope => scope.id === currentScope.parentScopeId);
  }

  return ancestors;
}

export function isLineAccessible(proofState, line, currentScopeId = proofState.currentScopeId) {
  if (!line) {
    return false;
  }

  const lineScope = proofState.scopes.find(scope => scope.id === line.scopeId);

  if (lineScope?.closed) {
    return false;
  }

  return getScopeAncestors(proofState, currentScopeId).includes(line.scopeId);
}

export function getScopeDepth(proofState, scopeId) {
  return Math.max(0, getScopeAncestors(proofState, scopeId).length - 1);
}

export function getCurrentScope(proofState) {
  return proofState.scopes.find(scope => scope.id === proofState.currentScopeId);
}

export function getAssumptionLineForScope(proofState, scopeId) {
  const scope = proofState.scopes.find(candidate => candidate.id === scopeId);

  if (!scope?.assumptionLineId) {
    return null;
  }

  return proofState.lines.find(line => line.id === scope.assumptionLineId) || null;
}
