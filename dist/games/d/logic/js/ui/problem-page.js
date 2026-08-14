export function renderProblemPage(container, problem) {
  if (!container || !problem) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="problem-header">
      <div>
        <h2 class="problem-title">${problem.title}</h2>
        <div class="problem-meta">${problem.prompt}</div>
      </div>
      <div class="problem-meta">難易度: ${problem.difficulty}</div>
    </div>
  `;
}

export function renderProblemStatus(container, statusMessage = '', statusKind = 'info') {
  if (!container) return;

  const statusClass = [
    'problem-status',
    statusKind === 'error' ? 'is-error' : '',
    statusKind === 'success' ? 'is-success' : ''
  ].filter(Boolean).join(' ');

  container.innerHTML = `
    <div id="problem-status" class="${statusClass}" aria-live="polite">
      <strong>状況:</strong> ${statusMessage}
    </div>
  `;
}
