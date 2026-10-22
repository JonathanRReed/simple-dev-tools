import { expect, test } from 'bun:test';
import { parseJsonWithoutUnsafeIntegers, assertSafeJsonNumbers } from '../../src/lib/json-precision';
test('JSON transforms reject unsafe integers instead of silently rounding them', () => {
  for (const source of ['{"id":9007199254740993}', '[-9007199254740993]', '{"n":1e309}']) {
    expect(() => parseJsonWithoutUnsafeIntegers(source)).toThrow('safe integer range');
  }
  expect(parseJsonWithoutUnsafeIntegers('{"id":"9007199254740993","n":12.25,"ok":true}')).toEqual({ id: '9007199254740993', n: 12.25, ok: true });
  expect(() => assertSafeJsonNumbers({ nested: [Number.MAX_SAFE_INTEGER + 1] })).toThrow();
});

test('checks own enumerable values in nested JSON, sparse arrays, and null-prototype objects', () => {
  const unsafe = Number.MAX_SAFE_INTEGER + 2;
  expect(() => parseJsonWithoutUnsafeIntegers('{"a":[1,2,{"b":[3.5,{"c":-9007199254740991}]}],"d":{"e":null,"f":"9007199254740993"}}')).not.toThrow();
  expect(() => parseJsonWithoutUnsafeIntegers('{"a":[1,{"b":[2,[3,9007199254740993]]}]}')).toThrow('safe integer range');
  const sparse: unknown[] = [1];
  sparse[2] = unsafe;
  expect(() => assertSafeJsonNumbers(sparse)).toThrow('safe integer range');
  expect(() => assertSafeJsonNumbers(Object.assign(Object.create(null), { n: unsafe }))).toThrow('safe integer range');
});

test('ignores inherited object properties, which JSON and YAML output omit', () => {
  const value = Object.create({ inherited: Number.MAX_SAFE_INTEGER + 2 });
  value.ok = 1;
  expect(() => assertSafeJsonNumbers(value)).not.toThrow();
});

test('array checks follow JSON serialization of indexes, not expando metadata', () => {
  const unsafe = Number.MAX_SAFE_INTEGER + 2;
  const hidden = [1];
  Object.defineProperty(hidden, '0', { value: unsafe, enumerable: false });
  expect(() => assertSafeJsonNumbers(hidden)).toThrow('safe integer range');
  const inherited: unknown[] = [];
  inherited.length = 1;
  Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), { 0: unsafe }));
  expect(() => assertSafeJsonNumbers(inherited)).toThrow('safe integer range');
  const metadata = Object.assign([1], { ignoredByJson: unsafe });
  expect(JSON.stringify(metadata)).toBe('[1]');
  expect(() => assertSafeJsonNumbers(metadata)).not.toThrow();
});
