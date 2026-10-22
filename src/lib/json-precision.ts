/** Reject a number that JSON or YAML output would not reproduce exactly. */
export function assertSafeJsonNumber(item: unknown): void {
  if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) {
    throw new Error('This document contains a number outside JavaScript’s safe integer range. To avoid changing it, formatting and conversion are disabled. Keep large identifiers as quoted strings or use a lossless JSON tool.');
  }
}
/**
 * Reject transformations that would silently round identifier-sized integers.
 * Performance: uses direct index iteration for arrays and for..in with Object.hasOwn for objects
 * to avoid allocating intermediate Object.values arrays for every container node during traversal.
 */
export function assertSafeJsonNumbers(value: unknown): void {
  const pending = [value];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop();
    assertSafeJsonNumber(item);
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
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
