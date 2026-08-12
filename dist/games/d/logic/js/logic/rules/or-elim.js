import { formulasEqual } from "../compare.js";
import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyOrElim(proofState, selectedLines) {
  return Boolean(getOrElimResult(proofState, selectedLines));
}

export function applyOrElim(proofState, selectedLines) {
  const result = getOrElimResult(proofState, selectedLines);

  if (!result) {
    throw new Error("∨Eには A ∨ B, A → C, B → C の3行が必要です。");
  }

  return addProofLine(
    proofState,
    result.formula,
    "orElim",
    result.references
  );
}

function getOrElimResult(proofState, selectedLines) {
  if (
    selectedLines.length !== 3 ||
    !selectedLines.every(line => isLineAccessible(proofState, line))
  ) {
    return null;
  }

  const disjunctionLine = selectedLines.find(line => line.formula.type === "or");
  const implicationLines = selectedLines.filter(line => line.formula.type === "implication");

  if (!disjunctionLine || implicationLines.length !== 2) {
    return null;
  }

  const leftCase = implicationLines.find(line => (
    formulasEqual(line.formula.left, disjunctionLine.formula.left)
  ));
  const rightCase = implicationLines.find(line => (
    formulasEqual(line.formula.left, disjunctionLine.formula.right)
  ));

  if (
    !leftCase ||
    !rightCase ||
    leftCase.id === rightCase.id ||
    !formulasEqual(leftCase.formula.right, rightCase.formula.right)
  ) {
    return null;
  }

  return {
    formula: leftCase.formula.right,
    references: [disjunctionLine.id, leftCase.id, rightCase.id]
  };
}

