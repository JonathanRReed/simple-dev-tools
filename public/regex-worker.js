/* global self */
self.onmessage = ({ data }) => {
  const { pattern, flags, text, replacement } = data;
  try {
    if (text.length > 100000 || pattern.length > 10000 || replacement.length > 100000) {
      throw new Error('Use at most 100,000 characters of text or replacement and 10,000 characters in the pattern.');
    }
    const regex = new RegExp(pattern, flags);
    const list = [];
    let truncated = false;
    const iterable = regex.global ? text.matchAll(regex) : [regex.exec(text)].filter(Boolean);
    for (const match of iterable) {
      if (list.length >= 5000) { truncated = true; break; }
      list.push({ match: match[0], index: match.index ?? 0, length: match[0].length, groups: Array.from(match).slice(1), named: { ...match.groups } });
    }
    self.postMessage({
      list, truncated, error: null,
      captureGroups: (new RegExp(`${pattern}|`, flags.replace(/[gy]/g, "")).exec("")?.length ?? 1) - 1,
      replaced: { value: text.replace(new RegExp(pattern, flags), replacement), error: null },
      split: { parts: text.slice(0, 50000).split(new RegExp(pattern, flags)), error: null, truncated: text.length > 50000 },
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Pattern evaluation failed.' });
  }
};
