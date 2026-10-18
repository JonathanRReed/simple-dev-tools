import { expect, test, type Page } from '@playwright/test';

const PRECISION_ERROR = 'This document contains a number outside JavaScript’s safe integer range.';

const button = (page: Page, group: 'Source format' | 'Target format', format: string) =>
  page.getByRole('group', { name: group, exact: true }).getByRole('button', { name: format, exact: true });

async function convert(page: Page, input: string, target: 'JSON' | 'YAML') {
  await page.goto('/tools/json/');
  await button(page, 'Source format', 'YAML').click();
  await button(page, 'Target format', target).click();
  await page.getByRole('textbox', { name: 'Source', exact: true }).fill(input);
}

for (const input of ['9007199254740993: v', '%YAML 1.1\n---\n!!set {9007199254740993: null}', '%YAML 1.1\n---\n!!omap [a: 9007199254740993]']) {
  test(`rejects YAML that would round ${JSON.stringify(input)}`, async ({ page }) => {
    await convert(page, input, 'YAML');
    await expect(page.getByText(PRECISION_ERROR)).toBeVisible();
    await expect(page.getByText('Valid YAML.', { exact: true })).toHaveCount(0);
    await expect(page.locator('pre').filter({ hasText: '9007199254740992' })).toHaveCount(0);
  });
}

test('keeps a quoted large numeric YAML key exact', async ({ page }) => {
  await convert(page, '"9007199254740993": v\nmax: 9007199254740991', 'JSON');
  await expect(page.getByText('Valid YAML.', { exact: true })).toBeVisible();
  await expect(page.locator('pre').first()).toContainText('"9007199254740993": "v"');
  await expect(page.locator('pre').first()).toContainText('"max": 9007199254740991');
});
