import { formulasEqual } from "../compare.js";
import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyImplicationElim(proofState, selectedLines) {
  return Boolean(getImplicationElimResult(proofState, selectedLines));
}

export function applyImplicationElim(proofState, selectedLines) {
  const result = getImplicationElimResult(proofState, selectedLines);

  if (!result) {
    throw new Error("→Eには A → B と A の2行が必要です。");
  }

  return addProofLine(
    proofState,
    result.formula,
    "implicationElim",
    result.references
  );
}

function getImplicationElimResult(proofState, selectedLines) {
  if (
    selectedLines.length !== 2 ||
    !selectedLines.every(line => isLineAccessible(proofState, line))
  ) {
    return null;
  }

  const [first, second] = selectedLines;

  if (
    first.formula.type === "implication" &&
    formulasEqual(first.formula.left, second.formula)
  ) {
    return {
      formula: first.formula.right,
      references: [first.id, second.id]
    };
  }

  if (
    second.formula.type === "implication" &&
    formulasEqual(second.formula.left, first.formula)
  ) {
    return {
      formula: second.formula.right,
      references: [second.id, first.id]
    };
  }

  return null;
}

