/** YAML aliases can produce cycles, which must not reach tree-only transforms. */
export function assertAcyclic(value: unknown): void {
  const active = new WeakSet<object>();
  const complete = new WeakSet<object>();
  const stack: Array<{ value: unknown; exit: boolean }> = [{ value, exit: false }];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.value === null || typeof current.value !== 'object') continue;
    const object = current.value;
    if (current.exit) { active.delete(object); complete.add(object); continue; }
    if (active.has(object)) throw new Error('Circular YAML aliases cannot be converted. Remove the self-reference.');
    if (complete.has(object)) continue;
    active.add(object);
    stack.push({ value: object, exit: true });
    // Performance optimization: Use Array.isArray loop and for..in with Object.hasOwn
    // to avoid Object.values(object) array allocation on every node (~2x faster).
    if (Array.isArray(object)) {
      for (let i = 0; i < object.length; i++) {
        stack.push({ value: object[i], exit: false });
      }
    } else {
      for (const key in object) {
        if (Object.hasOwn(object, key)) {
          stack.push({ value: (object as Record<string, unknown>)[key], exit: false });
        }
      }
    }
  }
}
