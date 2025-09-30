"use client";
import React, { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism-tomorrow.css";

import ToolPage from '@/components/layout/ToolPage';

const DEFAULT_SQL = `-- Try: SELECT 42 AS answer;`;

export default function SQLitePlayground() {
  const [db, setDb] = useState<any>(null);
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sqlJsLoaded, setSqlJsLoaded] = useState(false);

  // Dynamically load SQL.js from CDN only on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).initSqlJs) {
      setSqlJsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js";
    script.async = true;
    script.onload = () => setSqlJsLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize the database after SQL.js is loaded
  useEffect(() => {
    if (!sqlJsLoaded || db) return;
    (async () => {
      try {
        // @ts-ignore
        const SQL = await (window as any).initSqlJs({
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`,
        });
        setDb(new SQL.Database());
      } catch (err: any) {
        setError("Failed to load SQL.js: " + err.message);
      }
    })();
  }, [sqlJsLoaded, db]);

  const highlight = (code: string) => Prism.highlight(code, Prism.languages.sql, "sql");

  const runQuery = () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = db.exec(sql);
      setResults(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  function ResultsTable({ results }: { results: any[] }) {
    if (!results.length) return <div className="text-rp-muted mt-4">No results.</div>;
    return (
      <div className="h-full overflow-auto">
        {results.map((result, idx) => (
          <table key={idx} className="min-w-full text-sm text-rp-text mb-4">
            <thead>
              <tr>
                {result.columns.map((col: string) => (
                  <th key={col} className="px-3 py-2 text-left font-bold text-rp-iris">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.values.map((row: any[], i: number) => (
                <tr key={i} className="even:bg-rp-highlight-low/40">
                  {row.map((cell: any, j: number) => (
                    <td key={j} className="px-3 py-2">{cell as string}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    );
  }

  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 sm:px-8 py-8 flex flex-col gap-6 relative border border-rp-highlight-high" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-rp-iris drop-shadow">SQLite WASM Playground</h2>
          <p className="text-sm text-rp-subtle max-w-2xl">Run SQL experiments locally in your browser. Write statements on the left, execute instantly, and explore results without any backend.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] items-start">
          <div className="flex flex-col gap-3">
            <Editor
              value={sql}
              onValueChange={setSql}
              highlight={highlight}
              padding={12}
              className="rounded-xl bg-rp-surface/70 border border-rp-highlight-high text-rp-text font-mono text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-rp-iris w-full"
              style={{ minHeight: 160, background: "none" }}
              textareaId="sqlite-editor"
              textareaClassName="hidden"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="px-6 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
                onClick={runQuery}
                disabled={!db || loading}
              >
                {loading ? "Running..." : "Run Query"}
              </button>
              {error && <div className="text-rp-love text-xs">{error}</div>}
            </div>
          </div>
          <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-4 min-h-[200px]">
            {results ? <ResultsTable results={results} /> : (
              <div className="text-sm text-rp-subtle">
                {db ? 'Run a query to see results here.' : 'Loading SQLite WASM…'}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
