import { implication } from "../ast.js";
import { closeCurrentScopeWithLine } from "../proof/proof-state.js";
import { getAssumptionLineForScope, getCurrentScope, isLineAccessible } from "../proof/scope.js";

export function canApplyImplicationIntro(proofState, selectedLines) {
  const currentScope = getCurrentScope(proofState);

  return (
    currentScope?.id !== "root" &&
    selectedLines.length === 1 &&
    isLineAccessible(proofState, selectedLines[0]) &&
    Boolean(getAssumptionLineForScope(proofState, currentScope.id))
  );
}

export function applyImplicationIntro(proofState, selectedLines) {
  if (!canApplyImplicationIntro(proofState, selectedLines)) {
    throw new Error("→Iには、現在の仮定スコープ内で導出した結論1行が必要です。");
  }

  const currentScope = getCurrentScope(proofState);
  const assumptionLine = getAssumptionLineForScope(proofState, currentScope.id);
  const conclusionLine = selectedLines[0];

  return closeCurrentScopeWithLine(
    proofState,
    implication(assumptionLine.formula, conclusionLine.formula),
    "implicationIntro",
    [assumptionLine.id, conclusionLine.id]
  );
}
