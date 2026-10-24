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
    // Arrays can have extra own enumerable properties; ignore inherited and hidden keys.
    for (const child of Object.values(object)) stack.push({ value: child, exit: false });
  }
}
