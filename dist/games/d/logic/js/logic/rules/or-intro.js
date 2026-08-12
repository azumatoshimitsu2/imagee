import { or } from "../ast.js";
import { addProofLine } from "../proof/proof-state.js";
import { isLineAccessible } from "../proof/scope.js";

export function canApplyOrIntro(proofState, selectedLines) {
  return (
    selectedLines.length === 1 &&
    isLineAccessible(proofState, selectedLines[0])
  );
}

export function applyOrIntroLeft(proofState, selectedLines, options = {}) {
  return applyOrIntro(proofState, selectedLines, options, "left", "orIntroLeft");
}

export function applyOrIntroRight(proofState, selectedLines, options = {}) {
  return applyOrIntro(proofState, selectedLines, options, "right", "orIntroRight");
}

function applyOrIntro(proofState, selectedLines, options, side, rule) {
  if (!canApplyOrIntro(proofState, selectedLines) || !options.formula) {
    throw new Error("∨Iには使用可能な1行と、追加する式が必要です。");
  }

  const selectedFormula = selectedLines[0].formula;
  const formula = side === "left"
    ? or(options.formula, selectedFormula)
    : or(selectedFormula, options.formula);

  return addProofLine(
    proofState,
    formula,
    rule,
    [selectedLines[0].id]
  );
}

