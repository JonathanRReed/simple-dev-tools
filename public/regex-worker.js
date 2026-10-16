/* global self */
const MAX_OUTPUT = 1000000;
function captureSizeExceeds(match, limit) {
  let size = 0;
  for (const capture of match) {
    size += capture?.length ?? 0;
    if (size > limit) return true;
  }
  for (const [key, value] of Object.entries(match.groups ?? {})) {
    size += key.length + (value?.length ?? 0);
    if (size > limit) return true;
  }
  return false;
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
    let matchOutputSize = 0;
    const iterable = regex.global ? text.matchAll(regex) : [regex.exec(text)].filter(Boolean);
    for (const match of iterable) {
      if (list.length >= 5000) { truncated = true; break; }
      // Bound raw captures before JSON escaping can allocate an amplified payload.
      if (captureSizeExceeds(match, MAX_OUTPUT - matchOutputSize)) { truncated = true; break; }
      const entry = { match: match[0], index: match.index ?? 0, length: match[0].length, groups: Array.from(match).slice(1), named: { ...match.groups } };
      matchOutputSize += JSON.stringify(entry).length + 1;
      if (matchOutputSize > MAX_OUTPUT) { truncated = true; break; }
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
