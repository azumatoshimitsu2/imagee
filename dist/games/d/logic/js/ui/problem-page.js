import { getProblemById, problems } from "../data/problems.js";
import { generatePracticeProblem } from "../data/generated-problems.js";
import { formatFormula } from "../logic/formatter.js";
import { parseFormula } from "../logic/parser.js";
import { addAssumption, clearSelectedLines, createInitialProofState, getSelectedLines, toggleSelectedLine } from "../logic/proof/proof-state.js";
import { createHistory, pushHistory, undo } from "../logic/proof/history.js";
import { markCompletion } from "../logic/proof/validator.js";
import { getRule } from "../logic/rules/registry.js";
import { completeProblem, completeUnprovableProblem, loadProgress, saveProgress } from "../storage/progress.js";
import { createElement } from "./dom.js";
import { renderProofWorkspace } from "./proof-workspace.js";
import { renderRulePalette } from "./rule-palette.js";

export function mountProblemPage(root, problemId) {
  let problem = getProblemById(problemId);
  let history = createHistory(createInitialProofState(problem));
  let hintIndex = 0;
  let progress = loadProgress();
  let practiceSystem = "minimal";
  let message = "証明行を選択すると、使える規則が有効になります。";

  const refs = createLayout(root);

  function render() {
    const proofState = history.present;
    const selectedLines = getSelectedLines(proofState);

    renderHeader(refs.header, problem, proofState, progress, {
      onSwitchProblem: switchProblem,
      onStartPractice: startPractice,
      onNextPractice: nextPractice,
      practiceSystem
    });
    renderSummary(refs.summary, problem, proofState);
    renderProofWorkspace(refs.workspace, proofState, lineId => {
      history = {
        ...history,
        present: toggleSelectedLine(history.present, lineId)
      };
      render();
    });
    renderRulePalette(
      refs.rules,
      proofState,
      selectedLines,
      applyRule,
      explainRule
    );
    renderActions(refs.actions, proofState);
    renderMessage(refs.message, message, proofState.completed);
  }

  function applyRule(ruleId) {
    const rule = getRule(ruleId);
    const selectedLines = getSelectedLines(history.present);

    try {
      const options = getRuleOptions(rule);

      if (!options) {
        return;
      }

      const nextState = markCompletion(rule.apply(history.present, selectedLines, options));
      history = pushHistory(history, nextState);
      if (nextState.completed && !problem.generated) {
        progress = completeProblem(progress, problem, nextState, hintIndex);
        saveProgress(progress);
      }
      message = nextState.completed
        ? createCompleteMessage(problem, nextState, progress)
        : `${rule.label} を適用しました。`;
    } catch (error) {
      message = error.message;
    }

    render();
  }

  function getRuleOptions(rule) {
    if (!rule.needsFormulaInput) {
      return {};
    }

    const input = window.prompt(`${rule.label}: ${rule.inputLabel}を入力してください。例: A, B → C, ¬A`);

    if (!input) {
      return null;
    }

    try {
      return {
        formula: parseFormula(input)
      };
    } catch (error) {
      message = error.message;
      render();
      return null;
    }
  }

  function explainRule(ruleId, reason) {
    const rule = getRule(ruleId);
    message = `${rule.label}: ${reason}`;
    render();
  }

  function showHint() {
    message = problem.hints[Math.min(hintIndex, problem.hints.length - 1)];
    hintIndex += 1;
    render();
  }

  function resetProblem() {
    history = createHistory(createInitialProofState(problem));
    hintIndex = 0;
    message = "リセットしました。前提とゴールを確認して進めましょう。";
    render();
  }

  function switchProblem(problemId) {
    problem = getProblemById(problemId);
    history = createHistory(createInitialProofState(problem));
    hintIndex = 0;
    message = "問題を切り替えました。証明行を選択して進めましょう。";
    render();
  }

  function startPractice(system) {
    practiceSystem = system;
    problem = generatePracticeProblem(practiceSystem);
    history = createHistory(createInitialProofState(problem));
    hintIndex = 0;
    message = `${problem.systemLabel}の無限練習を開始しました。`;
    render();
  }

  function nextPractice() {
    problem = generatePracticeProblem(practiceSystem);
    history = createHistory(createInitialProofState(problem));
    hintIndex = 0;
    message = "次のランダム問題です。";
    render();
  }

  function startAssumption() {
    const input = window.prompt("仮定する式を入力してください。例: A, B, ¬A");

    if (!input) {
      return;
    }

    try {
      const nextState = addAssumption(history.present, parseFormula(input));
      history = pushHistory(history, nextState);
      message = `${formatFormula(nextState.lines.at(-1).formula)} を仮定しました。`;
    } catch (error) {
      message = error.message;
    }

    render();
  }

  function undoStep() {
    history = undo(history);
    message = "1手戻しました。";
    render();
  }

  function checkProof() {
    const nextState = markCompletion(clearSelectedLines(history.present));
    history = {
      ...history,
      present: nextState
    };
    if (nextState.completed && !problem.generated) {
      progress = completeProblem(progress, problem, nextState, hintIndex);
      saveProgress(progress);
    }
    message = nextState.completed
      ? createCompleteMessage(problem, nextState, progress)
      : "まだ root scope にゴールと同じ式がありません。";
    render();
  }

  function markUnprovable() {
    if (problem.provable) {
      message = "この問題は証明可能です。ヒントを見ながら証明を進めてみましょう。";
      render();
      return;
    }

    if (!problem.generated) {
      progress = completeUnprovableProblem(progress, problem);
      saveProgress(progress);
    }
    history = {
      ...history,
      present: {
        ...history.present,
        selectedLineIds: [],
        completed: true
      }
    };
    message = `正解です。${problem.unprovableExplanation}`;
    render();
  }

  function renderActions(container, proofState) {
    const hintButton = createElement("button", {
      className: "action-button",
      text: "ヒント",
      attributes: {
        type: "button"
      }
    });
    hintButton.addEventListener("click", showHint);

    const undoButton = createElement("button", {
      className: "action-button",
      text: "1手戻る",
      attributes: {
        type: "button"
      }
    });
    undoButton.disabled = history.past.length === 0;
    undoButton.addEventListener("click", undoStep);

    const assumptionButton = createElement("button", {
      className: "action-button",
      text: "仮定を置く",
      attributes: {
        type: "button"
      }
    });
    assumptionButton.addEventListener("click", startAssumption);

    const checkButton = createElement("button", {
      className: "action-button action-button--primary",
      text: proofState.completed ? "完成済み" : "証明確認",
      attributes: {
        type: "button"
      }
    });
    checkButton.addEventListener("click", checkProof);

    const resetButton = createElement("button", {
      className: "action-button",
      text: "リセット",
      attributes: {
        type: "button"
      }
    });
    resetButton.addEventListener("click", resetProblem);

    const nextPracticeButton = createElement("button", {
      className: "action-button",
      text: "次のランダム問題",
      attributes: {
        type: "button"
      }
    });
    nextPracticeButton.addEventListener("click", nextPractice);

    const unprovableButton = createElement("button", {
      className: "action-button",
      text: "この体系では証明できない",
      attributes: {
        type: "button"
      }
    });
    unprovableButton.addEventListener("click", markUnprovable);

    const buttons = problem.provable
      ? [hintButton, assumptionButton, undoButton, checkButton, resetButton]
      : [hintButton, assumptionButton, undoButton, unprovableButton, checkButton, resetButton];

    container.replaceChildren(...(problem.generated ? [...buttons, nextPracticeButton] : buttons));
  }

  render();
}

