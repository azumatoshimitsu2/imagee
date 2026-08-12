import { not } from "../ast.js";
import { closeCurrentScopeWithLine } from "../proof/proof-state.js";
import { getAssumptionLineForScope, getCurrentScope, isLineAccessible } from "../proof/scope.js";

export function canApplyNegationIntro(proofState, selectedLines) {
  const currentScope = getCurrentScope(proofState);

  return (
    currentScope?.id !== "root" &&
    selectedLines.length === 1 &&
    selectedLines[0].formula.type === "bottom" &&
    isLineAccessible(proofState, selectedLines[0]) &&
    Boolean(getAssumptionLineForScope(proofState, currentScope.id))
  );
}

export function applyNegationIntro(proofState, selectedLines) {
  if (!canApplyNegationIntro(proofState, selectedLines)) {
    throw new Error("¬Iには、現在の仮定スコープ内で導出した ⊥ の行が必要です。");
  }

  const currentScope = getCurrentScope(proofState);
  const assumptionLine = getAssumptionLineForScope(proofState, currentScope.id);
  const bottomLine = selectedLines[0];

  return closeCurrentScopeWithLine(
    proofState,
    not(assumptionLine.formula),
    "negationIntro",
    [assumptionLine.id, bottomLine.id]
  );
}
