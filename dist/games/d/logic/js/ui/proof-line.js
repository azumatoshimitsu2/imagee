import { formatFormula } from "../logic/formatter.js";
import { getScopeDepth, isLineAccessible } from "../logic/proof/scope.js";
import { createElement } from "./dom.js";

const ruleLabels = {
  premise: "前提",
  assumption: "仮定",
  andIntro: "∧I",
  andElimLeft: "∧E 左",
  andElimRight: "∧E 右",
  implicationIntro: "→I",
  implicationElim: "→E",
  negationIntro: "¬I",
  negationElim: "¬E",
  orIntroLeft: "∨I 左",
  orIntroRight: "∨I 右",
  orElim: "∨E",
  bottomElim: "⊥E",
  doubleNegationElim: "¬¬E"
};

export function createProofLineElement(line, index, selected, proofState) {
  const accessible = isLineAccessible(proofState, line);
  const depth = getScopeDepth(proofState, line.scopeId);
  const button = createElement("button", {
    className: "proof-line",
    attributes: {
      type: "button",
      "aria-pressed": selected ? "true" : "false",
      style: `--scope-depth: ${depth};`
    },
    dataset: {
      lineId: line.id
    }
  });

  if (selected) {
    button.classList.add("is-selected");
  }

  if (line.assumption) {
    button.classList.add("is-assumption");
  }

  if (!accessible) {
    button.classList.add("is-inaccessible");
    button.disabled = true;
  }

  const number = createElement("span", {
    className: "proof-line__number",
    text: `${index + 1}.`
  });
  const formula = createElement("span", {
    className: "proof-line__formula",
    text: formatFormula(line.formula)
  });
  const rule = createElement("span", {
    className: "proof-line__rule",
    text: formatRule(line)
  });

  button.append(number, formula, rule);

  return button;
}

function formatRule(line) {
  if (line.references.length === 0) {
    return ruleLabels[line.rule] || line.rule;
  }

  const references = line.references
    .map(referenceId => referenceId.replace("line-", ""))
    .join(",");

  return `${ruleLabels[line.rule] || line.rule} ${references}`;
}
