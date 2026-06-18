"use client";

import React, { useId, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const httpMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

type HeaderRow = { id: string; key: string; value: string };

type ParamRow = { id: string; key: string; value: string };

type SnippetSet = {
  curl: string;
  python: string;
  js: string;
};

type GenerateResult =
  | {
      ok: true;
      snippets: SnippetSet;
      bodyOmitted: boolean;
      droppedHeaderRows: number;
    }
  | { ok: false; error: string };

/** Whether the HTTP method permits a request body. */
function methodAllowsBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

let headerRowCounter = 0;
function newHeaderRow(key = "", value = ""): HeaderRow {
  headerRowCounter += 1;
  return { id: `hdr-${headerRowCounter}`, key, value };
}

let paramRowCounter = 0;
function newParamRow(key = "", value = ""): ParamRow {
  paramRowCounter += 1;
  return { id: `param-${paramRowCounter}`, key, value };
}

/**
 * Append non-blank, encoded query-param pairs to the URL. Pairs without a key
 * are skipped. Any "#fragment" is split off before appending so params land in
 * the query string (not the fragment) and is re-appended afterward. Values are
 * encoded but NOT trimmed, so intentional whitespace survives.
 */
function buildEffectiveUrl(url: string, params: ParamRow[]): string {
  const pairs: string[] = [];
  for (const row of params) {
    const key = row.key.trim();
    if (!key) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(row.value)}`);
  }
  if (!pairs.length) return url;

  // Split off any fragment so new params go into the query string, never the
  // fragment (which the server never sees).
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : url.slice(hashIndex);

  // Strip a dangling "?"/"&" so we never emit "?&" or "&&".
  const trimmedBase = base.replace(/[?&]$/, "");
  const separator = trimmedBase.includes("?") ? "&" : "?";

  return `${trimmedBase}${separator}${pairs.join("&")}${fragment}`;
}

/** Escape a single-quoted shell string: close, escaped literal quote, reopen. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Build the effective header map from custom rows + auth + body defaults. */
function buildHeaderEntries(
  headers: HeaderRow[],
  authToken: string,
  hasBody: boolean
): { entries: Array<[string, string]>; droppedRows: number } {
  const entries: Array<[string, string]> = [];
  const seen = new Set<string>();
  let droppedRows = 0;

  for (const row of headers) {
    const key = row.key.trim();
    if (!key) {
      // A blank/whitespace key with a real value is dropped; surface this.
      if (row.value.trim()) droppedRows += 1;
      continue;
    }
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    entries.push([key, row.value]);
  }

  if (authToken.trim() && !seen.has("authorization")) {
    seen.add("authorization");
    entries.push(["Authorization", `Bearer ${authToken.trim()}`]);
  }

  if (hasBody && !seen.has("content-type")) {
    seen.add("content-type");
    entries.push(["Content-Type", "application/json"]);
  }

  return { entries, droppedRows };
}

function indentPython(obj: Record<string, string>): string {
  const lines = Object.entries(obj).map(
    ([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`
  );
  return lines.length ? `{\n${lines.join("\n")}\n}` : "{}";
}

