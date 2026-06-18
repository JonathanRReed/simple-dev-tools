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

/** localStorage key for persisting the SQL editor buffer across reloads. Settings/input
 *  only — never secrets. Guarded for static export (typeof window + try/catch). */
const SQL_STORAGE_KEY = "sdt:sqlite:sql";

function loadStoredSql(): string {
  if (typeof window === "undefined") return DEFAULT_SQL;
  try {
    const saved = window.localStorage.getItem(SQL_STORAGE_KEY);
    return saved ?? DEFAULT_SQL;
  } catch {
    return DEFAULT_SQL;
  }
}

function persistSql(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SQL_STORAGE_KEY, value);
  } catch {
    /* ignore (private mode / quota) */
  }
}

function clearStoredSql(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SQL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] border-2 border-border bg-background animate-pulse" />
  ),
});

type SqlStatement = {
  getColumnNames: () => string[];
  getSQL?: () => string;
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

/** Escape HTML-special characters. Used as the fallback highlighter so that, before
 *  Prism loads (or if its chunk fails), typed SQL is rendered as text rather than raw
 *  HTML — react-simple-code-editor injects the result via dangerouslySetInnerHTML. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

/** True when a SQL statement is DML (INSERT/UPDATE/DELETE/REPLACE) and therefore
 *  actually affects sqlite3_changes(). DDL/PRAGMA do not touch the changes counter,
 *  so re-reading getRowsModified() after them would double-count the prior DML. */
function isDmlStatement(sql: string): boolean {
  // Strip leading whitespace and SQL comments (-- line and /* block */) so we can
  // read the real leading keyword.
  let s = sql;
  let prev;
  do {
    prev = s;
    s = s.replace(/^\s+/, "");
    s = s.replace(/^--[^\n\r]*/, "");
    s = s.replace(/^\/\*[\s\S]*?\*\//, "");
  } while (s !== prev);
  return /^(insert|update|delete|replace)\b/i.test(s);
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

/** Encode bytes as base64 so BLOBs export round-trippably instead of being dropped. */
function blobToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === "function" ? btoa(binary) : "";
}

/** Plain-text version of a cell, used for CSV export. BLOBs export as a base64 string. */
function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Uint8Array) return blobToBase64(cell);
  if (typeof cell === "bigint") return cell.toString();
  return String(cell);
}

/** Export-friendly raw value (BLOB → base64 string, bigint → string) for JSON. */
function cellToJson(cell: unknown): unknown {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Uint8Array) return blobToBase64(cell);
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

/** Disambiguate duplicate column names (e.g. SELECT * across a join) so that
 *  building row objects never drops a column's value. */
function dedupeColumns(columns: string[]): string[] {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const n = (seen.get(col) ?? 0) + 1;
    seen.set(col, n);
    return n === 1 ? col : `${col}_${n}`;
  });
}

function resultsToJson(results: ResultSet[]): string {
  const mapped = results.map((r) => {
    const keys = dedupeColumns(r.columns);
    return r.values.map((row) => {
      const obj: Record<string, unknown> = {};
      keys.forEach((key, i) => {
        obj[key] = cellToJson(row[i]);
      });
      return obj;
    });
  });
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
  const highlightRef = useRef<HighlightFn>(escapeHtml);
  const [highlightReady, setHighlightReady] = useState(false);

  // Hydrate the editor buffer from localStorage after mount so the static-export
  // markup (DEFAULT_SQL) and first client render match, avoiding a hydration mismatch.
  useEffect(() => {
    const stored = loadStoredSql();
    if (stored !== DEFAULT_SQL) setSql(stored);
  }, []);

  // Persist the editor buffer whenever it changes (guarded, settings-only).
  useEffect(() => {
    persistSql(sql);
  }, [sql]);

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
        try {
          const columns = stmt.getColumnNames();
          if (columns.length > 0) {
            const values: unknown[][] = [];
            while (stmt.step()) values.push(stmt.get());
            out.push({ columns, values });
          } else {
            stmt.step(); // execute the write/DDL
            sawWrite = true;
            // Only DML (INSERT/UPDATE/DELETE/REPLACE) updates sqlite3_changes().
            // A trailing DDL/PRAGMA leaves the counter at the previous DML's value,
            // so adding it again would double-count. Guard with isDmlStatement().
            const stmtSql = stmt.getSQL?.() ?? "";
            if (isDmlStatement(stmtSql)) {
              changed += db.getRowsModified();
            }
          }
        } finally {
          // Finalize each prepared statement so it doesn't keep tables locked
          // for later DROP/ALTER in the same session. free() is idempotent.
          stmt.free();
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
    // Reset to a fresh database before seeding (mirrors reset()) so SAMPLE_SQL's
    // CREATE TABLE is always re-runnable — without this, a 2nd click (or any prior
    // table creation) throws "table users already exists" and aborts the batch.
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
    // Clear the persisted buffer so Reset durably restores the default. (The persist
    // effect re-writes DEFAULT_SQL on the setSql below, which is equivalent: an absent
    // key and a stored DEFAULT_SQL both hydrate back to the default on reload.)
    clearStoredSql();
    setSql(DEFAULT_SQL);
    setResults(null);
    setOkMessage(null);
    setError(null);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      // Match the Run button's disabled state so keyboard and button behave the same.
      if (!dbReady || loading) return;
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
    // Defer revocation so the download isn't aborted in stricter browsers that
    // read the blob URL asynchronously after click().
    setTimeout(() => URL.revokeObjectURL(url), 0);
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
                    <div key={idx} className="mb-4 last:mb-0">
                      {results.length > 1 ? (
                        <p className="brutal-label mb-1">
                          {`#${idx + 1} · ${result.values.length} row${
                            result.values.length === 1 ? "" : "s"
                          } × ${result.columns.length} col${
                            result.columns.length === 1 ? "" : "s"
                          }`}
                        </p>
                      ) : null}
                      <table className="min-w-full font-mono text-sm text-foreground">
                      <thead>
                        <tr className="border-b-2 border-border">
                          {result.columns.map((col, i) => (
                            <th
                              key={`${col}-${i}`}
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
                    </div>
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