function createLayout(root) {
  const page = createElement("section", {
    className: "problem"
  });
  const header = createElement("header", {
    className: "problem-header"
  });
  const summary = createElement("section", {
    className: "problem-summary"
  });
  const layout = createElement("div", {
    className: "problem-layout"
  });
  const workspace = createElement("section", {
    className: "proof-workspace"
  });
  const rules = createElement("aside", {
    className: "rule-palette"
  });
  const message = createElement("p", {
    className: "problem-message",
    attributes: {
      role: "status"
    }
  });
  const actions = createElement("footer", {
    className: "problem-actions"
  });

  layout.append(workspace, rules);
  page.append(header, summary, layout, message, actions);
  root.replaceChildren(page);

  return {
    header,
    summary,
    workspace,
    rules,
    message,
    actions
  };
}

function renderHeader(container, problem, proofState, progress, callbacks) {
  const {
    onNextPractice,
    onStartPractice,
    onSwitchProblem,
    practiceSystem
  } = callbacks;
  const meta = createElement("p", {
    className: "problem-header__meta",
    text: `${problem.systemLabel} / ${problem.chapter} / Stage ${problem.stage}`
  });
  const title = createElement("h1", {
    className: "problem-header__title",
    text: problem.title
  });
  const modeTabs = createElement("div", {
    className: "mode-tabs",
    attributes: {
      role: "tablist",
      "aria-label": "学習モード"
    }
  });
  const stageTab = createElement("button", {
    className: problem.generated ? "mode-tab" : "mode-tab is-active",
    text: "規則を学ぶ",
    attributes: {
      type: "button",
      role: "tab",
      "aria-selected": problem.generated ? "false" : "true"
    }
  });
  const practiceTab = createElement("button", {
    className: problem.generated ? "mode-tab is-active" : "mode-tab",
    text: "無限練習",
    attributes: {
      type: "button",
      role: "tab",
      "aria-selected": problem.generated ? "true" : "false"
    }
  });

  stageTab.addEventListener("click", () => {
    if (problem.generated) {
      onSwitchProblem(problems[0].id);
    }
  });
  practiceTab.addEventListener("click", () => {
    if (!problem.generated) {
      onStartPractice(practiceSystem);
    }
  });
  modeTabs.append(stageTab, practiceTab);

  const modePanel = createElement("div", {
    className: "mode-panel"
  });
  const selector = createElement("select", {
    className: "problem-select",
    attributes: {
      "aria-label": "問題を選択"
    }
  });

  problems.forEach(candidate => {
    const completed = progress.completedProblems[candidate.id];
    const option = createElement("option", {
      text: `${completed ? "✓ " : ""}${candidate.stage}. ${candidate.title}`,
      attributes: {
        value: candidate.id
      }
    });

    option.selected = !problem.generated && candidate.id === problem.id;
    selector.append(option);
  });

  selector.addEventListener("change", event => {
    onSwitchProblem(event.currentTarget.value);
  });
  const practiceSelect = createElement("select", {
    className: "practice-controls__select",
    attributes: {
      "aria-label": "無限練習の論理体系"
    }
  });
  [
    ["minimal", "最小論理"],
    ["intuitionistic", "直観主義論理"],
    ["classical", "古典論理"]
  ].forEach(([value, label]) => {
    const option = createElement("option", {
      text: label,
      attributes: {
        value
      }
    });
    option.selected = value === practiceSystem;
    practiceSelect.append(option);
  });

  const practiceButton = createElement("button", {
    className: "practice-controls__button",
    text: problem.generated ? "次の問題" : "開始",
    attributes: {
      type: "button"
    }
  });
  practiceButton.addEventListener("click", () => {
    const selectedSystem = practiceSelect.value;

    if (problem.generated && selectedSystem === practiceSystem) {
      onNextPractice();
      return;
    }

    onStartPractice(selectedSystem);
  });

  const stagePanel = createElement("div", {
    className: "mode-panel__section"
  });
  const stageLabel = createElement("span", {
    className: "mode-panel__label",
    text: "Stage問題"
  });
  stagePanel.append(stageLabel, selector);

  const practicePanel = createElement("div", {
    className: "mode-panel__section"
  });
  const practiceLabel = createElement("span", {
    className: "mode-panel__label",
    text: "論理体系"
  });
  practicePanel.append(practiceLabel, practiceSelect, practiceButton);

  modePanel.append(problem.generated ? practicePanel : stagePanel);

  const mode = createElement("div", {
    className: "mode-switch",
    attributes: {
      role: "group",
      "aria-label": "証明モード"
    }
  });
  const forwardMode = createElement("button", {
    className: "mode-switch__button is-active",
    text: "前提から進む",
    attributes: {
      type: "button",
      "aria-pressed": "true"
    }
  });
  const goalMode = createElement("button", {
    className: "mode-switch__button",
    text: "ゴールから逆算",
    attributes: {
      type: "button",
      "aria-pressed": "false",
      title: "次の段階で実装します。"
    }
  });
  goalMode.disabled = true;

  const steps = createElement("p", {
    className: "problem-header__steps",
    text: `手数 ${proofState.stepCount} / 目安 ${problem.optimalSteps ?? "証明不能"}`
  });
  const progressBadge = createElement("p", {
    className: "problem-header__progress",
    text: problem.generated ? "無限練習" : formatProgress(progress.completedProblems[problem.id])
  });

  mode.append(forwardMode, goalMode);
  container.replaceChildren(meta, title, modeTabs, modePanel, mode, steps, progressBadge);
}

