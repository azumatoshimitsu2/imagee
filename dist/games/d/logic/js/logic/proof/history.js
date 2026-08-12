export function createHistory(initialState) {
  return {
    past: [],
    present: initialState,
    future: []
  };
}

export function pushHistory(history, nextState) {
  return {
    past: [...history.past, history.present],
    present: nextState,
    future: []
  };
}

export function undo(history) {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  };
}

