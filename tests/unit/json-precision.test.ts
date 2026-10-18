import { expect, test } from 'bun:test';
import { parseJsonWithoutUnsafeIntegers, assertSafeJsonNumbers } from '../../src/lib/json-precision';
test('JSON transforms reject unsafe integers instead of silently rounding them', () => {
  for (const source of ['{"id":9007199254740993}', '[-9007199254740993]', '{"n":1e309}']) {
    expect(() => parseJsonWithoutUnsafeIntegers(source)).toThrow('safe integer range');
  }
  expect(parseJsonWithoutUnsafeIntegers('{"id":"9007199254740993","n":12.25,"ok":true}')).toEqual({ id: '9007199254740993', n: 12.25, ok: true });
  expect(() => assertSafeJsonNumbers({ nested: [Number.MAX_SAFE_INTEGER + 1] })).toThrow();
});

test('assertSafeJsonNumbers processes nested arrays, objects, and ignores non-own properties', () => {
  const proto = { inheritedUnsafe: Number.MAX_SAFE_INTEGER + 1 };
  const obj = Object.create(proto);
  obj.safe = 42;
  obj.nestedArray = [10, 20, { deep: [100, 200] }];

  expect(() => assertSafeJsonNumbers(obj)).not.toThrow();

  const unsafeInArray = { items: [1, 2, [Number.MAX_SAFE_INTEGER + 1]] };
  expect(() => assertSafeJsonNumbers(unsafeInArray)).toThrow('safe integer range');
});
