"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Sparkles } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { FileDrop } from "@/components/FileDrop";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { readShareParams } from "@/lib/share";
import { downloadFile } from "@/lib/download";
import { useHotkey } from "@/hooks/use-hotkey";
import { useVirtualizer } from "@tanstack/react-virtual";

import { SqliteExecutor, SqliteWorkerFailure, type SqliteResultSet } from "@/lib/sqlite-executor";
import { useStoredState } from "@/hooks/use-stored-state";


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

/** localStorage key for persisting the SQL editor buffer across reloads. Settings/input
 *  only — never secrets. Guarded for static export (typeof window + try/catch). */
const SQL_STORAGE_KEY = "sdt:sqlite:sql";

const CodeEditor = dynamic(() => import("@/components/tool/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] border-2 border-border bg-background animate-pulse" />
  ),
});

type ResultSet = SqliteResultSet;

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

/**
 * A single result set, windowed.
 *
 * Every returned row used to be mounted, so a result in the tens of thousands
 * built hundreds of thousands of cells in one commit and locked the tab up.
 * This keeps the semantic <table> — and its header, scopes and caption — and
 * windows the body with spacer rows, so the whole result is scrollable without
 * all of it being in the DOM.
 */
function ResultTable({ result }: { result: ResultSet }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: result.values.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 37,
    overscan: 16,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div ref={scrollRef} className="max-h-[420px] overflow-auto" tabIndex={0} role="region" aria-label="Query results">
      <table className="min-w-full font-mono text-sm text-foreground">
        <caption className="sr-only">
          {result.values.length} rows by {result.columns.length} columns
        </caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b-2 border-border">
            {result.columns.map((col, i) => (
              <th
                key={`${col}-${i}`}
                scope="col"
                className="bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.values.length === 0 ? (
            <tr>
              <td colSpan={result.columns.length} className="px-3 py-2 italic text-muted-foreground">
                No rows.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td aria-hidden="true" colSpan={result.columns.length} style={{ height: paddingTop }}>&nbsp;</td>
                </tr>
              ) : null}
              {virtualRows.map((virtualRow) => {
                const row = result.values[virtualRow.index];
                return (
                  <tr
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="border-b border-border last:border-b-0"
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 align-top">
                        {renderCell(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td aria-hidden="true" colSpan={result.columns.length} style={{ height: paddingBottom }}>&nbsp;</td>
                </tr>
              ) : null}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SQLiteClient() {
  const [sql, setSql, clearSql] = useStoredState(SQL_STORAGE_KEY, DEFAULT_SQL);
  const [results, setResults] = useState<ResultSet[] | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [exportTab, setExportTab] = useState("csv");

  const executorRef = useRef<SqliteExecutor | null>(null);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const [warning, setWarning] = useState<string | null>(null);
  const stopSession = useCallback(() => {
    generationRef.current++;
    executorRef.current?.stop();
    executorRef.current = null;
    busyRef.current = false;
  }, []);
  const startSession = useCallback(() => {
    stopSession();
    setDbReady(false);
    setLoading(false);
    try {
      const executor = new SqliteExecutor();
      executorRef.current = executor;
      executor.ready.then(() => {
        if (executorRef.current === executor) setDbReady(true);
      }).catch((reason: Error) => {
        if (executorRef.current === executor) setError(reason.message);
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SQLite worker could not start.");
    }
  }, [stopSession]);

  // URL hash share state takes precedence over localStorage (hydrated by useStoredState).
  useEffect(() => {
    const params = readShareParams();
    if (!params) return;
    if (typeof params.sql === "string") setSql(params.sql);
  }, [setSql]);

  useEffect(() => {
    startSession();
    return stopSession;
  }, [startSession, stopSession]);

  const runSql = async (source: string, fresh = false) => {
    const executor = executorRef.current;
    if (!executor || !dbReady || busyRef.current) return;
    busyRef.current = true;
    const generation = generationRef.current;
    setLoading(true);
    setError(null);
    setResults(null);
    setOkMessage(null);
    setWarning(null);
    try {
      const reply = await executor.run(source, fresh);
      if (generationRef.current !== generation) return;
      setResults(reply.results.length ? reply.results : null);
      setOkMessage(reply.sawWrite ? `Query OK. ${reply.changed} row${reply.changed === 1 ? "" : "s"} changed` : "Query OK");
      if (reply.truncated) setWarning("Result limit reached (10,000 rows, 20 result sets, 100 statements, or 4 MB). Only displayed rows are exported. Remaining statements were not executed.");
    } catch (reason) {
      if (generationRef.current !== generation) return;
      if (reason instanceof SqliteWorkerFailure && reason.databaseLost) startSession();
      setError(reason instanceof Error ? reason.message : "Query failed.");
    } finally {
      if (generationRef.current === generation) { busyRef.current = false; setLoading(false); }
    }
  };
  const runQuery = () => { void runSql(sql); };
  const loadSample = () => { setSql(SAMPLE_SQL); void runSql(SAMPLE_SQL, true); };
  const reset = () => {
    startSession();
    clearSql();
    setSql(DEFAULT_SQL);
    setResults(null);
    setOkMessage(null);
    setError(null);
    setWarning(null);
  };
  const cancelQuery = () => {
    startSession();
    setResults(null);
    setOkMessage(null);
    setWarning(null);
    setError("Query cancelled. The in-memory database was discarded; load the sample or create your tables again.");
  };

  useHotkey(
    "mod+enter",
    (event) => {
      event.preventDefault();
      if (!dbReady || loading) return;
      runQuery();
    },
    { allowInInput: true }
  );

  const totalRows = useMemo(
    () => (results ? results.reduce((sum, r) => sum + r.values.length, 0) : 0),
    [results]
  );

  // Only the visible tab's serialisation is built. Both were computed for every
  // result set, so a large result was serialised twice — into CSV and into
  // pretty-printed JSON — before either export tab was opened.
  const exportValue = useMemo(() => {
    if (!results) return "";
    return exportTab === "csv" ? resultsToCsv(results) : resultsToJson(results);
  }, [results, exportTab]);

  const downloadCsv = () => downloadFile(exportValue, "results.csv", "text/csv;charset=utf-8");
  const downloadJson = () => downloadFile(exportValue, "results.json", "application/json");

  const handleFileText = (text: string) => {
    setSql(text);
  };

  const shareParams = () => {
    if (!sql.trim()) return null;
    return { sql };
  };

  const toolbar = (
    <>
      <Button variant="secondary" size="sm" onClick={loadSample} disabled={!dbReady || loading}>
        <Sparkles aria-hidden="true" />
        Load sample
      </Button>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  const shortcuts = [
    { keys: "⌘ ↵", description: "Run query" },
    { keys: "⌘ F", description: "Find in the editor" },
    { keys: "⌘ ]", description: "Indent selection" },
  ];

  return (
    <ToolShell
      eyebrow="SQLite · WASM"
      toolbar={toolbar}
      shareParams={shareParams}
      shortcuts={shortcuts}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Label htmlFor="sqlite-editor">SQL query</Label>
          <FileDrop
            onFileText={handleFileText}
            accept=".sql,.txt,text/plain"
            label="Import SQL"
            className="border-2 border-border bg-background focus-within:ring-2 focus-within:ring-ring"
          >
            <CodeEditor
              value={sql}
              onChange={setSql}
              language="sql"
              id="sqlite-editor"
              ariaLabel="SQL query"
              placeholder="SELECT * FROM users;"
              minHeight={200}
            />
          </FileDrop>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runQuery} disabled={!dbReady || loading}>
              <Play aria-hidden="true" />
              {loading ? "Running…" : "Run query"}
            </Button>
            {loading && <Button variant="outline" onClick={cancelQuery}>Cancel and discard database</Button>}
            <span className="font-mono text-xs text-muted-foreground">
              {dbReady ? "Press ⌘/Ctrl + Enter to run" : "Loading SQLite WASM…"}
            </span>
          </div>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {warning ? <Alert variant="warning">{warning}</Alert> : null}
          <p className="text-xs text-muted-foreground">
            Runs entirely in your browser. Your data stays in your browser (the SQLite WASM module
            is served from this site’s own origin). Queries run in a separate worker and stop after 5 seconds. Cancel, timeout, or Reset discards the in-memory database; the SQL editor text is kept unless you choose Reset.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {okMessage ? <Alert variant="success">{okMessage}</Alert> : null}

          {results ? (
              <ResultPanel
                title="Results"
                actions={<Badge variant="outline">{`${totalRows} row${totalRows === 1 ? "" : "s"}`}</Badge>}
                bodyClassName="p-0"
              >
                {/* Each ResultTable owns its own scroll viewport. The panel used
                    to add a second one around them, so on a wide result the
                    horizontal scrollbar sat at the bottom of the content rather
                    than the visible window — you had to scroll to the end of the
                    rows to reach it. */}
                <div>
                  {results.map((result, idx) => (
                    <div key={idx} className="border-b-2 border-border last:border-b-0">
                      {results.length > 1 ? (
                        <p className="brutal-label px-3 pt-2">
                          {`#${idx + 1} · ${result.values.length} row${
                            result.values.length === 1 ? "" : "s"
                          } × ${result.columns.length} col${
                            result.columns.length === 1 ? "" : "s"
                          }`}
                        </p>
                      ) : null}
                      <ResultTable result={result} />
                    </div>
                  ))}
                </div>
              </ResultPanel>
          ) : (
            <ResultPanel title="Results">
              <span className="text-sm text-muted-foreground">
                {okMessage
                  ? "Statement executed. No result set to display."
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
                      <CopyButton value={() => exportValue} label="Copy CSV" />
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={downloadJson}>
                        Download .json
                      </Button>
                      <CopyButton value={() => exportValue} label="Copy JSON" />
                    </>
                  )}
                </div>
              </div>
              <TabsContent value="csv">
                <ResultPanel scroll mono bodyClassName="text-xs">
                  {exportValue}
                </ResultPanel>
              </TabsContent>
              <TabsContent value="json">
                <ResultPanel scroll mono bodyClassName="text-xs">
                  {exportValue}
                </ResultPanel>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </ToolShell>
  );
}
