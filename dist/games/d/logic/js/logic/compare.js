export function formulasEqual(a, b) {
  if (!a || !b || a.type !== b.type) {
    return false;
  }

  switch (a.type) {
    case "atom":
      return a.name === b.name;

    case "bottom":
      return true;

    case "not":
      return formulasEqual(a.value, b.value);

    case "and":
    case "or":
    case "implication":
      return formulasEqual(a.left, b.left) && formulasEqual(a.right, b.right);

    default:
      return false;
  }
}

