import { describe, expect, test } from 'bun:test';

import { parsePath, resolvePath, NO_VALUE } from './json-path';

describe('parsePath', () => {
  test('parses dot-separated bare keys', () => {
    expect(parsePath('a.b.c')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'key', value: 'b' },
      { kind: 'key', value: 'c' },
    ]);
    expect(parsePath('.a')).toEqual([{ kind: 'key', value: 'a' }]);
    expect(parsePath('a.')).toEqual([{ kind: 'key', value: 'a' }]);
  });

  test('parses numeric bracket indices', () => {
    expect(parsePath('a[0]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'index', value: 0 },
    ]);
    expect(parsePath('[1][2]')).toEqual([
      { kind: 'index', value: 1 },
      { kind: 'index', value: 2 },
    ]);
  });

  test('parses negative bracket indices', () => {
    expect(parsePath('[-1]')).toEqual([{ kind: 'index', value: -1 }]);
    expect(parsePath('a[-2]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'index', value: -2 },
    ]);
  });

  test('parses quoted keys with escape sequences', () => {
    expect(parsePath('["weird key"]')).toEqual([
      { kind: 'key', value: 'weird key' },
    ]);
    expect(parsePath('a["b\\"c"]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'key', value: 'b"c' },
    ]);
  });

  test('parses unquoted bracket keys', () => {
    expect(parsePath('a[foo]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'key', value: 'foo' },
    ]);
    expect(parsePath('[foo bar]')).toEqual([{ kind: 'key', value: 'foo bar' }]);
  });

  test('tolerates whitespace inside brackets', () => {
    expect(parsePath('a[ 0 ]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'index', value: 0 },
    ]);
    expect(parsePath('a[ "foo" ]')).toEqual([
      { kind: 'key', value: 'a' },
      { kind: 'key', value: 'foo' },
    ]);
  });

  test('throws on unterminated quotes', () => {
    expect(() => parsePath('["abc')).toThrow('Unterminated quote in path.');
  });

  test('throws on missing closing brackets', () => {
    expect(() => parsePath('a[')).toThrow("Expected ']' to close bracket.");
    expect(() => parsePath('a[unclosed')).toThrow(
      "Expected ']' to close bracket.",
    );
  });
});

describe('resolvePath', () => {
  test('resolves nested object access', () => {
    expect(resolvePath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
  });

  test('resolves positive array indices', () => {
    expect(resolvePath({ arr: [10, 20, 30] }, 'arr[1]')).toBe(20);
  });

  test('resolves negative array indices', () => {
    expect(resolvePath({ arr: [10, 20, 30] }, 'arr[-1]')).toBe(30);
    expect(resolvePath([1, 2, 3], '[-2]')).toBe(2);
  });

  test('returns NO_VALUE for missing keys', () => {
    const result = resolvePath({ a: 1 }, 'b');
    expect(result).toBe(NO_VALUE);
    expect(result).not.toBe(undefined);
    expect(result).not.toBe(null);
  });

  test('returns NO_VALUE for out-of-bounds indices', () => {
    expect(resolvePath({ arr: [1, 2] }, 'arr[2]')).toBe(NO_VALUE);
    expect(resolvePath({ arr: [1, 2] }, 'arr[-3]')).toBe(NO_VALUE);
  });

  test('returns NO_VALUE when null appears in the chain', () => {
    expect(resolvePath({ a: null }, 'a.b')).toBe(NO_VALUE);
  });

  test('returns NO_VALUE for undefined or non-object roots', () => {
    expect(resolvePath(undefined, 'a')).toBe(NO_VALUE);
    expect(resolvePath(null, 'a')).toBe(NO_VALUE);
    expect(resolvePath(42, 'a')).toBe(NO_VALUE);
  });

  test('returns NO_VALUE when a primitive is followed by a key', () => {
    expect(resolvePath({ a: 1 }, 'a.b')).toBe(NO_VALUE);
  });

  test('indexes arrays by numeric string keys', () => {
    expect(resolvePath({ arr: [10, 20] }, 'arr["0"]')).toBe(10);
    expect(resolvePath({ arr: [10, 20] }, 'arr["1"]')).toBe(20);
  });

  test('resolves quoted keys with spaces', () => {
    expect(resolvePath({ 'weird key': 42 }, '["weird key"]')).toBe(42);
    expect(
      resolvePath({ a: { 'weird key': 99 } }, 'a["weird key"]'),
    ).toBe(99);
  });

  test('preserves symbol identity of NO_VALUE', () => {
    const missing = resolvePath({}, 'missing.path[0]');
    expect(missing === NO_VALUE).toBe(true);
    expect(missing !== NO_VALUE).toBe(false);
  });
});
