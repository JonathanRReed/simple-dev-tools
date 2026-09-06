import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { escapeHtml } from "./escape-html";

describe("escapeHtml", () => {
  test("neutralizes the tag and attribute delimiters", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  test("escapes ampersands first so entities are not double-decoded", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  test("escapes both quote styles", () => {
    expect(escapeHtml(`a "b" 'c'`)).toBe("a &quot;b&quot; &#39;c&#39;");
  });

  test("output can no longer open an element", () => {
    const payload = "<script>window.x=1</script><img src=x onerror=window.y=1>";
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
  });

  test("leaves ordinary code untouched", () => {
    expect(escapeHtml("SELECT * FROM t WHERE a = 1")).toBe("SELECT * FROM t WHERE a = 1");
  });
});

/**
 * Guard the actual defect this helper was introduced for: a code editor whose
 * fallback highlighter returns its input unchanged is a DOM XSS sink, because
 * react-simple-code-editor injects the highlighter's result with
 * dangerouslySetInnerHTML while Prism is still loading — and the editor can
 * already hold attacker-controlled text from a `#s=` share link by then.
 */
describe("code editors never fall back to an identity highlighter", () => {
  const EDITORS = [
    "src/app/mermaid/MermaidClient.tsx",
    "src/app/sqlite/SQLiteClient.tsx",
  ];

  for (const file of EDITORS) {
    test(`${file} seeds highlightRef with escapeHtml`, () => {
      const src = readFileSync(join(import.meta.dir, "../..", file), "utf8");
      const match = src.match(/useRef<HighlightFn>\(([^)]*)\)/);
      expect(match).not.toBeNull();
      expect(match?.[1].trim()).toBe("escapeHtml");
      // and specifically not a pass-through
      expect(src).not.toMatch(/useRef<HighlightFn>\(\s*\(value: string\)\s*=>\s*value\s*\)/);
    });
  }
});
