import { test, expect } from './fixtures.js';

test('additional questions appear in the archive and preserve an optional reason after reload', async ({ page }) => {
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  await page.evaluate(async () => {
    const [{ loadCatalog }, { createStorage }, { appendAnswer }] = await Promise.all([
      import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
    ]);
    const catalog = await loadCatalog();
    const storage = createStorage({ schemas: catalog.schemas, key: catalog.settings.storage.key });
    let state = storage.getState();
    for (const id of ['q005', 'q006', 'q008']) {
      const question = catalog.questions.questions.find(q => q.id === id);
      state = appendAnswer(state, question, 'A');
    }
    storage.saveState(state);
  });
  await page.reload();
  await page.getByRole('link', { name: 'ほかの問いを読む' }).click();
  for (const title of ['自由に使える午後', '活動費の使い道', '一枚の招待券', 'イベントの追加参加枠', '来月のノート', '読書会の進め方', '工房の作業時間', '周遊路の選択', 'スキャン機の利用時間', '展示紹介の広告枠']) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: '自由に使える午後', exact: true }).click();
  await page.getByRole('radio', { name: '自分の読書に使う', exact: true }).check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.getByRole('heading', { name: '判断の理由' })).toBeVisible();
  await page.getByRole('radio', { name: '別の理由', exact: true }).check();
  await page.getByRole('button', { name: '理由を記録して進む' }).click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await page.reload();
  const record = page.locator('.history-card').filter({ has: page.getByRole('heading', { name: '自由に使える午後' }) });
  await expect(record).toContainText('自分の読書に使う');
  await expect(record).toContainText('別の理由');
});
