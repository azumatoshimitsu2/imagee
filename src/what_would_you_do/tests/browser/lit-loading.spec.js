import { test, expect } from './fixtures.js';

// An integration probe for the vendored module, not the game's unfinished UI.
test('local Lit works without a build and updates text safely', async ({ page }) => {
  const externalRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await page.goto('data/questions.json');
  await page.setContent('<main></main>');
  await page.evaluate(async () => {
    const { LitElement, html } = await import('/games/d/what_would_you_do/js/vendor/lit.js');
    class LitProbe extends LitElement {
      static properties = { message: { type: String } };
      constructor() { super(); this.message = '以前のあなた'; }
      render() { return html`<p>${this.message}</p>`; }
    }
    customElements.define('self-dialogue-lit-probe', LitProbe);
    const element = document.createElement('self-dialogue-lit-probe');
    document.querySelector('main').append(element);
    await element.updateComplete;
  });
  const text = page.locator('self-dialogue-lit-probe p');
  await expect(text).toHaveText('以前のあなた');
  const literal = '<img src=x onerror="window.unexpectedExecution=true">今のあなた';
  await page.evaluate(async value => {
    const element = document.querySelector('self-dialogue-lit-probe');
    element.message = value;
    await element.updateComplete;
  }, literal);
  await expect(text).toHaveText(literal);
  await expect(page.locator('self-dialogue-lit-probe img')).toHaveCount(0);
  expect(await page.evaluate(() => window.unexpectedExecution)).toBeUndefined();
  expect(externalRequests).toEqual([]);
});
