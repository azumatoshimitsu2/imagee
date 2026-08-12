import { RULES } from "../constants.js";
import { isRuleAvailable } from "../systems.js";
import {
  applyAndElimLeft,
  applyAndElimRight,
  canApplyAndElimLeft,
  canApplyAndElimRight
} from "./and-elim.js";
import { applyAndIntro, canApplyAndIntro } from "./and-intro.js";
import { applyBottomElim, canApplyBottomElim } from "./bottom-elim.js";
import { applyDoubleNegationElim, canApplyDoubleNegationElim } from "./double-negation-elim.js";
import { applyImplicationIntro, canApplyImplicationIntro } from "./implication-intro.js";
import { applyImplicationElim, canApplyImplicationElim } from "./implication-elim.js";
import { applyNegationIntro, canApplyNegationIntro } from "./negation-intro.js";
import { applyNegationElim, canApplyNegationElim } from "./negation-elim.js";
import { applyOrElim, canApplyOrElim } from "./or-elim.js";
import { applyOrIntroLeft, applyOrIntroRight, canApplyOrIntro } from "./or-intro.js";

export const ruleRegistry = {
  [RULES.AND_INTRO]: {
    id: RULES.AND_INTRO,
    label: "∧I",
    description: "選択した2行から A ∧ B を導出します。",
    canApply: canApplyAndIntro,
    apply: applyAndIntro
  },
  [RULES.AND_ELIM_LEFT]: {
    id: RULES.AND_ELIM_LEFT,
    label: "∧E 左",
    description: "A ∧ B から左側の A を導出します。",
    canApply: canApplyAndElimLeft,
    apply: applyAndElimLeft
  },
  [RULES.AND_ELIM_RIGHT]: {
    id: RULES.AND_ELIM_RIGHT,
    label: "∧E 右",
    description: "A ∧ B から右側の B を導出します。",
    canApply: canApplyAndElimRight,
    apply: applyAndElimRight
  },
  [RULES.IMPLICATION_ELIM]: {
    id: RULES.IMPLICATION_ELIM,
    label: "→E",
    description: "A → B と A から B を導出します。",
    canApply: canApplyImplicationElim,
    apply: applyImplicationElim
  },
  [RULES.NEGATION_ELIM]: {
    id: RULES.NEGATION_ELIM,
    label: "¬E",
    description: "A と ¬A から ⊥ を導出します。",
    canApply: canApplyNegationElim,
    apply: applyNegationElim
  },
  [RULES.OR_INTRO_LEFT]: {
    id: RULES.OR_INTRO_LEFT,
    label: "∨I 左",
    description: "選択した A から、入力した B と合わせて B ∨ A を導出します。",
    needsFormulaInput: true,
    inputLabel: "左側に追加する式",
    canApply: canApplyOrIntro,
    apply: applyOrIntroLeft
  },
  [RULES.OR_INTRO_RIGHT]: {
    id: RULES.OR_INTRO_RIGHT,
    label: "∨I 右",
    description: "選択した A から、入力した B と合わせて A ∨ B を導出します。",
    needsFormulaInput: true,
    inputLabel: "右側に追加する式",
    canApply: canApplyOrIntro,
    apply: applyOrIntroRight
  },
  [RULES.OR_ELIM]: {
    id: RULES.OR_ELIM,
    label: "∨E",
    description: "A ∨ B, A → C, B → C から C を導出します。",
    canApply: canApplyOrElim,
    apply: applyOrElim
  },
  [RULES.IMPLICATION_INTRO]: {
    id: RULES.IMPLICATION_INTRO,
    label: "→I",
    description: "現在の仮定 A から B を導出できたら、外側に A → B を導出します。",
    canApply: canApplyImplicationIntro,
    apply: applyImplicationIntro
  },
  [RULES.NEGATION_INTRO]: {
    id: RULES.NEGATION_INTRO,
    label: "¬I",
    description: "現在の仮定 A から ⊥ を導出できたら、外側に ¬A を導出します。",
    canApply: canApplyNegationIntro,
    apply: applyNegationIntro
  },
  [RULES.BOTTOM_ELIM]: {
    id: RULES.BOTTOM_ELIM,
    label: "⊥E",
    description: "⊥ から任意の式を導出します。直観主義論理以上で使用できます。",
    needsFormulaInput: true,
    inputLabel: "導出する式",
    canApply: canApplyBottomElim,
    apply: applyBottomElim
  },
  [RULES.DOUBLE_NEGATION_ELIM]: {
    id: RULES.DOUBLE_NEGATION_ELIM,
    label: "¬¬E",
    description: "¬¬A から A を導出します。古典論理で使用できます。",
    canApply: canApplyDoubleNegationElim,
    apply: applyDoubleNegationElim
  }
};

export function getRule(ruleId) {
  return ruleRegistry[ruleId];
}

export function getRuleStatus(proofState, ruleId, selectedLines) {
  const rule = getRule(ruleId);

  if (!rule) {
    return {
      available: false,
      applicable: false,
      reason: "未知の規則です。"
    };
  }

  const available = isRuleAvailable(proofState.system, ruleId);

  if (!available) {
    return {
      available,
      applicable: false,
      reason: `${rule.label} はこの論理体系では使用できません。`
    };
  }

  return {
    available,
    applicable: rule.canApply(proofState, selectedLines),
    reason: rule.description
  };
}
