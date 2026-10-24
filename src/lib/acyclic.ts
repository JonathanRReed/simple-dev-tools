/** YAML aliases can produce cycles, which must not reach tree-only transforms. */
/**
 * Assert that an object structure is acyclic (contains no circular references).
 * Performance optimization: uses parallel value/exit stacks to eliminate wrapper object allocations per node,
 * and iterates array elements or own properties directly without allocating intermediate `Object.values` arrays.
 */
export function assertAcyclic(value: unknown): void {
  const active = new WeakSet<object>();
  const complete = new WeakSet<object>();
  const valStack: unknown[] = [value];
  const exitStack: boolean[] = [false];

  while (valStack.length > 0) {
    const val = valStack.pop()!;
    const isExit = exitStack.pop()!;

    if (val === null || typeof val !== 'object') continue;
    const object = val as object;

    if (isExit) {
      active.delete(object);
      complete.add(object);
      continue;
    }

    if (active.has(object)) {
      throw new Error('Circular YAML aliases cannot be converted. Remove the self-reference.');
    }
    if (complete.has(object)) continue;

    active.add(object);
    valStack.push(object);
    exitStack.push(true);

    if (Array.isArray(object)) {
      for (let i = 0; i < object.length; i++) {
        valStack.push(object[i]);
        exitStack.push(false);
      }
    } else {
      for (const key in object) {
        if (Object.hasOwn(object, key)) {
          valStack.push((object as Record<string, unknown>)[key]);
          exitStack.push(false);
        }
      }
    }
  }
}
