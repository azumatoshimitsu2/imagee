import {
  LOGIC_CATEGORIES,
  LOGIC_DIFFICULTY_LEVELS,
  buildGeneratedProblem,
  getProblemBank,
  selectProblem
} from './data/problem-bank.js';
import {
  addProofLine,
  checkProblemSolved,
  createInitialProofState,
  getSolutionPreview,
  getStackedLineLayout,
  validateLine
} from './logic/proof/proof-state.js';
import { renderProblemPage, renderProblemStatus } from './ui/problem-page.js';
import { renderProofWorkspace } from './ui/proof-workspace.js';

const categorySelector = document.querySelector('#category-selector');
const difficultySelector = document.querySelector('#difficulty-selector');
const problemList = document.querySelector('#problem-list');
const problemHeader = document.querySelector('#problem-header');
const problemStatus = document.querySelector('#problem-status-wrap');
const workspace = document.querySelector('#proof-workspace');

const state = {
  category: 'minimal',
  difficulty: 'all',
  selectedProblemId: null,
  problems: getProblemBank('minimal', 5, 'all'),
  proofState: null,
  statusMessage: '問題を選んで証明を始めましょう。',
  statusKind: 'info',
  proofDraft: null
};

function getCurrentProblem() {
  return selectProblem(state.problems, state.selectedProblemId);
}

function resetProofState() {
  const problem = getCurrentProblem();
  if (!problem) {
    state.proofState = null;
    return;
  }

  state.proofState = createInitialProofState(problem);
  state.statusMessage = `${problem.title} を開始しました。`;
  state.statusKind = 'info';
  state.proofDraft = null;
}

