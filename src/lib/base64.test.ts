import { describe, expect, test } from 'bun:test';

import {
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  bytesToBase64,
  base64ToBytes,
  bytesToBase64url,
  base64urlToBytes,
  toHex,
  bytesToArrayBuffer,
} from './base64';

describe('toBase64 / fromBase64', () => {
  test('round-trips ASCII text', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    expect(fromBase64(toBase64(text))).toBe(text);
  });

  test('round-trips unicode emoji', () => {
    const text = 'hello 🎉🚀🎨';
    expect(fromBase64(toBase64(text))).toBe(text);
  });

  test('round-trips CJK characters', () => {
    const text = '你好世界 日本語 한국어';
    expect(fromBase64(toBase64(text))).toBe(text);
  });
});

describe('fromBase64', () => {
  test('throws on invalid UTF-8 bytes', () => {
    const invalid = bytesToBase64(new Uint8Array([0xff, 0xfe, 0x00]));
    expect(() => fromBase64(invalid)).toThrow();
    const overlong = bytesToBase64(new Uint8Array([0xc0, 0x80]));
    expect(() => fromBase64(overlong)).toThrow();
  });
});

describe('toBase64Url / fromBase64Url', () => {
  test('strips padding and maps +/ to -_', () => {
    expect(toBase64Url('+/8=')).toBe('-_8');
    expect(toBase64Url('+/8A')).toBe('-_8A');
    expect(toBase64Url('aGVsbG8=')).toBe('aGVsbG8');
  });

  test('restores padding and maps -_ back to +/', () => {
    expect(fromBase64Url('-_8')).toBe('+/8=');
    expect(fromBase64Url('-_8A')).toBe('+/8A');
    expect(fromBase64Url('aGVsbG8')).toBe('aGVsbG8=');
  });

  test('round-trips binary through standard and url-safe base64', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0x00, 0x7f]);
    const b64 = bytesToBase64(bytes);
    const url = toBase64Url(b64);
    expect(fromBase64Url(url)).toBe(b64);
    expect(base64ToBytes(fromBase64Url(url))).toEqual(bytes);
  });
});

describe('bytesToBase64url / base64urlToBytes', () => {
  test('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([
      0x00, 0x01, 0xfb, 0xff, 0x80, 0x7f, 0x0d, 0x0a,
    ]);
    const url = bytesToBase64url(bytes);
    const decoded = base64urlToBytes(url);
    expect(decoded).toEqual(bytes);
  });

  test('round-trips UTF-8 encoded text', () => {
    const text = 'hello 中文 🎉';
    const bytes = new TextEncoder().encode(text);
    const decoded = base64urlToBytes(bytesToBase64url(bytes));
    expect(new TextDecoder().decode(decoded)).toBe(text);
  });
});

describe('toHex', () => {
  test('returns an empty string for empty input', () => {
    expect(toHex(new Uint8Array([]))).toBe('');
  });

  test('hex-encodes known byte vectors with lower-case and leading zeros', () => {
    expect(toHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
    expect(toHex(new Uint8Array([0x01, 0x10, 0xff]))).toBe('0110ff');
    expect(toHex(new Uint8Array([0x00, 0x0a]))).toBe('000a');
  });
});

describe('bytesToArrayBuffer', () => {
  test('produces an ArrayBuffer of the correct length', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const ab = bytesToArrayBuffer(bytes);
    expect(ab).toBeInstanceOf(ArrayBuffer);
    expect(ab.byteLength).toBe(5);
    expect(new Uint8Array(ab)).toEqual(bytes);
  });

  test('respects the byteOffset of a subarray view', () => {
    const full = new Uint8Array([0, 1, 2, 3, 4]);
    const sub = full.subarray(1, 4);
    const ab = bytesToArrayBuffer(sub);
    expect(ab).toBeInstanceOf(ArrayBuffer);
    expect(ab.byteLength).toBe(3);
    expect(new Uint8Array(ab)).toEqual(new Uint8Array([1, 2, 3]));
    expect(ab).not.toBe(full.buffer);
  });
});