function jsObjectLiteral(entries: Array<[string, string]>): string {
  if (!entries.length) return "{}";
  const lines = entries.map(
    ([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`
  );
  return `{\n${lines.join("\n")}\n  }`;
}

function generateSnippets(
  url: string,
  method: string,
  body: string,
  headers: HeaderRow[],
  authToken: string,
  params: ParamRow[]
): GenerateResult {
  // Trim once so a pasted URL with surrounding whitespace doesn't leak into
  // any of the three emitted snippets.
  const cleanUrl = url.trim();

  // Merge query params once so curl, python, and js all encode the same URL.
  const effectiveUrl = buildEffectiveUrl(cleanUrl, params);

  const trimmedBody = body.trim();
  let parsed: unknown = undefined;
  let hasBodyInput = false;

  if (trimmedBody) {
    try {
      parsed = JSON.parse(trimmedBody);
      hasBodyInput = true;
    } catch {
      return {
        ok: false,
        error: "Request body is not valid JSON. Fix the JSON to generate snippets.",
      };
    }
  }

  // GET/HEAD cannot carry a body, so gate inclusion by method for ALL targets
  // (curl, python, js) so they emit the same request. A body typed for such a
  // method is dropped, and the auto Content-Type header is suppressed with it.
  const includeBody = hasBodyInput && methodAllowsBody(method);
  const bodyOmitted = hasBodyInput && !includeBody;

  // The single canonical payload all three targets encode.
  const canonicalJson = includeBody ? JSON.stringify(parsed) : "";

  const { entries: headerEntries, droppedRows: droppedHeaderRows } =
    buildHeaderEntries(headers, authToken, includeBody);
  const headerObj: Record<string, string> = Object.fromEntries(headerEntries);

  const methodLower = method.toLowerCase();

  // ---- curl ----
  const curlParts = [`curl -X ${method} ${shellSingleQuote(effectiveUrl)}`];
  for (const [k, v] of headerEntries) {
    curlParts.push(`  -H ${shellSingleQuote(`${k}: ${v}`)}`);
  }
  if (includeBody) {
    curlParts.push(`  -d ${shellSingleQuote(canonicalJson)}`);
  }
  const curl = curlParts.join(" \\\n");

  // ---- python ----
  const pyLines = ["import requests", "import json", "", `url = ${JSON.stringify(effectiveUrl)}`];
  pyLines.push(`headers = ${indentPython(headerObj)}`);
  if (includeBody) {
    // JSON.stringify produces a double-quoted string literal whose escaping is
    // also valid Python, so this round-trips any content (incl. quotes/newlines)
    // without the delimiter-collision a raw triple-quoted string can hit.
    pyLines.push(`payload = json.loads(${JSON.stringify(canonicalJson)})`);
    pyLines.push(
      `response = requests.${methodLower}(url, json=payload, headers=headers)`
    );
  } else {
    pyLines.push(`response = requests.${methodLower}(url, headers=headers)`);
  }
  pyLines.push("print(response.text)");
  const python = pyLines.join("\n");

  // ---- js fetch ----
  // fetch() throws if a body is supplied with GET/HEAD; the same method gate
  // (includeBody) keeps all three targets consistent.
  const jsLines = [`fetch(${JSON.stringify(effectiveUrl)}, {`, `  method: ${JSON.stringify(method)},`];
  if (headerEntries.length) {
    jsLines.push(`  headers: ${jsObjectLiteral(headerEntries)},`);
  }
  if (includeBody) {
    jsLines.push(`  body: JSON.stringify(${canonicalJson}),`);
  } else if (bodyOmitted) {
    jsLines.push(`  // body omitted: ${method} requests cannot carry a body`);
  }
  jsLines.push("})");
  jsLines.push("  .then((res) => res.json())");
  jsLines.push("  .then(console.log);");
  const js = jsLines.join("\n");

  return {
    ok: true,
    snippets: { curl, python, js },
    bodyOmitted,
    droppedHeaderRows,
  };
}

const SAMPLE_HEADERS: HeaderRow[] = [
  newHeaderRow("Accept", "application/json"),
  newHeaderRow("X-Client", "snippet-gen"),
];

const SAMPLE_PARAMS: ParamRow[] = [newParamRow("page", "2")];

const SNIPPET_FILENAMES: Record<"curl" | "python" | "js", string> = {
  curl: "request.sh",
  python: "request.py",
  js: "request.js",
};

/** Save snippet text to a file via a transient object URL + <a download>. */
function downloadSnippet(filename: string, contents: string): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch {
    // Best-effort: download is a convenience, never block the UI.
  }
}

const SAMPLE_BODY = JSON.stringify(
  {
    name: "O'Brien",
    active: true,
    role: null,
    tags: ["alpha", "beta"],
  },
  null,
  2
);

export default function ApiSnippetClient() {
  const baseId = useId();
  const urlId = `${baseId}-url`;
  const methodId = `${baseId}-method`;
  const bodyId = `${baseId}-body`;
  const authId = `${baseId}-auth`;

  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [params, setParams] = useState<ParamRow[]>([]);
  const [tab, setTab] = useState<"curl" | "python" | "js">("curl");

  const result = useMemo(
    () => generateSnippets(url, method, body, headers, authToken, params),
    [url, method, body, headers, authToken, params]
  );

  const parseError = result.ok ? null : result.error;
  const snippets = result.ok ? result.snippets : null;
  const bodyOmitted = result.ok ? result.bodyOmitted : false;
  const droppedHeaderRows = result.ok ? result.droppedHeaderRows : 0;
  const hasUrl = url.trim().length > 0;

  const handleSample = () => {
    setUrl("https://api.example.com/v1/users");
    setMethod("POST");
    setBody(SAMPLE_BODY);
    setAuthToken("sk_test_51H8xToken");
    setHeaders(SAMPLE_HEADERS.map((h) => ({ ...h })));
    setParams(SAMPLE_PARAMS.map((p) => ({ ...p })));
  };

  const handleReset = () => {
    setUrl("");
    setMethod("GET");
    setBody("");
    setAuthToken("");
    setHeaders([]);
    setParams([]);
  };

  const addHeader = () => setHeaders((rows) => [...rows, newHeaderRow()]);

  const removeHeader = (id: string) =>
    setHeaders((rows) => rows.filter((r) => r.id !== id));

  const updateHeader = (id: string, patch: Partial<Omit<HeaderRow, "id">>) =>
    setHeaders((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addParam = () => setParams((rows) => [...rows, newParamRow()]);

  const removeParam = (id: string) =>
    setParams((rows) => rows.filter((r) => r.id !== id));

  const updateParam = (id: string, patch: Partial<Omit<ParamRow, "id">>) =>
    setParams((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toolbar = (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleSample}>
        Sample
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleReset}>
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell eyebrow="Request → snippets" toolbar={toolbar}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request definition */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
            <Field label="Method" htmlFor={methodId}>
              <select
                id={methodId}
                className="h-9 w-full px-3 text-sm font-mono"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {httpMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Endpoint URL" htmlFor={urlId}>
              <Input
                id={urlId}
                type="text"
                inputMode="url"
                placeholder="https://api.example.com/v1/users"
                className="font-mono"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Query parameters"
            hint="Appended to the endpoint URL. Keys and values are URL-encoded; rows without a name are ignored."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParam}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            }
          >
            {params.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No query parameters.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {params.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <Input
                      aria-label={`Parameter ${i + 1} name`}
                      placeholder="Key"
                      className="font-mono"
                      value={row.key}
                      onChange={(e) => updateParam(row.id, { key: e.target.value })}
                    />
                    <Input
                      aria-label={`Parameter ${i + 1} value`}
                      placeholder="Value"
                      className="font-mono"
                      value={row.value}
                      onChange={(e) =>
                        updateParam(row.id, { value: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove parameter ${i + 1}`}
                      onClick={() => removeParam(row.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field
            label="Headers"
            hint="Content-Type: application/json is added automatically when a body is present and you haven't set one."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHeader}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            }
          >
            {headers.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No custom headers.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {headers.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <Input
                      aria-label={`Header ${i + 1} name`}
                      placeholder="Header"
                      className="font-mono"
                      value={row.key}
                      onChange={(e) => updateHeader(row.id, { key: e.target.value })}
                    />
                    <Input
                      aria-label={`Header ${i + 1} value`}
                      placeholder="Value"
                      className="font-mono"
                      value={row.value}
                      onChange={(e) =>
                        updateHeader(row.id, { value: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove header ${i + 1}`}
                      onClick={() => removeHeader(row.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {droppedHeaderRows > 0 ? (
              <p className="text-xs text-muted-foreground">
                {droppedHeaderRows === 1
                  ? "1 row without a header name is ignored."
                  : `${droppedHeaderRows} rows without a header name are ignored.`}
              </p>
            ) : null}
          </Field>

          <Field
            label="Bearer token"
            htmlFor={authId}
            hint="Adds an Authorization: Bearer <token> header to every snippet."
          >
            <Input
              id={authId}
              type="text"
              placeholder="optional access token"
              className="font-mono"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </Field>

          <Field
            label="Request body (JSON)"
            htmlFor={bodyId}
            hint={
              bodyOmitted
                ? `Body omitted from all snippets: ${method} requests cannot carry a body.`
                : "Optional for any method. Parsed as JSON and re-serialized into all snippets."
            }
            error={parseError ?? undefined}
          >
            <textarea
              id={bodyId}
              className="min-h-[140px] w-full px-3 py-2 text-sm font-mono"
              placeholder={'{\n  "name": "value",\n  "active": true\n}'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-4">
          {!hasUrl && !parseError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 border-2 border-dashed border-border bg-background p-6 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                Enter an endpoint URL to generate snippets.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleSample}>
                Load a sample request
              </Button>
            </div>
          ) : snippets ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="js">JS fetch</TabsTrigger>
              </TabsList>

              {(["curl", "python", "js"] as const).map((lang) => (
                <TabsContent key={lang} value={lang}>
                  <div className="border-2 border-border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-border px-3 py-2">
                      <span className="brutal-label">
                        {lang === "curl"
                          ? "cURL"
                          : lang === "python"
                            ? "Python requests"
                            : "JavaScript fetch"}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadSnippet(SNIPPET_FILENAMES[lang], snippets[lang])
                          }
                        >
                          <Download className="size-4" aria-hidden="true" />
                          Download
                        </Button>
                        <CopyButton value={snippets[lang]} label="Copy" />
                      </div>
                    </div>
                    <pre className="overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words sm:text-sm">
                      {snippets[lang]}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              {parseError
                ? "Fix the request body JSON above to generate snippets."
                : "Enter an endpoint URL to generate snippets."}
            </p>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
