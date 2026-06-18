"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Sparkles, AlignLeft, Minimize2, ArrowDownAZ } from "lucide-react";
import YAML from "yaml";

import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ResultPanel } from "@/components/ui/result-panel";

type Format = "json" | "yaml" | "csv";

const STORAGE_KEY = "sdt:json:source";

const SAMPLE = `{
  "team": "Platform",
  "active": true,
  "members": [
    { "name": "Ada Lovelace", "role": "lead", "age": 36 },
    { "name": "Alan Turing", "role": "ic", "age": 41 },
    { "name": "Grace Hopper", "role": "ic", "age": 85 }
  ],
  "meta": { "region": "us-west", "weird key": 7 }
}`;

/* ------------------------------------------------------------------ */
/* localStorage (guarded for static export)                            */
/* ------------------------------------------------------------------ */

function loadStored(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persist(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore (private mode / quota) */
  }
}

function clearStored(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* CSV parse (RFC 4180-ish)                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse CSV text into a 2D array of string cells. Handles quoted fields,
 * commas and newlines inside quotes, and `""` escaped quotes. Accepts both
 * \r\n and \n line endings. A trailing newline does not produce a final empty
 * row.
 */
function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      // treat \r\n (and a lone \r) as one row terminator
      pushRow();
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  // flush trailing field/row unless the input ended exactly on a terminator
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }
  return rows;
}

/** Coerce a raw CSV string cell to a JS value: numbers, booleans, null, else string. */
function coerceCsvValue(raw: string): unknown {
  if (raw === "") return "";
  const lower = raw.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (lower === "null") return null;
  // Numeric (avoid coercing things like "+", "1.2.3", or leading-zero ids loosely;
  // require a clean JSON-style number).
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return raw;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const grid = parseCsvGrid(text);
  if (grid.length === 0) return [];
  const header = grid[0];
  if (header.length === 0) return [];
  const out: Record<string, unknown>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    // skip fully blank rows (a single empty cell from a stray blank line)
    if (cells.length === 1 && cells[0] === "") continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) {
      const key = header[c] || `column_${c + 1}`;
      obj[key] = c < cells.length ? coerceCsvValue(cells[c]) : "";
    }
    out.push(obj);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* CSV serialize                                                       */
/* ------------------------------------------------------------------ */

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Render a JS value as a single CSV cell. Objects/arrays are JSON-stringified. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Convert an array of objects to CSV. Header = union of keys in first-seen
 * order. Throws a friendly error when the value isn't an array of objects.
 */
function toCsv(value: unknown): string {
  if (!Array.isArray(value)) {
    throw new Error("CSV output needs an array of objects at the top level.");
  }
  if (value.length === 0) return "";
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("CSV output needs every item to be an object (not a primitive or array).");
    }
    for (const k of Object.keys(row as Record<string, unknown>)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  const headerLine = keys.map(escapeCsvCell).join(",");
  const lines = (value as Record<string, unknown>[]).map((row) =>
    keys.map((k) => escapeCsvCell(csvCell(row[k]))).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

/* ------------------------------------------------------------------ */
/* Transforms                                                          */
/* ------------------------------------------------------------------ */

/** Recursively sort object keys (arrays keep order, elements recursed). */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function topLevelType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function maxDepth(value: unknown): number {
  if (Array.isArray(value)) {
    let d = 0;
    for (const item of value) d = Math.max(d, maxDepth(item));
    return d + 1;
  }
  if (value !== null && typeof value === "object") {
    let d = 0;
    for (const v of Object.values(value as Record<string, unknown>)) {
      d = Math.max(d, maxDepth(v));
    }
    return d + 1;
  }
  return 0;
}

/** key count (objects) or length (arrays) at the top level. */
function topLevelCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length;
  }
  return null;
}

