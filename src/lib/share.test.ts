import { describe, expect, test } from 'bun:test';

import { encodeShareState, decodeShareState } from './share';

describe('encodeShareState / decodeShareState', () => {
  test('round-trips small params with version-0 raw prefix', async () => {
    const params = { foo: 'bar', baz: 'qux' };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('0:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('preserves URLSearchParams semantics', async () => {
    const params = { q: 'hello world', special: 'a&b=c' };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('0:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('compresses large params with version-1 prefix and round-trips', async () => {
    const params = { data: 'x'.repeat(500) };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('1:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('round-trips unicode values', async () => {
    const params = { text: 'hello 中文 🎉' };
    const encoded = await encodeShareState(params);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('round-trips empty-string values', async () => {
    const params = { empty: '', other: 'value' };
    const encoded = await encodeShareState(params);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('returns null for garbage input', async () => {
    expect(await decodeShareState('garbage')).toBeNull();
    expect(await decodeShareState('')).toBeNull();
    expect(await decodeShareState('0:')).toBeNull();
  });

  test('returns null for wrong version prefixes', async () => {
    expect(await decodeShareState('2:abc')).toBeNull();
    expect(await decodeShareState('9:abc')).toBeNull();
  });

  test('returns null for truncated or invalid compressed data', async () => {
    expect(await decodeShareState('1:')).toBeNull();
    expect(await decodeShareState('1:ab')).toBeNull();
    expect(await decodeShareState('1:!!')).toBeNull();
    expect(await decodeShareState('1:bm90LWdvb2Q')).toBeNull();
  });
});
