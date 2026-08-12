import { bottom } from "../ast.js";
import { formulasEqual } from "../compare.js";
import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyNegationElim(proofState, selectedLines) {
  return Boolean(getNegationElimReferences(proofState, selectedLines));
}

export function applyNegationElim(proofState, selectedLines) {
  const references = getNegationElimReferences(proofState, selectedLines);

  if (!references) {
    throw new Error("¬Eには A と ¬A の2行が必要です。");
  }

  return addProofLine(
    proofState,
    bottom(),
    "negationElim",
    references
  );
}

function getNegationElimReferences(proofState, selectedLines) {
  if (
    selectedLines.length !== 2 ||
    !selectedLines.every(line => isLineAccessible(proofState, line))
  ) {
    return null;
  }

  const [first, second] = selectedLines;

  if (
    second.formula.type === "not" &&
    formulasEqual(first.formula, second.formula.value)
  ) {
    return [first.id, second.id];
  }

  if (
    first.formula.type === "not" &&
    formulasEqual(second.formula, first.formula.value)
  ) {
    return [second.id, first.id];
  }

  return null;
}

