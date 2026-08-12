import { RULES } from "../logic/constants.js";
import { getRule, getRuleStatus } from "../logic/rules/registry.js";
import { createElement } from "./dom.js";

const visibleRules = [
  RULES.AND_INTRO,
  RULES.AND_ELIM_LEFT,
  RULES.AND_ELIM_RIGHT,
  RULES.OR_INTRO_LEFT,
  RULES.OR_INTRO_RIGHT,
  RULES.OR_ELIM,
  RULES.IMPLICATION_INTRO,
  RULES.IMPLICATION_ELIM,
  RULES.NEGATION_INTRO,
  RULES.NEGATION_ELIM,
  RULES.BOTTOM_ELIM,
  RULES.DOUBLE_NEGATION_ELIM
];

export function renderRulePalette(container, proofState, selectedLines, onApplyRule, onExplainRule) {
  const title = createElement("h2", {
    className: "panel-title",
    text: "推論規則"
  });

  const list = createElement("div", {
    className: "rule-list"
  });

  visibleRules.forEach(ruleId => {
    const rule = getRule(ruleId);
    const status = getRuleStatus(proofState, ruleId, selectedLines);
    const button = createElement("button", {
      className: "rule-button",
      text: status.available ? rule.label : `${rule.label} 🔒`,
      attributes: {
        type: "button",
        title: status.reason
      }
    });

    if (!status.available) {
      button.classList.add("is-locked");
    }

    button.disabled = !status.available || !status.applicable;
    button.addEventListener("click", () => {
      onApplyRule(ruleId);
    });

    const info = createElement("button", {
      className: "rule-info",
      text: "?",
      attributes: {
        type: "button",
        "aria-label": `${rule.label} の説明`
      }
    });
    info.addEventListener("click", () => {
      onExplainRule(ruleId, status.reason);
    });

    const item = createElement("div", {
      className: "rule-item"
    });

    item.append(button, info);
    list.append(item);
  });

  container.replaceChildren(title, list);
}
