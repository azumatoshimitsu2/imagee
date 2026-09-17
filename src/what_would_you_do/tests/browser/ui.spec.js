import { test, expect } from './fixtures.js';

async function open(page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /今の考えを、\s*未来の自分へ。/ })).toBeVisible();
}
async function seed(page, ids) {
  await page.evaluate(async ids => {
    const base = '/games/d/what_would_you_do/js/';
    const [{ loadCatalog }, { createStorage }, { appendAnswer }] = await Promise.all([import(`${base}data-loader.js`), import(`${base}storage.js`), import(`${base}answer-history.js`)]);
    const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
    let state = storage.getState();
    for (const id of ids) {
      const q = structuredClone(catalog.questions.questions.find(q => q.id === id) ?? catalog.questions.questions.find(q => q.id === 'q004'));
      if (q.id !== id) { q.id = id; q.relations = []; q.followUps = []; }
      state = appendAnswer(state, q, q.options[0].id);
    }
    storage.saveState(state);
  }, ids);
  await page.reload();
}

test('home, answer, explanation, history and revision work through real controls', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await expect(page.getByRole('button', { name: 'この答えを記録する' })).toBeDisabled();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await expect(page.locator('.history-card')).toHaveCount(1);
  await page.getByRole('button', { name: '今ならどう答えるか、考える' }).click();
  await expect(page.locator('question-view').getByText('選び直しても、以前の回答は残ります。')).toBeVisible();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await page.reload();
  await expect(page.locator('.history-card')).toHaveCount(1);
  await page.getByText('問いの本文と以前の回答（1件）').click();
  await expect(page.locator('.old-answer')).toHaveCount(1);
  await expect(page.locator('.old-answer')).toContainText('来週まで秘密を守り');
  await expect(page.locator('.history-card > .answer-quote')).toContainText('準備への影響に限って');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('history.png'), fullPage: true });
});

test('optional reason precedes explanation and is recorded in history', async ({ page }) => {
  await open(page); await seed(page, ['q004', 'q006', 'q008']);
  await page.getByRole('link', { name: 'ほかの問いを読む' }).click();
  await page.getByRole('link', { name: '会社のルール' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.getByRole('heading', { name: '判断の理由' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toHaveCount(0);
  await page.getByRole('radio', { name: '結果やその後への影響を考えた' }).check();
  await page.getByRole('button', { name: '理由を記録して進む' }).click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await expect(page.locator('.reason-note')).toContainText('結果やその後への影響');
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await expect(page.locator('.history-card').filter({ has: page.getByRole('heading', { name: '会社のルール' }) })).toContainText('結果やその後への影響');
});

test('reason can be skipped and stays skipped when the reading page reloads', async ({ page }) => {
  await open(page); await seed(page, ['q004', 'q006', 'q008']);
  await page.goto('./#question?id=q003');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await page.getByRole('link', { name: '今回は書かずに進む' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '判断の理由' })).toHaveCount(0);
});

test('related answers show a question back to the user and persist the discovery once', async ({ page }) => {
  await open(page); await seed(page, ['q045', ...Array.from({ length: 18 }, (_, i) => `neutral-${i}`)]);
  await page.goto('./#question?id=q051');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await page.getByRole('link', { name: '今回は書かずに進む' }).click();
  await expect(page.getByRole('region', { name: '過去の自分との対話' })).toContainText('場面や、そのときの気持ちはどう違いましたか。');
  await page.reload();
  await expect(page.getByRole('region', { name: '過去の自分との対話' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('selfDialogueGame:v1')).discoveries.length)).toBe(1);
});

test('free writing is optional, saved literally, and rendered as text in history', async ({ page }) => {
  await open(page); await seed(page, Array.from({ length: 19 }, (_, i) => `q${String(i + 1).padStart(3, '0')}`));
  await page.goto('./#question?id=q030');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  const literal = '<img src=x onerror="window.injected=true">自分で選び直せること。';
  await page.getByRole('textbox', { name: 'あなたの言葉（任意）' }).fill(literal);
  await page.getByRole('button', { name: '言葉を記録して進む' }).click();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await page.reload();
  await expect(page.getByText(literal, { exact: true })).toBeVisible();
  await expect(page.locator('.history-card img')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test('data management exports, clears with confirmation, and restores through the file input', async ({ page }) => {
  await open(page); await seed(page, ['q004']);
  await page.getByRole('link', { name: 'このノートについて・データ管理' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSONを書き出す', exact: true }).click();
  const download = await downloading; const path = await download.path();
  await page.getByRole('button', { name: 'すべての記録を削除する' }).click();
  await page.getByRole('button', { name: 'やめる', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('selfDialogueGame:v1')).answers.length)).toBe(1);
  await page.getByRole('button', { name: 'すべての記録を削除する' }).click();
  await page.getByRole('button', { name: '削除する', exact: true }).click();
  await page.getByLabel('JSONを読み込む').setInputFiles(path);
  await page.getByRole('button', { name: '置き換えて読み込む' }).click();
  await page.getByRole('link', { name: '回答の足あと', exact: true }).click();
  await expect(page.locator('.history-card')).toHaveCount(1);
});

test('corruption is explained visibly and raw data remains available', async ({ page }) => {
  await open(page);
  await page.evaluate(() => localStorage.setItem('selfDialogueGame:v1', '{broken'));
  await page.reload();
  await expect(page.locator('.storage-warning')).toContainText('元データは残したまま');
  await page.getByRole('link', { name: '記録を書き出す', exact: true }).click();
  await expect(page.getByRole('button', { name: '読み取れなかった元データを書き出す' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('selfDialogueGame:v1'))).toBe('{broken');
});

test('keyboard focus, empty history and missing routes remain usable', async ({ page }) => {
  await open(page);
  await page.screenshot({ path: test.info().outputPath('home.png'), fullPage: true });
  await page.getByRole('link', { name: '回答の足あと', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'まだ、白いページです。' })).toBeVisible();
  await page.goto('./#question?id=missing');
  await expect(page.getByRole('heading', { name: 'このページは見つかりませんでした。' })).toBeVisible();
  await page.getByRole('link', { name: 'ホームへ戻る' }).click();
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  const radio = page.getByRole('radio').first(); await radio.focus(); await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
  await expect(page.getByRole('button', { name: 'この答えを記録する' })).toBeEnabled();
});

test('browser back does not resubmit a completed answer', async ({ page }) => {
  await open(page);
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: /今の考えを、\s*未来の自分へ。/ })).toBeVisible();
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await expect(page.locator('question-view h1')).not.toHaveText('友人の秘密');
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole('button', { name: 'この答えを記録する' })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('selfDialogueGame:v1')).answers.length)).toBe(1);
});

test('storage denial is visible and answering still works in memory', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
  await open(page);
  await expect(page.locator('.storage-warning')).toContainText('今の画面を閉じると回答が失われます');
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await expect(page.locator('.history-card')).toHaveCount(1);
});
