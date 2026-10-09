export const ESCORT_TEXTURE = 'bazaarEscortDirections';
export const ESCORT_ATLAS = './assets/img/characters/bazaar-escort-directions-v1';

export function escortDirection(dx, dy, previous = 'down') {
  if (Math.hypot(dx, dy) < .1) return previous;
  // At equal diagonal speed keep the previous axis to avoid flickering at corners.
  if (Math.abs(Math.abs(dx) - Math.abs(dy)) < .01) {
    return previous === 'left' || previous === 'right' ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

export function createEscortSprite(scene, id, x, y, height = 70, direction = 'down', texture = ESCORT_TEXTURE) {
  const sprite = scene.add.sprite(x, y, texture, `${id}-${direction}`).setOrigin(.5, .85).setDepth(y);
  sprite.setData('escort', { id, height, direction, x, y });
  return sprite.setScale(height / sprite.frame.realHeight);
}

export function syncEscortSprite(sprite, x = sprite.x, y = sprite.y) {
  const state = sprite.getData('escort');
  const direction = escortDirection(x - state.x, y - state.y, state.direction);
  if (direction !== state.direction) {
    sprite.setFrame(`${state.id}-${direction}`);
    // Each generated direction is tightly cropped; keep the body height and foot anchor steady.
    sprite.setScale(state.height / sprite.frame.realHeight);
  }
  state.direction = direction; state.x = x; state.y = y;
  return sprite.setPosition(x, y).setDepth(y);
}
