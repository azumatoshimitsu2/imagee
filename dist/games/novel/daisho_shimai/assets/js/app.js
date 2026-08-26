
import { GameState } from "./state.js";
import { SaveManager } from "./save.js";
import { UI } from "./ui.js";
import { Engine } from "./engine.js";

const DEBUG_MODE = false;

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} の読み込みに失敗しました`);
  return res.json();
}

function getDebugStartScene(chapters) {
  if (!DEBUG_MODE) return null;

  const chapter = new URLSearchParams(location.search).get("chapter");
  if (!chapter) return null;

  const normalized = chapter.toLowerCase().replace(/^chapter/, "").padStart(2, "0");
  const aliases = {
    "01": 0,
    "02": 1,
    "03": 2,
    "04": 3,
    "05": 4,
    epilogue: 4
  };
  const chapterIndex = aliases[normalized] ?? aliases[chapter.toLowerCase()];
  const sceneId = chapters[chapterIndex]?.scenes?.[0]?.id;

  if (!sceneId) console.warn(`debug chapter not found: ${chapter}`);
  return sceneId ?? null;
}

async function main() {
  const [game, flagSpec, characters, backgrounds, evidence] = await Promise.all([
    loadJson("assets/data/game.json"),
    loadJson("assets/data/flags.json"),
    loadJson("assets/data/characters.json"),
    loadJson("assets/data/backgrounds.json"),
    loadJson("assets/data/evidence.json")
  ]);

  const chapters = [];
  for (const rel of game.scenario_files) {
    chapters.push(await loadJson(`assets/data/${rel}`));
  }

  const state = new GameState(flagSpec);
  const ui = new UI({characters, backgrounds, evidence});
  const saveManager = new SaveManager(game, flagSpec);
  const engine = new Engine({game, state, ui, saveManager, characters});
  engine.loadScenarioFiles(chapters);

  const gameRoot = document.querySelector("#game");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-btn");
  const continueButton = document.querySelector("#continue-btn");
  const startScene = getDebugStartScene(chapters) ?? game.start_scene;
  const isEvidenceOpen = () => !ui.evidenceLayer.classList.contains("hidden");
  let started = false;

  const openGame = () => {
    if (started) return false;
    started = true;
    gameRoot.classList.add("is-started");
    startScreen.classList.add("hidden");
    return true;
  };

  const startGame = () => {
    if (!openGame()) return;
    engine.start(startScene);
  };

  const continueGame = () => {
    try {
      const data = saveManager.load();
      if (!data) return;
      if (!openGame()) return;
      engine.load(data);
    } catch (err) {
      alert(err.message);
    }
  };

  try {
    if (saveManager.load()) continueButton.classList.remove("hidden");
  } catch (_) {}

  document.querySelector("#message-box").addEventListener("click", () => engine.next());
  document.querySelector("#chapter-title").addEventListener("click", () => engine.next());
  startButton.addEventListener("click", startGame);
  continueButton.addEventListener("click", continueGame);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!started) return;
      if (isEvidenceOpen()) return;
      engine.next();
    }
  });

  document.querySelector("#save-btn").onclick = () => {
    engine.save();
    alert("セーブしました。");
  };

  document.querySelector("#load-btn").onclick = () => {
    try {
      const data = saveManager.load();
      if (!data) return alert("セーブデータがありません。");
      engine.load(data);
    } catch (err) {
      alert(err.message);
    }
  };

  document.querySelector("#log-btn").onclick = () => ui.showLog(state.history);
}

main().catch(err => {
  console.error(err);
  document.body.innerHTML = `<pre style="white-space:pre-wrap;color:white;padding:2rem">${err.stack}</pre>`;
});
