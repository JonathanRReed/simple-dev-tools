/* global self */
const MAX_OUTPUT = 1000000;
const MAX_CAPTURE_FIELDS = 10000;
function quotedSize(value, limit) {
  let size = 2;
  for (let i = 0; i < value.length && size <= limit; i++) {
    const code = value.charCodeAt(i);
    if (code === 34 || code === 92 || [8, 9, 10, 12, 13].includes(code)) size += 2;
    else if (code < 32) size += 6;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { size += 2; i++; }
      else size += 6;
    } else size += code >= 0xdc00 && code <= 0xdfff ? 6 : 1;
  }
  return size;
}
function captureRecordSize(match, keys, limit) {
  let size = '{"match":,"index":,"length":,"groups":[],"named":{}}'.length;
  size += String(match.index ?? 0).length + String(match[0].length).length;
  size += quotedSize(match[0], limit - size);
  for (let i = 1; i < match.length && size <= limit; i++) {
    if (i > 1) size++;
    size += match[i] === undefined ? 4 : quotedSize(match[i], limit - size);
  }
  for (let i = 0; i < keys.length && size <= limit; i++) {
    if (i) size++;
    size += quotedSize(keys[i], limit - size) + 1;
    const value = match.groups[keys[i]];
    size += value === undefined ? 4 : quotedSize(value, limit - size);
  }
  return size;
}
function boundedReplace(text, regex, replacement) {
  const chunks = [];
  let size = 0;
  const append = value => {
    if (size + value.length > MAX_OUTPUT) throw new Error('Replacement output exceeds 1,000,000 characters. Use smaller input or a shorter replacement.');
    size += value.length;
    chunks.push(value);
  };
  let cursor = 0;
  const matches = regex.global ? text.matchAll(regex) : [regex.exec(text)].filter(Boolean);
  for (const match of matches) {
    const index = match.index ?? 0;
    append(text.slice(cursor, index));
    let position = 0;
    const substitutions = match.groups === undefined ? /\$(\$|&|`|'|[0-9]{1,2})/g : /\$(\$|&|`|'|[0-9]{1,2}|<[^>]*>)/g;
    for (const token of replacement.matchAll(substitutions)) {
      append(replacement.slice(position, token.index));
      const key = token[1];
      let value = token[0];
      if (key === '$') value = '$';
      else if (key === '&') value = match[0];
      else if (key === '`') value = text.slice(0, index);
      else if (key === "'") value = text.slice(index + match[0].length);
      else if (key.startsWith('<') && match.groups !== undefined) value = match.groups[key.slice(1, -1)] ?? '';
      else if (/^[0-9]+$/.test(key)) {
        const number = Number(key);
        if (number > 0 && number < match.length) value = match[number] ?? '';
        else if (key.length === 2 && Number(key[0]) > 0 && Number(key[0]) < match.length) value = (match[Number(key[0])] ?? '') + key[1];
      }
      append(value);
      position = token.index + token[0].length;
    }
    append(replacement.slice(position));
    cursor = index + match[0].length;
  }
  append(text.slice(cursor));
  return chunks.join('');
}

self.onmessage = ({ data }) => {
  const { pattern, flags, text, replacement } = data;
  try {
    if (text.length > 100000 || pattern.length > 10000 || replacement.length > 100000) {
      throw new Error('Use at most 100,000 characters of text or replacement and 10,000 characters in the pattern.');
    }
    const regex = new RegExp(pattern, flags);
    const list = [];
    let truncated = false;
    let matchOutputSize = 2;
    let captureFields = 0;
    const iterable = regex.global ? text.matchAll(regex) : [regex.exec(text)].filter(Boolean);
    for (const match of iterable) {
      if (list.length >= 5000) { truncated = true; break; }
      const keys = Object.keys(match.groups ?? {});
      const fields = match.length - 1 + keys.length;
      if (captureFields + fields > MAX_CAPTURE_FIELDS) { truncated = true; break; }
      // Count the normalized representation without allocating amplified JSON.
      const separator = list.length ? 1 : 0;
      const remaining = MAX_OUTPUT - matchOutputSize - separator;
      const size = captureRecordSize(match, keys, remaining);
      if (size > remaining) { truncated = true; break; }
      const entry = { match: match[0], index: match.index ?? 0, length: match[0].length,
        groups: Array.from(match).slice(1).map(value => value ?? null),
        named: Object.fromEntries(keys.map(key => [key, match.groups[key] ?? null])) };
      matchOutputSize += size + separator;
      captureFields += fields;
      list.push(entry);
    }
    let replaced;
    try { replaced = { value: boundedReplace(text, new RegExp(pattern, flags), replacement), error: null }; }
    catch (error) { replaced = { value: '', error: error.message }; }
    const splitParts = text.slice(0, 50000).split(new RegExp(pattern, flags), 5001);
    const splitTooLarge = splitParts.reduce((size, part) => size + (part?.length ?? 0) + 16, 0) > MAX_OUTPUT;
    self.postMessage({
      list, truncated, error: null,
      captureGroups: (new RegExp(`${pattern}|`, flags.replace(/[gy]/g, "")).exec("")?.length ?? 1) - 1,
      replaced,
      split: { parts: splitTooLarge ? [] : splitParts.slice(0, 5000), error: splitTooLarge ? 'Split output exceeds the processing limit.' : null, truncated: text.length > 50000 || splitParts.length > 5000 },
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Pattern evaluation failed.' });
  }
};
