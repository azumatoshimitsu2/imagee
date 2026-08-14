import { getOpenAssumptionNumbers, getProblemReferenceLines } from '../logic/proof/proof-state.js';
import { formatRuleLabel } from './rule-labels.js';

export function renderProofWorkspace(container, proofState, actions = {}) {
  if (!container || !proofState) {
    container.innerHTML = '';
    return;
  }

  const { lines } = proofState;
  const {
    onAdd,
    onReset,
    onFillSolution,
    onNextProblem,
    isSolved = false,
    draft = null
  } = actions;

  container.innerHTML = '';

  const copyFormula = (formula, form, element) => {
    form.elements.formula.value = formula;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(formula).catch(() => {});
    }
    element.classList.add('is-copied');
    window.setTimeout(() => {
      element.classList.remove('is-copied');
    }, 700);
  };

  const referenceLines = getProblemReferenceLines(proofState);
  const premiseCount = referenceLines.length;
  const formatDependencyLabel = (value) => {
    if (!Number.isInteger(value) || value < 0) return String(value);
    return value < premiseCount ? `P${value + 1}` : String(value - premiseCount + 1);
  };
  const parseDependencyToken = (token) => {
    const trimmed = token.trim();
    const premiseMatch = trimmed.match(/^p(\d+)$/i);
    if (premiseMatch) {
      return Number(premiseMatch[1]) - 1;
    }
    if (/^\d+$/.test(trimmed)) {
      return premiseCount + Number(trimmed) - 1;
    }
    return NaN;
  };
  const proofContext = document.createElement('section');
  proofContext.className = 'proof-context';
  proofContext.innerHTML = `
    <div class="proof-context-group">
      <h3>前提</h3>
      <div class="proof-context-lines">
        ${referenceLines.map((line) => `
          <button type="button" class="proof-context-line is-selectable-line" data-copy-premise="true" title="式欄にコピー">
            <span class="line-number">P${line.number}</span>
            <span class="line-formula">${line.formula}</span>
            <span class="line-rule">${formatRuleLabel(line.rule)}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="proof-context-group proof-goal">
      <h3>目標</h3>
      <button type="button" class="proof-context-line is-selectable-line" data-copy-goal="true" title="式欄にコピー">
        <span class="line-formula">${proofState.problem.conclusion}</span>
        <span class="line-rule">結論</span>
      </button>
    </div>
  `;

  const proofLines = document.createElement('div');
  proofLines.className = 'proof-lines';

  lines.forEach((line, index) => {
    const row = document.createElement('button');
    const displayNumber = index + 1;
    const openAssumptions = getOpenAssumptionNumbers(proofState, line);
    row.type = 'button';
    row.className = [
      'proof-line',
      'is-selectable-line',
      line.rule === '仮定' ? 'is-assumption-line' : '',
      openAssumptions.length > 0 ? 'has-open-assumptions' : ''
    ].filter(Boolean).join(' ');
    row.dataset.copyFormula = 'true';
    row.style.setProperty('--scope-depth', String(openAssumptions.length));

    const deps = Array.isArray(line.dependencies) && line.dependencies.length > 0
      ? line.dependencies.map(formatDependencyLabel).join(', ')
      : '-';
    const scope = openAssumptions.length > 0
      ? ` / 未解消: ${openAssumptions.join(', ')}`
      : '';

    row.innerHTML = `
      <span class="line-number">${displayNumber}</span>
      <span class="line-formula">${line.formula}</span>
      <span class="line-rule">${formatRuleLabel(line.rule)}</span>
      <span class="line-justification">依存: ${deps}${scope}</span>
    `;
    proofLines.appendChild(row);
  });

  if (lines.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'proof-empty';
    empty.textContent = '証明行はまだありません。前提は P1, P2... として依存元に使えます。';
    proofLines.appendChild(empty);
  }

  const form = document.createElement('form');
  form.className = 'logic-proof-form';
  const allowedRules = proofState.problem.availableRules ?? ['前提'];

  form.innerHTML = `
    <label>
      <span>式</span>
      <input type="text" name="formula" placeholder="例: A → B" inputmode="latin" autocomplete="off" autocapitalize="off" spellcheck="false" />
    </label>
    <label>
      <span>規則</span>
      <select name="rule">
        ${allowedRules.map((rule) => `<option value="${rule}">${formatRuleLabel(rule)}</option>`).join('')}
      </select>
    </label>
    <label>
      <span>依存元</span>
      <input type="text" name="dependencies" placeholder="例: P1,1" inputmode="latin" autocomplete="off" autocapitalize="off" spellcheck="false" />
    </label>
    <div class="logic-proof-actions">
      <button type="submit">証明行を追加</button>
      <button type="button" class="secondary" data-fill-solution="true">解答</button>
      ${isSolved ? '<button type="button" class="secondary" data-next="true">次の証明へ</button>' : ''}
      <button type="button" class="secondary" data-reset="true">リセット</button>
    </div>
  `;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const formula = String(formData.get('formula') || '').trim();
    const defaultRule = (proofState.problem.availableRules ?? ['前提'])[0] || '前提';
    const rule = String(formData.get('rule') || defaultRule);
    const rawDependencies = String(formData.get('dependencies') || '').trim();
    const dependencies = rawDependencies
      ? rawDependencies
          .split(',')
          .map((part) => part.trim())
          .map(parseDependencyToken)
      : [];

    if (typeof onAdd === 'function') {
      onAdd({ formula, rule, dependencies, rawDependencies });
    }
  });

  form.elements.formula.value = draft?.formula ?? '';
  form.elements.rule.value = draft?.rule ?? allowedRules[0] ?? '前提';
  form.elements.dependencies.value = draft?.rawDependencies ?? (
    Array.isArray(draft?.dependencies)
      ? draft.dependencies.map(formatDependencyLabel).join(',')
      : ''
  );

  const resetButton = form.querySelector('[data-reset="true"]');
  resetButton.addEventListener('click', () => {
    if (typeof onReset === 'function') onReset();
  });

  const fillSolutionButton = form.querySelector('[data-fill-solution="true"]');
  fillSolutionButton.addEventListener('click', () => {
    if (typeof onFillSolution === 'function') onFillSolution();
  });

  const nextButton = form.querySelector('[data-next="true"]');
  if (nextButton && typeof onNextProblem === 'function') {
    nextButton.addEventListener('click', () => {
      onNextProblem();
    });
  }

  container.appendChild(proofContext);
  container.appendChild(proofLines);
  container.appendChild(form);

  container.querySelectorAll('[data-copy-premise="true"], [data-copy-formula="true"], [data-copy-goal="true"]').forEach((element) => {
    element.addEventListener('click', () => {
      const formula = element.querySelector('.line-formula')?.textContent ?? '';
      copyFormula(formula, form, element);
    });
  });
}
