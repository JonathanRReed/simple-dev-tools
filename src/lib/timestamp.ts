export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds';
export type Detection = 'seconds' | 'milliseconds' | 'string';
export type ParseResult = { ok: true; date: Date; detected: Detection } | { ok: false };
export function parseMoment(raw: string, unit: TimestampUnit = 'auto'): ParseResult {
  const value = raw.trim();
  if (!value) return { ok: false };
  if (/^[+-]?\d+(?:\.\d+)?$/.test(value)) {
    const number = Number(value);
    if (!Number.isFinite(number)) return { ok: false };
    const digits = value.replace(/^[+-]/, '').split('.')[0].length;
    const detected = unit === 'auto' ? (digits === 13 || Math.abs(number) > 1e11 ? 'milliseconds' : 'seconds') : unit;
    const date = new Date(detected === 'seconds' ? number * 1000 : number);
    return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, date, detected };
  }
  if (unit !== 'auto') return { ok: false };
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, date, detected: 'string' };
}
