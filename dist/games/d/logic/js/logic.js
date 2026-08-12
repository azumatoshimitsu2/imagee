import { mountProblemPage } from "./ui/problem-page.js";

function init() {
  const stage = document.querySelector("[data-logic-stage]");

  if (!stage) {
    return;
  }

  mountProblemPage(stage);
}

init();
