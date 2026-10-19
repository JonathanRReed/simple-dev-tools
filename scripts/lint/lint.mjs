import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const eslint = new ESLint();
const results = await eslint.lintFiles(['.']);
const formatter = await eslint.loadFormatter('stylish');
const output = formatter.format(results);
if (output) process.stdout.write(output);

// Keep ESLint's selected files, including public JS and all eight extensions.
// The original Oxlint pass keeps its own rules and ignores unchanged.
const next = spawnSync(fileURLToPath(new URL('../../node_modules/.bin/oxlint', import.meta.url)), [
  '--threads=1', '--no-ignore', '--disable-nested-config',
  '--config', fileURLToPath(new URL('../../.oxlintrc.next.json', import.meta.url)),
  ...results.map(result => result.filePath),
], { stdio: 'inherit' });
if (next.error) throw next.error;
process.exitCode = results.some(result => result.errorCount > 0) || next.status !== 0 ? 1 : 0;