function byteSize(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  // Fallback rough estimate.
  return text.length;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Parse + serialize by format                                         */
/* ------------------------------------------------------------------ */

function parseSource(text: string, format: Format): unknown {
  if (format === "json") return JSON.parse(text);
  if (format === "yaml") return YAML.parse(text);
  return parseCsv(text);
}

function serialize(value: unknown, format: Format): string {
  if (format === "json") return JSON.stringify(value, null, 2);
  if (format === "yaml") return YAML.stringify(value);
  return toCsv(value);
}

/* ------------------------------------------------------------------ */
/* Path resolver                                                       */
/* ------------------------------------------------------------------ */

type PathSeg = { kind: "key"; value: string } | { kind: "index"; value: number };

/**
 * Parse a path like `a.b[0].c`, `users[2]["weird key"]`, or `[0].name` into
 * segments. Bracket access supports numeric indices and quoted string keys.
 */
function parsePath(path: string): PathSeg[] {
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

const NO_VALUE = Symbol("no-value");

function resolvePath(root: unknown, path: string): unknown | typeof NO_VALUE {
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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function JsonClient() {
  const [source, setSource] = useState("");
  const [sourceFormat, setSourceFormat] = useState<Format>("json");
  const [targetFormat, setTargetFormat] = useState<Format>("yaml");
  const [query, setQuery] = useState("");

  // Hydrate persisted source after mount (keeps SSR markup === first client render).
  useEffect(() => {
    const stored = loadStored();
    if (stored) setSource(stored);
  }, []);

  useEffect(() => {
    persist(source);
  }, [source]);

  const isEmpty = source.trim() === "";

  // Parse the source into { value } or { error }. Empty source is treated as a
  // benign "no value yet" state (error: null, value: null) — the UI guards on
  // isEmpty separately, so this never renders as a real error.
  const parsed = useMemo<{ value: unknown; error: string | null }>(() => {
    if (source.trim() === "") {
      return { value: null, error: null };
    }
    try {
      const value = parseSource(source, sourceFormat);
      return { value, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { value: null, error: msg };
    }
  }, [source, sourceFormat]);

  const isValid = !isEmpty && parsed.error === null;

  // Stats
  const stats = useMemo(() => {
    // Treat a whitespace-only ("empty") source as 0 B so the stats line agrees
    // with the "empty" badge.
    const size = isEmpty ? byteSize("") : byteSize(source);
    if (!isValid) {
      return { size, type: null as string | null, count: null as number | null, depth: 0 };
    }
    const value = parsed.value;
    return {
      size,
      type: topLevelType(value),
      count: topLevelCount(value),
      depth: maxDepth(value),
    };
  }, [source, isEmpty, isValid, parsed]);

  // Converted output for target format. error is null/"" when there's nothing
  // to report; a non-empty string is a real conversion error (e.g. CSV needs an
  // array of objects).
  const output = useMemo<{ text: string; error: string | null }>(() => {
    if (!isValid) return { text: "", error: null };
    try {
      return { text: serialize(parsed.value, targetFormat), error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { text: "", error: msg };
    }
  }, [isValid, parsed, targetFormat]);

  // Path query result.
  const queryResult = useMemo<
    { kind: "idle" } | { kind: "missing" } | { kind: "value"; text: string } | { kind: "error"; message: string }
  >(() => {
    if (query.trim() === "") return { kind: "idle" };
    if (!isValid) return { kind: "error", message: "Source is not valid; fix it to query." };
    try {
      const resolved = resolvePath(parsed.value, query.trim());
      if (resolved === NO_VALUE) return { kind: "missing" };
      let text: string;
      try {
        text = JSON.stringify(resolved, null, 2);
      } catch {
        text = String(resolved);
      }
      if (text === undefined) text = "undefined";
      return { kind: "value", text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { kind: "error", message: msg };
    }
  }, [query, isValid, parsed]);

  /* ----- Actions (operate on the source textarea) ----- */

  const applyToSource = (transform: (value: unknown) => unknown, format: Format) => {
    if (!isValid) return;
    try {
      const next = serialize(transform(parsed.value), format);
      setSource(next);
      setSourceFormat(format);
    } catch {
      /* ignore — invalid transform; UI already shows parse state */
    }
  };

  const handleFormat = () => applyToSource((v) => v, "json");
  const handleSortKeys = () => applyToSource((v) => sortKeysDeep(v), sourceFormat === "csv" ? "json" : sourceFormat);

  const handleMinify = () => {
    if (!isValid) return;
    try {
      setSource(JSON.stringify(parsed.value));
      setSourceFormat("json");
    } catch {
      /* ignore */
    }
  };

  const handleSample = () => {
    setSource(SAMPLE);
    setSourceFormat("json");
  };

  const handleReset = () => {
    clearStored();
    setSource("");
    setSourceFormat("json");
    setTargetFormat("yaml");
    setQuery("");
  };

  const downloadOutput = () => {
    if (!output.text) return;
    const ext = targetFormat;
    const mime =
      targetFormat === "json"
        ? "application/json"
        : targetFormat === "yaml"
          ? "text/yaml;charset=utf-8"
          : "text/csv;charset=utf-8";
    const blob = new Blob([output.text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workbench.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

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
    </>
  );

  const formats: { id: Format; label: string }[] = [
    { id: "json", label: "JSON" },
    { id: "yaml", label: "YAML" },
    { id: "csv", label: "CSV" },
  ];

  return (
    <ToolShell eyebrow="JSON · YAML · CSV" toolbar={toolbar}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* ---------------- Source column ---------------- */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label id="src-fmt-label">Source format</Label>
            <div role="group" aria-labelledby="src-fmt-label" className="flex flex-wrap items-center gap-1">
              {formats.map((f) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant={sourceFormat === f.id ? "default" : "outline"}
                  onClick={() => setSourceFormat(f.id)}
                  aria-pressed={sourceFormat === f.id}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <Field label="Source" htmlFor="json-source" className="min-w-0">
            <textarea
              id="json-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              placeholder={`Paste ${sourceFormat.toUpperCase()} here…`}
              className="min-h-[280px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
            />
          </Field>

          {isEmpty ? (
            <Alert variant="info">Paste some {sourceFormat.toUpperCase()} to get started.</Alert>
          ) : isValid ? (
            <Alert variant="success">
              Valid {sourceFormat.toUpperCase()}.
            </Alert>
          ) : (
            <Alert variant="error">{parsed.error || "Could not parse the source."}</Alert>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleFormat} disabled={!isValid}>
              <AlignLeft aria-hidden="true" />
              Format
            </Button>
            <Button size="sm" variant="outline" onClick={handleMinify} disabled={!isValid}>
              <Minimize2 aria-hidden="true" />
              Minify
            </Button>
            <Button size="sm" variant="outline" onClick={handleSortKeys} disabled={!isValid}>
              <ArrowDownAZ aria-hidden="true" />
              Sort keys
            </Button>
          </div>

          {/* Stats line */}
          <div className="flex flex-wrap items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
            <Badge variant={isValid ? "default" : isEmpty ? "outline" : "destructive"}>
              {isEmpty ? "empty" : isValid ? "valid" : "invalid"}
            </Badge>
            {isValid ? (
              <>
                <span>type: {stats.type}</span>
                {stats.count !== null ? (
                  <span>
                    {stats.type === "array" ? "len" : "keys"}: {stats.count}
                  </span>
                ) : null}
                <span>depth: {stats.depth}</span>
              </>
            ) : null}
            <span>size: {formatBytes(stats.size)}</span>
          </div>
        </div>

        {/* ---------------- Output column ---------------- */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label id="tgt-fmt-label">Target format</Label>
            <div role="group" aria-labelledby="tgt-fmt-label" className="flex flex-wrap items-center gap-1">
              {formats.map((f) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant={targetFormat === f.id ? "default" : "outline"}
                  onClick={() => setTargetFormat(f.id)}
                  aria-pressed={targetFormat === f.id}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <ResultPanel
            title={`Output · ${targetFormat.toUpperCase()}`}
            scroll
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadOutput}
                  disabled={!output.text}
                >
                  Download .{targetFormat}
                </Button>
                <CopyButton value={() => output.text} label="Copy" disabled={!output.text} />
              </>
            }
          >
            {!isValid ? (
              <span className="text-sm text-muted-foreground">
                {isEmpty ? "Output appears here once the source is valid." : "Fix the source to see output."}
              </span>
            ) : output.error ? (
              <Alert variant="warning">{output.error}</Alert>
            ) : output.text === "" ? (
              <span className="text-sm text-muted-foreground">
                {targetFormat === "csv" ? "No rows to render as CSV." : "Empty output."}
              </span>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
                {output.text}
              </pre>
            )}
          </ResultPanel>

          {/* Path query */}
          <Field
            label="Path query"
            htmlFor="json-path"
            hint={
              stats.type === "array"
                ? `e.g. [0].name or ["weird key"]`
                : stats.type === "object"
                  ? `e.g. members[0].name or ["weird key"]`
                  : isValid
                    ? `(scalar — no path)`
                    : `e.g. members[0].name or ["weird key"]`
            }
            className="min-w-0"
          >
            <Input
              id="json-path"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="a.b[0].c"
              spellCheck={false}
              className="font-mono"
            />
          </Field>

          <ResultPanel
            title="Resolved value"
            copyValue={queryResult.kind === "value" ? queryResult.text : ""}
          >
            {queryResult.kind === "idle" ? (
              <span className="text-sm text-muted-foreground">
                Enter a path to resolve it against the parsed value.
              </span>
            ) : queryResult.kind === "missing" ? (
              <span className="text-sm text-muted-foreground italic">No value at path.</span>
            ) : queryResult.kind === "error" ? (
              <Alert variant="error">{queryResult.message}</Alert>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
                {queryResult.text}
              </pre>
            )}
          </ResultPanel>
        </div>
      </div>
    </ToolShell>
  );
}
