const STORAGE_KEY = "imagee.logic.progress";

const initialProgress = {
  version: 1,
  completedProblems: {},
  unlockedRules: []
};

export function loadProgress() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return initialProgress;
    }

    return {
      ...initialProgress,
      ...JSON.parse(rawValue)
    };
  } catch {
    return initialProgress;
  }
}

export function saveProgress(progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function completeProblem(progress, problem, proofState, hintCount) {
  const stars = calculateStars(problem, proofState, hintCount);
  const previous = progress.completedProblems[problem.id];
  const bestSteps = previous?.bestSteps
    ? Math.min(previous.bestSteps, proofState.stepCount)
    : proofState.stepCount;

  return {
    ...progress,
    completedProblems: {
      ...progress.completedProblems,
      [problem.id]: {
        stars: Math.max(previous?.stars || 0, stars),
        bestSteps
      }
    }
  };
}

export function completeUnprovableProblem(progress, problem) {
  const previous = progress.completedProblems[problem.id];

  return {
    ...progress,
    completedProblems: {
      ...progress.completedProblems,
      [problem.id]: {
        stars: Math.max(previous?.stars || 0, 3),
        bestSteps: previous?.bestSteps || 0
      }
    }
  };
}

function calculateStars(problem, proofState, hintCount) {
  let stars = 1;

  if (hintCount <= 1) {
    stars += 1;
  }

  if (problem.optimalSteps !== null && proofState.stepCount <= problem.optimalSteps) {
    stars += 1;
  }

  return stars;
}

