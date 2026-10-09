import { installSaveGame } from './ui/save-game.js';
import { YuateaChancellorScene } from './scenes/19-yuatea-chancellor.js';
import { YuateaEntranceScene } from './scenes/17-yuatea-entrance.js';
import { VektenaCityScene } from './scenes/16-vektena-city.js';
import { seedDebugInventory } from './data/debug-inventory.js';
import { UpetoaVillageScene } from "./scenes/01-upetoa-village.js";
import { PetoaIslandScene } from "./scenes/02-sea-crossing.js";
import { PetoaBeachScene } from "./scenes/03-petoa-beach.js";
import { PetoaForestNightScene, PetoaForestScene } from "./scenes/04-petoa-forest.js";
import { PetoaCaveScene } from "./scenes/06-petoa-cave.js";
import { PetoaForestMorningScene } from "./scenes/07-petoa-reunion.js";
import { UpetoaVillageReturnScene } from "./scenes/08-upetoa-return.js";
import { UpetoaChiefMorningScene } from "./scenes/09-utopas-morning.js";
import { UpetoaHarborAttackScene } from "./scenes/10-harbor-attack.js";
import { PetoaSeaEscapeScene } from "./scenes/11-sea-escape.js";
import { MainlandLandingScene } from "./scenes/12-mainland-landing.js";
import { BazaarCityScene } from "./scenes/13-bazaar-city.js";
import { BazaarUneaseScene } from "./scenes/14-bazaar-unease.js";
import { VektenaChaseScene } from "./scenes/15-vektena-chase.js";
import { installJournal } from "./ui/journal.js";

//?scene=6&debug=blue-wall

const params = new URLSearchParams(window.location.search);
const sceneMap = {
  "1": "UpetoaVillageScene",
  "2": "PetoaIslandScene",
  "3": "PetoaBeachScene",
  "4": "PetoaForestScene",
  "5": "PetoaForestNightScene",
  "6": "PetoaCaveScene",
  "7": "PetoaForestMorningScene",
  "8": "UpetoaVillageReturnScene",
  "9": "UpetoaChiefMorningScene",
  "10": "UpetoaHarborAttackScene",
  "11": "PetoaSeaEscapeScene",
  "12": "MainlandLandingScene",
  "13": "BazaarCityScene",
  "14": "BazaarUneaseScene",
  "15": "VektenaChaseScene",
  "16": "VektenaCityScene",
  "17": "VektenaCityScene",
  "18": "YuateaEntranceScene",
  "19": "YuateaChancellorScene",
};
const startScene = sceneMap[params.get("scene")] ?? "UpetoaVillageScene";
const sceneClasses = [UpetoaVillageScene, PetoaIslandScene, PetoaBeachScene, PetoaForestScene, PetoaForestNightScene, PetoaCaveScene, PetoaForestMorningScene, UpetoaVillageReturnScene, UpetoaChiefMorningScene, UpetoaHarborAttackScene, PetoaSeaEscapeScene, MainlandLandingScene, BazaarCityScene, BazaarUneaseScene, VektenaChaseScene, VektenaCityScene, YuateaEntranceScene, YuateaChancellorScene];
const startIndex = sceneClasses.findIndex(Scene => new Scene().sys.settings.key === startScene);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "phaser-stage",
  backgroundColor: "#2b774a",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: "phaser-stage",
    width: 832,
    height: 576,
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  // Only the selected scene should auto-start; starting a second scene in
  // postBoot leaves the default village active behind it.
  scene: [sceneClasses[startIndex], ...sceneClasses.filter((_, index) => index !== startIndex)],
  callbacks: {
    postBoot: (game) => {
      seedDebugInventory(game.registry, params.get("scene"));
      // Direct scene links are fresh previews, separate from the saved journey.
      installSaveGame(game,{preview:Object.hasOwn(sceneMap,params.get("scene"))});
      installJournal(game, { persist: !Object.hasOwn(sceneMap, params.get("scene")) });
    },
  },
});
