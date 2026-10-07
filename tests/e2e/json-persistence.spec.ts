import { expect, test, type Page } from '@playwright/test';

import { encodeShareState } from '../../src/lib/share';

const SOURCE_FORMAT_KEY = 'sdt:json:source-format';
const TARGET_FORMAT_KEY = 'sdt:json:target-format';

const sourceButton = (page: Page, format: string) =>
  page.getByRole('group', { name: 'Source format', exact: true })
    .getByRole('button', { name: format, exact: true });
const targetButton = (page: Page, format: string) =>
  page.getByRole('group', { name: 'Target format', exact: true })
    .getByRole('button', { name: format, exact: true });

// Playwright gives each test a fresh context. Do not clear storage with a
// document init script: it would also erase the state under test on reload.
for (const fixture of [
  { source: 'CSV', target: 'JSON', input: 'name,age\nAda,36', output: '"name": "Ada"' },
  { source: 'YAML', target: 'CSV', input: '- name: Ada\n  age: 36', output: 'name,age\nAda,36' },
]) {
  test(`restores ${fixture.source} to ${fixture.target} after reload`, async ({ page }) => {
    await page.goto('/tools/json/');
    await sourceButton(page, fixture.source).click();
    await targetButton(page, fixture.target).click();
    await page.getByRole('textbox', { name: 'Source', exact: true }).fill(fixture.input);
    await expect(page.getByText(`Valid ${fixture.source}.`, { exact: true })).toBeVisible();
    await expect(page.locator('pre').first()).toContainText(fixture.output);
    await expect.poll(() => page.evaluate(() => ({
      source: localStorage.getItem('sdt:json:source'),
      sourceFormat: localStorage.getItem('sdt:json:source-format'),
      targetFormat: localStorage.getItem('sdt:json:target-format'),
    }))).toEqual({
      source: fixture.input,
      sourceFormat: fixture.source.toLowerCase(),
      targetFormat: fixture.target.toLowerCase(),
    });

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Source', exact: true })).toHaveValue(fixture.input);
    await expect(sourceButton(page, fixture.source)).toHaveAttribute('aria-pressed', 'true');
    await expect(targetButton(page, fixture.target)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(`Valid ${fixture.source}.`, { exact: true })).toBeVisible();
    await expect(page.locator('pre').first()).toContainText(fixture.output);
  });
}

test('flushes a format change when leaving before the persistence delay', async ({ page }) => {
  await page.goto('/tools/json/');
  await sourceButton(page, 'CSV').click();
  await page.getByRole('textbox', { name: 'Source', exact: true }).fill('name\nAda');
  await expect(page.getByText('Valid CSV.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sdt:json:source')))
    .toBe('name\nAda');

  // Dispatch the format click and start navigation in the same task. This
  // intentionally does not wait for the 300 ms debounced storage write.
  await page.evaluate(() => {
    const group = document.querySelector('[aria-labelledby="tgt-fmt-label"]');
    const button = Array.from(group!.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.trim() === 'JSON');
    button!.click();
    window.location.assign(new URL('/', window.location.href).href);
  });
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
  await page.goto('/tools/json/');
  await expect(sourceButton(page, 'CSV')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetButton(page, 'JSON')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Valid CSV.', { exact: true })).toBeVisible();
});

test('reset clears saved input and formats without a pending write restoring them', async ({ page }) => {
  await page.goto('/tools/json/');
  await sourceButton(page, 'CSV').click();
  await targetButton(page, 'JSON').click();
  await page.getByRole('textbox', { name: 'Source', exact: true }).fill('name\nAda');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sdt:json:source')))
    .toBe('name\nAda');
  // Queue fresh format writes and reset in the same task, so clearing must
  // cancel pending writes as well as remove previously persisted values.
  await page.evaluate(() => {
    for (const [label, format] of [['src-fmt-label', 'YAML'], ['tgt-fmt-label', 'CSV']]) {
      const group = document.querySelector(`[aria-labelledby="${label}"]`);
      const button = Array.from(group!.querySelectorAll('button'))
        .find((candidate) => candidate.textContent?.trim() === format);
      button!.click();
    }
    const reset = Array.from(document.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.trim() === 'Reset');
    reset!.click();
  });
  await expect(sourceButton(page, 'JSON')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetButton(page, 'YAML')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Source', exact: true })).toHaveValue('');
  await expect(sourceButton(page, 'JSON')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetButton(page, 'YAML')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)),
    ['sdt:json:source', SOURCE_FORMAT_KEY, TARGET_FORMAT_KEY])).toEqual([null, null, null]);
});

test('invalid saved formats fall back to the original defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt:json:source', '{"name":"Ada"}');
    localStorage.setItem('sdt:json:source-format', 'xml');
    localStorage.setItem('sdt:json:target-format', '');
  });
  await page.goto('/tools/json/');
  await expect(sourceButton(page, 'JSON')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetButton(page, 'YAML')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Valid JSON.', { exact: true })).toBeVisible();
  await expect(page.locator('pre').first()).toContainText('name: Ada');
});

test('share-link state takes precedence over saved formats', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt:json:source', 'name\nSaved');
    localStorage.setItem('sdt:json:source-format', 'csv');
    localStorage.setItem('sdt:json:target-format', 'json');
  });
  const input = '- name: Shared\n  age: 36';
  const hash = encodeShareState({ src: input, sf: 'yaml', tf: 'csv', q: '[0].name' });
  await page.goto(`/tools/json/#s=${hash}`);
  await expect(page.getByRole('textbox', { name: 'Source', exact: true })).toHaveValue(input);
  await expect(sourceButton(page, 'YAML')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetButton(page, 'CSV')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Valid YAML.', { exact: true })).toBeVisible();
  await expect(page.locator('pre').first()).toContainText('name,age\nShared,36');
  await expect(page.getByRole('textbox', { name: 'Path query', exact: true })).toHaveValue('[0].name');
});

test('formatting CSV persists the transformed JSON source format', async ({ page }) => {
  await page.goto('/tools/json/');
  await sourceButton(page, 'CSV').click();
  await page.getByRole('textbox', { name: 'Source', exact: true }).fill('name\nAda');
  await expect(page.getByText('Valid CSV.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(page.getByText('Valid JSON.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sdt:json:source-format')))
    .toBe('json');
  await page.reload();
  await expect(sourceButton(page, 'JSON')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Valid JSON.', { exact: true })).toBeVisible();
  await expect(page.locator('pre').first()).toContainText('name: Ada');
});
