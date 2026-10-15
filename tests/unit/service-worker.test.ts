import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
function worker(options: { fetch: () => Promise<Response>; cached?: Response; failWrite?: boolean }) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const timers: Array<() => void> = [];
  const context = {
    self: { location: { origin: 'https://example.com' }, addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; } },
    fetch: options.fetch,
    caches: {
      match: async (key: string | Request) => typeof key === 'string' && key === '/offline/' ? new Response('offline') : options.cached?.clone(),
      open: async () => ({ put: async () => { if (options.failWrite) throw new Error('quota'); } }),
    },
    Request, Response, URL,
    setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; },
    clearTimeout: () => {},
  };
  runInNewContext(script, context);
  return { navigate: (request = new Request('https://example.com/tools/json/')) => runInNewContext('handleNavigation(request)', { ...context, request, handleNavigation: runInNewContext('handleNavigation', context) }) as Promise<Response>, timers };
}

describe('offline navigation', () => {
  test('returns a real HTTP 404 instead of disguising it as offline', async () => {
    const sw = worker({ fetch: async () => new Response('missing', { status: 404 }) });
    const response = await sw.navigate();
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('missing');
  });
  test('cache quota failure does not discard a successful page', async () => {
    const sw = worker({ fetch: async () => new Response('fresh'), failWrite: true });
    expect(await (await sw.navigate()).text()).toBe('fresh');
  });
  test('waits for a slow first visit rather than displaying a false offline page', async () => {
    let finish!: (response: Response) => void;
    const sw = worker({ fetch: () => new Promise(resolve => { finish = resolve; }) });
    const pending = sw.navigate();
    await Promise.resolve();
    for (const callback of sw.timers) callback();
    await Promise.resolve();
    finish(new Response('slow but online'));
    expect(await (await pending).text()).toBe('slow but online');
  });
  test('a true network failure uses the cached page', async () => {
    const sw = worker({ fetch: async () => { throw new Error('offline'); }, cached: new Response('saved page') });
    expect(await (await sw.navigate()).text()).toBe('saved page');
  });
  test('a true network failure without a saved page uses offline fallback', async () => {
    const sw = worker({ fetch: async () => { throw new Error('offline'); } });
    expect(await (await sw.navigate()).text()).toBe('offline');
  });
});

test('unhashed scripts and route payloads use the current deployment rather than stale-while-revalidate', async () => {
  const context = {
    self: { addEventListener: () => {} },
    fetch: async () => new Response('new version'),
    caches: { match: async () => new Response('old version'), open: async () => ({ put: async () => {} }) },
    Request, Response, URL,
  };
  const response = await runInNewContext(`${script}\nhandleFreshAsset(new Request('https://example.com/regex-worker.js'));`, context);
  expect(await response.text()).toBe('new version');
});
