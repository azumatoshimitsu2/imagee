import { formulasEqual } from "../compare.js";

export function isProofComplete(proofState) {
  return proofState.lines.some(line => (
    line.scopeId === "root" &&
    formulasEqual(line.formula, proofState.conclusion)
  ));
}

export function markCompletion(proofState) {
  return {
    ...proofState,
    completed: isProofComplete(proofState)
  };
}

