import { expect, test } from '@playwright/test';

test('rejects malformed color syntax without showing conversions', async ({ page }) => {
  await page.goto('/tools/color/');
  for (const value of ['rgb(1..2, 3, 4)', 'rgba(1, 2, 3, ..5)', 'rgb(1, 2 3)', 'rgb(10%, 2, 3)', 'hsl(30, 50% 50%)', 'constructor', '__proto__']) {
    await page.locator('#color-input').fill(value);
    await expect(page.getByText(/Not a recognized CSS color/)).toBeVisible();
    await expect(page.getByText('Conversions', { exact: true })).not.toBeVisible();
  }
});

test('recomputes custom-property colors after the document context changes', async ({ page }) => {
  await page.goto('/tools/color/');
  await page.evaluate(() => document.body.style.setProperty('--parser-test-color', '#191724'));
  await page.locator('#color-input').fill('var(--parser-test-color)');
  await expect(page.getByText('rgb(25, 23, 36)', { exact: true })).toBeVisible();

  await page.evaluate(() => document.body.style.setProperty('--parser-test-color', '#faf4ed'));
  await page.locator('#color-input').fill('');
  await page.locator('#color-input').fill('var(--parser-test-color)');
  await expect(page.getByText('rgb(250, 244, 237)', { exact: true })).toBeVisible();
});

test('retries a failed browser resolution after the document context changes', async ({ page }) => {
  await page.goto('/tools/color/');
  // The existing parser cannot convert a computed display-p3 color to RGBA.
  await page.evaluate(() => document.body.style.setProperty('--parser-test-color', 'color(display-p3 1 0 0)'));
  await page.locator('#color-input').fill('var(--parser-test-color)');
  await expect(page.getByText(/Not a recognized CSS color/)).toBeVisible();

  await page.evaluate(() => document.body.style.setProperty('--parser-test-color', '#123456'));
  await page.locator('#color-input').fill('');
  await page.locator('#color-input').fill('var(--parser-test-color)');
  await expect(page.getByText('rgb(18, 52, 86)', { exact: true })).toBeVisible();
});

test('preserves advanced browser fallbacks and HSL precision', async ({ page }) => {
  await page.goto('/tools/color/');
  for (const [value, rgb] of [
    ['tomato', 'rgb(255, 99, 71)'],
    ['hsl(.5turn 100% 50%)', 'rgb(0, 255, 255)'],
    ['rgb(calc(10 + 20) 0 0)', 'rgb(30, 0, 0)'],
  ]) {
    await page.locator('#color-input').fill(value);
    await expect(page.getByText(rgb, { exact: true })).toBeVisible();
  }
  await page.locator('#color-input').fill('hsl(30, 1%, 1%)');
  await expect(page.getByText('hsl(30, 1%, 1%)', { exact: true })).toBeVisible();
  await expect(page.getByText('rgb(3, 3, 3)', { exact: true })).toBeVisible();
});
