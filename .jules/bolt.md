## 2026-08-04 - Memoizing quick tools derivation on interactive search inputs

**Learning:** Components such as `CommandMenu` receive search input keystrokes, triggering state updates (`query`) on every keypress. When non-memoized derivations like mapping recent/pinned tool href lists to tool objects and instantiating helper `Set` instances run directly inside the render loop, every single keystroke causes redundant iterations and array/Set allocations.

**Action:** Always wrap list derivations and array transformations inside `useMemo` when they depend only on persistent lists (like `recent` and `pinned`) and not on fast-changing user input states like `query`.
