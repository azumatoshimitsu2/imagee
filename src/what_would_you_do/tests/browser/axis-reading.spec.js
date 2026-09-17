import { test, expect } from './fixtures.js';

test('an axis route keeps its questions across reload and returns to the map after completing its active questions', async ({ page }) => {
  await page.goto('./#profile');
  const axis = page.locator('.map-axis').filter({ has: page.locator('#axis-individual_collective') });
  await axis.getByRole('link', { name: /この軸の問いに答える/ }).click();
  await expect(page.getByRole('heading', { name: '個人 / 集団の問い', exact: true })).toBeVisible();
  await expect(page.locator('.archive-list a')).toHaveCount(4);
  await page.locator('.archive-list a').first().click();
  for (let n = 0; n < 4; n++) {
    await expect(page).toHaveURL(/axis=individual_collective/);
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'この答えを記録する' }).click();
    if (n === 3) await page.getByRole('link', { name: '今回は書かずに進む' }).click();
    await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
    if (n < 3) {
      await page.reload();
      await page.getByRole('link', { name: 'この軸の次の問いへ', exact: true }).click();
    }
  }
  await expect(page.getByRole('link', { name: 'この軸の次の問いへ', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'あなたの地図を見る', exact: true }).click();
  await expect(axis).toContainText('この軸の手がかり：4件');
  await expect(axis.locator('.axis-position')).toHaveCount(1);
  await axis.getByRole('link', { name: 'この軸の問いを振り返る →', exact: true }).click();
  await expect(page.locator('.axis-answered .map-evidence li')).toHaveCount(4);
  await page.goto('./#question?id=q001&axis=individual_collective');
  await expect(page.getByRole('heading', { name: 'このページは見つかりませんでした。' })).toBeVisible();
});

for (const saveReason of [true, false]) {
  test(`axis is preserved when a general reason is ${saveReason ? 'saved' : 'skipped'}`, async ({ page }) => {
    await page.goto('./#home');
    await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
    await page.evaluate(async () => {
      const [{ loadCatalog }, { createStorage }, { appendAnswer }] = await Promise.all([
        import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
      ]);
      const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
      let state = storage.getState();
      for (const id of ['q005', 'q006', 'q008']) {
        state = appendAnswer(state, catalog.questions.questions.find(q => q.id === id), 'A');
      }
      storage.saveState(state);
    });
    await page.reload();
    await page.goto('./#archive?axis=principle_outcome');
    await page.getByRole('link', { name: '友人の秘密', exact: true }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'この答えを記録する' }).click();
    await expect(page.getByRole('heading', { name: '判断の理由', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: '自分が大切にしたいことに近かった' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'まだうまく言葉にできない' })).toBeVisible();
    if (saveReason) {
      await page.getByRole('radio', { name: '直感で選んだ', exact: true }).check();
      await page.getByRole('button', { name: '理由を記録して進む' }).click();
      await expect(page.locator('.reason-note')).toContainText('直感で選んだ');
    } else {
      await page.getByRole('link', { name: '今回は書かずに進む' }).click();
    }
    await page.reload();
    await expect(page).toHaveURL(/axis=principle_outcome/);
    await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
    await page.getByRole('link', { name: 'この軸の次の問いへ', exact: true }).click();
    await expect(page.locator('question-view h1')).toHaveText('会社のルール');
    await expect(page).toHaveURL(/axis=principle_outcome/);
  });
}
