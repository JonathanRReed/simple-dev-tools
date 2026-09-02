import { describe, expect, test } from 'bun:test';

import { parseCsvGrid, coerceCsvValue, parseCsv, toCsv } from './csv';

describe('parseCsvGrid', () => {
  test('parses simple comma-separated rows', () => {
    expect(parseCsvGrid('a,b,c\nd,e,f')).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  test('handles quoted fields with embedded commas', () => {
    expect(parseCsvGrid('"a,b","c,d"')).toEqual([['a,b', 'c,d']]);
  });

  test('handles embedded newlines and escaped quotes', () => {
    const csv = '"line 1\nline 2","he said ""hello"""';
    expect(parseCsvGrid(csv)).toEqual([['line 1\nline 2', 'he said "hello"']]);
  });

  test('normalises \\r\\n, \\n, and lone \\r', () => {
    expect(parseCsvGrid('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsvGrid('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsvGrid('a,b\rc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  test('does not emit an empty row for a trailing newline', () => {
    expect(parseCsvGrid('a,b\n')).toEqual([['a', 'b']]);
    expect(parseCsvGrid('a,b\r\n')).toEqual([['a', 'b']]);
    expect(parseCsvGrid('a,b\r')).toEqual([['a', 'b']]);
  });

  test('returns an empty grid for empty input', () => {
    expect(parseCsvGrid('')).toEqual([]);
  });

  test('preserves whitespace in unquoted fields', () => {
    expect(parseCsvGrid(' a , b ')).toEqual([[' a ', ' b ']]);
  });

  test('treats a stray empty line as an empty single-cell row', () => {
    expect(parseCsvGrid('a,b\n\nc,d')).toEqual([
      ['a', 'b'],
      [''],
      ['c', 'd'],
    ]);
  });
});

describe('coerceCsvValue', () => {
  test('coerces integers, decimals, negatives, and exponents', () => {
    expect(coerceCsvValue('0')).toBe(0);
    expect(coerceCsvValue('42')).toBe(42);
    expect(coerceCsvValue('-3')).toBe(-3);
    expect(coerceCsvValue('1.5')).toBe(1.5);
    expect(coerceCsvValue('-2.5E-2')).toBe(-0.025);
    expect(coerceCsvValue('1e3')).toBe(1000);
  });

  test('leads leading-zero ids as strings', () => {
    expect(coerceCsvValue('007')).toBe('007');
    expect(coerceCsvValue('0123')).toBe('0123');
  });

  test('keeps malformed numbers like 1.2.3 as strings', () => {
    expect(coerceCsvValue('1.2.3')).toBe('1.2.3');
  });

  test('coerces true, false, and null case-insensitively', () => {
    expect(coerceCsvValue('true')).toBe(true);
    expect(coerceCsvValue('True')).toBe(true);
    expect(coerceCsvValue('FALSE')).toBe(false);
    expect(coerceCsvValue('null')).toBe(null);
    expect(coerceCsvValue('Null')).toBe(null);
  });

  test('keeps an empty string as an empty string', () => {
    expect(coerceCsvValue('')).toBe('');
  });

  test('rejects non-finite numeric strings and loose values', () => {
    expect(coerceCsvValue('+')).toBe('+');
    expect(coerceCsvValue('NaN')).toBe('NaN');
    expect(coerceCsvValue('Infinity')).toBe('Infinity');
    expect(coerceCsvValue('0x10')).toBe('0x10');
    expect(coerceCsvValue('.5')).toBe('.5');
    expect(coerceCsvValue('1.')).toBe('1.');
    expect(coerceCsvValue('1e')).toBe('1e');
  });
});

describe('parseCsv', () => {
  test('maps rows to the header keys', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  test('fills in missing cells with empty strings', () => {
    expect(parseCsv('a,b,c\n1,2')).toEqual([{ a: 1, b: 2, c: '' }]);
  });

  test('skips fully blank rows', () => {
    expect(parseCsv('a,b\n1,2\n\n3,4')).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  test('uses column_N fallback for empty headers', () => {
    expect(parseCsv(',b,\n1,2,3\n4,5,6')).toEqual([
      { column_1: 1, b: 2, column_3: 3 },
      { column_1: 4, b: 5, column_3: 6 },
    ]);
  });

  test('coerces values while respecting headers', () => {
    expect(parseCsv('name,active\nAlice,true\nBob,false\n,\n')).toEqual([
      { name: 'Alice', active: true },
      { name: 'Bob', active: false },
      { name: '', active: '' },
    ]);
  });
});

describe('toCsv', () => {
  test('builds a header union in first-seen key order', () => {
    const rows = [
      { a: 1, b: 2 },
      { b: 3, c: 4 },
      { a: 5, c: 6, d: 7 },
    ];
    expect(toCsv(rows)).toBe('a,b,c,d\n1,2,,\n,3,4,\n5,,6,7');
  });

  test('escapes commas, quotes, and newlines', () => {
    const rows = [
      { a: 'has, comma', b: 'has "quote"', c: 'line\nbreak' },
    ];
    expect(toCsv(rows)).toBe(
      'a,b,c\n"has, comma","has ""quote""","line\nbreak"',
    );
  });

  test('escapes carriage returns', () => {
    expect(toCsv([{ a: 'a\rb' }])).toBe('a\n"a\rb"');
  });

  test('JSON-stringifies nested objects and escapes the resulting quotes', () => {
    const rows = [{ a: { nested: 1 } }];
    expect(toCsv(rows)).toBe('a\n"{""nested"":1}"');
  });

  test('throws when the top-level value is not an array', () => {
    expect(() => toCsv({})).toThrow(
      'CSV output needs an array of objects at the top level.',
    );
    expect(() => toCsv('hello')).toThrow(
      'CSV output needs an array of objects at the top level.',
    );
    expect(() => toCsv(null)).toThrow(
      'CSV output needs an array of objects at the top level.',
    );
  });

  test('throws when any item is not an object', () => {
    expect(() => toCsv([1])).toThrow(
      'CSV output needs every item to be an object (not a primitive or array).',
    );
    expect(() => toCsv([['nested', 'array']])).toThrow(
      'CSV output needs every item to be an object (not a primitive or array).',
    );
    expect(() => toCsv([{ a: 1 }, null])).toThrow(
      'CSV output needs every item to be an object (not a primitive or array).',
    );
  });

  test('returns an empty string for an empty array', () => {
    expect(toCsv([])).toBe('');
  });
});
