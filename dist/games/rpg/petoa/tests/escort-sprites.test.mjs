import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { escortDirection, createEscortSprite, syncEscortSprite } from '../js/ui/escort-sprites.js';
const atlas = JSON.parse(await readFile(new URL('../assets/img/characters/bazaar-escort-directions-v1.json', import.meta.url)));

test('directions follow the dominant movement axis and remain stable when stopped', () => {
  assert.equal(escortDirection(5, 0), 'right');
  assert.equal(escortDirection(-5, 0), 'left');
  assert.equal(escortDirection(0, -5), 'up');
  assert.equal(escortDirection(0, 5), 'down');
  assert.equal(escortDirection(0, 0, 'up'), 'up');
  assert.equal(escortDirection(.001, -.001, 'left'), 'left');
  assert.equal(escortDirection(3, -3, 'left'), 'right');
  assert.equal(escortDirection(3, -3, 'up'), 'up');
});

test('all three people have valid four-direction atlas frames', () => {
  for (const id of ['mados', 'iria', 'messenger']) {
    for (const dir of ['down', 'right', 'left', 'up']) {
      const f = atlas.frames[`${id}-${dir}`].frame;
      assert.ok(f.w > 0 && f.h > 0);
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= atlas.meta.size.w && f.y + f.h <= atlas.meta.size.h);
    }
  }
});

test('movement and tween updates change frames without changing displayed height or idle facing', () => {
  for (const id of ['mados', 'iria', 'messenger']) {
    const sprite = {
      x: 0, y: 0, data: new Map(),
      setOrigin() { return this; }, setDepth() { return this; },
      setData(k, v) { this.data.set(k, v); return this; }, getData(k) { return this.data.get(k); },
      setFrame(name) { this.frame = { name, realHeight: atlas.frames[name].frame.h }; return this; },
      setScale(scale) { this.height = this.frame.realHeight * scale; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
    };
    const scene = { add: { sprite(_x, _y, _key, frame) { return sprite.setFrame(frame); } } };
    createEscortSprite(scene, id, 0, 0, 74);
    for (const [x, y, dir] of [[10, 0, 'right'], [0, 0, 'left'], [0, -10, 'up'], [0, 0, 'down']]) {
      syncEscortSprite(sprite, x, y);
      assert.equal(sprite.frame.name, `${id}-${dir}`); assert.equal(sprite.height, 74);
      syncEscortSprite(sprite, x, y); assert.equal(sprite.frame.name, `${id}-${dir}`);
    }
    sprite.x = 20; syncEscortSprite(sprite);
    assert.equal(sprite.frame.name, `${id}-right`, 'Phaser tween positions are compared with stored previous positions');
  }
});
