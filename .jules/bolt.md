## 2026-08-04 - `indexOf` in CSV/Text Parser Char Loops
**Learning:** Attempting to optimize character-by-character CSV parsing by searching for delimiter positions using `indexOf` inside the loop unexpectedly slowed down execution by ~3x (from ~433ms to ~1361ms for 10k rows). Setting up string searches repeatedly inside a hot parsing loop has higher overhead in V8/Bun JIT than sequential single-character index increments.
**Action:** When parsing streaming or string data, prefer straightforward single-character loops or chunked scanning over calling `indexOf()` inside the inner loop.
