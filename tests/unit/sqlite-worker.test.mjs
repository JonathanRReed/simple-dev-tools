import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../public/sqlite-worker.js', import.meta.url), 'utf8');
async function harness() {
  const messages = [];
  let ready;
  const loaded = new Promise(resolve => { ready = resolve; });
  const context = { Uint8Array, Error, importScripts() {}, initSqlJs: () => initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') }), postMessage(message) { messages.push(message); if (message.type === 'ready' || message.type === 'init-error') ready(message); } };
  context.self = context;
  vm.runInNewContext(source, context);
  expect((await loaded).type).toBe('ready');
  return sql => { context.onmessage({ data: { id: messages.length, sql } }); return messages.at(-1); };
}
test('SQLite worker preserves empty selects, writes, RETURNING, and later reads', async () => {
  const run = await harness();
  const reply = run('CREATE TABLE t(x); INSERT INTO t VALUES (1),(2); SELECT * FROM t WHERE 0;');
  expect(reply.type).toBe('result');
  expect(reply.result.changed).toBe(2);
  expect(reply.result.results[0].columns).toEqual(['x']);
  expect(reply.result.results[0].values).toEqual([]);
  expect(run('INSERT INTO t VALUES(3) RETURNING x;').result.changed).toBe(1);
  expect(run('SELECT count(*) FROM t;').result.results[0].values).toEqual([[3]]);
  expect(run('PRAGMA hard_heap_limit;').result.results[0].values).toEqual([[67108864]]);
  expect(run('SELECT * FROM missing').type).toBe('error');
  expect(run('SELECT 42').result.results[0].values).toEqual([[42]]);
});
test('SQLite worker caps result size and stops remaining batch statements', async () => {
  const run = await harness();
  const reply = run('WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<12000) SELECT x FROM n; CREATE TABLE should_not_exist(x);');
  expect(reply.result.truncated).toBe(true);
  expect(reply.result.results[0].values.length).toBe(10000);
  expect(run('SELECT * FROM should_not_exist').type).toBe('error');
});
