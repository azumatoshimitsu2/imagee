import { test, expect } from './fixtures.js';

async function seed(page, boundary = false) {
  await page.evaluate(async boundary => {
    const [{ loadCatalog }, { createStorage }, { appendAnswer }] = await Promise.all([
      import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
    ]);
    const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
    let state = storage.getState();
    for (const id of ['q001', 'q003', 'q009', 'q002', 'q004']) {
      const q = catalog.questions.questions.find(q => q.id === id);
      const option = q.options.find(o => o.weights.principle_outcome > 0) ?? q.options[0];
      state = appendAnswer(state, q, option.id);
    }
    if (boundary) for (const [id, option] of [['q031', 'A'], ['q032', 'B']]) {
      state = appendAnswer(state, catalog.questions.questions.find(q => q.id === id), option);
    }
    storage.saveState(state);
  }, boundary);
  await page.reload();
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
}

test('landscape loads only on the map, shows a neutral starting view and fits mobile', async ({ page }) => {
  const assets = [];
  page.on('request', r => { if (/\/what_would_you_do\/(img\/|data\/landscapes.json)/.test(r.url())) assets.push(r.url()); });
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  expect(assets).toEqual([]);
  await page.getByRole('link', { name: 'あなたの地図', exact: true }).click();
  const view = page.locator('landscape-view');
  await expect(view.getByRole('heading', { name: '分岐路' })).toBeVisible();
  await expect(view).toContainText('まだ、風景を選ぶための回答が十分に集まっていません');
  const img = view.locator('img');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(img).toHaveAttribute('loading', 'lazy');
  expect(assets.filter(url => url.includes('/img/'))).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('landscape-start.png'), fullPage: true });
});

test('selected landscape exposes actual evidence and changes after revision', async ({ page }) => {
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  await seed(page);
  await page.goto('./#profile');
  const view = page.locator('landscape-view');
  await expect(view.getByRole('heading', { name: '曲がる川' })).toBeVisible();
  await expect(view).toContainText('暫定の風景');
  await view.getByText('この風景につながった回答を読む（3件）').click();
  await expect(view.locator('.map-evidence li')).toHaveCount(3);
  const before = await page.evaluate(() => localStorage.getItem('selfDialogueGame:v1'));
  await page.reload();
  await expect(view.getByRole('heading', { name: '曲がる川' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('selfDialogueGame:v1'))).toBe(before);
  await page.evaluate(async () => {
    const [{ loadCatalog }, { createStorage }, { currentAnswers, reviseAnswer }] = await Promise.all([
      import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
    ]);
    const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
    let state = storage.getState();
    for (const answer of currentAnswers(state.answers).filter(a => a.derivedWeights.principle_outcome > 0)) {
      state = reviseAnswer(state, answer.id, answer.snapshot.options.find(o => o.weights.principle_outcome < 0).id);
    }
    storage.saveState(state);
  });
  await page.reload();
  await expect(view.getByRole('heading', { name: 'まっすぐな橋' })).toBeVisible();
});

test('boundary landscape links to its observed pair', async ({ page }) => {
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  await seed(page, true);
  await page.goto('./#profile');
  const view = page.locator('landscape-view');
  await expect(view.getByRole('heading', { name: '潮の境界' })).toBeVisible();
  await view.locator('img').scrollIntoViewIfNeeded();
  await expect.poll(() => view.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await view.getByText('この風景につながった回答を読む（2件）').click();
  await page.screenshot({ path: test.info().outputPath('landscape-boundary.png'), fullPage: true });
  await view.getByRole('link', { name: '条件と二つの答えを見比べる →' }).click();
  await expect(page.locator('.comparison-pair')).toBeVisible();
});

test('missing image leaves its caption, map and navigation usable without a retry loop', async ({ page }) => {
  let attempts = 0;
  await page.route('**/what_would_you_do/img/*.webp', route => { attempts++; return route.abort(); });
  await page.goto('./#profile');
  const view = page.locator('landscape-view');
  await view.scrollIntoViewIfNeeded();
  await expect(view.getByText('画像を読み込めませんでした。風景の言葉と根拠は、下で読めます。')).toBeVisible();
  await expect(view.getByRole('heading', { name: '分岐路' })).toBeVisible();
  expect(attempts).toBe(1);
  await expect(page.locator('.map-axis')).toHaveCount(6);
  await page.getByRole('link', { name: 'ホーム', exact: true }).click();
  await page.getByRole('link', { name: 'この問いを読む' }).click();
  await expect(page.getByRole('button', { name: 'この答えを記録する' })).toBeVisible();
});

test('landscape JSON failure is isolated and retry renders external text safely', async ({ page }) => {
  let fail = true;
  await page.route('**/data/landscapes.json', async route => {
    if (fail) return route.fulfill({ status: 503, body: '' });
    const response = await route.fetch();
    const data = await response.json();
    data.landscapes[0].resultText = '<img src=x onerror="window.landscapeXss=true">風景';
    return route.fulfill({ response, json: data });
  });
  await page.goto('./#profile');
  await expect(page.locator('.map-axis')).toHaveCount(6);
  await expect(page.locator('landscape-view')).toContainText('風景を読み込めませんでした');
  fail = false;
  await page.getByRole('button', { name: '風景をもう一度読み込む' }).click();
  await expect(page.locator('.landscape-words')).toHaveText('<img src=x onerror="window.landscapeXss=true">風景');
  await expect(page.locator('.landscape-words img')).toHaveCount(0);
  expect(await page.evaluate(() => window.landscapeXss)).toBeUndefined();
});

test('standalone direction becomes a combination and exposes only its matching evidence', async ({ page }) => {
  await page.goto('./#home');
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  const addDirections = async directions => page.evaluate(async directions => {
    const [{ loadCatalog }, { createStorage }, { appendAnswer }] = await Promise.all([
      import('./js/data-loader.js'), import('./js/storage.js'), import('./js/answer-history.js'),
    ]);
    const catalog = await loadCatalog(), storage = createStorage({ schemas: catalog.schemas });
    let state = storage.getState();
    for (const [axis, direction, ids] of directions) for (const id of ids) {
      const question = catalog.questions.questions.find(q => q.id === id);
      const option = question.options.find(o => o.weights[axis] * direction > 0);
      state = appendAnswer(state, question, option.id);
    }
    storage.saveState(state);
  }, directions);
  await addDirections([['stability_change', 1, ['q038', 'q047', 'q053']]]);
  await page.reload();
  await expect(page.getByRole('link', { name: 'この問いを読む' })).toBeVisible();
  await page.goto('./#profile');
  const view = page.locator('landscape-view');
  await expect(view.locator('.landscape-selection-reason')).toHaveText('変化寄りの回答を手がかりに、一つの軸の風景を選びました。');
  await addDirections([
    ['principle_outcome', 1, ['q001', 'q003', 'q009']],
    ['freedom_security', -1, ['q040', 'q048', 'q054']],
  ]);
  await page.reload();
  await expect(view.getByRole('heading', { name: '開いた門', exact: true })).toBeVisible();
  await expect(view.locator('.landscape-selection-reason')).toHaveText('自由と変化寄りの回答を手がかりに、組み合わせの風景を選びました。');
  await view.getByText('この風景につながった回答を読む（6件）').click();
  await expect(view.locator('.map-evidence li')).toHaveCount(6);
  await expect(view.locator('.map-evidence')).not.toContainText('会社のルール');
  await page.reload();
  await expect(view.locator('.landscape-selection-reason')).toContainText('組み合わせの風景');
});
