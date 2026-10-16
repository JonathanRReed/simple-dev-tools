import { expect, test } from '@playwright/test';
import { decodeShareState } from '../../src/lib/share';

test('API snippets preserve JSON types and omit common credentials from sharing', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/api-snippet/');
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await page.getByRole('tab', { name: 'Python', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Python', exact: true })).toContainText('json.loads');
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const params = decodeShareState(new URL(link).hash.slice(3));
  expect(params?.auth).toBeUndefined();
  expect(JSON.stringify(params)).not.toContain('sk_test_51H8xToken');
  expect(params?.body).toContain("O'Brien");
  await page.getByRole('combobox', { name: 'Method', exact: true }).selectOption('GET');
  await expect(page.getByRole('tabpanel', { name: 'Python', exact: true })).not.toContainText('json=payload');
});

test('timestamp units handle ambiguous and fractional epochs and expose UTC', async ({ page }) => {
  await page.goto('/tools/timestamp/');
  await page.getByRole('combobox', { name: 'Input unit', exact: true }).selectOption('milliseconds');
  await page.getByRole('textbox', { name: 'Moment', exact: true }).fill('1000');
  await expect(page.getByText('1970-01-01T00:00:01.000Z', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Input unit', exact: true }).selectOption('seconds');
  await page.getByRole('textbox', { name: 'Moment', exact: true }).fill('-0.5');
  await expect(page.getByText('1969-12-31T23:59:59.500Z', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Convert to time zone', exact: true }).selectOption('UTC');
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Input unit', exact: true })).toHaveValue('auto');
  await expect(page.getByText('2024-03-14T15:09:26.535Z', { exact: true })).toBeVisible();
});

test('immediate encoder swaps use the current input rather than a previous result', async ({ page }) => {
  await page.goto('/tools/encode-qr/');
  await page.getByRole('tab', { name: 'Base64', exact: true }).click();
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('Hello 🌎 中文');
  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Base64 output', exact: true })).toHaveValue('Hello 🌎 中文');
  await page.getByRole('tab', { name: 'URL', exact: true }).click();
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('a+b & c');
  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'URL output', exact: true })).toHaveValue('a+b & c');
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('%ZZ');
  await expect(page.getByRole('textbox', { name: 'URL output', exact: true })).toHaveValue('');
});

test('QR formats render and oversized text recovers without a stale image', async ({ page }) => {
  await page.goto('/tools/encode-qr/');
  await page.getByRole('tab', { name: 'QR', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Generated QR code', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('svg');
  await expect(page.getByRole('img', { name: 'Generated QR code', exact: true }).locator('svg')).toBeVisible();
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('a'.repeat(10000));
  await expect(page.getByRole('img', { name: 'Generated QR code', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('https://example.com/recovered');
  await expect(page.getByRole('img', { name: 'Generated QR code', exact: true })).toBeVisible();
});

test('identifier generation and cron errors remain usable', async ({ page }) => {
  await page.goto('/tools/ids-cron/');
  await page.getByRole('textbox', { name: 'ULID', exact: true }).fill('invalid');
  await expect(page.getByText('A ULID must be exactly 26 characters.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Cron', exact: true }).click();
  await page.getByRole('button', { name: 'Weekdays 09:00', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Cron', exact: true })).toContainText('Monday through Friday');
  await page.getByRole('textbox', { name: 'Cron expression', exact: true }).fill('invalid');
  await expect(page.getByRole('tabpanel', { name: 'Cron', exact: true })).toContainText('Validation error');
  await page.getByRole('button', { name: 'Every minute', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Cron', exact: true })).toContainText('Every minute');
});

test('every diagram template renders and system theme describes the displayed palette', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/mermaid/');
  const templates = [
    ['Flowchart', 'Start'], ['Sequence Diagram', 'Alice'], ['Class Diagram', 'Animal'],
    ['State Diagram', 'Still'], ['Gantt Chart', 'A Gantt Diagram'], ['ER Diagram', 'CUSTOMER'],
    ['Git Graph', 'develop'], ['Pie Chart', 'Dogs'], ['Mindmap', 'Origins'], ['User Journey', 'Make tea'],
  ];
  for (const [name, text] of templates) {
    await page.getByRole('combobox', { name: 'Insert a diagram template' }).selectOption({ label: name });
    await expect(page.getByRole('img', { name: 'Rendered Mermaid diagram' })).toContainText(text, { timeout: 20000 });
  }
  await page.getByRole('button', { name: 'Toggle theme', exact: true }).click();
  await page.getByRole('menuitemradio', { name: /System Match/ }).click();
  await expect(page.getByRole('menu', { name: 'Toggle theme', exact: true })).toContainText('System · Paper');
  for (const [label, id] of [['Art Deco', 'art-deco'], ['Rose Pine', 'main'], ['Moon', 'moon'], ['Dawn', 'dawn'], ['Raycast', 'raycast'], ['Paper', 'paper']]) {
    await page.getByRole('menuitemradio', { name: new RegExp(`^${label} `) }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
  }
});

test('hash verification waits for the current input and ignores results after reset', async ({ page }) => {
  await page.addInitScript(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (...args: Parameters<SubtleCrypto['digest']>) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      return digest(...args);
    };
  });
  await page.goto('/tools/hash/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('abc');
  await page.getByRole('textbox', { name: 'Expected digest', exact: true }).fill('BA7816BF8F01CFEA414140DE5DAE2223 B00361A396177A9CB410FF61F20015AD');
  await expect(page.getByText('No match', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('changed');
  await expect(page.getByText('Match', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText('All four digests are ready', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(1200);
  await expect(page.getByText('All four digests are ready', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue('');
});

test('diff options match their labels and expensive comparisons recover', async ({ page }) => {
  await page.goto('/tools/diff/');
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByRole('textbox', { name: 'Original', exact: true }).fill(' Hello World ');
  await page.getByRole('textbox', { name: 'Changed', exact: true }).fill('hello World');
  await page.getByRole('checkbox', { name: 'Ignore edge whitespace', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Ignore case', exact: true }).check();
  await expect(page.getByText('0 added', { exact: true })).toBeVisible();
  await expect(page.getByText('0 removed', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Original', exact: true }).fill(Array.from({length: 5000}, (_, i) => `old-${i}`).join('\n'));
  await expect(page.getByText('These texts are too different to compare within the processing limit. Compare smaller sections.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy unified', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy unified', exact: true })).toBeEnabled();
});
