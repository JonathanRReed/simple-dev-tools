import { expect, test } from 'bun:test';
import { assertAcyclic } from '../../src/lib/acyclic';
import { assertSafeJsonNumbers } from '../../src/lib/json-precision';

for (const [name, validate] of [
  ['cycle check', assertAcyclic],
  ['number check', assertSafeJsonNumbers],
] as const) {
  test(`${name} reads only the stored index in a sparse array`, () => {
    let indexReads = 0;
    let childReads = 0;
    const sparse: unknown[] = [];
    sparse[100_000] = { get value() { childReads++; return 1; } };
    const value = new Proxy(sparse, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) indexReads++;
        return Reflect.get(target, key, receiver);
      },
    });
    validate(value);
    expect(indexReads).toBe(1);
    expect(childReads).toBe(1);
  });

  test(`${name} visits named enumerable array properties`, () => {
    let reads = 0;
    const value = Object.assign([1], {
      metadata: { get value() { reads++; return 2; } },
    });
    validate(value);
    expect(reads).toBe(1);
  });

  test(`${name} ignores inherited indexed and named array values`, () => {
    const prototype = Object.create(Array.prototype);
    for (const key of ['0', 'inherited']) {
      Object.defineProperty(prototype, key, {
        enumerable: true,
        get() { throw new Error('Inherited values must not be read'); },
      });
    }
    const value: unknown[] = [];
    value.length = 1;
    Object.setPrototypeOf(value, prototype);
    expect(() => validate(value)).not.toThrow();
  });

  test(`${name} ignores non-enumerable indices and symbol properties`, () => {
    const value: unknown[] = [];
    for (const key of ['0', Symbol('hidden')]) {
      Object.defineProperty(value, key, {
        enumerable: typeof key === 'symbol',
        get() { throw new Error('Excluded values must not be read'); },
      });
    }
    expect(() => validate(value)).not.toThrow();
  });

  test(`${name} preserves own enumerable values on ordinary and null-prototype objects`, () => {
    let reads = 0;
    const prototype = Object.create(null);
    Object.defineProperty(prototype, 'inherited', {
      enumerable: true,
      get() { throw new Error('Inherited values must not be read'); },
    });
    for (const parent of [prototype, null]) {
      const value = Object.assign(Object.create(parent), {
        child: { get value() { reads++; return 1; } },
      });
      Object.defineProperty(value, 'hidden', {
        get() { throw new Error('Non-enumerable values must not be read'); },
      });
      validate(value);
    }
    expect(reads).toBe(2);
  });
}

test('cycle check rejects sparse-index and named-property array cycles', () => {
  const sparse: unknown[] = [];
  sparse[100_000] = sparse;
  const named = Object.assign([], { metadata: {} });
  named.metadata = { parent: named };
  for (const value of [sparse, named]) {
    expect(() => assertAcyclic(value)).toThrow('Circular YAML aliases');
  }
});

test('cycle check ignores an inherited indexed cycle', () => {
  const value: unknown[] = [];
  value.length = 1;
  Object.setPrototypeOf(value, Object.assign(Object.create(Array.prototype), { 0: value }));
  expect(() => assertAcyclic(value)).not.toThrow();
});

test('number check rejects unsafe numbers in sparse indices and named array properties', () => {
  const sparse: unknown[] = [];
  sparse[100_000] = Number.MAX_SAFE_INTEGER + 1;
  const named = Object.assign([], { metadata: { number: Number.POSITIVE_INFINITY } });
  for (const value of [sparse, named]) {
    expect(() => assertSafeJsonNumbers(value)).toThrow('safe integer range');
  }
});

test('number check ignores inherited indexed unsafe numbers and handles shared cyclic values', () => {
  const value: unknown[] = [];
  value.length = 1;
  Object.setPrototypeOf(value, Object.assign(Object.create(Array.prototype), { 0: Number.MAX_SAFE_INTEGER + 1 }));
  expect(() => assertSafeJsonNumbers(value)).not.toThrow();
  const shared = { number: 1, self: {} };
  shared.self = shared;
  expect(() => assertSafeJsonNumbers([shared, shared])).not.toThrow();
});
