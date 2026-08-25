
export class SaveManager {
  constructor(gameConfig, flagSpec) {
    this.game = gameConfig;
    this.flagSpec = flagSpec;
  }

  save(state, position) {
    const payload = {
      save_version: this.game.save_version,
      episode: this.game.game_id,
      ...state.snapshot(position)
    };
    localStorage.setItem(this.game.save_storage_key, JSON.stringify(payload));
    this.writeSeriesData(state);
    return payload;
  }

  load() {
    const raw = localStorage.getItem(this.game.save_storage_key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.save_version !== this.game.save_version) {
      throw new Error("SAVEデータのバージョンが一致しません。");
    }
    return data;
  }

  writeSeriesData(state) {
    const key = this.game.series_storage_key;
    const series = JSON.parse(localStorage.getItem(key) || '{"series_version":1,"episode_completed":{},"choices":{}}');
    for (const name of (this.flagSpec.persistent_variables ?? [])) {
      if (state.variables[name] != null) {
        series.choices[`${this.game.game_id}.${name}`] = state.variables[name];
      }
    }
    localStorage.setItem(key, JSON.stringify(series));
  }
}
