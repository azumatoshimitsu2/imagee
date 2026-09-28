import { test, expect } from '@playwright/test';

test('dismissed help stays closed after closing the tab and can still be opened manually', async ({ page, context }) => {
  await page.goto('./#home');
  const modal = page.locator('#js-modal-help');
  await expect(modal).toHaveClass(/is-show/);
  await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(modal).toBeHidden();
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto('./#home');
  // Wait for both the component and its stylesheet, including queued auto-opening.
  await reopened.evaluate(async () => {
    await customElements.whenDefined('imagee-modal');
    const modal = document.querySelector('#js-modal-help');
    while (!modal.shadowRoot.adoptedStyleSheets.length) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  });
  const reopenedModal = reopened.locator('#js-modal-help');
  await expect(reopenedModal).toBeHidden();
  await expect(reopened.locator('body')).not.toHaveClass(/is-show-modal/);
  await reopened.locator('imagee-btn-help').click();
  await expect(reopenedModal).toHaveClass(/is-show/);
  await expect(reopenedModal.getByRole('heading', { name: 'ゲームの遊び方' })).toBeVisible();
});

test('open=true displays help initially and the help button can reopen it after closing', async ({ page }) => {
  await page.goto('./#home');
  const modal = page.locator('imagee-modal#js-modal-help');
  await expect(modal).toHaveClass(/is-show/);
  await expect(modal.getByRole('heading', { name: 'ゲームの遊び方' })).toBeVisible();
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  await expect(modal).toHaveCSS('opacity', '1');
  await expect(modal).toBeFocused();
  await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/is-show-modal/);
  await page.locator('imagee-btn-help').click();
  await expect(modal).toHaveClass(/is-show/);
  await expect(modal.getByRole('heading', { name: 'ゲームの遊び方' })).toBeVisible();
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  await expect(modal).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath('help-open.png'), fullPage: false });
});

test('open=false and an absent open attribute stay closed until explicitly opened', async ({ page }) => {
  await page.goto('./#home');
  await page.evaluate(async () => {
    await customElements.whenDefined('imagee-modal');
    for (const [id, value] of [['false-modal', 'false'], ['absent-modal', null]]) {
      const modal = document.createElement('imagee-modal');
      modal.id = id;
      if (value !== null) modal.setAttribute('open', value);
      modal.textContent = 'テスト用';
      document.body.append(modal);
    }
  });
  const initial = page.locator('#js-modal-help');
  await expect(initial).toHaveAttribute('aria-modal', 'true');
  await initial.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(initial).toBeHidden();
  for (const id of ['false-modal', 'absent-modal']) await expect(page.locator(`#${id}`)).toBeHidden();
  await page.locator('#false-modal').evaluate(modal => modal.dispatchEvent(new CustomEvent('modalShow')));
  await expect(page.locator('#false-modal')).toHaveAttribute('aria-modal', 'true');
});

test('an empty open attribute also supports declarative initial opening', async ({ page }) => {
  await page.route('**/what_would_you_do/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('open="true"', 'open') });
  });
  await page.goto('./');
  await expect(page.locator('#js-modal-help')).toHaveAttribute('aria-modal', 'true');
});
