import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../public/regex-worker.js', import.meta.url), 'utf8');
function evaluate(pattern: string, flags: string, text: string, replacement = '$&') {
  let result: any;
  const self = { onmessage: undefined, postMessage: (value: unknown) => { result = value; } };
  runInNewContext(`${script}\nself.onmessage({ data });`, { self, data: { pattern, flags, text, replacement } }, { timeout: 1000 });
  return result;
}
test('returns named groups, replacement and splitting in one worker result', () => {
  const result = evaluate('(?<word>fox)', 'gi', 'fox FOX', '$<word>!');
  expect(result.list).toHaveLength(2);
  expect(result.list[1].named.word).toBe('FOX');
  expect(result.replaced.value).toBe('fox! FOX!');
  expect(result.split.parts).toEqual(['', 'fox', ' ', 'FOX', '']);
});
test('sticky-only evaluation respects the non-global flag', () => {
  expect(evaluate('a', 'y', 'aaa').list).toHaveLength(1);
});
test('unicode zero-length matches advance safely', () => {
  expect(evaluate('(?:)', 'gu', '😀').list.map((match: any) => match.index)).toEqual([0, 2]);
});
test('distinguishes empty output from an invalid pattern', () => {
  expect(evaluate('.*', 'g', 'abc', '').replaced.value).toBe('');
  expect(evaluate('[', 'g', 'abc').error).toBeTruthy();
});
test('bounds large input and match lists', () => {
  expect(evaluate('.', 'g', 'a'.repeat(100001)).error).toContain('100,000');
  const result = evaluate('a', 'g', 'a'.repeat(6000));
  expect(result.list).toHaveLength(5000);
  expect(result.truncated).toBe(true);
});
