## 2026-08-04 - Memoizing quick tools derivation on interactive search inputs

**Learning:** Components such as `CommandMenu` receive search input keystrokes, triggering state updates (`query`) on every keypress. When non-memoized derivations like mapping recent/pinned tool href lists to tool objects and instantiating helper `Set` instances run directly inside the render loop, every single keystroke causes redundant iterations and array/Set allocations.

**Action:** Always wrap list derivations and array transformations inside `useMemo` when they depend only on persistent lists (like `recent` and `pinned`) and not on fast-changing user input states like `query`.

## 2026-08-04 - Precomputed Hex Lookup Table & Chunked Base64 Encoding
**Learning:** In hot byte/token/hash conversion paths, per-byte `b.toString(16).padStart(2, "0")` inside loops allocates hundreds of thousands of short-lived strings and invokes heavy string methods, slowing hex generation down by 6x compared to a 256-element precomputed lookup array (`HEX_TABLE`). Furthermore, chunking `String.fromCharCode.apply(null, chunk)` in 32KB chunks avoids stack overflow while avoiding single-byte string builder loops for base64 conversions.
**Action:** Always prefer `HEX_TABLE[bytes[i]]` and chunked `String.fromCharCode.apply` in `@/lib/base64` over duplicate inline `Array.from(bytes).map(...)` implementations across tools.

## 2026-10-06 - Reduced-Allocation Stack Traversal & String Slicing in JSON Tools
**Learning:** Using parallel stack arrays (`nodeStack` and `depthStack`) in `maxDepth` avoids a `{ node, depth }` wrapper object for each child. Iterating object properties with `for..in` and `Object.hasOwn` also avoids an `Object.values` array for each object. The stacks still allocate and grow. In `parsePath`, `path.slice` replaces character-by-character concatenation for contiguous ranges, while escaped quoted keys still require decoding. Performance depends on the runtime and input; fixed speedup percentages need reproducible benchmarks.
**Action:** In tree traversal or path parsing utilities, use parallel stacks instead of per-node wrapper objects, use `for..in` with `Object.hasOwn`, and slice contiguous character ranges. Measure runtime and allocation effects on representative inputs before making performance claims.

## 2026-10-08 - Pure JS Fast-Path for CSS Color Parsing
**Learning:** Common hexadecimal, RGB, and HSL inputs can be parsed without creating and attaching a DOM element or reading computed styles. A fast path must validate complete numeric tokens and distinguish legacy comma syntax from modern space/slash syntax. Fractional HSL-derived channels preserve precision until an output formatter requires rounding. Inputs outside these narrow patterns retain the existing browser fallback.
**Action:** Test invalid syntax, fractional channels, and fallback behavior before adding a color fast path. DOM avoidance alone does not establish a speedup ratio, interaction coverage percentage, or forced layout cost; those require representative browser measurements.
