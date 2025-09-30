"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const DEFAULT_SQL = `-- Try: SELECT 42 AS answer;`;
const SQL_JS_CDN_BASE = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0";

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[160px] rounded-xl border border-rp-highlight-high bg-rp-overlay/50 animate-pulse" />
  ),
});

type SqlDatabase = any;

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

export default function SQLiteClient() {
  const [db, setDb] = useState<SqlDatabase | null>(null);
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const highlightRef = useRef<HighlightFn>((value: string) => value);
  const [highlightReady, setHighlightReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const SQL = await ensureSqlJsModule();
        if (cancelled) return;
        if (!SQL) throw new Error("SQL.js failed to initialize");
        setDb(new SQL.Database());
      } catch (err: any) {
        if (cancelled) return;
        setError("Failed to load SQL.js: " + (err?.message || err));
      }
    })();
    return () => {
      cancelled = true;
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

  const runQuery = () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = db.exec(sql);
      setResults(res);
    } catch (e: any) {
      setError(e?.message || "Query failed");
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
    <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 sm:px-8 py-8 flex flex-col gap-6 relative border border-rp-highlight-high" style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-rp-iris drop-shadow">SQLite WASM Playground</h2>
        <p className="text-sm text-rp-subtle max-w-2xl">Run SQL experiments locally in your browser. Write statements on the left, execute instantly, and explore results without any backend.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] items-start">
        <div className="flex flex-col gap-3">
          <Editor
            value={sql}
            onValueChange={setSql}
            highlight={(value) => highlightRef.current(value)}
            padding={12}
            className="rounded-xl bg-rp-surface/70 border border-rp-highlight-high text-rp-text font-mono text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-rp-iris w-full"
            style={{ minHeight: 160, background: "none", opacity: highlightReady ? 1 : 0.85 }}
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
          {results ? (
            <ResultsTable results={results} />
          ) : (
            <div className="text-sm text-rp-subtle">
              {db ? "Run a query to see results here." : "Loading SQLite WASM…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
