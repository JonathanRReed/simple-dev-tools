/** Reject a number that JSON or YAML output would not reproduce exactly. */
export function assertSafeJsonNumber(item: unknown): void {
  if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) {
    throw new Error('This document contains a number outside JavaScript’s safe integer range. To avoid changing it, formatting and conversion are disabled. Keep large identifiers as quoted strings or use a lossless JSON tool.');
  }
}
/** Reject transformations that would silently round identifier-sized integers. */
export function assertSafeJsonNumbers(value: unknown): void {
  const pending = [value];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop();
    assertSafeJsonNumber(item);
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      // Performance optimization: Avoid allocating an array via Object.values(item) for
      // every object and array node in the tree during traversal (~3x faster).
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
