import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../public/regex-worker.js', import.meta.url), 'utf8');
function evaluate(pattern: string, flags: string, text: string, replacement = '$&', json = JSON) {
  let result: any;
  const self = { onmessage: undefined, postMessage: (value: unknown) => { result = value; } };
  runInNewContext(`${script}\nself.onmessage({ data });`, { self, JSON: json, data: { pattern, flags, text, replacement } }, { timeout: 1000 });
  return result;
}
test('returns named groups, replacement and splitting in one worker result', () => {
  const result = evaluate('(?<word>fox)', 'gi', 'fox FOX', '$<word>!');
  expect(result.list).toHaveLength(2);
  expect(result.captureGroups).toBe(1);
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

test('bounds expanded replacement output before sending it to the page', () => {
  const result = evaluate('a', 'g', 'a'.repeat(1000), 'x'.repeat(2000));
  expect(result.replaced.error).toContain('1,000,000');
  expect(result.replaced.value).toBe('');
});
test('bounded replacement preserves native substitution semantics', () => {
  for (const [pattern, flags, input, replacement] of [
    ['(a)(b)', 'g', 'ab ab', '$$-$&-$`-$\'-${x}-$1-$2-$12-$99'],
    ['(?<letter>a)(b)?', 'g', 'a ab', '$<letter>:$<missing>:$2'],
    ['(?:)', 'gu', '😀', '_'],
  ]) expect(evaluate(pattern, flags, input, replacement).replaced.value).toBe(input.replace(new RegExp(pattern, flags), replacement));
});
test('bounds serialized named-group keys and capture values, not just matched text', () => {
  const result = evaluate(`(?<${'x'.repeat(9000)}>a)`, 'g', 'a'.repeat(5000));
  expect(JSON.stringify(result).length).toBeLessThan(1100000);
  expect(result.truncated).toBe(true);
});
test('dollar substitution inside a literal named-group placeholder stays native', () => {
  const replacement = '$<label:$&>';
  expect(evaluate('a', 'g', 'a', replacement).replaced.value).toBe('a'.replace(/a/g, replacement));
});
test('oversized individual capture records are flagged rather than reported as no matches', () => {
  const result = evaluate('((((((((((((a+))))))))))))', 'g', 'a'.repeat(100000));
  expect(result.list).toHaveLength(0);
  expect(result.truncated).toBe(true);
  expect(result.replaced.value.length).toBe(100000);
});

test('rejects amplified captures before allocating their serialized JSON', () => {
  let attemptedOversize = false;
  const guardedJson = { ...JSON, stringify(value: any) {
    if (value?.groups?.reduce((size: number, group: string | undefined) => size + (group?.length ?? 0), 0) > 1000000) {
      attemptedOversize = true;
      throw new Error('Oversized serialization intercepted');
    }
    return JSON.stringify(value);
  } } as JSON;
  const result = evaluate('(?=(a+))'.repeat(13) + 'a+', '', 'a'.repeat(100000), '$&', guardedJson);
  expect(attemptedOversize).toBe(false);
  expect(result.list).toHaveLength(0);
  expect(result.truncated).toBe(true);
  expect(result.error).toBeNull();
});
