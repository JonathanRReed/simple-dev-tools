"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";

import type { ToolShortcut } from "@/components/KeyboardShortcuts";
import ToolShell from "@/components/tool/ToolShell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { useHotkey } from "@/hooks/use-hotkey";
import { useStoredState } from "@/hooks/use-stored-state";
import { readShareParams } from "@/lib/share";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sdt:query:input";

const SAMPLE = "https://tools.example.com/search?q=hello+world&page=1&filters=active&filters=paid&tag=dev-tools";

type OutputMode = "query" | "url" | "form";

const MODES: { id: OutputMode; label: string }[] = [
  { id: "query", label: "Query string" },
  { id: "url", label: "Full URL" },
  { id: "form", label: "Form body" },
];

type Row = {
  id: string;
  key: string;
  value: string;
  keyInput: string;
  valueInput: string;
  keyError: boolean;
  valueError: boolean;
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Encode a decoded value for application/x-www-form-urlencoded output. */
function encodeForm(value: string, spacePlus: boolean): string {
  const encoded = encodeURIComponent(value);
  return spacePlus ? encoded.replace(/%20/g, "+") : encoded;
}

/** Try to decode a raw, encoded cell value back to its decoded form. */
function tryDecode(raw: string, spacePlus: boolean): { ok: true; value: string } | { ok: false } {
  const prepared = spacePlus ? raw.replace(/\+/g, " ") : raw;
  try {
    return { ok: true, value: decodeURIComponent(prepared) };
  } catch {
    return { ok: false };
  }
}

/** Decode a query/form value: '+' is space, then percent-decode. */
function decodeForm(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

/** Extract the query string and base URL from a pasted query, URL, or form body. */
function extractQuery(input: string): { base: string; query: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { base: "", query: "" };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const base = `${url.origin}${url.pathname}`;
      const query = url.search.startsWith("?") ? url.search.slice(1) : url.search;
      return { base, query };
    } catch {
      // fall through to raw query parsing
    }
  }

  if (trimmed.startsWith("?")) {
    return { base: "", query: trimmed.slice(1) };
  }

  return { base: "", query: trimmed };
}

/** Parse a raw query string into decoded rows, preserving duplicates and order. */
function parseRows(query: string, showDecoded: boolean, spacePlus: boolean): Row[] {
  const normalized = query.replace(/\r?\n/g, "&").trim();
  const segments = normalized.split("&").filter((s) => s.length > 0);

  return segments.map((seg) => {
    const eq = seg.indexOf("=");
    const rawKey = eq === -1 ? seg : seg.slice(0, eq);
    const rawValue = eq === -1 ? "" : seg.slice(eq + 1);
    const key = decodeForm(rawKey);
    const value = decodeForm(rawValue);

    return {
      id: newId(),
      key,
      value,
      keyInput: showDecoded ? key : encodeForm(key, spacePlus),
      valueInput: showDecoded ? value : encodeForm(value, spacePlus),
      keyError: false,
      valueError: false,
    };
  });
}

