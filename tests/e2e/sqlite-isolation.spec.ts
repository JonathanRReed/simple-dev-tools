import { expect, test, type Locator, type Page } from '@playwright/test';
const slowQuery = 'WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000000000) SELECT sum(x) FROM n;';


// DOM fill can race Android EditContext selection. Use the editor's keymap.
async function replaceSql(page: Page, editor: Locator, text: string) {
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
  await expect(editor).toHaveText(text);
}

test.beforeEach(async ({ page, isMobile }) => {
  if (!isMobile) return;
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
});

test('SQLite runs off-thread, can be cancelled, and recovers with an explicit fresh database', async ({ page, request }) => {
  test.slow();
  const response = await request.get('/sqlite-worker.js');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'");
  expect(response.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
  await page.goto('/sqlite/');
  const sample = page.getByRole('button', { name: 'Load sample', exact: true });
  await expect(sample).toBeEnabled({ timeout: 20000 });
  await sample.click();
  await expect(page.getByText('4 rows', { exact: true })).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'SQL query', exact: true });
  await replaceSql(page, editor, slowQuery);
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel and discard database', exact: true }).click();
  await expect(page.getByText(/Query cancelled\. The in-memory database was discarded/)).toBeVisible();
  await expect(sample).toBeEnabled({ timeout: 20000 });
  await replaceSql(page, editor, 'SELECT * FROM users;');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(page.getByText(/no such table: users/)).toBeVisible();
  await sample.click();
  await expect(page.getByText('4 rows', { exact: true })).toBeVisible();
});

test('SQLite timeout and reset never publish stale results', async ({ page }) => {
  test.slow();
  await page.goto('/sqlite/');
  const run = page.getByRole('button', { name: 'Run query', exact: true });
  await expect(run).toBeEnabled({ timeout: 20000 });
  const editor = page.getByRole('textbox', { name: 'SQL query', exact: true });
  await replaceSql(page, editor, slowQuery);
  await run.click();
  await expect(page.getByText(/Query stopped after 5 seconds/)).toBeVisible({ timeout: 12000 });
  await expect(run).toBeEnabled({ timeout: 20000 });
  await replaceSql(page, editor, slowQuery);
  await run.click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(run).toBeEnabled({ timeout: 20000 });
  await replaceSql(page, editor, 'SELECT 42 AS answer;');
  await run.click();
  await expect(page.getByRole('cell', { name: '42', exact: true })).toBeVisible();
  await page.waitForTimeout(5500);
  await expect(page.getByRole('cell', { name: '42', exact: true })).toBeVisible();
  await expect(page.getByText(/Query stopped after/)).toHaveCount(0);
});
