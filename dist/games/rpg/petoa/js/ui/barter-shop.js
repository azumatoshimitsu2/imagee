import { BARTER_ITEMS, exchangeItem, shopInventory } from '../data/barter-shop.js';

export function openBarterShop(scene) {
  if (scene.shopDialog) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'barter-shop';
  dialog.setAttribute('aria-labelledby', 'barter-title');
  dialog.innerHTML = `<h2 id="barter-title">旅道具の交換屋</h2><p>浜辺や洞窟で持ち物を、旅の道具と交換するよ。気に入ったものがあればどうぞ。</p><p class="barter-stock"></p><div class="barter-items"></div><p class="barter-notice" role="status"></p><button type="button" class="barter-close" autofocus>店を出る</button>`;
  const keyboard = scene.input.keyboard, enabled = keyboard.enabled;
  keyboard.resetKeys(); keyboard.enabled = false;
  scene.touchDirection = null;
  scene.storyBusy = true;
  const block = event => { if (dialog.open) event.stopImmediatePropagation(); };
  window.addEventListener('keydown', block, true);
  window.addEventListener('keyup', block, true);
  const close = () => {
    window.removeEventListener('keydown', block, true);
    window.removeEventListener('keyup', block, true);
    keyboard.resetKeys(); keyboard.enabled = enabled;
    scene.storyBusy = false; scene.shopDialog = null;
    dialog.remove(); scene.events.off('shutdown', close);
    if (scene.scene.isActive()) scene.updateHud();
  };
  const render = () => {
    const inventory = shopInventory(scene.registry);
    dialog.querySelector('.barter-stock').textContent = `持ち物：貝殻 ${inventory.shells}個 ／ 動物の骨 ${inventory.caveItems.includes('animal-bone') ? 1 : 0}個 ／ 骨のかけら ${inventory.caveItems.includes('bone-fragment') ? 1 : 0}個`;
    const list = dialog.querySelector('.barter-items'); list.replaceChildren();
    for (const item of BARTER_ITEMS) {
      const card = document.createElement('section');
      const title = document.createElement('h3'); title.textContent = item.name;
      const detail = document.createElement('p'); detail.textContent = item.description;
      const cost = document.createElement('p'); cost.textContent = `交換に必要：${item.cost}`;
      const button = document.createElement('button'); button.type = 'button';
      const owned = inventory.equipment.includes(item.id);
      button.textContent = owned ? '入手済み・効果発揮中' : `「${item.name}」と交換する`;
      button.disabled = !exchangeItem(inventory, item.id).exchanged;
      button.addEventListener('click', () => {
        const result = exchangeItem(shopInventory(scene.registry), item.id);
        if (!result.exchanged) return;
        scene.registry.set('beachShells', result.shells);
        scene.registry.set('caveCollectedItems', result.caveItems);
        scene.registry.set('travelEquipment', result.equipment);
        scene.collected = new Set(result.caveItems);
        render();
        dialog.querySelector('.barter-notice').textContent = `${item.name}を受け取った。効果は自動で働きます。`;
        dialog.querySelector('.barter-close').focus();
      });
      card.append(title, detail, cost, button); list.append(card);
    }
  };
  dialog.querySelector('.barter-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', close, { once: true });
  scene.events.once('shutdown', close);
  scene.shopDialog = dialog; document.body.append(dialog); render(); dialog.showModal();
}
