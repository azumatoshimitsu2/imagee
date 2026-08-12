const PRECEDENCE = {
  implication: 1,
  or: 2,
  and: 3,
  not: 4,
  atom: 5,
  bottom: 5
};

export function formatFormula(formula) {
  return formatWithParent(formula, 0, null);
}

function formatWithParent(formula, parentPrecedence, side) {
  const precedence = PRECEDENCE[formula.type];
  let text = "";

  switch (formula.type) {
    case "atom":
      text = formula.name;
      break;

    case "bottom":
      text = "⊥";
      break;

    case "not":
      text = `¬${formatWithParent(formula.value, precedence, "right")}`;
      break;

    case "and":
      text = `${formatWithParent(formula.left, precedence, "left")} ∧ ${formatWithParent(formula.right, precedence, "right")}`;
      break;

    case "or":
      text = `${formatWithParent(formula.left, precedence, "left")} ∨ ${formatWithParent(formula.right, precedence, "right")}`;
      break;

    case "implication":
      text = `${formatWithParent(formula.left, precedence, "left")} → ${formatWithParent(formula.right, precedence, "right")}`;
      break;

    default:
      throw new TypeError(`Unknown formula type: ${formula.type}`);
  }

  if (needsParentheses(formula, parentPrecedence, side)) {
    return `(${text})`;
  }

  return text;
}

function needsParentheses(formula, parentPrecedence, side) {
  const precedence = PRECEDENCE[formula.type];

  if (precedence < parentPrecedence) {
    return true;
  }

  if (formula.type === "implication" && side === "left" && precedence === parentPrecedence) {
    return true;
  }

  return false;
}

