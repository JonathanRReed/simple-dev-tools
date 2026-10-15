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
