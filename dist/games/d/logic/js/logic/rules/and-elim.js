import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyAndElimLeft(proofState, selectedLines) {
  return canApplyAndElim(proofState, selectedLines);
}

export function canApplyAndElimRight(proofState, selectedLines) {
  return canApplyAndElim(proofState, selectedLines);
}

export function applyAndElimLeft(proofState, selectedLines) {
  return applyAndElim(proofState, selectedLines, "left", "andElimLeft");
}

export function applyAndElimRight(proofState, selectedLines) {
  return applyAndElim(proofState, selectedLines, "right", "andElimRight");
}

function canApplyAndElim(proofState, selectedLines) {
  return (
    selectedLines.length === 1 &&
    selectedLines[0].formula.type === "and" &&
    isLineAccessible(proofState, selectedLines[0])
  );
}

function applyAndElim(proofState, selectedLines, side, rule) {
  if (!canApplyAndElim(proofState, selectedLines)) {
    throw new Error("∧Eには使用可能な A ∧ B の1行が必要です。");
  }

  return addProofLine(
    proofState,
    selectedLines[0].formula[side],
    rule,
    [selectedLines[0].id]
  );
}

