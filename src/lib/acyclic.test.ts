import { expect, test } from 'bun:test';
import YAML from 'yaml';
import { assertAcyclic } from './acyclic';

test('rejects a YAML self-reference before measuring or transforming it', () => {
  expect(() => assertAcyclic(YAML.parse('a: &a\n  self: *a'))).toThrow('Circular YAML aliases');
});
test('accepts shared aliases that are not cycles', () => {
  expect(() => assertAcyclic(YAML.parse('a: &a {name: Ada}\nb: *a'))).not.toThrow();
});
test('inspects deeply nested JSON without recursive call-stack limits', () => {
  let value: unknown = null;
  for (let i = 0; i < 20000; i++) value = [value];
  expect(() => assertAcyclic(value)).not.toThrow();
});
