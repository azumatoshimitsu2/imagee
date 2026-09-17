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
  for (const title of ['自由に使える午後', '合作の最後の一枚', '一枚の招待券', '友人が持ってきた案', '来月のノート', 'いつもの席から', '工房の作業時間', '投稿する前の確認', 'スキャン機の利用時間', '自分も並ぶ受付']) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: '自由に使える午後', exact: true }).click();
  await page.getByRole('radio', { name: '自分の読書に使う', exact: true }).check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.getByRole('heading', { name: '判断の理由' })).toBeVisible();
  await page.getByRole('radio', { name: '別の理由がある', exact: true }).check();
  await page.getByRole('button', { name: '理由を記録して進む' }).click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await page.reload();
  const record = page.locator('.history-card').filter({ has: page.getByRole('heading', { name: '自由に使える午後' }) });
  await expect(record).toContainText('自分の読書に使う');
  await expect(record).toContainText('別の理由');
});

test('retired questions are absent from new reading and reflection-only answers remain readable', async ({ page }) => {
  await page.goto('./#archive');
  await expect(page.getByRole('heading', { name: 'ほかの問い', exact: true })).toBeVisible();
  for (const id of ['q024', 'q035', 'q037', 'q039', 'q041', 'q043']) {
    await expect(page.locator(`.archive-list a[href="#question?id=${id}"]`)).toHaveCount(0);
  }
  for (const title of ['頼まれたままの文章', '旅先の一時間', 'いつもの相手の小さな遅れ', '選ばない棚の一冊', '知らない人からのメッセージ', '発表前の練習', '箱にしまってある記念品', '返事をしない夜']) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await page.goto('./#question?id=q024');
  await expect(page.getByRole('heading', { name: 'このページは見つかりませんでした。' })).toBeVisible();
  await page.goto('./#question?id=q056');
  await expect(page.getByText('この問いは地図の位置には反映せず、あとから読み返すための記録として残します。')).toBeVisible();
  await page.getByRole('radio', { name: '今は手元に残しておく', exact: true }).check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await page.getByRole('link', { name: '回答の足あとを読む' }).click();
  await page.reload();
  await expect(page.locator('.history-card')).toContainText('箱にしまってある記念品');
  await expect(page.locator('.history-card')).toContainText('今は手元に残しておく');
});
