import { and } from "../ast.js";
import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyAndIntro(proofState, selectedLines) {
  return (
    selectedLines.length === 2 &&
    selectedLines.every(line => isLineAccessible(proofState, line))
  );
}

export function applyAndIntro(proofState, selectedLines) {
  if (!canApplyAndIntro(proofState, selectedLines)) {
    throw new Error("∧Iには使用可能な2行が必要です。");
  }

  return addProofLine(
    proofState,
    and(selectedLines[0].formula, selectedLines[1].formula),
    "andIntro",
    selectedLines.map(line => line.id)
  );
}

