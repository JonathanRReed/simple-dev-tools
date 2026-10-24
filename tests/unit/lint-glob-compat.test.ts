import { afterAll, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs') as {
  getRootDirs(context: { cwd: string; settings: { next: { rootDir?: unknown } } }): string[];
};
const root = mkdtempSync(join(tmpdir(), 'next-root-compat-'));
for (const directory of ['apps/a/pages', 'apps/b/app/about', 'packages/ui', 'with spaces/app', '.hidden/app']) {
  mkdirSync(join(root, directory), { recursive: true });
}
writeFileSync(join(root, 'apps/a/pages/contact.tsx'), 'export default function Page() {}');
writeFileSync(join(root, 'apps/b/app/page.tsx'), 'export default function Page() {}');
writeFileSync(join(root, 'apps/b/app/about/page.tsx'), 'export default function Page() {}');
writeFileSync(join(root, 'plain.txt'), 'not a directory');
symlinkSync(join(root, 'apps/a'), join(root, 'linked'), 'dir');
symlinkSync(join(root, 'missing'), join(root, 'broken'), 'dir');
afterAll(() => rmSync(root, { recursive: true, force: true }));

// Golden directory selections captured from the original fast-glob adapter.
// Compare canonical paths, not harmless './' prefixes or trailing separators.
const cases = [
  { label: 'default', setting: undefined, expected: [''] },
  { label: 'literal', setting: root, expected: [''] },
  { label: 'wildcard', setting: root + '/apps/*', expected: ['apps/a', 'apps/b'] },
  { label: 'brace pattern', setting: root + '/{apps,packages}/*', expected: ['apps/a', 'apps/b', 'packages/ui'] },
  { label: 'array', setting: [root + '/apps/*', root + '/with spaces', null, 7], expected: ['apps/a', 'apps/b', 'with spaces'] },
  { label: 'missing', setting: root + '/missing', expected: [] },
  { label: 'file', setting: root + '/plain.txt', expected: [] },
  { label: 'symlink', setting: root + '/*', expected: ['apps', 'linked', 'packages', 'with spaces'] },
  { label: 'globstar', setting: root + '/**', expected: ['apps', 'apps/a', 'apps/a/pages', 'apps/b', 'apps/b/app', 'apps/b/app/about', 'linked', 'linked/pages', 'packages', 'packages/ui', 'with spaces', 'with spaces/app'] },
  { label: 'explicit dot directory', setting: root + '/.hidden', expected: ['.hidden'] },
  { label: 'backslash normalization', setting: root.replaceAll('/', '\\') + '/apps/*', expected: ['apps/a', 'apps/b'] },
  { label: 'relative pattern', setting: relative(process.cwd(), root) + '/apps/*', expected: ['apps/a', 'apps/b'] },
  { label: 'relative literal', setting: './' + relative(process.cwd(), root), expected: [''] },
];
test.each(cases)('Next root selection: $label', ({ setting, expected }) => {
  const actual = getRootDirs({ cwd: root, settings: { next: { rootDir: setting } } });
  expect(actual.map(value => relative(root, resolve(value))).sort()).toEqual([...expected].sort());
});

test('the alias is the official replacement, with only the reviewed consumer', () => {
  expect(require('fast-glob/package.json')).toMatchObject({ name: 'tinyglobby', version: '0.2.17' });
  const lock = Bun.JSONC.parse(readFileSync('bun.lock', 'utf8')) as {
    packages: Record<string, [string, string, { dependencies?: Record<string, string> }]>;
  };
  expect(Object.values(lock.packages).some(entry => /^(braces|micromatch|fast-glob)@/.test(entry[0]))).toBe(false);
  expect(Object.entries(lock.packages).filter(([, entry]) => entry[2]?.dependencies?.['fast-glob']).map(([key]) => key))
    .toEqual(['@next/eslint-plugin-next']);
});

test('the ESM glob entry also includes directory symlinks', async () => {
  const { globSync } = await import('fast-glob');
  expect(globSync(root + '/*', { onlyDirectories: true, expandDirectories: false, absolute: true })
    .map(value => relative(root, resolve(value))).sort()).toEqual(['apps', 'linked', 'packages', 'with spaces']);
});

test('Next route lint diagnostics remain enabled for Pages and App Router', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      files: ['**/*.jsx'],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { '@next/next': require('@next/eslint-plugin-next') },
      settings: { next: { rootDir: root + '/apps/*' } },
      rules: { '@next/next/no-html-link-for-pages': 'error' },
    }],
  });
  for (const route of ['/contact/', '/']) {
    const [result] = await eslint.lintText(`export default () => <a href="${route}">Go</a>`, { filePath: 'fixture.jsx' });
    expect(result.messages.map(message => message.ruleId)).toContain('@next/next/no-html-link-for-pages');
  }
  for (const source of ['export default () => <a href="https://example.com/about/">Go</a>',
    'import Link from "next/link"; export default () => <Link href="/about/">Go</Link>']) {
    const [result] = await eslint.lintText(source, { filePath: 'fixture.jsx' });
    expect(result.errorCount).toBe(0);
  }
});
