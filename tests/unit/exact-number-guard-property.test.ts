import { expect, test } from 'bun:test';
import Ajv from 'ajv';
import { exactValidationStatus, parseJsonExact, toAjvInput } from '../../src/lib/exact-number';

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const r = rng(157);
const SCALE = 4n;
const toScaled = (lit: string) => { const [i, f = ''] = lit.replace('-', '').split('.'); const v = BigInt(i + f.padEnd(Number(SCALE), '0').slice(0, Number(SCALE))); return lit.startsWith('-') ? -v : v; };
function literal(): string {
  const bases = [2n ** 53n, 2n ** 63n, 10n ** 18n, 2n ** 70n, 12345n];
  let v = bases[Math.floor(r() * bases.length)] + BigInt(Math.floor(r() * 9) - 4);
  if (r() < 0.3) v = -v;
  const frac = r() < 0.3 ? `.${Math.floor(r() * 9999).toString().padStart(4, '0')}` : '';
  return `${v}${frac}`;
}
test('whenever the guard says exact, Ajv agrees with exact decimal arithmetic', () => {
  const keywords = ['maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum', 'const', 'enum'] as const;
  let exact = 0, undecidable = 0, wrongWhenExact = 0, ajvWrongOverall = 0;
  for (let i = 0; i < 20000; i++) {
    const kw = keywords[Math.floor(r() * keywords.length)];
    const b = literal(), d = literal();
    const B = toScaled(b), D = toScaled(d);
    const truth = { maximum: D <= B, minimum: D >= B, exclusiveMaximum: D < B, exclusiveMinimum: D > B, const: D === B, enum: D === B }[kw];
    const schemaText = kw === 'enum' ? `{"enum":[${b}]}` : `{"${kw}":${b}}`;
    const schema = parseJsonExact(schemaText), data = parseJsonExact(d);
    const ajv = new Ajv({ strict: false }).compile(toAjvInput(schema).value as object)(toAjvInput(data).value);
    if (ajv !== truth) ajvWrongOverall++;
    if (exactValidationStatus(schema, data).exact) { exact++; if (ajv !== truth) wrongWhenExact++; } else undecidable++;
  }
  console.log(JSON.stringify({ cases: 20000, exact, undecidable, wrongWhenExact, ajvWrongOverall }));
  expect(wrongWhenExact).toBe(0);
}, 600_000);
