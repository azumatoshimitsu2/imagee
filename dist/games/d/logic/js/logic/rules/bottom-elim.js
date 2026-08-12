import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyBottomElim(proofState, selectedLines) {
  return (
    selectedLines.length === 1 &&
    selectedLines[0].formula.type === "bottom" &&
    isLineAccessible(proofState, selectedLines[0])
  );
}

export function applyBottomElim(proofState, selectedLines, options = {}) {
  if (!canApplyBottomElim(proofState, selectedLines) || !options.formula) {
    throw new Error("⊥Eには ⊥ の1行と、導出したい式が必要です。");
  }

  return addProofLine(
    proofState,
    options.formula,
    "bottomElim",
    [selectedLines[0].id]
  );
}

