import { check, safeJSON, indexById } from './validation.js';

// This module selects illustrations from existing analysis, never scores answers.
export function validateLandscapes(data, axes) {
  safeJSON(data);
  check(data?.schemaVersion === 1, 'Unsupported landscape schema');
  const entries = indexById(data.landscapes, 'landscapes');
  const axisIds = new Set(axes.map(a => a.id));
  const policy = data.selection;
  check(policy?.axisMatch === 'all' && policy.baseStrategy === 'multiple_axes_then_mean_absolute_score'
    && policy.tieBreak === 'priority_then_id' && policy.specialFirst === true, 'Unsupported landscape selection');
  check(Number.isInteger(policy.minimumAxisAnswers) && policy.minimumAxisAnswers >= 3, 'Insufficient landscape evidence threshold');
  for (const key of ['intro', 'insufficient', 'unmatched', 'base', 'special', 'provisional', 'method']) {
    check(typeof data.copy?.[key] === 'string' && data.copy[key].trim(), 'Missing landscape copy');
  }
  for (const item of entries.values()) {
    for (const key of ['name', 'alt', 'resultText']) check(typeof item[key] === 'string' && item[key].trim(), 'Missing landscape text');
    // Same-site local assets only: no remote tracking, schemes or path traversal.
    check(typeof item.image === 'string' && /^img\/[a-z0-9_-]+\.webp$/.test(item.image), 'Unsafe landscape image path');
    check(typeof item.enabled === 'boolean' && Number.isFinite(item.priority), 'Invalid landscape metadata');
    check(['base', 'special'].includes(item.type), 'Invalid landscape type');
    if (!item.enabled) {
      check(typeof item.pendingReason === 'string' && item.pendingReason.trim(), 'Missing pending landscape reason');
      continue;
    }
    const c = item.conditions;
    check(c && typeof c === 'object', 'Missing landscape conditions');
    if (c.mode === 'fallback_balanced') {
      check(item.id === policy.fallbackLandscapeId && item.type === 'base' && Object.keys(c).length === 1, 'Invalid landscape fallback');
    } else if (c.axisHints) {
      check(item.type === 'base' && Object.keys(c).length === 1 && Object.keys(c.axisHints).length > 0, 'Invalid axis conditions');
      for (const [axis, range] of Object.entries(c.axisHints)) {
        check(axisIds.has(axis), 'Unknown landscape axis');
        check(range && Object.keys(range).length > 0 && Object.entries(range).every(([key, value]) => ['min', 'max'].includes(key) && Number.isFinite(value) && value >= -1 && value <= 1), 'Invalid landscape range');
        check(range.min === undefined || range.max === undefined || range.min <= range.max, 'Reversed landscape range');
      }
    } else {
      check(item.type === 'special' && c.event === 'BOUNDARY'
        && Object.keys(c).every(k => ['event', 'minimumCount', 'minimumEvidenceAnswers'].includes(k)), 'Unsupported landscape condition');
      check(Number.isInteger(c.minimumCount) && c.minimumCount >= 1 && Number.isInteger(c.minimumEvidenceAnswers) && c.minimumEvidenceAnswers >= 2, 'Insufficient special evidence');
    }
  }
  const fallback = entries.get(policy.fallbackLandscapeId);
  check(fallback?.enabled && fallback.conditions?.mode === 'fallback_balanced', 'Missing enabled landscape fallback');
  return data;
}

export async function loadLandscapes({ axes, fetcher = globalThis.fetch, url = new URL('../data/landscapes.json', import.meta.url) }) {
  const response = await fetcher(url);
  check(response.ok, `Cannot load landscapes: ${response.status}`);
  return validateLandscapes(await response.json(), axes);
}

export function selectLandscape(definition, profile, discoveries = []) {
  const policy = definition.selection;
  const visible = axis => axis && axis.visibility !== 'hidden' && Number.isFinite(axis.score)
    && axis.confidence >= policy.minimumAxisAnswers;
  const fallback = definition.landscapes.find(l => l.id === policy.fallbackLandscapeId);
  const enabled = definition.landscapes.filter(l => l.enabled);
  const order = (a, b) => b.landscape.priority - a.landscape.priority || a.landscape.id.localeCompare(b.landscape.id);
  const specials = enabled.filter(l => l.type === 'special').flatMap(landscape => {
    const c = landscape.conditions;
    // Callers supply freshly detected comments, not persisted discoveries.
    const events = [...new Map(discoveries.filter(d => d.type === c.event).map(d => [d.id, d])).values()];
    const evidenceAnswerIds = [...new Set(events.flatMap(d => d.evidence.answerIds))];
    return events.length >= c.minimumCount && evidenceAnswerIds.length >= c.minimumEvidenceAnswers
      ? [{ landscape, status: 'special', matchedAxes: [], evidenceAnswerIds, discoveryIds: events.map(d => d.id), provisional: false }] : [];
  });
  if (specials.length) return specials.sort(order)[0];
  const bases = enabled.filter(l => l.type === 'base' && l.conditions.axisHints).flatMap(landscape => {
    const hints = Object.entries(landscape.conditions.axisHints);
    if (!hints.every(([id, range]) => {
      const axis = profile.axes[id];
      return visible(axis) && (range.min === undefined || axis.score >= range.min) && (range.max === undefined || axis.score <= range.max);
    })) return [];
    const matchedAxes = hints.map(([id]) => id);
    return [{ landscape, status: 'base', matchedAxes,
      fit: matchedAxes.reduce((sum, id) => sum + Math.abs(profile.axes[id].score), 0) / matchedAxes.length,
      provisional: matchedAxes.some(id => profile.axes[id].visibility === 'provisional'),
      evidenceAnswerIds: [...new Set(matchedAxes.flatMap(id => profile.axes[id].evidenceAnswerIds))], discoveryIds: [] }];
  });
  // Prefer a matching combination over any single-axis candidate, even a stronger one.
  // Among combinations, more axes do not automatically mean better evidence.
  if (bases.length) return bases.sort((a, b) => Number(b.matchedAxes.length > 1) - Number(a.matchedAxes.length > 1)
    || b.fit - a.fit || order(a, b))[0];
  return { landscape: fallback, status: Object.values(profile.axes).some(visible) ? 'unmatched' : 'insufficient',
    matchedAxes: [], evidenceAnswerIds: [], discoveryIds: [], provisional: false };
}
