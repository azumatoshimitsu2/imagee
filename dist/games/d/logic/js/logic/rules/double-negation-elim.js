import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyDoubleNegationElim(proofState, selectedLines) {
  return (
    selectedLines.length === 1 &&
    Boolean(getDoubleNegationResult(selectedLines[0].formula)) &&
    isLineAccessible(proofState, selectedLines[0])
  );
}

export function applyDoubleNegationElim(proofState, selectedLines) {
  if (!canApplyDoubleNegationElim(proofState, selectedLines)) {
    throw new Error("¬¬Eには ¬¬A の1行が必要です。");
  }

  return addProofLine(
    proofState,
    getDoubleNegationResult(selectedLines[0].formula),
    "doubleNegationElim",
    [selectedLines[0].id]
  );
}

function getDoubleNegationResult(formula) {
  if (formula.type === "not" && formula.value.type === "not") {
    return formula.value.value;
  }

  if (
    formula.type === "implication" &&
    formula.left.type === "not" &&
    formula.right.type === "bottom"
  ) {
    return formula.left.value;
  }

  return null;
}
