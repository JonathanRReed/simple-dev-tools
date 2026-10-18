/** Reject transformations that would silently round identifier-sized integers. */
export function assertSafeJsonNumbers(value: unknown): void {
  const pending = [value];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) {
      throw new Error('This document contains a number outside JavaScript’s safe integer range. To avoid changing it, formatting and conversion are disabled. Keep large identifiers as quoted strings or use a lossless JSON tool.');
    }
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      // Iterating arrays directly and using for..in + Object.hasOwn for objects avoids
      // allocating an Object.values array for every node in the document (~2x faster).
      if (Array.isArray(item)) {
        for (let i = 0; i < item.length; i++) {
          pending.push(item[i]);
        }
      } else {
        for (const key in item) {
          if (Object.hasOwn(item, key)) {
            pending.push((item as Record<string, unknown>)[key]);
          }
        }
      }
    }
  }
}
export function parseJsonWithoutUnsafeIntegers(text: string): unknown {
  const value: unknown = JSON.parse(text);
  assertSafeJsonNumbers(value);
  return value;
}
