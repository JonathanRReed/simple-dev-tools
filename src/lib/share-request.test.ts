import { expect, test } from 'bun:test';
import { shareRequest } from './share-request';

test('share links omit common credentials while preserving the request example', () => {
  const result = shareRequest({
    url: 'https://user:password@example.com/users?api_key=hidden&access_token=hidden&password=hidden&page=2', method: 'POST', body: '{"name":"Ada"}',
    headers: [{ key: 'Authorization', value: 'Bearer hidden' }, { key: 'Cookie', value: 'hidden' }, { key: 'Accept', value: 'application/json' }],
    params: [{ key: 'access_token', value: 'hidden' }, { key: 'sort', value: 'name' }],
  });
  expect(result?.url).toBe('https://example.com/users?page=2');
  expect(JSON.stringify(result)).not.toContain('hidden');
  expect(result?.body).toBe('{"name":"Ada"}');
  expect(result?.headers).toBe('[{"key":"Accept","value":"application/json"}]');
  expect(result?.params).toBe('[{"key":"sort","value":"name"}]');
});
test('invalid endpoints do not produce share links', () => {
  expect(shareRequest({ url: 'javascript:alert(1)', method: 'GET', body: '', headers: [], params: [] })).toBeNull();
});