function renderCategoryButtons() {
  categorySelector.innerHTML = '';
  LOGIC_CATEGORIES.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-button${state.category === category ? ' is-active' : ''}`;
    button.textContent = category === 'minimal'
      ? '最小論理'
      : category === 'intuitionistic'
        ? '直感論理'
        : '古典論理';
    button.addEventListener('click', () => {
      state.category = category;
      state.problems = getProblemBank(category, 5, state.difficulty);
      state.selectedProblemId = state.problems[0]?.id ?? null;
      resetProofState();
      render();
    });
    categorySelector.appendChild(button);
  });
}

function renderDifficultySelector() {
  if (!difficultySelector.dataset.initialized) {
    difficultySelector.innerHTML = '';

    const label = document.createElement('label');
    label.className = 'difficulty-control';

    const span = document.createElement('span');
    span.textContent = '難易度';

    const select = document.createElement('select');
    LOGIC_DIFFICULTY_LEVELS.forEach((level) => {
      const option = document.createElement('option');
      option.value = level;
      option.textContent = level === 'all' ? 'すべて' : level;
      select.appendChild(option);
    });

    select.addEventListener('change', (event) => {
      state.difficulty = event.target.value;
      state.problems = getProblemBank(state.category, 5, state.difficulty);
      state.selectedProblemId = state.problems[0]?.id ?? null;
      resetProofState();
      render();
    });

    label.appendChild(span);
    label.appendChild(select);
    difficultySelector.appendChild(label);
    difficultySelector.dataset.initialized = 'true';
  }

  const select = difficultySelector.querySelector('select');
  if (select) {
    select.value = state.difficulty;
  }
}

function renderProblemList() {
  problemList.innerHTML = '';
  state.problems.forEach((problem) => {
    const item = document.createElement('li');
    item.className = `problem-item${problem.id === state.selectedProblemId ? ' is-selected' : ''}`;
    item.textContent = problem.title;
    item.addEventListener('click', () => {
      state.selectedProblemId = problem.id;
      resetProofState();
      render();
    });
    problemList.appendChild(item);
  });

  const generateButton = document.createElement('button');
  generateButton.type = 'button';
  generateButton.className = 'category-button';
  generateButton.textContent = '新しい問題を追加';
  generateButton.addEventListener('click', () => {
    appendGeneratedProblem();
    state.selectedProblemId = state.problems.at(-1)?.id ?? null;
    resetProofState();
    render();
  });
  problemList.appendChild(generateButton);
}

function appendGeneratedProblem() {
  const currentProblems = [...state.problems];
  const nextProblem = buildGeneratedProblem(state.category, currentProblems.length + 1, state.difficulty);
  const numberedProblem = {
    ...nextProblem,
    title: `問題 ${currentProblems.length + 1}`
  };
  state.problems = [...currentProblems, numberedProblem].filter((problem) => (
    state.difficulty === 'all' || problem.difficulty === state.difficulty
  ));
}

function goToNextProblem() {
  if (state.problems.length === 0) {
    state.selectedProblemId = null;
    state.proofState = null;
    return;
  }

  const currentIndex = state.problems.findIndex((problem) => problem.id === state.selectedProblemId);
  if (currentIndex === state.problems.length - 1) {
    appendGeneratedProblem();
    state.selectedProblemId = state.problems.at(-1)?.id ?? null;
    resetProofState();
    render();
    return;
  }

  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  state.selectedProblemId = state.problems[nextIndex]?.id ?? null;
  resetProofState();
  render();
}

function fillSolution() {
  const problem = getCurrentProblem();
  if (!problem || !state.proofState) return;

  const preview = getSolutionPreview(problem);
  if (preview.length === 0) {
    state.statusMessage = 'この問題には解答データがまだありません。';
    state.statusKind = 'error';
    render();
    return;
  }

  state.proofState = createInitialProofState(problem);
  state.proofDraft = null;

  for (const step of preview) {
    const isExistingPremise = step.rule === '前提' &&
      problem.premises.some((premise) => premise === step.formula);
    if (isExistingPremise) continue;

    const result = addProofLine(state.proofState, {
      formula: step.formula,
      rule: step.rule,
      dependencies: (step.deps ?? []).map((dependency) => dependency - 1)
    });

    if (!result.ok) {
      state.statusMessage = `解答を入力できませんでした: ${result.message}`;
      state.statusKind = 'error';
      render();
      return;
    }
  }

  state.statusMessage = checkProblemSolved(state.proofState)
    ? '解答を入力しました。証明が完成しています。'
    : '解答を入力しました。';
  state.statusKind = checkProblemSolved(state.proofState) ? 'success' : 'info';
  render();
}

function renderWorkspace() {
  const problem = getCurrentProblem();
  if (!problem || !state.proofState) {
    workspace.innerHTML = '';
    return;
  }

  const solved = checkProblemSolved(state.proofState);

  renderProofWorkspace(workspace, state.proofState, {
    isSolved: solved,
    draft: state.proofDraft,
    onAdd: (draft) => {
      const result = addProofLine(state.proofState, draft);
      if (!result.ok) {
        state.proofDraft = draft;
        state.statusMessage = result.message;
        state.statusKind = 'error';
        render();
        return;
      }

      state.proofDraft = null;
      const validation = validateLine(state.proofState, result.line);
      state.statusMessage = validation.message;
      state.statusKind = 'info';
      if (checkProblemSolved(state.proofState)) {
        state.statusMessage = '正解です！ 結論に到達しました。';
        state.statusKind = 'success';
      }
      render();
    },
    onReset: () => {
      resetProofState();
      state.proofDraft = null;
      render();
    },
    onFillSolution: () => {
      fillSolution();
    },
    onNextProblem: () => {
      goToNextProblem();
    }
  });
}

function render() {
  renderCategoryButtons();
  renderDifficultySelector();
  if (!state.selectedProblemId && state.problems.length > 0) {
    state.selectedProblemId = state.problems[0].id;
  }

  if (!state.proofState || state.proofState.problem.id !== state.selectedProblemId) {
    resetProofState();
  }

  renderProblemList();
  renderWorkspace();
  renderProblemPage(problemHeader, getCurrentProblem());
  renderProblemStatus(problemStatus, state.statusMessage, state.statusKind);
}

state.selectedProblemId = state.problems[0]?.id ?? null;
resetProofState();
render();
