import { LOGIC_SYSTEM, RULES } from "./constants.js";

const minimalRules = [
  RULES.AND_INTRO,
  RULES.AND_ELIM_LEFT,
  RULES.AND_ELIM_RIGHT,
  RULES.OR_INTRO_LEFT,
  RULES.OR_INTRO_RIGHT,
  RULES.OR_ELIM,
  RULES.IMPLICATION_INTRO,
  RULES.IMPLICATION_ELIM,
  RULES.NEGATION_INTRO,
  RULES.NEGATION_ELIM
];

export const logicSystems = {
  [LOGIC_SYSTEM.MINIMAL]: minimalRules,
  [LOGIC_SYSTEM.INTUITIONISTIC]: [
    ...minimalRules,
    RULES.BOTTOM_ELIM
  ],
  [LOGIC_SYSTEM.CLASSICAL]: [
    ...minimalRules,
    RULES.BOTTOM_ELIM,
    RULES.DOUBLE_NEGATION_ELIM
  ]
};

export function isRuleAvailable(system, ruleId) {
  return Boolean(logicSystems[system]?.includes(ruleId));
}

