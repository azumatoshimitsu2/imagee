import { JOURNAL_ENTRIES, createJournal, observeScene } from '../data/journal.js';

export function installJournal(game, { persist = true } = {}) {
  let storage;
  try { if (persist) storage = window.localStorage; } catch { /* Session-only discovery remains available. */ }
  const journal = createJournal(storage);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'journal-button';
  button.setAttribute('aria-haspopup', 'dialog');
  document.querySelector('.status').append(button);
  const toast = document.createElement('p');
  toast.className = 'journal-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  document.querySelector('.viewport').append(toast);
  const modal = document.createElement('dialog');
  modal.className = 'journal-modal';
  modal.setAttribute('aria-labelledby', 'journal-title');
  modal.innerHTML = `<header class="journal-header"><div><p class="chapter">旅の記録</p><h2 id="journal-title">自分だけの図鑑</h2></div><button type="button" class="journal-close" autofocus>閉じる</button></header>
    <p class="journal-help">出会った生き物や人々、訪れた場所、持ち物を記録します。図鑑を読んでいる間、冒険はひと休み。</p>
    <nav class="journal-filters" aria-label="図鑑の分類"></nav><p class="journal-count" aria-live="polite"></p><div class="journal-entries"></div>`;
  document.body.append(modal);
  let category = 'すべて';
  let unread = 0;
  let paused = [];
  let toastTimer;
  const updateButton = () => { button.textContent = `図鑑 ${journal.size}件${unread ? ` · 新着${unread}` : ''}`; };
  updateButton();
  const render = () => {
    const entries = JOURNAL_ENTRIES.filter(item => journal.has(item.id) && (category === 'すべて' || item.category === category));
    modal.querySelector('.journal-count').textContent = `${category}の記録：${entries.length}件`;
    const list = modal.querySelector('.journal-entries');
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.textContent = 'まだ記録はありません。旅の途中で出会うと、ここにページが増えていきます。';
      list.append(empty);
    }
    for (const entry of entries) {
      const card = document.createElement('article');
      card.className = 'journal-entry';
      if (entry.image) {
        const illustration = document.createElement('div');
        illustration.className = 'journal-image';
        const img = document.createElement('img');
        img.alt = entry.name;
        img.loading = 'lazy';
        img.decoding = 'async';
        if (entry.imageColumns > 1) {
          // Existing character sheets contain four horizontal direction frames.
          // Show the first (front-facing) frame without loading another asset.
          illustration.classList.add('journal-image--sheet');
          img.style.width = `${entry.imageColumns * 100}%`;
        }
        img.addEventListener('error', () => illustration.remove(), { once: true });
        img.src = `./assets/img/${entry.image}`;
        illustration.append(img);
        card.append(illustration);
      }
      const label = document.createElement('p');
      label.className = 'chapter';
      label.textContent = `${entry.category} / ${entry.area}`;
      const title = document.createElement('h3');
      title.textContent = entry.name;
      const body = document.createElement('p');
      body.textContent = entry.text;
      const note = document.createElement('p');
      note.className = 'journal-note';
      note.textContent = `チャトアのメモ「${entry.note}」`;
      card.append(label, title, body, note);
      list.append(card);
    }
    for (const filter of modal.querySelectorAll('.journal-filters button')) filter.setAttribute('aria-pressed', String(filter.textContent === category));
  };
  for (const name of ['すべて', '場所', '人々', '生き物', '持ち物']) {
    const filter = document.createElement('button');
    filter.type = 'button';
    filter.textContent = name;
    filter.addEventListener('click', () => { category = name; render(); });
    modal.querySelector('nav').append(filter);
  }
  button.addEventListener('click', () => {
    if (modal.open) return;
    paused = game.scene.getScenes(true).map(scene => {
      const keyboard = scene.input.keyboard;
      const enabled = keyboard?.enabled;
      keyboard?.resetKeys();
      if (keyboard) keyboard.enabled = false;
      scene.touchDirection = null;
      scene.touchRunning = false;
      scene.queuedDirection = null;
      scene.scene.pause();
      return { scene, enabled };
    });
    unread = 0;
    updateButton();
    render();
    modal.showModal();
  });
  modal.querySelector('.journal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    for (const { scene, enabled } of paused) {
      scene.input.keyboard?.resetKeys();
      if (scene.input.keyboard) scene.input.keyboard.enabled = enabled;
      if (scene.scene.isPaused()) scene.scene.resume();
    }
    paused = [];
    button.focus();
  });
  // Stop Phaser's global keyboard listeners while retaining native dialog navigation.
  const blockGameKeys = event => {
    if (!modal.open) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); modal.close(); }
  };
  window.addEventListener('keydown', blockGameKeys, true);
  window.addEventListener('keyup', blockGameKeys, true);
  const discover = id => {
    if (!journal.discover(id)) return;
    unread += 1;
    updateButton();
    const entry = JOURNAL_ENTRIES.find(item => item.id === id);
    toast.textContent = `図鑑に記録しました：${entry.name}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  };
  const observe = () => {
    if (modal.open || !document.querySelector('#title-screen').classList.contains('closed')) return;
    for (const scene of game.scene.getScenes(true)) observeScene(scene, discover);
  };
  const reset = () => {
    journal.reset();
    unread = 0;
    category = 'すべて';
    clearTimeout(toastTimer);
    toast.hidden = true;
    updateButton();
    render();
  };
  game.events.on('new-game', reset);
  game.events.on('poststep', observe);
  game.events.once('destroy', () => {
    clearTimeout(toastTimer);
    game.events.off('new-game', reset);
    game.events.off('poststep', observe);
    window.removeEventListener('keydown', blockGameKeys, true);
    window.removeEventListener('keyup', blockGameKeys, true);
    modal.remove(); button.remove(); toast.remove();
  });
}
