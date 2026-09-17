// Keep help dismissal within this tab, separate from game answer storage.
const dismissed = new Set();
const keyFor = (path, id) => `imagee:modal-dismissed:${JSON.stringify([path, id])}`;

export function wasDismissed(path, id) {
  const key = keyFor(path, id);
  if (dismissed.has(key)) return true;
  try { return sessionStorage.getItem(key) === 'true'; }
  catch { return false; }
}

export function rememberDismissal(path, id) {
  const key = keyFor(path, id);
  dismissed.add(key);
  try { sessionStorage.setItem(key, 'true'); }
  catch { /* Keep the in-memory dismissal when browser storage is unavailable. */ }
}
