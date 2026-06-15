"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Sparkles } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const DEFAULT_SQL = `-- Try: SELECT 42 AS answer;`;

const SAMPLE_SQL = `-- Load sample seeds this schema, then runs the SELECT below.
CREATE TABLE users (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  email   TEXT,
  age     INTEGER,
  active  INTEGER DEFAULT 1
);

INSERT INTO users (name, email, age, active) VALUES
  ('Ada Lovelace',   'ada@example.com',   36, 1),
  ('Alan Turing',    'alan@example.com',  41, 1),
  ('Grace Hopper',   'grace@example.com', 85, 0),
  ('Katherine J.',   NULL,                NULL, 1);

SELECT id, name, email, age, active FROM users ORDER BY id;`;

const SQL_JS_CDN_BASE = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0";

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] border-2 border-border bg-background animate-pulse" />
  ),
});

type SqlStatement = {
  getColumnNames: () => string[];
  step: () => boolean;
  get: () => unknown[];
  free: () => void;
};

type SqlDatabase = {
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  iterateStatements: (sql: string) => Iterable<SqlStatement>;
  getRowsModified: () => number;
  close: () => void;
};

type ResultSet = { columns: string[]; values: unknown[][] };

type HighlightFn = (code: string) => string;

let sqlJsModulePromise: Promise<any> | null = null;

declare global {
  interface Window {
    __initSqlJsPromise?: Promise<any>;
    initSqlJs?: any;
  }
}

async function ensureSqlJsLoader() {
  if (typeof window === "undefined") return null;
  const w = window;
  if (w.__initSqlJsPromise) return w.__initSqlJsPromise;
  if (w.initSqlJs) {
    w.__initSqlJsPromise = Promise.resolve(w.initSqlJs);
    return w.__initSqlJsPromise;
  }
  const script = document.createElement("script");
  script.src = `${SQL_JS_CDN_BASE}/sql-wasm.js`;
  script.async = true;

  w.__initSqlJsPromise = new Promise((resolve, reject) => {
    const handleFailure = (error: Error) => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // allow subsequent retries to re-run loader
      delete w.__initSqlJsPromise;
      reject(error);
    };

    script.onload = () => {
      if (w.initSqlJs) {
        resolve(w.initSqlJs);
      } else {
        handleFailure(new Error("SQL.js loader failed to initialize"));
      }
    };
    script.onerror = () => handleFailure(new Error("Failed to load SQL.js script"));
  });

  document.body.appendChild(script);

  return w.__initSqlJsPromise;
}

async function ensureSqlJsModule() {
  if (typeof window === "undefined") return null;
  if (sqlJsModulePromise) return sqlJsModulePromise;

  const loadPromise = (async () => {
    const initSqlJs = await ensureSqlJsLoader();
    if (!initSqlJs) return null;
    return initSqlJs({
      locateFile: (file: string) => `${SQL_JS_CDN_BASE}/${file}`,
    });
  })();

  sqlJsModulePromise = loadPromise.then(
    (module) => module,
    (error) => {
      sqlJsModulePromise = null;
      throw error;
    }
  );

  return sqlJsModulePromise;
}

/** Render a SQLite cell value, handling NULL, BLOB (Uint8Array), number, string. */
function renderCell(cell: unknown): React.ReactNode {
  if (cell === null || cell === undefined) {
    return <span className="text-muted-foreground italic">NULL</span>;
  }
  if (cell instanceof Uint8Array) {
    return <span className="text-muted-foreground">{`BLOB(${cell.length} bytes)`}</span>;
  }
  if (typeof cell === "number" || typeof cell === "bigint") {
    return <span className="tabular-nums">{cell.toString()}</span>;
  }
  return String(cell);
}

/** Plain-text version of a cell, used for CSV/JSON export. */
function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Uint8Array) return `BLOB(${cell.length} bytes)`;
  if (typeof cell === "bigint") return cell.toString();
  return String(cell);
}

