import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('resting on a tool link warms its page with an ordinary request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Hover is a pointer-device behaviour');

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Prefetch-marked requests are refused by the production host, so the page
  // must not ask for them.
  await expect(page.locator('script[type="speculationrules"]')).toHaveCount(0);

  const warmed = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/tools/regex/' && request.resourceType() === 'fetch'
  );
  await page.locator('a.key[href="/tools/regex/"]').hover();
  const request = await warmed;
  expect(request.headers()['sec-purpose']).toBeUndefined();
  expect((await request.response())?.status()).toBe(200);

  // Only the HTML was fetched: the tool has not run, so it is not "recent".
  expect(await page.evaluate(() => window.localStorage.getItem('sdt:recent-tools'))).toBeNull();

  await page.locator('a.key[href="/tools/regex/"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex Lab', { timeout: 20_000 });
});

test('a first visit navigates between pages without uncaught errors or failed requests', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Home -> tool -> home -> tool, by real link clicks. The first hop leaves a
  // page that loaded before the service worker took control.
  for (const [href, heading] of [
    ['/tools/json/', 'JSON Workbench'],
    ['/tools/diff/', 'Text Diff'],
  ] as const) {
    await page.locator(`a.key[href="${href}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'All tools' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Developer tools', { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
  }
  expect(problems).toEqual([]);
});
