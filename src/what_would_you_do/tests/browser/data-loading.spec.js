import { test, expect } from './fixtures.js';

// Only the data stage exists. This checks real HTTP loading in a browser;
// answering, persistence and rendering tests follow when those features exist.
test('external JSON loads from the deployed subdirectory with Japanese text intact', async ({ page }) => {
  const response = await page.goto('data/questions.json');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/json');
  const loaded = await page.evaluate(async () => {
    const names = ['questions', 'axes', 'followups', 'rules', 'settings', 'copy'];
    return Promise.all(names.map(async name => {
      const response = await fetch(`./${name}.json`);
      if (!response.ok) throw new Error(`${name}: ${response.status}`);
      return response.json();
    }));
  });
  expect(loaded.every(data => data.schemaVersion === 1)).toBe(true);
  expect(loaded[0].questions[0].title).toBe('友人の秘密');
  expect(loaded[0].questions[0].body).not.toContain('\uFFFD');
});
