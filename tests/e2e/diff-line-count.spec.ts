import { expect, test } from '@playwright/test';

test('line labels follow edits, samples, and repeated resets', async ({ page }) => {
  await page.goto('/tools/diff/');
  const original = page.locator('#diff-original');
  const changed = page.locator('#diff-changed');
  const originalLabel = page.locator('label[for="diff-original"]').locator('..');
  const changedLabel = page.locator('label[for="diff-changed"]').locator('..');
  await expect(originalLabel).toContainText('0 chars · 0 lines');
  await original.fill('alpha\nbeta\n');
  await changed.fill('😀\n');
  await expect(originalLabel).toContainText('11 chars · 3 lines');
  await expect(changedLabel).toContainText('3 chars · 2 lines');
  await original.fill('single');
  await expect(originalLabel).toContainText('6 chars · 1 lines');
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await expect(originalLabel).toContainText('4 lines');
  await expect(changedLabel).toContainText('4 lines');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(original).toHaveValue('');
    await expect(changed).toHaveValue('');
    await expect(originalLabel).toContainText('0 chars · 0 lines');
    await expect(changedLabel).toContainText('0 chars · 0 lines');
  }
});
