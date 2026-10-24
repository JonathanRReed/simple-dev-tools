import { expect, test } from 'bun:test';
import { assertAcyclic } from '../../src/lib/acyclic';

test('rejects a cycle through an extra own enumerable array property', () => {
  const value: unknown[] & { extra?: unknown } = [];
  value.extra = value;
  expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
});

test('ignores inherited array indices when visiting sparse arrays', () => {
  const value: unknown[] = [];
  value.length = 1;
  const prototype = Object.create(Array.prototype);
  prototype[0] = value;
  Object.setPrototypeOf(value, prototype);
  expect(() => assertAcyclic(value)).not.toThrow();
});

test('ignores non-enumerable own array indices', () => {
  const value: unknown[] = [];
  Object.defineProperty(value, '0', { value, enumerable: false });
  expect(() => assertAcyclic(value)).not.toThrow();
});

test('rejects cycles through ordinary array elements', () => {
  const value: unknown[] = [];
  value.push(value);
  expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
});

test('visits own enumerable properties of null-prototype objects', () => {
  const value = Object.create(null);
  value.self = value;
  expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
});

test('ignores inherited, non-enumerable, and symbol object properties', () => {
  const prototype: Record<string, unknown> = {};
  const value = Object.create(prototype);
  prototype.self = value;
  Object.defineProperty(value, 'hidden', { value, enumerable: false });
  value[Symbol('self')] = value;
  value.safe = { name: 'Ada' };
  expect(() => assertAcyclic(value)).not.toThrow();
});

test('accepts shared array and object aliases without re-reading their children', () => {
  let reads = 0;
  const shared = { get name() { reads++; return 'Ada'; } };
  const array = [shared, shared];
  const value = { first: array, second: array, third: shared };
  expect(() => assertAcyclic(value)).not.toThrow();
  expect(reads).toBe(1);
});

test('rejects a back edge through mixed arrays and objects', () => {
  const value: { children: unknown[] } = { children: [] };
  value.children.push({ parent: value });
  expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
});

test('ignores an own property made non-enumerable by an earlier getter', () => {
  const value = {
    get first() {
      Object.defineProperty(this, 'second', { enumerable: false });
      return null;
    },
    second: null as unknown,
  };
  value.second = value;
  expect(() => assertAcyclic(value)).not.toThrow();
});
