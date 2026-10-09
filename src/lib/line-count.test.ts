import { describe, expect, test } from 'bun:test';
import { countLines } from './line-count';

describe('countLines', () => {
  test.each([
    ['', 0], ['hello', 1], ['a\0b\r\nc', 2], ['\n', 2], ['\r', 2], ['\r\n', 2],
    ['a\nb', 2], ['a\rb', 2], ['a\r\nb', 2],
    ['a\n', 2], ['a\r', 2], ['a\r\n', 2],
    ['\n\n', 3], ['\r\r', 3], ['\r\n\r\n', 3],
    ['\n\r', 3], ['\r\r\n', 3], ['a\r\nb\nc\rd', 4],
    ['😀\r\n日本語\n', 3], ['a\u2028b\u2029c\u0085d', 1],
  ] as const)('counts %j as %i lines', (input, expected) => {
    expect(countLines(input)).toBe(expected);
  });

  test('matches the previous split semantics for every short mixed input', () => {
    const alphabet = ['a', '\r', '\n', '😀'];
    const visit = (input: string, remaining: number) => {
      const expected = input === '' ? 0 : input.split(/\r\n|\r|\n/).length;
      expect(countLines(input)).toBe(expected);
      if (remaining > 0) for (const next of alphabet) visit(input + next, remaining - 1);
    };
    visit('', 7);
  });

  test('handles large sparse and dense newline inputs', () => {
    expect(countLines('x'.repeat(500_000))).toBe(1);
    expect(countLines(('x'.repeat(999) + '\n').repeat(500))).toBe(501);
    expect(countLines('abcdef\r\n'.repeat(60_000))).toBe(60_001);
    expect(countLines('\r\n'.repeat(250_000))).toBe(250_001);
  });
});
