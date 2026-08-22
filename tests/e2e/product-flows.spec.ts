import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('catalog, search, and theme controls work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Developer tools');
  await expect(page.getByText('11 small, local tools')).toBeVisible();

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('menuitemradio', { name: /Paper/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Search tools by name or tag/ }).click();
  await page.getByPlaceholder(/Search tools/).fill('security');
  await page.getByRole('option', { name: /Security & Tokens/ }).click();
  await expect(page).toHaveURL(/\/studio\/security\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Security & Tokens');
});

test('JSON conversion and JWT verification return usable output', async ({ page }) => {
  await page.goto('/tools/json/');
  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByText('Valid JSON.')).toBeVisible();
  await expect(page.getByText(/team: Platform/)).toBeVisible();

  await page.goto('/studio/security/');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('Mermaid and SQLite browser runtimes initialize', async ({ page }) => {
  await page.goto('/mermaid/');
  await expect(page.getByRole('img', { name: 'Rendered Mermaid diagram' }).locator('svg')).toBeVisible({ timeout: 20_000 });

  await page.goto('/');
  await page.getByRole('link', { name: /SQLite Playground/ }).first().click();
  await expect(page).toHaveURL(/\/sqlite\/$/);
  const loadSample = page.getByRole('button', { name: 'Load sample' });
  await expect(loadSample).toBeEnabled({ timeout: 20_000 });
  await loadSample.click();
  await expect(page.locator('tbody td').filter({ hasText: 'Ada Lovelace' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('4 rows', { exact: true })).toBeVisible();
});

test('Schema Studio parses and documents a sample schema', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Schema & Types Studio/ }).first().click();
  await expect(page).toHaveURL(/\/studio\/schema\/$/);
  await page.getByRole('button', { name: 'Sample' }).click();
  await page.getByRole('tab', { name: 'Validate' }).click();
  await expect(page.getByText('Valid. Data conforms to the schema.')).toBeVisible();
  await page.getByRole('tab', { name: 'Docs' }).click();
  await expect(page.locator('.swagger-ui')).toBeVisible({ timeout: 20_000 });
});

test('unknown routes return a single noindex directive', async ({ page }) => {
  const response = await page.goto('/definitely-missing/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveCount(1);
  await expect(robots).toHaveAttribute('content', 'noindex');
});

test('mobile navigation reaches a tool without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only navigation check');

  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  await page.getByRole('link', { name: 'Regex Lab' }).click();
  await expect(page).toHaveURL(/\/tools\/regex\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex Lab');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
