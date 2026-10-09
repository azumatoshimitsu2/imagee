// A 36 × 40 pixel sprite, displayed at an integer scale like the room's tiles.
// Keep the outline, wood grain and brass fittings on the same pixel grid.
const TEXTURE = 'cloth-wardrobe-pixel-v1';
export const WARDROBE_HEIGHT = 80;

export function createClothWardrobe(scene, x, y) {
  if (!scene.textures.exists(TEXTURE)) {
    const texture = scene.textures.createCanvas(TEXTURE, 36, 40);
    const ctx = texture.context;
    const colors = {
      outline: '#281b1a', shadow: '#513022', dark: '#754127',
      wood: '#a0612e', light: '#c48b43', edge: '#e5b663',
      brass: '#e5c879', metalShadow: '#856030',
      cloth: '#526780', clothLight: '#91a5b0', clothShadow: '#334253',
    };
    const rect = (color, left, top, width, height) => {
      ctx.fillStyle = colors[color];
      ctx.fillRect(left, top, width, height);
    };
    // Stepped silhouette, short feet and the top seen from above.
    rect('outline', 3, 4, 30, 33);
    rect('outline', 1, 6, 34, 5);
    rect('outline', 4, 36, 6, 4); rect('outline', 26, 36, 6, 4);
    rect('dark', 5, 36, 3, 3); rect('wood', 27, 36, 3, 2);
    rect('wood', 4, 5, 28, 3);
    rect('edge', 5, 5, 26, 1);
    rect('light', 2, 7, 32, 2); rect('shadow', 2, 9, 32, 1);
    rect('dark', 4, 10, 28, 25);
    rect('light', 4, 11, 2, 22); rect('shadow', 30, 10, 2, 25);
    // Three recessed drawers with bevelled edges and paired brass pulls.
    for (const top of [11, 19, 27]) {
      rect('outline', 7, top, 22, 7);
      rect('wood', 8, top + 1, 20, 5);
      rect('light', 8, top + 1, 20, 1);
      rect('shadow', 8, top + 6, 20, 1);
      rect('dark', 27, top + 2, 1, 4);
      rect('dark', 9, top + 4, 3, 1);
      rect('light', 17, top + 3, 3, 1);
      rect('dark', 22, top + 5, 4, 1);
      for (const left of [13, 23]) {
        rect('metalShadow', left - 1, top + 2, 3, 3);
        rect('outline', left, top + 3, 2, 2);
        rect('brass', left - 1, top + 2, 3, 1);
        rect('edge', left - 1, top + 3, 1, 1);
      }
    }
    rect('light', 3, 35, 30, 1); rect('shadow', 3, 36, 30, 1);
    rect('edge', 4, 35, 6, 1);
    // A folded piece of blue fabric connects the cabinet to the cloth shop.
    rect('clothShadow', 11, 1, 16, 5);
    rect('cloth', 12, 1, 14, 3); rect('clothLight', 12, 1, 13, 1);
    rect('clothLight', 13, 4, 13, 1); rect('clothShadow', 23, 2, 2, 2);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return scene.add.image(x, y, TEXTURE).setOrigin(.5, 1).setScale(2).setDepth(y);
}
