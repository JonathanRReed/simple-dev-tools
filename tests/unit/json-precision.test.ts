import { expect, test } from 'bun:test';
import { parseJsonWithoutUnsafeIntegers, assertSafeJsonNumbers } from '../../src/lib/json-precision';
test('JSON transforms reject unsafe integers instead of silently rounding them', () => {
  for (const source of ['{"id":9007199254740993}', '[-9007199254740993]', '{"n":1e309}']) {
    expect(() => parseJsonWithoutUnsafeIntegers(source)).toThrow('safe integer range');
  }
  expect(parseJsonWithoutUnsafeIntegers('{"id":"9007199254740993","n":12.25,"ok":true}')).toEqual({ id: '9007199254740993', n: 12.25, ok: true });
  expect(() => assertSafeJsonNumbers({ nested: [Number.MAX_SAFE_INTEGER + 1] })).toThrow();
});
