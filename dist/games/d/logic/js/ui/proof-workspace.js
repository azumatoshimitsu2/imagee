import { createElement } from "./dom.js";
import { createProofLineElement } from "./proof-line.js";

export function renderProofWorkspace(container, proofState, onToggleLine) {
  const title = createElement("h2", {
    className: "panel-title",
    text: "証明"
  });

  const list = createElement("div", {
    className: "proof-lines",
    attributes: {
      role: "list",
      "aria-label": "証明行"
    }
  });

  proofState.lines.forEach((line, index) => {
    const selected = proofState.selectedLineIds.includes(line.id);
    const lineElement = createProofLineElement(line, index, selected, proofState);

    lineElement.addEventListener("click", () => {
      onToggleLine(line.id);
    });

    list.append(lineElement);
  });

  container.replaceChildren(title, list);
}