/** Export-friendly raw value (BLOB → null, bigint → string) for JSON. */
function cellToJson(cell: unknown): unknown {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Uint8Array) return `BLOB(${cell.length} bytes)`;
  if (typeof cell === "bigint") return cell.toString();
  return cell;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function resultsToCsv(results: ResultSet[]): string {
  return results
    .map((r) => {
      const header = r.columns.map(escapeCsv).join(",");
      const rows = r.values.map((row) => row.map((c) => escapeCsv(cellToText(c))).join(","));
      return [header, ...rows].join("\n");
    })
    .join("\n\n");
}

function resultsToJson(results: ResultSet[]): string {
  const mapped = results.map((r) =>
    r.values.map((row) => {
      const obj: Record<string, unknown> = {};
      r.columns.forEach((col, i) => {
        obj[col] = cellToJson(row[i]);
      });
      return obj;
    })
  );
  // Flatten when there's a single result set for a cleaner export.
  return JSON.stringify(mapped.length === 1 ? mapped[0] : mapped, null, 2);
}

export default function SQLiteClient() {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [results, setResults] = useState<ResultSet[] | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [exportTab, setExportTab] = useState("csv");

  const dbRef = useRef<SqlDatabase | null>(null);
  const sqlModuleRef = useRef<any>(null);
  const highlightRef = useRef<HighlightFn>((value: string) => value);
  const [highlightReady, setHighlightReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const SQL = await ensureSqlJsModule();
        if (cancelled) return;
        if (!SQL) throw new Error("SQL.js failed to initialize");
        sqlModuleRef.current = SQL;
        dbRef.current = new SQL.Database();
        setDbReady(true);
      } catch (err: any) {
        if (cancelled) return;
        setError("Failed to load SQL.js: " + (err?.message || err));
      }
    })();
    return () => {
      cancelled = true;
      // Free the WASM-backed database to avoid leaking memory.
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch {
          /* ignore */
        }
        dbRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prismModule = await import("prismjs");
      await Promise.all([
        import("prismjs/components/prism-sql"),
        import("prismjs/themes/prism-tomorrow.css"),
      ]);
      if (cancelled) return;
      const Prism = prismModule.default ?? prismModule;
      highlightRef.current = (value: string) => Prism.highlight(value, Prism.languages.sql, "sql");
      setHighlightReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSql = (source: string) => {
    const db = dbRef.current;
    if (!db) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setOkMessage(null);
    try {
      // Step statements individually so a query that returns ZERO rows is still
      // recognized as a query (it has column names) and not mislabeled as a
      // write. Writes have no column names; sum their row counts across the batch.
      const out: ResultSet[] = [];
      let sawWrite = false;
      let changed = 0;
      for (const stmt of db.iterateStatements(source)) {
        const columns = stmt.getColumnNames();
        if (columns.length > 0) {
          const values: unknown[][] = [];
          while (stmt.step()) values.push(stmt.get());
          out.push({ columns, values });
        } else {
          stmt.step(); // execute the write/DDL
          sawWrite = true;
          changed += db.getRowsModified();
        }
      }
      if (out.length > 0) {
        setResults(out);
        if (sawWrite) {
          setOkMessage(`Query OK — ${changed} row${changed === 1 ? "" : "s"} changed`);
        }
      } else if (sawWrite) {
        setOkMessage(`Query OK — ${changed} row${changed === 1 ? "" : "s"} changed`);
      } else {
        setOkMessage("Query OK");
      }
    } catch (e: any) {
      setError(e?.message || "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const runQuery = () => runSql(sql);

  const loadSample = () => {
    setSql(SAMPLE_SQL);
    runSql(SAMPLE_SQL);
  };

  const reset = () => {
    // Recreate a fresh in-memory database so seeded tables are dropped.
    const SQL = sqlModuleRef.current;
    if (SQL) {
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch {
          /* ignore */
        }
      }
      dbRef.current = new SQL.Database();
    }
    setSql(DEFAULT_SQL);
    setResults(null);
    setOkMessage(null);
    setError(null);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runQuery();
    }
  };

  const totalRows = useMemo(
    () => (results ? results.reduce((sum, r) => sum + r.values.length, 0) : 0),
    [results]
  );

  const csvValue = useMemo(() => (results ? resultsToCsv(results) : ""), [results]);
  const jsonValue = useMemo(() => (results ? resultsToJson(results) : ""), [results]);

  const downloadCsv = () => download(csvValue, "results.csv", "text/csv;charset=utf-8");
  const downloadJson = () => download(jsonValue, "results.json", "application/json");

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const toolbar = (
    <>
      <Button variant="secondary" size="sm" onClick={loadSample} disabled={!dbReady || loading}>
        <Sparkles aria-hidden="true" />
        Load sample
      </Button>
      <Button variant="outline" size="sm" onClick={reset} disabled={!dbReady || loading}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell eyebrow="SQLite · WASM" toolbar={toolbar}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Label htmlFor="sqlite-editor">SQL query</Label>
          <div
            onKeyDown={handleEditorKeyDown}
            className="border-2 border-border bg-background focus-within:ring-2 focus-within:ring-ring"
          >
            <Editor
              value={sql}
              onValueChange={setSql}
              highlight={(value) => highlightRef.current(value)}
              padding={12}
              className="font-mono text-sm min-h-[200px] w-full text-foreground"
              style={{ minHeight: 200, background: "none", opacity: highlightReady ? 1 : 0.85 }}
              textareaId="sqlite-editor"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runQuery} disabled={!dbReady || loading}>
              <Play aria-hidden="true" />
              {loading ? "Running…" : "Run query"}
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {dbReady ? "Press ⌘/Ctrl + Enter to run" : "Loading SQLite WASM…"}
            </span>
          </div>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <p className="text-xs text-muted-foreground">
            Runs entirely in your browser — your data stays in your browser (the SQLite WASM module
            is fetched once from a CDN).
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {okMessage ? <Alert variant="success">{okMessage}</Alert> : null}

          {results ? (
              <ResultPanel
                title="Results"
                actions={<Badge variant="outline">{`${totalRows} row${totalRows === 1 ? "" : "s"}`}</Badge>}
                scroll
              >
                <div className="overflow-auto">
                  {results.map((result, idx) => (
                    <table key={idx} className="min-w-full font-mono text-sm text-foreground mb-4 last:mb-0">
                      <thead>
                        <tr className="border-b-2 border-border">
                          {result.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-xs text-muted-foreground"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.values.length === 0 ? (
                          <tr>
                            <td
                              colSpan={result.columns.length}
                              className="px-3 py-2 text-muted-foreground italic"
                            >
                              No rows.
                            </td>
                          </tr>
                        ) : (
                          result.values.map((row, i) => (
                            <tr key={i} className="border-b border-border last:border-b-0">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 align-top">
                                  {renderCell(cell)}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ))}
                </div>
              </ResultPanel>
          ) : (
            <ResultPanel title="Results">
              <span className="text-sm text-muted-foreground">
                {okMessage
                  ? "Statement executed — no result set to display."
                  : dbReady
                  ? "Run a query to see results here."
                  : "Loading SQLite WASM…"}
              </span>
            </ResultPanel>
          )}

          {results && results.length > 0 ? (
            <Tabs value={exportTab} onValueChange={setExportTab}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="csv">CSV</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  {exportTab === "csv" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={downloadCsv}>
                        Download .csv
                      </Button>
                      <CopyButton value={() => csvValue} label="Copy CSV" />
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={downloadJson}>
                        Download .json
                      </Button>
                      <CopyButton value={() => jsonValue} label="Copy JSON" />
                    </>
                  )}
                </div>
              </div>
              <TabsContent value="csv">
                <ResultPanel scroll mono bodyClassName="text-xs">
                  {csvValue}
                </ResultPanel>
              </TabsContent>
              <TabsContent value="json">
                <ResultPanel scroll mono bodyClassName="text-xs">
                  {jsonValue}
                </ResultPanel>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </ToolShell>
  );
}