function renderSummary(container, problem, proofState) {
  const premises = createElement("section", {
    className: "summary-card"
  });
  const premisesTitle = createElement("h2", {
    className: "summary-card__title",
    text: "前提"
  });
  const premiseList = createElement("ul", {
    className: "formula-list"
  });

  problem.premises.forEach(premise => {
    premiseList.append(createElement("li", {
      text: premise
    }));
  });

  const goal = createElement("section", {
    className: "summary-card"
  });
  const goalTitle = createElement("h2", {
    className: "summary-card__title",
    text: "ゴール"
  });
  const conclusion = createElement("p", {
    className: "goal-formula",
    text: formatFormula(proofState.conclusion)
  });

  premises.append(premisesTitle, premiseList);
  goal.append(goalTitle, conclusion);
  container.replaceChildren(premises, goal);
}

function renderMessage(container, text, completed) {
  container.textContent = text;
  container.classList.toggle("is-success", completed);
}

function createCompleteMessage(problem, proofState, progress) {
  if (problem.generated) {
    return `証明完成です。${formatFormula(proofState.conclusion)} を導出できました。手数 ${proofState.stepCount}`;
  }

  const record = progress.completedProblems[problem.id];
  const stars = record ? "★".repeat(record.stars) : "★";

  return `証明完成です。${formatFormula(proofState.conclusion)} を導出できました。${stars} 手数 ${proofState.stepCount}`;
}

function formatProgress(record) {
  if (!record) {
    return "未クリア";
  }

  return `${"★".repeat(record.stars)} 最短 ${record.bestSteps}手`;
}
