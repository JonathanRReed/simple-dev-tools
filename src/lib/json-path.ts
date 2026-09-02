/**
 * JSON path resolution (`a.b[0].c`, `users[2]["weird key"]`, `[0].name`),
 * extracted from the JSON Workbench so it can be unit-tested and reused.
 */

export type PathSeg = { kind: "key"; value: string } | { kind: "index"; value: number };

/**
 * Parse a path like `a.b[0].c`, `users[2]["weird key"]`, or `[0].name` into
 * segments. Bracket access supports numeric indices and quoted string keys.
 */
export function parsePath(path: string): PathSeg[] {
  const segs: PathSeg[] = [];
  let i = 0;
  const n = path.length;

  const readQuoted = (quote: string): string => {
    let s = "";
    i += 1; // skip opening quote
    while (i < n) {
      const c = path[i];
      if (c === "\\" && i + 1 < n) {
        s += path[i + 1];
        i += 2;
        continue;
      }
      if (c === quote) {
        i += 1; // skip closing quote
        return s;
      }
      s += c;
      i += 1;
    }
    throw new Error("Unterminated quote in path.");
  };

  while (i < n) {
    const c = path[i];
    if (c === ".") {
      i += 1;
      continue;
    }
    if (c === "[") {
      i += 1;
      // skip whitespace
      while (i < n && path[i] === " ") i += 1;
      const q = path[i];
      if (q === '"' || q === "'") {
        const key = readQuoted(q);
        while (i < n && path[i] === " ") i += 1;
        if (path[i] !== "]") throw new Error("Expected ']' after bracket key.");
        i += 1;
        segs.push({ kind: "key", value: key });
      } else {
        let raw = "";
        while (i < n && path[i] !== "]") {
          raw += path[i];
          i += 1;
        }
        if (path[i] !== "]") throw new Error("Expected ']' to close bracket.");
        i += 1;
        const trimmed = raw.trim();
        if (/^-?\d+$/.test(trimmed)) {
          segs.push({ kind: "index", value: parseInt(trimmed, 10) });
        } else {
          // allow unquoted bracket keys too
          segs.push({ kind: "key", value: trimmed });
        }
      }
      continue;
    }
    // bare key: read until . or [
    let key = "";
    while (i < n && path[i] !== "." && path[i] !== "[") {
      key += path[i];
      i += 1;
    }
    if (key.length > 0) segs.push({ kind: "key", value: key });
  }
  return segs;
}

export const NO_VALUE = Symbol("no-value");

export function resolvePath(root: unknown, path: string): unknown | typeof NO_VALUE {
  const segs = parsePath(path);
  let cur: unknown = root;
  for (const seg of segs) {
    if (cur === null || cur === undefined) return NO_VALUE;
    if (seg.kind === "index") {
      if (!Array.isArray(cur)) return NO_VALUE;
      const idx = seg.value < 0 ? cur.length + seg.value : seg.value;
      if (idx < 0 || idx >= cur.length) return NO_VALUE;
      cur = cur[idx];
    } else {
      if (typeof cur !== "object" || Array.isArray(cur)) {
        // allow indexing arrays by numeric-string key
        if (Array.isArray(cur) && /^\d+$/.test(seg.value)) {
          cur = cur[parseInt(seg.value, 10)];
          continue;
        }
        return NO_VALUE;
      }
      const obj = cur as Record<string, unknown>;
      if (!(seg.value in obj)) return NO_VALUE;
      cur = obj[seg.value];
    }
  }
  return cur;
}
