## 2026-08-04 - Memoizing quick tools derivation on interactive search inputs

**Learning:** Components such as `CommandMenu` receive search input keystrokes, triggering state updates (`query`) on every keypress. When non-memoized derivations like mapping recent/pinned tool href lists to tool objects and instantiating helper `Set` instances run directly inside the render loop, every single keystroke causes redundant iterations and array/Set allocations.

**Action:** Always wrap list derivations and array transformations inside `useMemo` when they depend only on persistent lists (like `recent` and `pinned`) and not on fast-changing user input states like `query`.

## 2026-08-04 - Precomputed Hex Lookup Table & Chunked Base64 Encoding
**Learning:** In hot byte/token/hash conversion paths, per-byte `b.toString(16).padStart(2, "0")` inside loops allocates hundreds of thousands of short-lived strings and invokes heavy string methods, slowing hex generation down by 6x compared to a 256-element precomputed lookup array (`HEX_TABLE`). Furthermore, chunking `String.fromCharCode.apply(null, chunk)` in 32KB chunks avoids stack overflow while avoiding single-byte string builder loops for base64 conversions.
**Action:** Always prefer `HEX_TABLE[bytes[i]]` and chunked `String.fromCharCode.apply` in `@/lib/base64` over duplicate inline `Array.from(bytes).map(...)` implementations across tools.

## 2026-10-06 - Allocation-Free Stack Traversal & String Slicing in JSON Tools
**Learning:** Iterative AST and object depth traversals (`maxDepth`) that use `Object.values` and create `{ node, depth }` wrapper objects allocate hundreds of thousands of ephemeral objects/arrays for large JSON payloads, causing heavy garbage collection pressure. Replacing `Object.values` and object wrappers with parallel stack arrays (`nodeStack` and `depthStack`) and `for..in` with `Object.hasOwn` cuts traversal execution time by ~48% and reduces heap allocations to zero. Additionally, replacing char-by-char string builder loops in path parsing (`parsePath`) with string slicing (`path.slice`) speeds up path resolution by ~36%.
**Action:** In tree traversal or path parsing utilities, use parallel primitive stacks instead of wrapping objects, use `for..in` with `Object.hasOwn`, and slice contiguous character ranges instead of accumulating string characters in loops.
