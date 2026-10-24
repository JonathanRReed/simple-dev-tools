import { expect, test } from 'bun:test';
import Ajv from 'ajv';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import uri from 'ajv/dist/runtime/uri';

// Exercise the resolver Ajv actually loads, using bounded inert identifiers only.
// https://github.com/fastify/fast-uri/releases/tag/v3.1.9
// No requests are made and no executable schemes or stress inputs are used.
test('Ajv resolver rejects encoded schemes instead of canonicalizing them', () => {
  expect(uri.parse('%68ttps://schemas.example/root.json').error).toBeTruthy();
});
test('Ajv resolver rejects ambiguous hosts rather than silently rewriting them', () => {
  for (const input of ['https://a@b@schemas.example/root.json', 'https://sche\tmas.example/root.json']) {
    expect(uri.parse(input).error).toBeTruthy();
  }
});
test('normalizing relative schema references preserves their resolution', () => {
  const base = 'https://schemas.example/directory/root.json';
  for (const ref of ['../shared.json', 'a/../child.json', './child.json']) {
    expect(uri.resolve(base, uri.serialize(uri.parse(ref)))).toBe(uri.resolve(base, ref));
  }
});
test('suffix serialization does not turn a path into a scheme', () => {
  const output = uri.serialize({ scheme: 'custom', path: 'schema:item' }, { reference: 'suffix' });
  expect(uri.parse(output).scheme).toBeUndefined();
  expect(output).toBe('schema%3Aitem');
});

for (const [dialect, Constructor] of [['draft07', Ajv], ['2019', Ajv2019], ['2020', Ajv2020]] as const) {
  test(`${dialect}: local relative IDs, pointer refs, formats, and recompilation work`, () => {
    // Same fresh-instance options and format registration as SchemaStudioClient.
    function compile(type: 'string' | 'number') {
      const instance = new Constructor({ allErrors: true, strict: false });
      addFormats(instance);
      return instance.compile({
        $id: 'https://schemas.example/directory/root.json',
        definitions: { item: { $id: './child.json', type } },
        type: 'object',
        properties: {
          child: { $ref: './child.json' },
          local: { $ref: '#/definitions/item' },
          email: { type: 'string', format: 'email' },
        },
        required: ['child', 'local', 'email'],
      });
    }
    const validate = compile('string');
    expect(validate({ child: 'ok', local: 'ok', email: 'reader@example.com' })).toBe(true);
    expect(validate({ child: 2, local: 2, email: 'invalid' })).toBe(false);
    expect(validate.errors?.map(error => error.keyword).sort()).toEqual(['format', 'type', 'type']);
    expect(compile('number')({ child: 2, local: 2, email: 'reader@example.com' })).toBe(true);
  });
  test(`${dialect}: unresolved remote references fail without fetching`, () => {
    const instance = new Constructor({ allErrors: true, strict: false });
    expect(() => instance.compile({ $ref: 'https://schemas.example/missing.json' })).toThrow();
  });
}
