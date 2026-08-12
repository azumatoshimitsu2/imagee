export function atom(name) {
  return {
    type: "atom",
    name
  };
}

export function and(left, right) {
  return {
    type: "and",
    left,
    right
  };
}

export function or(left, right) {
  return {
    type: "or",
    left,
    right
  };
}

export function implication(left, right) {
  return {
    type: "implication",
    left,
    right
  };
}

export function not(value) {
  return {
    type: "not",
    value
  };
}

export function bottom() {
  return {
    type: "bottom"
  };
}

