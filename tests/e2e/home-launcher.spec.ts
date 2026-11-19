import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

// A structurally valid, obviously fake token. The payload carries a marker so
// the test can prove the content never travels in a URL or a request.
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ sub: 'LOCAL_HANDOFF_71c4', iat: 1700000000 })).toString('base64url');
const TOKEN = `${header}.${payload}.c2lnbmF0dXJl`;

// A tool's own bundle loads after navigation; allow for a busy local server.
const TOOL_READY = { timeout: 20_000 };

type Page = import('@playwright/test').Page;
const slot = (page: Page) => page.getByRole('textbox', { name: 'Paste content or type a tool name' });
// Scoped to the slot's own list: the sidebar has "Pin <tool>" buttons too.
const suggestion = (page: Page, name: RegExp) =>
  page.getByRole('group', { name: 'Suggestions' }).getByRole('button', { name });

test('a pasted token opens the security studio loaded, without entering a URL or a request', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (request) => seen.push(request.url() + (request.postData() ?? '')));

  await page.goto('/');
  await slot(page).fill(TOKEN);
  const token = suggestion(page, /JSON Web Token/);
  await expect(token).toContainText('HS256');
  await expect(token).toContainText('Open in Security & Tokens');

  await slot(page).press('Enter');
  await expect(page).toHaveURL(/\/studio\/security\/$/);
  await expect(page.getByRole('textbox', { name: 'JWT token', exact: true })).toHaveValue(TOKEN, TOOL_READY);
  await expect(page.getByText('"LOCAL_HANDOFF_71c4"')).toBeVisible();

  // One-shot: the handoff is gone once read, and reloading does not replay it.
  expect(await page.evaluate(() => window.sessionStorage.getItem('sdt:handoff'))).toBeNull();
  expect(seen.some((entry) => entry.includes(payload) || entry.includes('LOCAL_HANDOFF'))).toBe(false);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'JWT token', exact: true })).toBeVisible(TOOL_READY);
  await expect(page.getByRole('textbox', { name: 'JWT token', exact: true })).not.toHaveValue(TOKEN);
});

test('the slot reads a timestamp back before opening it', async ({ page }) => {
  await page.goto('/');
  await slot(page).fill('1700000000');
  const stamp = suggestion(page, /Unix time, in seconds/);
  await expect(stamp).toContainText('2023-11-14T22:13:20Z');
  await stamp.click();
  await expect(page).toHaveURL(/\/tools\/timestamp\/$/);
  await expect(page.getByRole('textbox', { name: 'Moment', exact: true })).toHaveValue('1700000000', TOOL_READY);
});

test('a paste anywhere on the home page lands in the slot', async ({ page }) => {
  await page.goto('/');
  // Retried because the listener is attached when the page hydrates.
  await expect(async () => {
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData('text/plain', '*/15 9-17 * * 1-5');
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(slot(page)).toHaveValue('*/15 9-17 * * 1-5', { timeout: 500 });
  }).toPass();
  await expect(suggestion(page, /Cron schedule/)).toContainText('Open in IDs & Scheduling');
});

test('typing a tool name finds the tool, and plain prose is not misread', async ({ page }) => {
  await page.goto('/');
  await slot(page).fill('just some ordinary words to think about');
  await expect(page.getByText('That reads as plain text.')).toBeVisible();

  await slot(page).fill('regex');
  await expect(suggestion(page, /Regex Lab/)).toBeVisible();

  // Enter straight after typing, before the list has caught up, still opens it.
  await slot(page).fill('markdown');
  await slot(page).press('Enter');
  await expect(page).toHaveURL(/\/tools\/markdown\/$/);
});

test('the command palette opens pasted content in the right tool', async ({ page }) => {
  await page.goto('/tools/json/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder(/Search tools/).fill('#e1bb62');
  await page.getByRole('option', { name: /Open in Color & Contrast/ }).click();
  await expect(page).toHaveURL(/\/tools\/color\/$/);
  await expect(page.getByRole('textbox', { name: 'CSS color', exact: true })).toHaveValue('#e1bb62', TOOL_READY);
});

test('rack keys open tools from the keyboard and can be switched off', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Key shortcuts are a hardware-keyboard feature');

  await page.goto('/');
  // W is the second key of the second row: Regex Lab.
  await expect(page.getByRole('link', { name: /Regex Lab/ }).first()).toBeVisible();
  await page.keyboard.press('w');
  await expect(page).toHaveURL(/\/tools\/regex\/$/);

  await page.goto('/');
  const toggle = page.getByRole('switch', { name: 'Key shortcuts' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.locator('h1').click();
  await page.keyboard.press('w');
  await page.keyboard.press('/');
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // The choice is saved, and the modifier shortcut is never disabled.
  expect(await page.evaluate(() => window.localStorage.getItem('sdt:single-key-shortcuts'))).toBe('off');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByPlaceholder(/Search tools/)).toBeVisible();
});

test('no page scrolls sideways on a phone', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only layout check');
  for (const path of ['/', '/tools/hash/', '/tools/color/', '/studio/security/', '/sqlite/', '/about/']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});
