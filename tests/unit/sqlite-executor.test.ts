import { expect, test } from 'bun:test';
import { SqliteExecutor } from '../../src/lib/sqlite-executor';
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  messages: unknown[] = [];
  postMessage(message: unknown) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
}
function fixture(timeout = 100) {
  const worker = new FakeWorker();
  const executor = new SqliteExecutor(() => worker as unknown as Worker, timeout, 100);
  return { worker, executor };
}
test('SQLite executor handles normal replies and ignores stale ids', async () => {
  const { worker, executor } = fixture();
  worker.emit({ type: 'ready' });
  const result = executor.run('SELECT 42');
  await Promise.resolve();
  worker.emit({ type: 'result', id: 99, result: null });
  const reply = { results: [{ columns: ['answer'], values: [[42]] }], changed: 0, sawWrite: false, truncated: false };
  worker.emit({ type: 'result', id: 1, result: reply });
  expect(await result).toEqual(reply);
  executor.stop();
});
test('SQLite executor terminates timed-out work and rejects later runs', async () => {
  const { worker, executor } = fixture(5);
  worker.emit({ type: 'ready' });
  await expect(executor.run('expensive query')).rejects.toThrow('database was discarded');
  expect(worker.terminated).toBe(true);
  await expect(executor.run('SELECT 1')).rejects.toThrow('reset');
});
test('SQLite reset rejects pending work and late results cannot resolve it', async () => {
  const { worker, executor } = fixture();
  worker.emit({ type: 'ready' });
  const result = executor.run('SELECT 1');
  await Promise.resolve();
  executor.stop();
  worker.emit({ type: 'result', id: 1, result: {} });
  await expect(result).rejects.toThrow('reset');
  expect(worker.terminated).toBe(true);
});
test('SQLite load errors reject readiness and terminate the worker', async () => {
  const { worker, executor } = fixture();
  worker.emit({ type: 'init-error', error: 'missing WASM' });
  await expect(executor.ready).rejects.toThrow('missing WASM');
  expect(worker.terminated).toBe(true);
});
