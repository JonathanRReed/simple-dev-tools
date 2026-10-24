import { expect, test } from 'bun:test';
import { parseMoment } from './timestamp';
function iso(raw: string, unit: 'auto' | 'seconds' | 'milliseconds' = 'auto') {
  const result = parseMoment(raw, unit);
  return result.ok ? result.date.toISOString() : null;
}
test('seconds, milliseconds and decimal epochs preserve the same instant', () => {
  expect(iso('1700000000')).toBe('2023-11-14T22:13:20.000Z');
  expect(iso('1700000000000')).toBe(iso('1700000000'));
  expect(iso('1700000000.5')).toBe('2023-11-14T22:13:20.500Z');
});
test('explicit units resolve early-epoch ambiguity and negative fractions', () => {
  expect(iso('1000', 'milliseconds')).toBe('1970-01-01T00:00:01.000Z');
  expect(iso('1000', 'seconds')).toBe('1970-01-01T00:16:40.000Z');
  expect(iso('-0.5', 'seconds')).toBe('1969-12-31T23:59:59.500Z');
});
test('invalid and out-of-range inputs do not become numeric output', () => {
  expect(iso('')).toBeNull();
  expect(iso('9'.repeat(400))).toBeNull();
  expect(iso('2026-10-15T12:00:00Z', 'seconds')).toBeNull();
  expect(iso('2026-10-15T12:00:00Z')).toBe('2026-10-15T12:00:00.000Z');
});

test('numeric digit bounds preserve signs, fractions, leading zeroes, and thresholds', () => {
  const cases = [
    ['+1700000000.5', 'seconds', 1700000000500],
    ['-1700000000.5', 'seconds', -1700000000500],
    ['  +0000000000001.5  ', 'milliseconds', 1],
    ['-0000000000001.5', 'milliseconds', -1],
    ['000000000001', 'seconds', 1000],
    ['0000000000001', 'milliseconds', 1],
    ['00000000000001', 'seconds', 1000],
    ['100000000000', 'seconds', 100000000000000],
    ['100000000001', 'milliseconds', 100000000001],
    ['-100000000000', 'seconds', -100000000000000],
    ['-100000000001', 'milliseconds', -100000000001],
  ] as const;
  for (const [raw, detected, time] of cases) {
    const result = parseMoment(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detected).toBe(detected);
      expect(result.date.getTime()).toBe(time);
    }
  }
});

test('numeric parsing matches the prior digit-count semantics across explicit units', () => {
  const values = ['0', '0.5', '000000000001', '0000000000001', '00000000000001',
    '100000000000', '100000000001', '999999999999', '1000000000000', '1700000000000.5'];
  for (const value of values) for (const sign of ['', '+', '-']) {
    const raw = sign + value;
    const number = Number(raw);
    const digits = raw.replace(/^[+-]/, '').split('.')[0].length;
    for (const unit of ['auto', 'seconds', 'milliseconds'] as const) {
      const detected = unit === 'auto' ? (digits === 13 || Math.abs(number) > 1e11 ? 'milliseconds' : 'seconds') : unit;
      const result = parseMoment(` ${raw} `, unit);
      expect(result).toEqual({ ok: true, detected, date: new Date(detected === 'seconds' ? number * 1000 : number) });
    }
  }
});

test('non-numeric input keeps string fallback only in auto mode', () => {
  for (const raw of ['+', '-', '--1', '+-1', '1.2.3', '1e3', 'Infinity', 'NaN', '.5', '1.', '2026-10-15T12:00:00Z']) {
    expect(parseMoment(raw, 'seconds')).toEqual({ ok: false });
    expect(parseMoment(raw, 'milliseconds')).toEqual({ ok: false });
    const date = new Date(raw);
    expect(parseMoment(raw)).toEqual(Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, date, detected: 'string' });
  }
});
