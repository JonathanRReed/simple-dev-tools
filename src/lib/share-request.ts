const isCredential = (key: string) => /^(authorization|proxy-authorization|cookie|set-cookie|password|passwd|secret|token|access[_-]?token|api[_-]?key|x-api-key|x-auth-token)$/i.test(key.trim());
export function shareRequest(input: {
  url: string; method: string; body: string;
  headers: Array<{ key: string; value: string }>;
  params: Array<{ key: string; value: string }>;
}): Record<string, string> | null {
  let url: URL;
  try { url = new URL(input.url.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  url.username = '';
  url.password = '';
  const credentialKeys = [...url.searchParams.keys()].filter(isCredential);
  for (const key of credentialKeys) url.searchParams.delete(key);
  const out: Record<string, string> = { url: url.toString(), method: input.method };
  if (input.body.trim()) out.body = input.body;
  const headers = input.headers.filter(row => row.key.trim() && !isCredential(row.key)).map(({ key, value }) => ({ key, value }));
  const params = input.params.filter(row => row.key.trim() && !isCredential(row.key)).map(({ key, value }) => ({ key, value }));
  if (headers.length) out.headers = JSON.stringify(headers);
  if (params.length) out.params = JSON.stringify(params);
  return out;
}
