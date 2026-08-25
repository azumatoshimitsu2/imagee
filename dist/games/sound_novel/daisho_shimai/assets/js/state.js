
export class GameState {
  constructor(flagSpec) {
    this.defaults = structuredClone(flagSpec);
    this.reset();
  }

  reset() {
    this.flags = structuredClone(this.defaults.flags ?? {});
    this.variables = structuredClone(this.defaults.variables ?? {});
    this.visitedScenes = [];
    this.readEvents = {};
    this.history = [];
  }

  setFlag(name, value = true) { this.flags[name] = value; }
  setVariable(name, value) { this.variables[name] = value; }

  applySet(setSpec = {}) {
    for (const [k,v] of Object.entries(setSpec.flags ?? {})) this.setFlag(k,v);
    for (const [k,v] of Object.entries(setSpec.variables ?? {})) this.setVariable(k,v);
  }

  test(condition) {
    if (!condition) return true;
    if (condition.flag) return this.flags[condition.flag] === condition.equals;
    if (condition.variable) return this.variables[condition.variable] === condition.equals;
    if (condition.all) return condition.all.every(c => this.test(c));
    if (condition.any) return condition.any.some(c => this.test(c));
    if (condition.not) return !this.test(condition.not);
    return false;
  }

  snapshot(position) {
    return {
      position,
      flags: structuredClone(this.flags),
      variables: structuredClone(this.variables),
      visitedScenes: [...this.visitedScenes],
      readEvents: structuredClone(this.readEvents),
      history: structuredClone(this.history)
    };
  }

  restore(data) {
    this.flags = structuredClone(data.flags ?? {});
    this.variables = structuredClone(data.variables ?? {});
    this.visitedScenes = [...(data.visitedScenes ?? [])];
    this.readEvents = structuredClone(data.readEvents ?? {});
    this.history = structuredClone(data.history ?? []);
  }
}
