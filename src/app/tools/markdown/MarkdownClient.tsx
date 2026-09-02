"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEventHandler } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Download, RotateCcw, ScrollText, Sparkles } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ResultPanel } from "@/components/ui/result-panel";
import { FileDrop } from "@/components/FileDrop";
import { downloadFile } from "@/lib/download";
import { readShareParams } from "@/lib/share";
import { useHotkey } from "@/hooks/use-hotkey";
import { useStoredState, useDebounced } from "@/hooks/use-stored-state";

const STORAGE_KEY = "sdt:markdown:source";

const SAMPLE = `# Markdown Preview

Type or paste **Markdown** on the left and watch it render on the right.

## Features

- Headings and paragraphs
- [Links](https://example.com)
- Code blocks and inline \`code\`
- Tables
- Blockquotes and horizontal rules

## Sample code

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> A blockquote with a left border.

## Comparison

| Feature     | Supported |
|-------------|-----------|
| Headings    | Yes       |
| Tables      | Yes       |
| Lists       | Yes       |

---

*That is all.*`;

const PREVIEW_CSS = `.md-preview {
  color: hsl(var(--foreground));
  line-height: 1.65;
}
.md-preview > *:first-child {
  margin-top: 0;
}
.md-preview > *:last-child {
  margin-bottom: 0;
}
.md-preview h1,
.md-preview h2,
.md-preview h3,
.md-preview h4,
.md-preview h5,
.md-preview h6 {
  font-weight: 700;
  margin: 1.25em 0 0.5em;
  color: hsl(var(--foreground));
}
.md-preview h1 { font-size: 1.75rem; }
.md-preview h2 { font-size: 1.5rem; }
.md-preview h3 { font-size: 1.25rem; }
.md-preview h4 { font-size: 1.1rem; }
.md-preview p {
  margin: 0.75em 0;
}
.md-preview a {
  color: var(--rp-foam);
  text-decoration: underline;
}
.md-preview a:hover {
  color: var(--rp-iris);
}
.md-preview ul,
.md-preview ol {
  margin: 0.75em 0;
  padding-left: 1.5em;
}
.md-preview li {
  margin: 0.25em 0;
}
.md-preview blockquote {
  margin: 0.75em 0;
  padding-left: 1em;
  border-left: 2px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
}
.md-preview pre {
  margin: 0.75em 0;
  padding: 0.75em;
  border: 2px solid hsl(var(--border));
  background: var(--rp-surface);
  overflow: auto;
}
.md-preview code {
  font-family: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.md-preview pre code {
  padding: 0;
  background: transparent;
  border: none;
}
.md-preview :not(pre) > code {
  background: var(--rp-surface);
  border: 1px solid hsl(var(--border));
  padding: 0.15em 0.35em;
}
.md-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  border: 2px solid hsl(var(--border));
}
.md-preview th,
.md-preview td {
  border: 1px solid hsl(var(--border));
  padding: 0.5em 0.75em;
}
.md-preview th {
  background: var(--rp-surface);
  font-weight: 600;
}
.md-preview hr {
  border: 0;
  border-top: 2px solid hsl(var(--border));
  margin: 1.5em 0;
}
.md-preview img {
  max-width: 100%;
}`;

