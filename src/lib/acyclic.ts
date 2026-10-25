/**
 * YAML aliases can produce cycles, which must not reach tree-only transforms.
 *
 * Performance optimization:
 * Direct property enumeration with `for..in` and `Object.hasOwn` (or index-based loop for arrays)
 * replaces `Object.values(object)`. This eliminates allocating intermediate array instances
 * for every object node during cycle checking of large parsed YAML documents.
 */
export function assertAcyclic(value: unknown): void {
  const active = new WeakSet<object>();
  const complete = new WeakSet<object>();
  const stack: Array<{ value: unknown; exit: boolean }> = [{ value, exit: false }];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.value === null || typeof current.value !== 'object') continue;
    const object = current.value;
    if (current.exit) {
      active.delete(object);
      complete.add(object);
      continue;
    }
    if (active.has(object)) {
      throw new Error('Circular YAML aliases cannot be converted. Remove the self-reference.');
    }
    if (complete.has(object)) continue;
    active.add(object);
    stack.push({ value: object, exit: true });

    // Arrays can have extra own enumerable properties; ignore inherited and hidden keys.
    if (Array.isArray(object)) {
      const len = object.length;
      for (let i = 0; i < len; i++) {
        if (Object.prototype.propertyIsEnumerable.call(object, i)) {
          stack.push({ value: object[i], exit: false });
        }
      }
      for (const key in object) {
        if (Object.hasOwn(object, key)) {
          // Skip numeric array index properties already processed above
          const num = Number(key);
          if (Number.isInteger(num) && num >= 0 && num < len && String(num) === key) {
            continue;
          }
          stack.push({ value: (object as unknown as Record<string, unknown>)[key], exit: false });
        }
      }
    } else {
      const obj = object as Record<string, unknown>;
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          stack.push({ value: obj[key], exit: false });
        }
      }
    }
  }
}
