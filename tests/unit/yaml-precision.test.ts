import { expect, test } from 'bun:test';
import YAML from 'yaml';
import { assertAcyclic } from '../../src/lib/acyclic';
import { parseYamlWithoutUnsafeIntegers } from '../../src/lib/yaml-precision';

const PRECISION_ERROR = 'safe integer range';

test('rejects unsafe integers used as mapping keys', () => {
  for (const source of ['9007199254740993: v', '-9007199254740993: v', 'outer:\n  9007199254740993: v', '0x20000000000001: v', '? [9007199254740993]\n: v']) {
    expect(() => parseYamlWithoutUnsafeIntegers(source)).toThrow(PRECISION_ERROR);
  }
});

test('rejects unsafe integers inside YAML 1.1 !!set and !!omap collections', () => {
  for (const source of [
    '%YAML 1.1\n---\n!!set {9007199254740993: null}',
    '%YAML 1.1\n---\n!!omap [a: 9007199254740993]',
    '%YAML 1.1\n---\n!!omap [9007199254740993: a]',
    '%YAML 1.1\n---\nouter:\n  - !!set {? 9007199254740993}',
    '%YAML 1.1\n---\n!!omap [a: {b: [1, 9007199254740993]}]',
  ]) {
    expect(() => parseYamlWithoutUnsafeIntegers(source)).toThrow(PRECISION_ERROR);
  }
});

test('rejects unsafe integers and non-finite numbers in nested values', () => {
  for (const source of ['a: [1, {b: [2, 9007199254740993]}]', 'a: 1e400', 'a: .inf', 'a: -.inf', 'a: .nan', 'a: 1.0e20']) {
    expect(() => parseYamlWithoutUnsafeIntegers(source)).toThrow(PRECISION_ERROR);
  }
});

test('rejects an unsafe integer reached only through an alias', () => {
  expect(() => parseYamlWithoutUnsafeIntegers('base: &id 9007199254740993\nref: *id')).toThrow(PRECISION_ERROR);
  expect(() => parseYamlWithoutUnsafeIntegers('base: &b {n: 9007199254740993}\nchild:\n  <<: *b')).toThrow(PRECISION_ERROR);
});

test('keeps quoted and string-tagged large numbers as exact strings', () => {
  expect(parseYamlWithoutUnsafeIntegers('"9007199254740993": "9007199254740993"\nid: !!str 9007199254740993\n\'-9007199254740993\': x'))
    .toEqual({ '9007199254740993': '9007199254740993', id: '9007199254740993', '-9007199254740993': 'x' });
});

test('keeps safe boundary integers exact as keys and values', () => {
  const value = parseYamlWithoutUnsafeIntegers('9007199254740991: max\n-9007199254740991: min\nvalues: [9007199254740991, -9007199254740991]');
  expect(value).toEqual({ '9007199254740991': 'max', '-9007199254740991': 'min', values: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER] });
  const set = parseYamlWithoutUnsafeIntegers('%YAML 1.1\n---\n!!set {9007199254740991: null}');
  expect(set).toEqual(new Set([Number.MAX_SAFE_INTEGER]));
});

test('matches YAML.parse for ordinary documents', () => {
  for (const source of [
    'name: Ada\nage: 36\nratio: 12.25\nsmall: 0.1\ntiny: 1e-7\npi: 3.14159\nneg: -2.5',
    '- name: Ada\n  tags: [a, b]\n- name: Grace\n  tags: []',
    'a: &a {name: Ada}\nb: *a\nc:\n  <<: *a\n  extra: true',
    'empty:\nnull: ~\nbool: [true, false]\nhex: 0x1F\noct: 0o17\ndate: 2001-12-14',
    '%YAML 1.1\n---\nset: !!set {a: null, 1: null}\nomap: !!omap [x: 1, y: 2]\nyes: yes',
    '? [1, 2]\n: complex key',
    '"": empty key\n? |\n  block\n: value',
    '',
    '# only a comment',
  ]) {
    expect(parseYamlWithoutUnsafeIntegers(source)).toEqual(YAML.parse(source));
  }
});

test('reports unsupported syntax with the same parser message as YAML.parse', () => {
  for (const source of ['a: [1, , 3]', 'a: b: c', 'a: 1\n---\nb: 2', 'key: [unclosed']) {
    let expected = '';
    try { YAML.parse(source); } catch (e) { expected = (e as Error).message; }
    expect(expected).not.toBe('');
    expect(() => parseYamlWithoutUnsafeIntegers(source)).toThrow(expected);
  }
});

test('leaves circular aliases to the existing cycle check', () => {
  const value = parseYamlWithoutUnsafeIntegers('a: &a\n  self: *a');
  expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
  expect(() => assertAcyclic(parseYamlWithoutUnsafeIntegers('a: &a {name: Ada}\nb: *a'))).not.toThrow();
});
