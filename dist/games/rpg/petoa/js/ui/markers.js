export function drawRouteMarker(scene, {
  x,
  y,
  depth = 10,
  direction = "up",
  scale = 1,
  alpha = 1,
} = {}) {
  const marker = scene.add.graphics();
  const baseWidth = 44 * scale;
  const baseHeight = 18 * scale;
  const radius = 4 * scale;
  const arrow = 12 * scale;
  const halfArrow = 11 * scale;

  marker.setDepth(depth);
  marker.setAlpha(alpha);
  marker.fillStyle(0x1f5f88, 0.92);
  marker.fillRoundedRect(x - baseWidth / 2, y, baseWidth, baseHeight, radius);
  marker.lineStyle(Math.max(1, 2 * scale), 0x9fd8ff, 0.95);
  marker.strokeRoundedRect(x - baseWidth / 2, y, baseWidth, baseHeight, radius);
  marker.fillStyle(0xd7f3ff, 0.95);

  if (direction === "right") {
    marker.fillTriangle(x + arrow, y + baseHeight / 2, x - 2 * scale, y - 2 * scale, x - 2 * scale, y + baseHeight + 2 * scale);
  } else if (direction === "left") {
    marker.fillTriangle(x - arrow, y + baseHeight / 2, x + 2 * scale, y - 2 * scale, x + 2 * scale, y + baseHeight + 2 * scale);
  } else if (direction === "down") {
    marker.fillTriangle(x, y + baseHeight + arrow, x - halfArrow, y + baseHeight - 2 * scale, x + halfArrow, y + baseHeight - 2 * scale);
  } else {
    marker.fillTriangle(x, y - arrow, x - halfArrow, y + 2 * scale, x + halfArrow, y + 2 * scale);
  }

  return marker;
}
