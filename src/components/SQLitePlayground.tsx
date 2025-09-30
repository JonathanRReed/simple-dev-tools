"use client";
import React, { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism-tomorrow.css";

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
      <div className="overflow-auto rounded-xl border border-rp-highlight-high bg-rp-overlay/70 mt-4">
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
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-8 py-10 max-w-3xl w-full flex flex-col items-center gap-6 relative border border-rp-highlight-high" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <h2 className="text-3xl font-bold text-rp-iris mb-2 text-center drop-shadow">SQLite WASM Playground</h2>
        <p className="text-rp-subtle mb-4 text-center max-w-xl">Run SQL queries on SQLite directly in your browser. No server or database required!</p>
        <Editor
          value={sql}
          onValueChange={setSql}
          highlight={highlight}
          padding={12}
          className="rounded-xl bg-rp-surface/70 border border-rp-highlight-high text-rp-text font-mono text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-rp-iris w-full"
          style={{ minHeight: 90, background: "none" }}
          textareaId="sqlite-editor"
          textareaClassName="hidden"
          spellCheck={false}
        />
        <button
          className="mt-2 px-6 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
          onClick={runQuery}
          disabled={!db || loading}
        >
          {loading ? "Running..." : "Run Query"}
        </button>
        {error && <div className="text-rp-love text-xs mt-2">{error}</div>}
        {results && <ResultsTable results={results} />}
      </div>
    </div>
  );
}
