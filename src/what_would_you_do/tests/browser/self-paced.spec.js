import { test, expect } from './fixtures.js';

async function finishQuestion(page) {
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'この答えを記録する' }).click();
  await expect(page.locator('.result-page, form a[href*="stage=read"]')).toBeVisible();
  const skip = page.getByRole('link', { name: '今回は書かずに進む' });
  if (await skip.count()) await skip.click();
  await expect(page.getByRole('heading', { name: '少し、視点を変えてみる' })).toBeVisible();
}

test('answer continuously, pause after three, then resume without a daily limit', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
  await page.goto('./#home');
  await expect(page.locator('.daily-card')).toContainText('次の問い');
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  const titles = [];
  for (let i = 0; i < 4; i++) {
    titles.push(await page.locator('question-view h1').innerText());
    await finishQuestion(page);
    await expect(page.getByRole('heading', { name: '少し、立ち止まってみませんか。' })).toHaveCount(i === 2 ? 1 : 0);
    if (i === 2) await page.screenshot({ path: test.info().outputPath('self-paced-pause.png'), fullPage: true });
    if (i < 3) await page.getByRole('link', { name: '次の問いへ', exact: true }).click();
  }
  expect(new Set(titles).size).toBe(4);
  await page.getByRole('link', { name: 'ここでひと休み' }).click();
  await expect(page.getByRole('heading', { name: 'ここで、ひと休み。' })).toBeVisible();
  await page.getByRole('link', { name: 'ホームへ戻る' }).click();
  await page.reload();
  const next = await page.locator('.daily-card h2').innerText();
  expect(titles).not.toContain(next);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('selfDialogueGame:v1')));
  expect(state.answers).toHaveLength(4);
  expect(state.dailyAssignments).toEqual([]);
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await finishQuestion(page);
  await expect(page.getByRole('heading', { name: '少し、立ち止まってみませんか。' })).toHaveCount(0);
});

test('legacy missing daily version no longer blocks home or legacy daily links', async ({ page }) => {
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  await page.evaluate(async () => {
    const [{ loadCatalog }, { createStorage }, { localDate }] = await Promise.all([
      import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
    ]);
    const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
    storage.update(state => {
      state.dailyAssignments.push({ localDate: localDate(), questionId: 'q001', questionVersion: 1, completedAnswerId: null });
      return state;
    });
  });
  await page.reload();
  await expect(page.getByText('今日の問いを確認できません')).toHaveCount(0);
  await page.goto('./#question?source=daily');
  await expect(page.locator('question-view h1')).toHaveText('友人の秘密');
  await finishQuestion(page);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('selfDialogueGame:v1')));
  expect(state.dailyAssignments[0].questionVersion).toBe(1);
  expect(state.dailyAssignments[0].completedAnswerId).toBeNull();
  expect(state.answers[0].questionVersion).toBe(2);
  await page.getByRole('link', { name: '次の問いへ', exact: true }).click();
  await expect(page.locator('question-view h1')).not.toHaveText('友人の秘密');
});
