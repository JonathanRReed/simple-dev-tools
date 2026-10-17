/**
 * YAML aliases can produce cycles, which must not reach tree-only transforms.
 * Performance: Uses parallel stack arrays (valueStack & exitStack) to eliminate
 * wrapper object allocations ({ value, exit }) for every node and child during traversal.
 * Avoids Object.values() array allocations by directly indexing arrays and using
 * for..in with Object.hasOwn for object properties.
 */
export function assertAcyclic(value: unknown): void {
  if (value === null || typeof value !== 'object') return;

  const active = new WeakSet<object>();
  const complete = new WeakSet<object>();
  const valueStack: unknown[] = [value];
  const exitStack: boolean[] = [false];

  while (valueStack.length > 0) {
    const val = valueStack.pop()!;
    const exit = exitStack.pop()!;

    if (val === null || typeof val !== 'object') continue;
    const object = val as object;

    if (exit) {
      active.delete(object);
      complete.add(object);
      continue;
    }

    if (active.has(object)) {
      throw new Error('Circular YAML aliases cannot be converted. Remove the self-reference.');
    }
    if (complete.has(object)) continue;

    active.add(object);
    valueStack.push(object);
    exitStack.push(true);

    if (Array.isArray(object)) {
      for (let i = object.length - 1; i >= 0; i--) {
        valueStack.push(object[i]);
        exitStack.push(false);
      }
    } else {
      for (const key in object) {
        if (Object.hasOwn(object, key)) {
          valueStack.push((object as Record<string, unknown>)[key]);
          exitStack.push(false);
        }
      }
    }
  }
}
