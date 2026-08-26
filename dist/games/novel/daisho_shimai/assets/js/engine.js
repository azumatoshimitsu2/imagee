
export class Engine {
  constructor({game, state, ui, saveManager, characters}) {
    this.game = game;
    this.state = state;
    this.ui = ui;
    this.saveManager = saveManager;
    this.characters = characters;
    this.sceneMap = new Map();
    this.scene = null;
    this.sceneId = null;
    this.eventIndex = 0;
    this.locked = false;
  }

  loadScenarioFiles(chapters) {
    for (const chapter of chapters) {
      for (const scene of chapter.scenes ?? []) {
        if (this.sceneMap.has(scene.id)) throw new Error(`scene id duplicate: ${scene.id}`);
        this.sceneMap.set(scene.id, scene);
      }
    }
  }

  start(sceneId = this.game.start_scene, eventIndex = 0) {
    this.gotoScene(sceneId, eventIndex);
  }

  gotoScene(sceneId, eventIndex = 0) {
    const scene = this.sceneMap.get(sceneId);
    if (!scene) throw new Error(`scene not found: ${sceneId}`);
    this.scene = scene;
    this.sceneId = sceneId;
    this.eventIndex = eventIndex;
    if (!this.state.visitedScenes.includes(sceneId)) this.state.visitedScenes.push(sceneId);
    if (scene.background) this.ui.setBackground(scene.background);
    if (scene.characters) this.ui.setCharacters(scene.characters);
    this.next();
  }

  async next() {
    if (this.locked || !this.scene) return;
    const events = this.scene.events ?? [];
    if (this.eventIndex >= events.length) {
      if (this.scene.next) this.gotoScene(this.scene.next, 0);
      return;
    }

    const currentIndex = this.eventIndex;
    const event = events[currentIndex];
    this.eventIndex += 1;
    const readKey = `${this.sceneId}:${currentIndex}`;
    this.state.readEvents[readKey] = true;

    switch (event.type) {
      case "narration":
        this.pushLog(null, event.text);
        this.ui.showText("", event.text);
        return;

      case "dialogue": {
        const char = this.characters[event.speaker];
        if (event.expression && event.position) this.ui.setCharacter(event.speaker, event.expression, event.position);
        const name = char?.short_name ?? char?.name ?? event.speaker;
        this.pushLog(name, event.text);
        this.ui.showText(name, event.text);
        return;
      }

      case "background":
        this.ui.setBackground(event.id);
        return this.next();

      case "character":
        this.ui.setCharacter(event.id, event.expression, event.position);
        return this.next();

      case "hide_character":
        this.ui.hideCharacter(event.position);
        return this.next();

      case "image":
        this.ui.showEvidence(event.id);
        return;

      case "hide_image":
        this.ui.hideEvidence();
        return this.next();

      case "effect":
        this.locked = true;
        await this.ui.effect(event.effect, event.duration);
        this.locked = false;
        return this.next();

      case "title":
        this.locked = true;
        await this.ui.title(event.text, event.duration, {keep: !this.scene.next && this.eventIndex >= events.length});
        this.locked = false;
        return this.next();

      case "set_flag":
        this.state.setFlag(event.flag, event.value ?? true);
        return this.next();

      case "set_variable":
        this.state.setVariable(event.variable, event.value);
        return this.next();

      case "jump":
        if (!event.conditions || this.state.test(event.conditions)) {
          this.gotoScene(event.target, 0);
        } else {
          this.next();
        }
        return;

      case "choice": {
        const visible = (event.options ?? []).filter(opt => !opt.show_if || this.state.test(opt.show_if));
        this.ui.showChoices(event.prompt, visible, option => {
          this.state.applySet(option.set ?? {});
          if (event.persistent) this.saveManager.writeSeriesData(this.state);
          if (option.jump) this.gotoScene(option.jump, 0);
          else this.next();
        });
        return;
      }

      case "deduction": {
        this.ui.showDeduction(event, () => {
          this.state.applySet(event.set_on_success ?? {});
          this.next();
        });
        return;
      }

      case "wait":
        this.locked = true;
        await new Promise(r => setTimeout(r, event.duration ?? 500));
        this.locked = false;
        return this.next();

      default:
        console.warn("Unknown event:", event);
        return this.next();
    }
  }

  pushLog(speaker, text) {
    this.state.history.push({speaker, text});
    if (this.state.history.length > 500) this.state.history.shift();
  }

  save() {
    return this.saveManager.save(this.state, {scene:this.sceneId, event_index:this.eventIndex});
  }

  load(data) {
    this.state.restore(data);
    this.gotoScene(data.position.scene, data.position.event_index);
  }

  back() {
    if (this.state.history.length < 2) return;
    const prev = this.state.history[this.state.history.length - 2];
    this.ui.showText(prev.speaker ?? "", prev.text);
  }
}
