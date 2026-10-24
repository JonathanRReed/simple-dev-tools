import { describe, expect, test } from 'bun:test';
import { toCsv } from '../../src/lib/csv';

describe('CSV cell serialization compatibility', () => {
  const notJsonValues = [
    ['function', () => undefined],
    ['symbol', Symbol('cell')],
    ['toJSON returning undefined', { toJSON: () => undefined }],
  ] as const;

  for (const [name, value] of notJsonValues) {
    test(`retains undefined text for a ${name} in the first of multiple columns`, () => {
      expect(toCsv([{ a: value, b: 'after' }])).toBe('a,b\nundefined,after');
    });

    test(`retains undefined text for a ${name} after the first column`, () => {
      expect(toCsv([{ a: 'before', b: value, c: 'after' }])).toBe('a,b,c\nbefore,undefined,after');
    });

    test(`retains the blank single-column result for a ${name}`, () => {
      expect(toCsv([{ a: value }, { a: 'next' }])).toBe('a\n\nnext');
    });
  }

  test('keeps missing, undefined, and null input values empty', () => {
    expect(toCsv([{ a: undefined, b: null, c: 'value' }, { b: undefined, c: null }])).toBe('a,b,c\n,,value\n,,');
    expect(toCsv([{ a: undefined }, { a: null }])).toBe('a\n\n');
  });

  test('uses the complete header union when serializing undefined JSON results', () => {
    expect(toCsv([{ a: Symbol('first') }, { b: 'later column' }])).toBe('a,b\nundefined,\n,later column');
  });

  test('retains String fallback and CSV escaping when JSON serialization throws', () => {
    const value = {
      toJSON() { throw new Error('not JSON'); },
      toString() { return 'fallback,"quoted"\nline'; },
    };
    expect(toCsv([{ a: 123n, b: value }])).toBe('a,b\n123,"fallback,""quoted""\nline"');
  });

  test('does not leave blank output rows when a cell getter removes later rows', () => {
    const rows = [
      { get a() { rows.length = 1; return 'first'; } },
      { a: 'second' },
    ];
    expect(toCsv(rows)).toBe('a\nfirst');
  });
});
