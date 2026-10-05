import {
  constants,
  createHash,
  createHmac,
  generateKeyPairSync,
  sign as signWithNode,
  verify as verifyWithNode,
} from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

// These oracles deliberately use Node crypto/Buffer, never the application's
// shared encoding helpers or a mocked browser crypto implementation.
const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const SHA256_ABC_BASE64URL = 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0';
const PAYLOAD = { sub: 'test-only-user', name: 'José 🚀', iat: 1_700_000_000 };
type JwtAlgorithm = 'HS256' | 'RS256' | 'ES256';

function jwtHeader(alg: JwtAlgorithm) {
  return { alg, typ: 'JWT', kid: 'e2e-test-only' };
}

function signingInput(alg: JwtAlgorithm) {
  return [jwtHeader(alg), PAYLOAD]
    .map((value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'))
    .join('.');
}

function alterSignature(token: string) {
  const [header, payload, signature] = token.split('.');
  const bytes = Buffer.from(signature, 'base64url');
  // Change a significant signature bit, rather than unused Base64 padding bits.
  bytes[0] ^= 1;
  return `${header}.${payload}.${bytes.toString('base64url')}`;
}

function activePanel(page: Page, name: string) {
  return page.getByRole('tabpanel', { name, exact: true });
}

function resultBody(panel: Locator, title: string) {
  // ResultPanel renders a visible title inside its header, then a sibling body.
  // Read the actual displayed output, without evaluating hidden React state.
  return panel.getByText(title, { exact: true })
    .locator('..').locator('..').locator(':scope > div').last();
}

async function openSecurityTab(page: Page, name: string) {
  await page.goto('/studio/security/');
  await page.getByRole('tab', { name, exact: true }).click();
  return activePanel(page, name);
}

async function fillSigningInputs(page: Page, alg: JwtAlgorithm, key: string) {
  const panel = activePanel(page, 'Sign & build');
  await panel.getByLabel('Algorithm', { exact: true }).selectOption(alg);
  await panel.getByLabel('Header (JSON)', { exact: true }).fill(JSON.stringify(jwtHeader(alg), null, 2));
  await panel.getByLabel('Payload (JSON)', { exact: true }).fill(JSON.stringify(PAYLOAD, null, 2));
  await panel.getByLabel(alg === 'HS256' ? 'Secret (HS256)' : `Private key (${alg})`, { exact: true }).fill(key);
  return panel;
}

async function verifyToken(page: Page, token: string, key: string, alg: JwtAlgorithm) {
  await page.getByRole('tab', { name: 'JWT', exact: true }).click();
  const panel = activePanel(page, 'JWT');
  await panel.getByLabel('JWT token', { exact: true }).fill(token);
  await panel.getByLabel(alg === 'HS256' ? 'Secret (HS256)' : 'Public key (RS256 / ES256)', { exact: true }).fill(key);
  await panel.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(panel.getByText('Verified', { exact: true })).toBeVisible();
  return panel;
}

test('File Hash Checker renders exact digests and casing for abc', async ({ page }) => {
  // Detects wrong bytes, truncated/non-zero-padded hex, or a shared toHex import
  // regression in HashClient, rather than merely accepting a 64-character shape.
  await page.goto('/tools/hash/');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).fill('abc');
  await expect(page.getByRole('status').filter({ hasText: 'All four digests are ready' })).toHaveText('All four digests are ready');

  const digests = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map((label) => ({
    label,
    expected: createHash(label.toLowerCase().replace('-', '')).update('abc', 'utf8').digest('hex'),
  }));
  expect(digests.find(({ label }) => label === 'SHA-256')?.expected).toBe(SHA256_ABC);
  for (const { label, expected } of digests) {
    const output = page.getByText(label, { exact: true }).locator('..').locator(':scope > span').nth(1);
    await expect(output).toHaveText(expected);
  }

  await page.getByRole('button', { name: 'UPPERCASE', exact: true }).click();
  for (const { label, expected } of digests) {
    const output = page.getByText(label, { exact: true }).locator('..').locator(':scope > span').nth(1);
    await expect(output).toHaveText(expected.toUpperCase());
  }
  await page.getByLabel('Expected digest', { exact: true }).fill(SHA256_ABC.toUpperCase().match(/.{1,8}/g)!.join(' '));
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
  await page.getByLabel('Expected digest', { exact: true }).fill('00'.repeat(32));
  await expect(page.getByText('No match', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No digests computed' })).toHaveText('No digests computed');
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('');
});

test('File Hash Checker hashes original binary file bytes exactly', async ({ page }) => {
  // NUL, high bytes, invalid UTF-8 and line endings catch an accidental text
  // read/re-encode instead of File.arrayBuffer() in the real file-mode path.
  const bytes = Buffer.from([0x00, 0xff, 0x80, 0x0a, 0x0d, 0x41, 0xc3, 0x28, 0xfe, 0x00, 0x7f, 0x01]);
  await page.goto('/tools/hash/');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('tab', { name: 'File', exact: true }).click();
  const filePanel = activePanel(page, 'File');
  const choosingFile = page.waitForEvent('filechooser');
  await filePanel.getByRole('button', { name: 'Import file', exact: true }).click();
  const chooser = await choosingFile;
  await chooser.setFiles({ name: 'e2e-test-only-binary.bin', mimeType: 'application/octet-stream', buffer: bytes });
  await expect(filePanel.getByText('e2e-test-only-binary.bin', { exact: true })).toBeVisible();
  await expect(filePanel.getByText('12 B', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'All four digests are ready' })).toHaveText('All four digests are ready');

  for (const label of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) {
    const expected = createHash(label.toLowerCase().replace('-', '')).update(bytes).digest('hex');
    const output = page.getByText(label, { exact: true }).locator('..').locator(':scope > span').nth(1);
    await expect(output).toHaveText(expected);
  }
  await expect(page.getByRole('alert')).toHaveCount(0);
  await filePanel.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(filePanel.getByText('Drop file here', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'No digests computed' })).toHaveText('No digests computed');
});

test('Security Hash renders exact SHA-256 hex and unpadded Base64URL', async ({ page }) => {
  // The abc digest has zero-prefixed bytes and both URL-safe alphabet symbols.
  // Exact output catches hex padding, +/ conversion, and trailing = regressions.
  const panel = await openSecurityTab(page, 'Hash');
  await panel.getByLabel('Input', { exact: true }).fill('abc');
  await panel.getByLabel('Algorithm', { exact: true }).selectOption('SHA-256');
  await panel.getByRole('button', { name: 'Compute', exact: true }).click();
  await expect(resultBody(panel, 'Hex')).toHaveText(SHA256_ABC);
  await expect(resultBody(panel, 'Base64url')).toHaveText(SHA256_ABC_BASE64URL);

  await panel.getByLabel('Algorithm', { exact: true }).selectOption('SHA-512');
  await expect(panel.getByText('Compute a digest to see hex and base64url output.', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Compute', exact: true }).click();
  const sha512 = createHash('sha512').update('abc', 'utf8').digest();
  await expect(resultBody(panel, 'Hex')).toHaveText(sha512.toString('hex'));
  await expect(resultBody(panel, 'Base64url')).toHaveText(sha512.toString('base64url'));
});

test('HMAC matches the independent SHA-256 oracle and recovers from an empty secret', async ({ page }) => {
  // Detects changed text-key/message bytes, hex conversion, or Base64URL output.
  const message = 'The quick brown fox jumps over the lazy dog';
  const secret = 'key';
  const expected = createHmac('sha256', secret).update(message, 'utf8').digest();
  expect(expected.toString('hex')).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  const panel = await openSecurityTab(page, 'HMAC');
  await panel.getByLabel('Message', { exact: true }).fill(message);
  await panel.getByLabel('Secret', { exact: true }).fill(secret);
  await panel.getByLabel('Algorithm', { exact: true }).selectOption('SHA-256');
  await panel.getByRole('button', { name: 'Compute', exact: true }).click();
  await expect(resultBody(panel, 'Hex')).toHaveText(expected.toString('hex'));
  await expect(resultBody(panel, 'Base64url')).toHaveText(expected.toString('base64url'));

  await panel.getByLabel('Secret', { exact: true }).fill('');
  await expect(panel.getByText('Compute an HMAC to see hex and base64url output.', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Compute', exact: true }).click();
  await expect(panel.getByRole('alert')).toHaveText('Enter a secret to compute an HMAC.');
  await panel.getByLabel('Secret', { exact: true }).fill(secret);
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Compute', exact: true }).click();
  await expect(resultBody(panel, 'Hex')).toHaveText(expected.toString('hex'));
  await expect(resultBody(panel, 'Base64url')).toHaveText(expected.toString('base64url'));
});

test('HS256 signs an exact UTF-8 JWT, verifies it, and rejects a changed secret or signature', async ({ page }) => {
  // Exact compact JWT covers UTF-8 JSON bytes, unpadded header/payload/signature
  // encoding, and HMAC signing. Verification must fail closed after input edits.
  const secret = 'e2e-only-José-🚀-secret-with-no-real-access';
  const input = signingInput('HS256');
  const expected = `${input}.${createHmac('sha256', secret).update(input, 'utf8').digest('base64url')}`;
  await openSecurityTab(page, 'Sign & build');
  const signPanel = await fillSigningInputs(page, 'HS256', '');
  await signPanel.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(signPanel.getByRole('alert')).toHaveText('A secret is required for HS256.');
  await signPanel.getByLabel('Secret (HS256)', { exact: true }).fill(secret);
  await signPanel.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(resultBody(signPanel, 'Signed JWT')).toHaveText(expected);
  await expect(signPanel.getByText('32 bytes', { exact: true })).toBeVisible();
  const actual = (await resultBody(signPanel, 'Signed JWT').textContent())!;

  const jwtPanel = await verifyToken(page, actual, secret, 'HS256');
  await expect(resultBody(jwtPanel, 'Header')).toHaveText(JSON.stringify(jwtHeader('HS256'), null, 2));
  await expect(resultBody(jwtPanel, 'Payload')).toHaveText(JSON.stringify(PAYLOAD, null, 2));
  await jwtPanel.getByLabel('Secret (HS256)', { exact: true }).fill(`${secret}-wrong`);
  await expect(jwtPanel.getByText('Verified', { exact: true })).toHaveCount(0);
  await jwtPanel.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(jwtPanel.getByText('Invalid signature', { exact: true })).toBeVisible();
  await verifyToken(page, actual, secret, 'HS256');
  await jwtPanel.getByLabel('JWT token', { exact: true }).fill(alterSignature(actual));
  await expect(jwtPanel.getByText('Verified', { exact: true })).toHaveCount(0);
  await jwtPanel.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(jwtPanel.getByText('Invalid signature', { exact: true })).toBeVisible();
  await verifyToken(page, actual, secret, 'HS256');
});

test('RS256 imports PEM, signs the exact PKCS1 signature, and verifies or rejects it', async ({ page }) => {
  // Fresh, test-only keys live only in this test's memory/browser fields. No
  // fixture grants access. PKCS1-v1_5 is deterministic for this key and input.
  // This covers Base64 PEM decoding, ArrayBuffer conversion and signature bytes.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/g, '\r\n');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString().replace(/\n/g, '\r\n');
  const input = signingInput('RS256');
  const signature = signWithNode('RSA-SHA256', Buffer.from(input, 'utf8'), {
    key: privateKey,
    padding: constants.RSA_PKCS1_PADDING,
  });
  const expected = `${input}.${signature.toString('base64url')}`;
  await openSecurityTab(page, 'Sign & build');
  const signPanel = await fillSigningInputs(page, 'RS256', privatePem);
  await signPanel.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(resultBody(signPanel, 'Signed JWT')).toHaveText(expected);
  await expect(signPanel.getByText('256 bytes', { exact: true })).toBeVisible();
  const actual = (await resultBody(signPanel, 'Signed JWT').textContent())!;

  const jwtPanel = await verifyToken(page, actual, publicPem, 'RS256');
  await expect(jwtPanel.getByText('Checked with RSASSA-PKCS1-v1_5 / SHA-256', { exact: true })).toBeVisible();
  await jwtPanel.getByLabel('JWT token', { exact: true }).fill(alterSignature(actual));
  await expect(jwtPanel.getByText('Verified', { exact: true })).toHaveCount(0);
  await jwtPanel.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(jwtPanel.getByText('Invalid signature', { exact: true })).toBeVisible();
  await verifyToken(page, actual, publicPem, 'RS256');
});

test('ES256 verifies an independent raw signature and produces a Node-verifiable PEM signature', async ({ page }) => {
  // ECDSA signatures are randomized, so compare exact header/payload bytes and
  // verify the 64-byte IEEE-P1363 signature with Node instead of a shape check.
  // An independently signed input also checks browser Base64URL/PEM decoding.
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const input = signingInput('ES256');
  const signature = signWithNode('sha256', Buffer.from(input, 'utf8'), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  const independentToken = `${input}.${signature.toString('base64url')}`;
  await page.goto('/studio/security/');
  const jwtPanel = await verifyToken(page, independentToken, publicPem, 'ES256');
  await expect(jwtPanel.getByText('Checked with ECDSA P-256 / SHA-256', { exact: true })).toBeVisible();
  await jwtPanel.getByLabel('JWT token', { exact: true }).fill(alterSignature(independentToken));
  await jwtPanel.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(jwtPanel.getByText('Invalid signature', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Sign & build', exact: true }).click();
  const signPanel = await fillSigningInputs(page, 'ES256', privatePem);
  await signPanel.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(signPanel.getByText('Signed', { exact: true })).toBeVisible();
  await expect(signPanel.getByText('64 bytes', { exact: true })).toBeVisible();
  const actual = (await resultBody(signPanel, 'Signed JWT').textContent())!;
  const [header, payload, encodedSignature] = actual.split('.');
  expect(`${header}.${payload}`).toBe(input);
  const actualSignature = Buffer.from(encodedSignature, 'base64url');
  expect(encodedSignature).toBe(actualSignature.toString('base64url'));
  expect(actualSignature.byteLength).toBe(64);
  expect(verifyWithNode('sha256', Buffer.from(input, 'utf8'), {
    key: publicKey,
    dsaEncoding: 'ieee-p1363',
  }, actualSignature)).toBe(true);
  await verifyToken(page, actual, publicPem, 'ES256');
});
