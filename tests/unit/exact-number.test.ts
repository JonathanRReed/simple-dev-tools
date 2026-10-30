import { expect, test } from 'bun:test';
import Ajv from 'ajv';
import {
  ExactNumber, exactValidationStatus, holdsExactly, findInexactJsonNumbers, formatJsonExact, formatYamlExact, isRepresentable,
  parseJsonExact, parseYamlExact, toAjvInput, yamlToJsonExact,
} from '../../src/lib/exact-number';

const ajvValid = (schema: unknown, data: unknown) => new Ajv({ strict: false }).compile(toAjvInput(schema).value as object)(toAjvInput(data).value);

test('classifies literals by shortest round trip', () => {
  for (const ok of ['0', '-0', '1.0', '1e2', '0.1', '9007199254740991', '-9007199254740991', '1.5e-7', '1E+21']) expect(isRepresentable(ok)).toBe(true);
  for (const bad of ['9007199254740993', '9223372036854775807', '-9223372036854775809', '1e400', '-1e400', '0.1000000000000000055', '9007199254740993.5']) expect(isRepresentable(bad)).toBe(false);
});

test('2^63 holds exactly but prints differently, so it is wrapped for text and trusted for comparison', () => {
  expect(isRepresentable('9223372036854775808')).toBe(false);
  expect(holdsExactly('9223372036854775808')).toBe(true);
  expect(holdsExactly('9223372036854775807')).toBe(false);
  const schema = parseJsonExact('{"maximum":9223372036854775808}');
  expect(exactValidationStatus(schema, parseJsonExact('9223372036854775808')).exact).toBe(true);
  expect(ajvValid(schema, parseJsonExact('9223372036854775808'))).toBe(true);
});

test('Format Source/Schema JSON keeps every literal', () => {
  const src = '{"maximum":9223372036854775807,"minimum":-9223372036854775808,"enum":[1e400,0.1000000000000000055,-0,1.0],"const":9007199254740993}';
  const out = formatJsonExact(src);
  for (const lit of ['9223372036854775807', '-9223372036854775808', '1e400', '0.1000000000000000055', '-0', '1.0', '9007199254740993']) expect(out).toContain(lit);
  expect(out).toContain('\n  "maximum"');
});

test('Format Source YAML keeps literals, comments, anchors and aliases', () => {
  const src = '# bounds\nmaximum: &m 9223372036854775807 # int64\nminimum: 0x7FFFFFFFFFFFFFFF\nexclusiveMaximum: *m\nratio: 0.1000000000000000055\nz: -0\nbig: 1e400\nok: 12.5\n';
  expect(formatYamlExact(src)).toBe(src);
});

test('Use source as JSON Schema converts YAML with exact JSON literals', () => {
  const json = yamlToJsonExact('type: integer\nmaximum: &m 9223372036854775807\nexclusiveMaximum: *m\nminimum: 0x7FFFFFFFFFFFFFFF\nmultipleOf: 0.1000000000000000055\nz: -0\nbig: 1e400\nplus: +5\nhalf: .5\nproperties:\n  9007199254740993: {type: string}\nquoted: "9007199254740993"');
  expect(JSON.parse(json, ((_k: string, v: unknown, c?: { source?: string }) => (typeof v === 'number' ? c?.source : v)) as (key: string, value: unknown) => unknown)).toEqual({
    type: 'integer', maximum: '9223372036854775807', exclusiveMaximum: '9223372036854775807', minimum: '9223372036854775807',
    multipleOf: '0.1000000000000000055', z: '-0', big: '1e400', plus: '5', half: '0.5',
    properties: { '9007199254740993': { type: 'string' } }, quoted: '9007199254740993',
  });
});

test('Use source as JSON Schema blocks numbers JSON cannot express instead of writing null', () => {
  expect(() => yamlToJsonExact('maximum: .inf')).toThrow('JSON has no representation for .inf');
  expect(() => yamlToJsonExact('x: .nan')).toThrow('.nan');
});

test('semantic parse keeps safe numbers as Numbers and wraps the rest', () => {
  const v = parseJsonExact('{"a":5,"b":0.1,"c":-0,"d":9223372036854775807,"e":1e400,"f":[9007199254740993]}') as Record<string, unknown>;
  expect(v.a).toBe(5); expect(v.b).toBe(0.1); expect(Object.is(v.c, -0)).toBe(true);
  expect(v.d).toEqual(new ExactNumber('9223372036854775807')); expect(v.e).toEqual(new ExactNumber('1e400'));
  expect(JSON.stringify(v)).toBe('{"a":5,"b":0.1,"c":0,"d":9223372036854775807,"e":1e400,"f":[9007199254740993]}');
  const y = parseYamlExact('a: 5\nb: 0x7FFFFFFFFFFFFFFF\nc: &x 9007199254740993\nd: *x\ne: 2.5\n9007199254740993: key') as Record<string, unknown>;
  expect(y.a).toBe(5); expect(y.e).toBe(2.5);
  expect(y.b).toEqual(new ExactNumber('9223372036854775807'));
  expect(y.d).toEqual(new ExactNumber('9007199254740993'));
  expect(Object.keys(y)).toContain('9007199254740993');
});

test('validation is reported exact only when rounding cannot change the outcome', () => {
  const cases: [string, string, boolean | 'undecidable'][] = [
    ['{"type":"integer","maximum":9223372036854775807}', '5', true],
    ['{"type":"integer","maximum":9223372036854775807}', '9223372036854775808', 'undecidable'],
    ['{"minimum":-9223372036854775808}', '-9223372036854775809', 'undecidable'],
    ['{"const":9007199254740993}', '9007199254740992', 'undecidable'],
    ['{"enum":[9007199254740993]}', '1', false],
    ['{"exclusiveMaximum":9007199254740993}', '9007199254740992', 'undecidable'],
    ['{"type":"integer"}', '9007199254740993.5', 'undecidable'],
    ['{"type":"number","maximum":0.1}', '0.1000000000000000055', 'undecidable'],
    ['{"maximum":1e400}', '1e401', 'undecidable'],
    ['{"maximum":1e400}', '1e300', true],
    ['{"const":0}', '-0', true],
    ['{"multipleOf":0.1000000000000000055}', '1', 'undecidable'],
  ];
  for (const [schemaText, dataText, expected] of cases) {
    const schema = parseJsonExact(schemaText), data = parseJsonExact(dataText);
    const status = exactValidationStatus(schema, data);
    if (expected === 'undecidable') expect({ schemaText, dataText, exact: status.exact }).toEqual({ schemaText, dataText, exact: false });
    else { expect({ schemaText, dataText, exact: status.exact }).toEqual({ schemaText, dataText, exact: true }); expect(ajvValid(schema, data)).toBe(expected); }
  }
});

test('fallback detector finds inexact literals outside strings', () => {
  expect(findInexactJsonNumbers('{"s":"9007199254740993 \\" 1e400","a":9007199254740993,"b":[1,0.1000000000000000055,-0,1e400]}')).toEqual(['9007199254740993', '0.1000000000000000055', '1e400']);
});