/** Build the re-encoded output from the current rows and options. */
function buildOutput(rows: Row[], mode: OutputMode, baseUrl: string, spacePlus: boolean): string {
  const pairs = rows
    .map((row) => `${encodeForm(row.key, spacePlus)}=${encodeForm(row.value, spacePlus)}`)
    .join("&");

  if (!pairs) {
    return "";
  }

  if (mode === "url") {
    const base = baseUrl.trim().replace(/[?#].*$/, "");
    return base ? `${base}?${pairs}` : `?${pairs}`;
  }

  return pairs;
}

/** Recompute the visible input strings for a row after the display/spacing toggle changes. */
function refreshDisplay(row: Row, showDecoded: boolean, spacePlus: boolean): Row {
  return {
    ...row,
    keyInput: showDecoded ? row.key : encodeForm(row.key, spacePlus),
    valueInput: showDecoded ? row.value : encodeForm(row.value, spacePlus),
    keyError: false,
    valueError: false,
  };
}

export default function QueryClient() {
  const [input, setInput, clearInput] = useStoredState(STORAGE_KEY, "");
  const [rows, setRows] = useState<Row[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [mode, setMode] = useState<OutputMode>("query");
  const [spacePlus, setSpacePlus] = useState(true);
  const [showDecoded, setShowDecoded] = useState(true);
  const baseId = useId();

  // URL hash share state takes precedence over localStorage (hydrated by useStoredState).
  useEffect(() => {
    let active = true;
    readShareParams().then((params) => {
      if (!active || !params) return;
      if (typeof params.q === "string") setInput(params.q);
      if (
        typeof params.mode === "string" &&
        MODES.some((m) => m.id === params.mode)
      ) {
        setMode(params.mode as OutputMode);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse the source input into rows and a base URL whenever the source changes.
  useEffect(() => {
    const { base, query } = extractQuery(input);
    setBaseUrl(base);
    setRows(parseRows(query, showDecoded, spacePlus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // When the display toggle or spacing changes, refresh the visible cell values.
  useEffect(() => {
    setRows((prev) => prev.map((row) => refreshDisplay(row, showDecoded, spacePlus)));
  }, [showDecoded, spacePlus]);

  const output = useMemo(() => buildOutput(rows, mode, baseUrl, spacePlus), [rows, mode, baseUrl, spacePlus]);

  const hasErrors = useMemo(
    () => rows.some((r) => r.keyError || r.valueError),
    [rows]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: newId(),
        key: "",
        value: "",
        keyInput: "",
        valueInput: "",
        keyError: false,
        valueError: false,
      },
    ]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const updateKey = useCallback(
    (id: string, next: string) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;

          if (showDecoded) {
            return { ...row, key: next, keyInput: next, keyError: false };
          }

          const res = tryDecode(next, spacePlus);
          if (res.ok) {
            return { ...row, key: res.value, keyInput: next, keyError: false };
          }

          return { ...row, keyInput: next, keyError: true };
        })
      );
    },
    [showDecoded, spacePlus]
  );

  const updateValue = useCallback(
    (id: string, next: string) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;

          if (showDecoded) {
            return { ...row, value: next, valueInput: next, valueError: false };
          }

          const res = tryDecode(next, spacePlus);
          if (res.ok) {
            return { ...row, value: res.value, valueInput: next, valueError: false };
          }

          return { ...row, valueInput: next, valueError: true };
        })
      );
    },
    [showDecoded, spacePlus]
  );

  const handleSample = useCallback(() => {
    setInput(SAMPLE);
  }, [setInput]);

  const handleReset = useCallback(() => {
    clearInput();
    setMode("query");
    setSpacePlus(true);
    setShowDecoded(true);
    setBaseUrl("");
    setRows([]);
  }, [clearInput]);

  const shareParams = useCallback(() => {
    if (!input.trim()) return null;
    return { q: input, mode };
  }, [input, mode]);

  const shortcuts: ToolShortcut[] = useMemo(
    () => [
      { keys: "Alt Shift A", description: "Add a parameter row" },
      { keys: "Alt Shift S", description: "Load sample" },
      { keys: "Alt Shift R", description: "Reset" },
    ],
    []
  );

  useHotkey("alt+shift+a", addRow);
  useHotkey("alt+shift+s", handleSample);
  useHotkey("alt+shift+r", handleReset);

  const toolbar = (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={handleSample}>
        <Sparkles className="size-4" aria-hidden="true" />
        Sample
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleReset}>
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell
      eyebrow="Querystring Editor"
      toolbar={toolbar}
      shareParams={shareParams}
      shortcuts={shortcuts}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Field label="Source" htmlFor={`${baseId}-source`} className="min-w-0">
            <textarea
              id={`${baseId}-source`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="Paste a query string, full URL, or form body…"
              className="min-h-[120px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label id={`${baseId}-mode-label`} className="brutal-label">
                Mode
              </Label>
              <div
                role="group"
                aria-labelledby={`${baseId}-mode-label`}
                className="flex flex-wrap gap-1"
              >
                {MODES.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={mode === m.id ? "default" : "outline"}
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label id={`${baseId}-space-label`} className="brutal-label">
                Spaces
              </Label>
              <div
                role="group"
                aria-labelledby={`${baseId}-space-label`}
                className="flex flex-wrap gap-1"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={spacePlus ? "default" : "outline"}
                  onClick={() => setSpacePlus(true)}
                  aria-pressed={spacePlus}
                  aria-label="Encode spaces as plus"
                >
                  +
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!spacePlus ? "default" : "outline"}
                  onClick={() => setSpacePlus(false)}
                  aria-pressed={!spacePlus}
                  aria-label="Encode spaces as percent twenty"
                >
                  %20
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label id={`${baseId}-decode-label`} className="brutal-label">
                Values
              </Label>
              <div
                role="group"
                aria-labelledby={`${baseId}-decode-label`}
                className="flex flex-wrap gap-1"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={showDecoded ? "default" : "outline"}
                  onClick={() => setShowDecoded(true)}
                  aria-pressed={showDecoded}
                >
                  Decoded
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!showDecoded ? "default" : "outline"}
                  onClick={() => setShowDecoded(false)}
                  aria-pressed={!showDecoded}
                >
                  Raw
                </Button>
              </div>
            </div>
          </div>

          {mode === "url" && (
            <Field
              label="Base URL"
              htmlFor={`${baseId}-base`}
              hint="Origin and path used when building the full URL."
              className="min-w-0"
            >
              <Input
                id={`${baseId}-base`}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://example.com/path"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
          )}

          <Field
            label="Parameters"
            action={
              <div className="flex items-center gap-2">
                <Badge variant="outline">{rows.length}</Badge>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add row
                </Button>
              </div>
            }
            className="min-w-0"
          >
            <div className="border-2 border-border">
              <table className="w-full border-collapse">
                <caption className="sr-only">Editable query parameters</caption>
                <thead>
                  <tr className="border-b-2 border-border bg-secondary text-left">
                    <th scope="col" className="brutal-label px-3 py-2">
                      Key
                    </th>
                    <th scope="col" className="brutal-label px-3 py-2">
                      Value
                    </th>
                    <th scope="col" className="brutal-label px-3 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const keyId = `${baseId}-key-${row.id}`;
                    const valId = `${baseId}-val-${row.id}`;
                    return (
                      <tr
                        key={row.id}
                        className="border-b-2 border-border last:border-b-0"
                      >
                        <td className="p-2">
                          <label htmlFor={keyId} className="sr-only">
                            Parameter {i + 1} key
                          </label>
                          <Input
                            id={keyId}
                            value={row.keyInput}
                            onChange={(e) => updateKey(row.id, e.target.value)}
                            placeholder="key"
                            spellCheck={false}
                            className={cn(
                              "font-mono text-sm",
                              row.keyError && "border-destructive"
                            )}
                            aria-invalid={row.keyError}
                          />
                        </td>
                        <td className="p-2">
                          <label htmlFor={valId} className="sr-only">
                            Parameter {i + 1} value
                          </label>
                          <Input
                            id={valId}
                            value={row.valueInput}
                            onChange={(e) => updateValue(row.id, e.target.value)}
                            placeholder="value"
                            spellCheck={false}
                            className={cn(
                              "font-mono text-sm",
                              row.valueError && "border-destructive"
                            )}
                            aria-invalid={row.valueError}
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove parameter"
                            onClick={() => removeRow(row.id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="px-3 py-4 text-sm font-mono text-muted-foreground">
                  Paste a query above to populate rows, or add one manually.
                </p>
              )}
            </div>
          </Field>

          {hasErrors && (
            <Alert variant="warning">
              Some raw values could not be decoded. Output uses the last valid value for those fields.
            </Alert>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <ResultPanel
            title={`Output · ${MODES.find((m) => m.id === mode)?.label ?? mode}`}
            copyValue={output}
            mono
          >
            {output ? (
              <output aria-live="polite" aria-atomic="true" className="block">
                {output}
              </output>
            ) : (
              <span className="text-sm text-muted-foreground">
                Add or paste parameters to build output.
              </span>
            )}
          </ResultPanel>
        </div>
      </div>
    </ToolShell>
  );
}
