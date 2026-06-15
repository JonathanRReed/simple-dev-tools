"use client";

import React, { useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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

type SnippetSet = {
  curl: string;
  python: string;
  js: string;
};

type GenerateResult =
  | { ok: true; snippets: SnippetSet }
  | { ok: false; error: string };

let headerRowCounter = 0;
function newHeaderRow(key = "", value = ""): HeaderRow {
  headerRowCounter += 1;
  return { id: `hdr-${headerRowCounter}`, key, value };
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
): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  const seen = new Set<string>();

  for (const row of headers) {
    const key = row.key.trim();
    if (!key) continue;
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

  return entries;
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
  authToken: string
): GenerateResult {
  const trimmedBody = body.trim();
  let parsed: unknown = undefined;
  let hasBody = false;

  if (trimmedBody) {
    try {
      parsed = JSON.parse(trimmedBody);
      hasBody = true;
    } catch {
      return {
        ok: false,
        error: "Request body is not valid JSON. Fix the JSON to generate snippets.",
      };
    }
  }

  // The single canonical payload all three targets encode.
  const canonicalJson = hasBody ? JSON.stringify(parsed) : "";

  const headerEntries = buildHeaderEntries(headers, authToken, hasBody);
  const headerObj: Record<string, string> = Object.fromEntries(headerEntries);

  const methodLower = method.toLowerCase();

  // ---- curl ----
  const curlParts = [`curl -X ${method} ${shellSingleQuote(url)}`];
  for (const [k, v] of headerEntries) {
    curlParts.push(`  -H ${shellSingleQuote(`${k}: ${v}`)}`);
  }
  if (hasBody) {
    curlParts.push(`  -d ${shellSingleQuote(canonicalJson)}`);
  }
  const curl = curlParts.join(" \\\n");

  // ---- python ----
  const pyLines = ["import requests", "import json", "", `url = ${JSON.stringify(url)}`];
  pyLines.push(`headers = ${indentPython(headerObj)}`);
  if (hasBody) {
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
  // fetch() throws if a body is supplied with GET/HEAD, so omit it there.
  const jsBodyAllowed = hasBody && method !== "GET" && method !== "HEAD";
  const jsLines = [`fetch(${JSON.stringify(url)}, {`, `  method: ${JSON.stringify(method)},`];
  if (headerEntries.length) {
    jsLines.push(`  headers: ${jsObjectLiteral(headerEntries)},`);
  }
  if (jsBodyAllowed) {
    jsLines.push(`  body: JSON.stringify(${canonicalJson}),`);
  } else if (hasBody) {
    jsLines.push(`  // body omitted: fetch() does not allow a body with ${method}`);
  }
  jsLines.push("})");
  jsLines.push("  .then((res) => res.json())");
  jsLines.push("  .then(console.log);");
  const js = jsLines.join("\n");

  return { ok: true, snippets: { curl, python, js } };
}

const SAMPLE_HEADERS: HeaderRow[] = [
  newHeaderRow("Accept", "application/json"),
  newHeaderRow("X-Client", "snippet-gen"),
];

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
  const [tab, setTab] = useState<"curl" | "python" | "js">("curl");

  const result = useMemo(
    () => generateSnippets(url, method, body, headers, authToken),
    [url, method, body, headers, authToken]
  );

  const parseError = result.ok ? null : result.error;
  const snippets = result.ok ? result.snippets : null;
  const hasUrl = url.trim().length > 0;

  const handleSample = () => {
    setUrl("https://api.example.com/v1/users");
    setMethod("POST");
    setBody(SAMPLE_BODY);
    setAuthToken("sk_test_51H8xToken");
    setHeaders(SAMPLE_HEADERS.map((h) => ({ ...h })));
  };

  const handleReset = () => {
    setUrl("");
    setMethod("GET");
    setBody("");
    setAuthToken("");
    setHeaders([]);
  };

  const addHeader = () => setHeaders((rows) => [...rows, newHeaderRow()]);

  const removeHeader = (id: string) =>
    setHeaders((rows) => rows.filter((r) => r.id !== id));

  const updateHeader = (id: string, patch: Partial<Omit<HeaderRow, "id">>) =>
    setHeaders((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

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
            hint="Optional for any method. Parsed as JSON and re-serialized into all snippets."
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
                      <CopyButton value={snippets[lang]} label="Copy" />
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