function byteSize(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return text.length;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function buildHtmlDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Markdown Preview</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 80ch; margin: 2rem auto; padding: 0 1rem; color: #111; background: #fff; }
    h1, h2, h3, h4, h5, h6 { font-weight: 600; margin: 1.25em 0 0.5em; }
    p, ul, ol, blockquote, pre, table { margin: 0.75em 0; }
    a { color: #0066cc; text-decoration: underline; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { padding: 1rem; background: #f5f5f5; border: 1px solid #ccc; overflow: auto; }
    code { padding: 0.15em 0.35em; background: #f5f5f5; border: 1px solid #ccc; }
    pre > code { padding: 0; background: transparent; border: none; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5em 0.75em; text-align: left; }
    th { background: #f5f5f5; }
    blockquote { border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 0; color: #555; }
    hr { border: 0; border-top: 2px solid #ccc; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export default function MarkdownClient() {
  const [source, setSource] = useStoredState(STORAGE_KEY, "");
  const debouncedSource = useDebounced(source, 200);
  const [syncScroll, setSyncScroll] = useState(true);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const isEmpty = source.trim() === "";

  useEffect(() => {
    const params = readShareParams();
    if (!params) return;
    if (typeof params.md === "string") setSource(params.md);
    if (params.sync === "0" || params.sync === "1") setSyncScroll(params.sync === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Parse + sanitize in an effect (not useMemo): DOMPurify touches the DOM,
  // which must not happen during render.
  const [rendered, setRendered] = useState<{ sanitizedHtml: string; parseError: string }>({
    sanitizedHtml: "",
    parseError: "",
  });

  useEffect(() => {
    if (debouncedSource.trim() === "") {
      setRendered({ sanitizedHtml: "", parseError: "" });
      return;
    }
    try {
      const raw = marked.parse(debouncedSource, { async: false }) as string;
      // FORBID_ATTR "style" keeps share-link payloads from injecting
      // position:fixed overlays or fake UI via inline style attributes.
      const sanitized = DOMPurify.sanitize(raw, {
        FORBID_TAGS: ["script", "style"],
        FORBID_ATTR: ["style"],
        ALLOW_DATA_ATTR: false,
      });
      setRendered({ sanitizedHtml: sanitized, parseError: "" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRendered({ sanitizedHtml: "", parseError: msg });
    }
  }, [debouncedSource]);

  const { sanitizedHtml, parseError } = rendered;

  useHotkey(
    "mod+Enter",
    (event) => {
      if (!isEmpty && sanitizedHtml) {
        event.preventDefault();
        void copyToClipboard(sanitizedHtml);
      }
    },
    { allowInInput: true }
  );

  const stats = useMemo(() => {
    return {
      words: wordCount(source),
      chars: source.length,
      bytes: byteSize(source),
    };
  }, [source]);

  const handleSourceScroll: UIEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      if (!syncScroll) return;
      const textarea = event.currentTarget;
      const previewBody = previewRef.current?.parentElement;
      if (!previewBody) return;
      const taMax = textarea.scrollHeight - textarea.clientHeight;
      const pMax = previewBody.scrollHeight - previewBody.clientHeight;
      if (taMax <= 0 || pMax <= 0) return;
      previewBody.scrollTop = Math.round((textarea.scrollTop / taMax) * pMax);
    },
    [syncScroll]
  );

  const handleSample = () => setSource(SAMPLE);
  const handleReset = () => setSource("");

  const handleDownload = useCallback(() => {
    if (!sanitizedHtml) return;
    const doc = buildHtmlDocument(sanitizedHtml);
    downloadFile(doc, "markdown-preview.html", "text/html;charset=utf-8");
  }, [sanitizedHtml]);

  const handleFileText = useCallback((text: string) => {
    setSource(text);
  }, [setSource]);

  const toolbar = (
    <>
      <Button variant="secondary" size="sm" onClick={handleSample}>
        <Sparkles aria-hidden="true" />
        Sample
      </Button>
      <Button variant="outline" size="sm" onClick={handleReset}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
      <CopyButton value={() => sanitizedHtml} label="Copy HTML" disabled={!sanitizedHtml} />
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={!sanitizedHtml}>
        <Download aria-hidden="true" />
        Download .html
      </Button>
    </>
  );

  const shortcuts = [
    { keys: "⌘ ↵", description: "Copy sanitized HTML" },
  ];

  return (
    <ToolShell
      eyebrow="Markdown"
      toolbar={toolbar}
      shareParams={() => (isEmpty ? null : { md: source, sync: syncScroll ? "1" : "0" })}
      shortcuts={shortcuts}
    >
      <style>{PREVIEW_CSS}</style>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Field
            label="Markdown source"
            htmlFor="md-source"
            hint="Paste Markdown or drop a .md / .markdown / .txt file."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSyncScroll((s) => !s)}
                aria-pressed={syncScroll}
              >
                <ScrollText aria-hidden="true" />
                Sync {syncScroll ? "on" : "off"}
              </Button>
            }
            className="min-w-0"
          >
            <FileDrop
              onFileText={handleFileText}
              accept=".md,.markdown,.txt,text/plain,text/markdown"
              label="Import Markdown"
              className="group"
            >
              <textarea
                ref={sourceRef}
                id="md-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onScroll={handleSourceScroll}
                spellCheck={false}
                placeholder="Paste or type Markdown here…"
                className="min-h-[320px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
              />
            </FileDrop>
          </Field>

          {parseError ? <Alert variant="error">{parseError}</Alert> : null}

          <div className="flex flex-wrap items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
            <Badge variant={!isEmpty ? "default" : "outline"}>
              {!isEmpty ? "ready" : "empty"}
            </Badge>
            <span>words: {stats.words}</span>
            <span>chars: {stats.chars}</span>
            <span>bytes: {stats.bytes}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <ResultPanel
            title="Preview"
            scroll
          >
            <div
              ref={previewRef}
              className="md-preview"
              role="region"
              aria-label="Rendered markdown preview"
            >
              {isEmpty ? (
                <p className="text-sm text-muted-foreground">
                  Start typing or paste Markdown to see the preview.
                </p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
              )}
            </div>
          </ResultPanel>
        </div>
      </div>
    </ToolShell>
  );
}
