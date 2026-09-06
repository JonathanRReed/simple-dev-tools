import { expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the DOM XSS that shipped in the Mermaid editor.
 *
 * `react-simple-code-editor` renders its highlighter's return value through
 * `dangerouslySetInnerHTML`. MermaidClient seeded that highlighter with the
 * identity function, so between mount — when a `#s=` share link has already
 * filled the editor — and Prism's lazy chunk arriving, a crafted share URL
 * executed script on the origin. It was confirmed firing in a browser, then
 * confirmed fixed.
 *
 * The editors now use CodeMirror, which builds real DOM instead of injecting
 * markup, so the sink is gone rather than mitigated. These tests pin that:
 * bringing the library back, or introducing a new unsanitized HTML sink, fails
 * here rather than in a browser.
 */

const SRC = join(import.meta.dir, "..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

test("the editor library that injected raw HTML is not a dependency", () => {
  const pkg = JSON.parse(
    readFileSync(join(import.meta.dir, "../../package.json"), "utf8")
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  expect(all["react-simple-code-editor"]).toBeUndefined();
});

test("every dangerouslySetInnerHTML sink is a reviewed one", () => {
  // Each entry is a sink that has been checked: markdown runs through
  // DOMPurify, the QR SVG is library-generated geometry with no user text in
  // it, and the JSON-LD is our own data with "<" escaped.
  const ALLOWED = new Set([
    "src/app/layout.tsx",
    "src/app/tools/markdown/MarkdownClient.tsx",
    "src/app/tools/encode-qr/Client.tsx",
  ]);

  // Strip comments first: files are allowed to *describe* the old sink (this
  // one does), and matching prose would make the guard fire on its own docs.
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

  const offenders = sourceFiles(SRC)
    .filter((file) => stripComments(readFileSync(file, "utf8")).includes("dangerouslySetInnerHTML"))
    .map((file) => file.slice(file.indexOf("src/")))
    .filter((rel) => !ALLOWED.has(rel));

  expect(offenders).toEqual([]);
});
