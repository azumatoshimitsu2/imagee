import { test as base, expect } from '@playwright/test';

// Gameplay tests start after the introductory help is dismissed.
// modal.spec.js uses the base fixture to verify the initial help itself.
export const test = base.extend({
  page: async ({ page }, use) => {
    const modal = page.locator('imagee-modal#js-modal-help');
    await page.addLocatorHandler(modal.getByRole('button', { name: '閉じる', exact: true }), async () => {
      await modal.getByRole('button', { name: '閉じる', exact: true }).click();
      await expect(modal).toBeHidden();
    });
    await use(page);
  },
});
export { expect };
